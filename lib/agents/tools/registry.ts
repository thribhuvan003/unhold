/**
 * Agent tool allowlist — FORBIDDEN names are CI-grep targets.
 * @see docs/BUILD_SPEC_AGENTS.md §1
 */

export const FORBIDDEN_TOOL_NAMES = [
  'send_email',
  'send_sms',
  'file_rbi',
  'file_ncrp',
  'auto_send',
  'mark_escalation_sent',
  'skip_escalation_level',
  'delete_evidence',
  'update_case_status_unguarded',
] as const;

export type ForbiddenToolName = (typeof FORBIDDEN_TOOL_NAMES)[number];

export const AGENT_TOOL_ALLOWLIST: Record<string, readonly string[]> = {
  intake: [
    'get_case',
    'get_evidence_list',
    'get_playbook',
    'search_supermemory',
    'write_supermemory_fact',
    'enqueue_human_gate',
  ],
  drafter: [
    'get_case',
    'get_playbook',
    'get_bank_contacts',
    'get_template_fallback',
    'get_escalation_history',
  ],
  monitor: ['get_case', 'set_next_check_at', 'set_user_action_required', 'get_action_logs'],
  verifier: ['run_vision_ocr', 'update_evidence_extracted_json', 'enqueue_human_gate'],
  evidence: ['compute_sha256', 'generate_bundle_manifest'],
  escalator: ['check_proof_gates', 'enqueue_drafter_job'],
  pressure: ['get_anonymized_case_stats'],
  system: ['enqueue_agent_job'],
};

export function isToolAllowed(agentRole: string, toolName: string): boolean {
  if ((FORBIDDEN_TOOL_NAMES as readonly string[]).includes(toolName)) {
    return false;
  }
  const allowlist = AGENT_TOOL_ALLOWLIST[agentRole];
  if (!allowlist) return false;
  return allowlist.includes(toolName);
}