import 'server-only';

import { isToolAllowed } from '@/lib/agents/tools/registry';

export type ToolContext = {
  case_id: string;
  agent_role: string;
  job_id: string;
};

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

/**
 * Bounded tool dispatcher — agents call only allowlisted tools.
 * Full handlers implemented per slice (05–09).
 */
export async function invokeAgentTool(
  ctx: ToolContext,
  toolName: string,
  _args: Record<string, unknown>,
): Promise<ToolResult> {
  if (!isToolAllowed(ctx.agent_role, toolName)) {
    return { ok: false, error: `tool_forbidden: ${toolName}` };
  }

  // Slice 05+ implements concrete handlers
  return { ok: false, error: `tool_not_implemented: ${toolName}` };
}