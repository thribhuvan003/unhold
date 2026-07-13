import type { NextRequest } from "next/server";
import { createUserAction } from "@/lib/user-actions/create";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertCaseAccess, requireRequestAuth } from "@/lib/api/case-access";
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
  parseJsonBody,
} from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import type { Database } from "@/supabase/database.types";

type UserActionType = Database["public"]["Enums"]["user_action_type"];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, "viewer");
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("user_actions")
      .select("*")
      .eq("case_id", caseId)
      .order("priority", { ascending: false });

    if (error) {
      throw new ApiError(500, "internal_error", error.message);
    }

    return jsonSuccess({ actions: data ?? [] });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, "editor");

    const body = (await parseJsonBody(request, requestId)) as {
      action_type: UserActionType;
      title: string;
      description?: string;
      priority?: number;
      due_at?: string;
    };

    if (!body.action_type || !body.title) {
      throw new ApiError(400, "validation_failed", "Missing required fields");
    }

    const actionId = await createUserAction({
      case_id: caseId,
      action_type: body.action_type,
      title: body.title,
      description: body.description,
      priority: body.priority,
      due_at: body.due_at,
    });

    return jsonSuccess({ id: actionId }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, "editor");
    const admin = createAdminClient();

    const body = (await parseJsonBody(request, requestId)) as {
      action_id: string;
      completed?: boolean;
      dismissed?: boolean;
    };

    if (!body.action_id) {
      throw new ApiError(400, "validation_failed", "Missing action_id");
    }

    const update: Database["public"]["Tables"]["user_actions"]["Update"] = {};
    if (body.completed) update.completed_at = new Date().toISOString();
    if (body.dismissed) update.dismissed_at = new Date().toISOString();

    const { error } = await admin
      .from("user_actions")
      .update(update)
      .eq("id", body.action_id)
      .eq("case_id", caseId);

    if (error) {
      throw new ApiError(500, "internal_error", error.message);
    }

    return jsonSuccess({ ok: true });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
