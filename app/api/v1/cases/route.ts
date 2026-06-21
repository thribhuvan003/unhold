import { NextRequest } from 'next/server';
import { requireRequestAuth, serializeCase } from '@/lib/api/case-access';
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  enforceGuestCaseCreateLimit,
  parseIdempotentReplay,
  requireIdempotencyKey,
} from '@/lib/ratelimit';
import { createCaseSchema } from '@/lib/validation/api-schemas';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/supabase/database.types';
import { appendActionLog } from '@/lib/action-logs/append';
import { recordConsent } from '@/lib/consent/record';
import { ApiError } from '@/lib/api/errors';
import {
  getRequestId,
  handleRouteError,
  jsonError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const auth = await requireRequestAuth(request);
    const idempotencyKey = requireIdempotencyKey(request);
    const { replay } = await beginIdempotentRequest('cases:create', idempotencyKey);
    if (replay && replay.body !== '__pending__') {
      const parsed = parseIdempotentReplay(replay);
      return NextResponseFromIdempotent(parsed.status, parsed.body, requestId);
    }

    if (auth.actorType === 'guest') {
      await enforceGuestCaseCreateLimit(auth.guestSessionId!);
    }

    const body = await parseJsonBody(request, requestId);
    const parsed = createCaseSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'validation_failed', parsed.error.issues[0]?.message ?? 'Invalid body');
    }

    const admin = createAdminClient();
    const { data: bank, error: bankError } = await admin
      .from('banks')
      .select('id')
      .eq('slug', parsed.data.bank_slug)
      .eq('is_active', true)
      .maybeSingle();

    if (bankError || !bank) {
      throw new ApiError(400, 'validation_failed', 'Unknown or inactive bank_slug');
    }

    const insertRow = {
      bank_id: bank.id,
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
      status: 'new' as const,
    };

    const { data: created, error: createError } = await admin
      .from('cases')
      .insert(insertRow)
      .select('*')
      .single();

    if (createError || !created) {
      throw createError ?? new ApiError(500, 'internal_error', 'Failed to create case');
    }

    await appendActionLog({
      caseId: created.id,
      actorType: auth.actorType,
      actorId: auth.actorId,
      action: 'case.created',
      payload: { public_id: created.public_id, bank_slug: parsed.data.bank_slug },
      requestId,
    });

    await recordConsent({
      consent_type: 'case_data_processing',
      granted: true,
      case_id: created.id,
      user_id: auth.userId,
      guest_session_id: auth.userId ? null : auth.guestSessionId,
    });

    const payload = serializeCase(created);
    await completeIdempotentRequest('cases:create', idempotencyKey, 201, payload);
    const response = jsonSuccess(payload, { status: 201 });
    response.headers.set('x-request-id', requestId);
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

    let query = admin.from('cases').select('*').order('created_at', { ascending: false });

    if (auth.userId) {
      query = query.eq('user_id', auth.userId);
    } else if (auth.guestSessionId) {
      query = query.eq('guest_session_id', auth.guestSessionId).is('user_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;

    const response = jsonSuccess({ cases: (data ?? []).map(serializeCase) });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

function NextResponseFromIdempotent(status: number, body: unknown, requestId: string) {
  if (status === 0) {
    return jsonError(409, 'idempotency_conflict', 'Request still in progress', requestId);
  }
  const response = jsonSuccess(body, { status });
  response.headers.set('x-request-id', requestId);
  return response;
}