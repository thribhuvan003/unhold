import { NextRequest } from "next/server";
import { requireRequestAuth, serializeCase } from "@/lib/api/case-access";
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  enforceGuestCaseCreateLimit,
  getClientRateLimitFingerprint,
  parseIdempotentReplay,
  requireIdempotencyKey,
} from "@/lib/ratelimit";
import { createCaseSchema } from "@/lib/validation/api-schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/supabase/database.types";
import { appendActionLog } from "@/lib/action-logs/append";
import { recordConsent } from "@/lib/consent/record";
import { ApiError } from "@/lib/api/errors";
import {
  getRequestId,
  handleRouteError,
  jsonError,
  jsonSuccess,
  parseJsonBody,
} from "@/lib/api/response";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Resolve a bank_id for the case FK, resilient to an unseeded environment:
 * 1) the exact requested slug, 2) the always-seeded SBI provisional, 3) any
 * active bank. Returns null only when the banks table is genuinely empty.
 */
async function resolveBankId(
  admin: AdminClient,
  slug: string,
): Promise<string | null> {
  const exact = await admin
    .from("banks")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (exact.data) return exact.data.id;

  const sbi = await admin
    .from("banks")
    .select("id")
    .eq("slug", "state-bank-of-india")
    .eq("is_active", true)
    .maybeSingle();
  if (sbi.data) return sbi.data.id;

  const anyBank = await admin
    .from("banks")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return anyBank.data?.id ?? null;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const auth = await requireRequestAuth(request);
    const idempotencyKey = requireIdempotencyKey(request);
    const { replay } = await beginIdempotentRequest(
      "cases:create",
      idempotencyKey,
    );
    if (replay && replay.body !== "__pending__") {
      const parsed = parseIdempotentReplay(replay);
      return NextResponseFromIdempotent(parsed.status, parsed.body, requestId);
    }

    if (auth.actorType === "guest") {
      await enforceGuestCaseCreateLimit(getClientRateLimitFingerprint(request));
    }

    const body = await parseJsonBody(request, requestId);
    const parsed = createCaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "validation_failed",
        parsed.error.issues[0]?.message ?? "Invalid body",
      );
    }

    const admin = createAdminClient();
    // Resolve the bank row for the FK. A slug that isn't seeded on this
    // environment (e.g. a bank added in a migration that hasn't run on prod)
    // must never hard-fail case creation for a freeze victim — fall back to a
    // seeded active bank. The user's real bank still travels in
    // intake_json.bank_slug_selected, which is what contacts and letters read.
    const bankId = await resolveBankId(admin, parsed.data.bank_slug);
    if (!bankId) {
      throw new ApiError(
        400,
        "validation_failed",
        "No banks are configured yet — please try again shortly.",
      );
    }

    const insertRow = {
      bank_id: bankId,
      user_id: auth.userId,
      guest_session_id: auth.userId ? null : auth.guestSessionId,
      freeze_reason: parsed.data.freeze_reason ?? null,
      freeze_type: parsed.data.freeze_type ?? null,
      victim_role: parsed.data.victim_role ?? null,
      frozen_amount_paise: parsed.data.frozen_amount_paise ?? null,
      account_last4: parsed.data.account_last4 ?? null,
      state_code: parsed.data.state_code ?? null,
      district: parsed.data.district ?? null,
      narration_codes: parsed.data.narration_codes ?? [],
      intake_json: (parsed.data.intake_json ?? {}) as Json,
      status: "new" as const,
    };

    const { data: created, error: createError } = await admin
      .from("cases")
      .insert(insertRow)
      .select("*")
      .single();

    if (createError || !created) {
      throw (
        createError ??
        new ApiError(500, "internal_error", "Failed to create case")
      );
    }

    // One-time guest recovery secret — plaintext only in this 201 response.
    // Hash lives on cases.metadata_json (no extra migration).
    let recoveryCode: string | undefined;
    if (!auth.userId && auth.guestSessionId) {
      const {
        generateRecoveryCode,
        hashRecoveryCode,
        RECOVERY_HASH_KEY,
        RECOVERY_SET_AT_KEY,
      } = await import("@/lib/auth/recovery");
      recoveryCode = generateRecoveryCode();
      const prevMeta =
        typeof created.metadata_json === "object" &&
        created.metadata_json !== null
          ? (created.metadata_json as Record<string, unknown>)
          : {};
      const nextMeta = {
        ...prevMeta,
        [RECOVERY_HASH_KEY]: hashRecoveryCode(recoveryCode),
        [RECOVERY_SET_AT_KEY]: new Date().toISOString(),
      };
      const { data: withMeta, error: metaError } = await admin
        .from("cases")
        .update({ metadata_json: nextMeta as Json })
        .eq("id", created.id)
        .select("*")
        .single();
      if (!metaError && withMeta) {
        Object.assign(created, withMeta);
      }
    }

    await appendActionLog({
      caseId: created.id,
      actorType: auth.actorType,
      actorId: auth.actorId,
      action: "case.created",
      payload: {
        public_id: created.public_id,
        bank_slug: parsed.data.bank_slug,
        recovery_enabled: Boolean(recoveryCode),
      },
      requestId,
    });

    await recordConsent({
      consent_type: "case_data_processing",
      granted: true,
      case_id: created.id,
      user_id: auth.userId,
      guest_session_id: auth.userId ? null : auth.guestSessionId,
    });

    if (parsed.data.ai_consent_accepted) {
      await recordConsent({
        consent_type: "cross_border_ai",
        granted: true,
        case_id: created.id,
        user_id: auth.userId,
        guest_session_id: auth.userId ? null : auth.guestSessionId,
      });
      await recordConsent({
        consent_type: "ai_ocr_processing",
        granted: true,
        case_id: created.id,
        user_id: auth.userId,
        guest_session_id: auth.userId ? null : auth.guestSessionId,
      });
    }

    // Classify freeze_reason NOW (deterministic rules — no LLM, instant) so the
    // papers checklist and letter adapt to the case from the first screen.
    // Best-effort: a failure just leaves the generic default until a notice is
    // analysed. Runs before the response so the case page/papers see it.
    try {
      const { classifyCaseNow } = await import("@/lib/agents/intake/runner");
      await classifyCaseNow(created.id);
    } catch {
      // cron / notice-analysis will classify later
    }

    const payload = {
      ...serializeCase(created),
      ...(recoveryCode ? { recovery_code: recoveryCode } : {}),
    };
    await completeIdempotentRequest(
      "cases:create",
      idempotencyKey,
      201,
      payload,
    );
    const response = jsonSuccess(payload, { status: 201 });
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const auth = await requireRequestAuth(request);
    const admin = createAdminClient();

    let query = admin
      .from("cases")
      .select("*")
      .order("created_at", { ascending: false });

    if (auth.userId) {
      query = query.eq("user_id", auth.userId);
    } else if (auth.guestSessionId) {
      query = query
        .eq("guest_session_id", auth.guestSessionId)
        .is("user_id", null);
    }

    const { data, error } = await query;
    if (error) throw error;

    const caseRows = data ?? [];
    const evidenceCounts = await loadEvidenceCounts(
      admin,
      caseRows.map((row) => row.id),
    );

    const response = jsonSuccess({
      cases: caseRows.map((row) => ({
        ...serializeCase(row),
        evidence_count: evidenceCounts.get(row.id) ?? 0,
      })),
    });
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

async function loadEvidenceCounts(
  admin: ReturnType<typeof createAdminClient>,
  caseIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (caseIds.length === 0) return counts;

  const { data, error } = await admin
    .from("evidence")
    .select("case_id")
    .in("case_id", caseIds)
    .is("deleted_at", null);
  if (error) throw error;

  for (const row of data ?? []) {
    counts.set(row.case_id, (counts.get(row.case_id) ?? 0) + 1);
  }
  return counts;
}

function NextResponseFromIdempotent(
  status: number,
  body: unknown,
  requestId: string,
) {
  if (status === 0) {
    return jsonError(
      409,
      "idempotency_conflict",
      "Request still in progress",
      requestId,
    );
  }
  const response = jsonSuccess(body, { status });
  response.headers.set("x-request-id", requestId);
  return response;
}
