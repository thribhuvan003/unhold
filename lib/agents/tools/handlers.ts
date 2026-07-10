import 'server-only';

import { isToolAllowed } from '@/lib/agents/tools/registry';
import { getBankContacts, getRegionalGrievanceContact } from '@/lib/banks/official-contacts';

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
 *
 * get_bank_contacts now supports location-based lookup for agents:
 *   args: { bank_slug: string, state?: string, city?: string }
 * Agents (DRAFTER etc.) can "look up" the correct regional grievance contact
 * using the verified map + dynamic resolver. This lets the LLM-powered agents
 * include accurate "email this to: xxx for your [city/state]" in letters/advice
 * without hallucinating emails (always grounded in official verified data).
 */
export async function invokeAgentTool(
  ctx: ToolContext,
  toolName: string,
  _args: Record<string, unknown>,
): Promise<ToolResult> {
  if (!isToolAllowed(ctx.agent_role, toolName)) {
    return { ok: false, error: `tool_forbidden: ${toolName}` };
  }

  if (toolName === 'get_bank_contacts') {
    const bankSlug = (_args.bank_slug as string) || '';
    const state = _args.state as string | undefined;
    const city = _args.city as string | undefined;

    const staticContacts = getBankContacts(bankSlug);
    const regional = getRegionalGrievanceContact(bankSlug, { state, city });

    return {
      ok: true,
      data: {
        bank_slug: bankSlug,
        location: { state, city },
        contacts: staticContacts?.contacts ?? [],
        regional_grievance: regional,
        note: 'Primary: visit nearest branch in person with sealed bundle. Use regional email as follow-up. Always verify.',
      },
    };
  }

  // Slice 05+ implements concrete handlers
  return { ok: false, error: `tool_not_implemented: ${toolName}` };
}