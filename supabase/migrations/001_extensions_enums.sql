-- =============================================================================
-- LienLiberator — Migration 001: Extensions & Enums
-- =============================================================================
-- Run order: 001 → 010. Idempotent only where noted; fresh install assumed.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto"  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

COMMENT ON EXTENSION "pgcrypto" IS 'gen_random_uuid(), digest(), crypt() for tokens and hashes';

-- ---------------------------------------------------------------------------
-- ENUMS (canonical — must match API/UI TypeScript unions)
-- ---------------------------------------------------------------------------

CREATE TYPE public.case_status AS ENUM (
  'new',
  'intake_scoping',
  'monitoring',
  'evidence_building',
  'escalation',
  'awaiting_response',
  'verified',
  'resolved',
  'stalled',
  'retried',
  'human_escalation',
  'closed',
  'public_pressure'
);
COMMENT ON TYPE public.case_status IS 'Canonical case state machine status; transitions enforced by transition_case()';

CREATE TYPE public.freeze_reason AS ENUM (
  'cyber_upi_chain',
  'suspected_mule',
  'kyc_expired',
  'tax_gst_attachment',
  'court_order',
  'police_notice_bnss106',
  'bank_str',
  'cheque_dishonour',
  'death_nomination_dispute'
);
COMMENT ON TYPE public.freeze_reason IS 'Nine intake freeze-reason values; drives playbook selection';

CREATE TYPE public.freeze_type AS ENUM (
  'debit_freeze',
  'credit_freeze',
  'total_freeze',
  'partial_lien'
);
COMMENT ON TYPE public.freeze_type IS 'How the account is restricted';

CREATE TYPE public.victim_role AS ENUM (
  'victim',
  'innocent_receiver'
);
COMMENT ON TYPE public.victim_role IS 'Fork for playbook templates and timeline copy';

CREATE TYPE public.resolution_type AS ENUM (
  'full_unfreeze',
  'partial_release',
  'lien_lifted_innocent_receiver',
  'stalled',
  'closed_user_abandoned',
  'referred_legal',
  'rejected'
);
COMMENT ON TYPE public.resolution_type IS 'Outcome taxonomy; fee + rankings use first three only';

CREATE TYPE public.evidence_type AS ENUM (
  'freeze_sms',
  'bank_statement',
  'passbook_screenshot',
  'ncrp_acknowledgement',
  'police_fir',
  'pan_card',
  'aadhaar_masked',
  'chat_screenshot',
  'letter_sent_proof',
  'bank_release_letter',
  'court_order',
  'other'
);
COMMENT ON TYPE public.evidence_type IS 'Evidence classification for checklist and bundle manifest';

CREATE TYPE public.agent_role AS ENUM (
  'INTAKE',
  'MONITOR',
  'EVIDENCE',
  'DRAFTER',
  'ESCALATOR',
  'VERIFIER',
  'PRESSURE',
  'HUMAN_OPS'
);
COMMENT ON TYPE public.agent_role IS 'Swarm agent roles; no auto-send tools permitted';

CREATE TYPE public.escalation_level AS ENUM (
  'L1',
  'L2',
  'L3',
  'L4'
);
COMMENT ON TYPE public.escalation_level IS 'Escalation ladder; no skip levels allowed';

CREATE TYPE public.escalation_channel AS ENUM (
  'branch_manager',
  'nodal_officer',
  'principal_nodal_officer',
  'internal_ombudsman',
  'rbi_cms',
  'consumer_commission',
  'rti',
  'cpgrams',
  'high_court_writ'
);
COMMENT ON TYPE public.escalation_channel IS 'Delivery channel per escalation step';

CREATE TYPE public.escalation_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'response_received',
  'timeout',
  'skipped'
);
COMMENT ON TYPE public.escalation_status IS 'Per-level letter lifecycle';

CREATE TYPE public.job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'dead_letter'
);
COMMENT ON TYPE public.job_status IS 'agent_jobs queue status';

CREATE TYPE public.user_role AS ENUM (
  'citizen',
  'operator',
  'admin',
  'guest'
);
COMMENT ON TYPE public.user_role IS 'profiles.role; operators bypass case RLS via policy';

CREATE TYPE public.permission_level AS ENUM (
  'owner',
  'editor',
  'viewer',
  'parent_readonly'
);
COMMENT ON TYPE public.permission_level IS 'Scoped case access grant level';

CREATE TYPE public.consent_type AS ENUM (
  'terms_privacy',
  'case_data_processing',
  'evidence_upload',
  'ai_ocr_processing',
  'cross_border_ai',
  'public_stats_opt_in',
  'whatsapp_sms_reminders',
  'fee_agreement',
  'escalation_send'
);
COMMENT ON TYPE public.consent_type IS 'DPDP granular consent; append-only grants';

CREATE TYPE public.invoice_status AS ENUM (
  'none',
  'issued',
  'paid',
  'waived',
  'disputed'
);
COMMENT ON TYPE public.invoice_status IS 'fee_agreements billing state';

CREATE TYPE public.fee_tier AS ENUM (
  'free',
  'escalate_999',
  'rbi_1499'
);
COMMENT ON TYPE public.fee_tier IS 'Monetization tier at intake';

CREATE TYPE public.user_action_type AS ENUM (
  'upload_evidence',
  'complete_checklist',
  'review_letter',
  'approve_escalation',
  'mark_letter_sent',
  'upload_send_proof',
  'confirm_unfreeze',
  'confirm_resolution',
  'sign_fee_agreement',
  'respond_monitoring',
  'reopen_case',
  'acknowledge_disclaimer',
  'contact_human_ops'
);
COMMENT ON TYPE public.user_action_type IS 'NextStepsCard action types surfaced to user';

CREATE TYPE public.swarm_event_severity AS ENUM (
  'debug',
  'info',
  'warn',
  'error',
  'human_required'
);
COMMENT ON TYPE public.swarm_event_severity IS 'SwarmLog display severity';

CREATE TYPE public.human_gate_status AS ENUM (
  'pending',
  'assigned',
  'resolved',
  'dismissed'
);
COMMENT ON TYPE public.human_gate_status IS 'human_gate_queue item status';

CREATE TYPE public.bank_type AS ENUM (
  'public_sector',
  'private',
  'cooperative',
  'payment_bank',
  'small_finance',
  'foreign',
  'other'
);
COMMENT ON TYPE public.bank_type IS 'Bank classification for leaderboard grouping';

CREATE TYPE public.dispute_status AS ENUM (
  'open',
  'under_review',
  'upheld',
  'rejected',
  'withdrawn'
);
COMMENT ON TYPE public.dispute_status IS 'bank_disputes workflow status';

CREATE TYPE public.seal_type AS ENUM (
  'evidence_bundle',
  'action_log_export',
  'data_export',
  'audit_manifest'
);
COMMENT ON TYPE public.seal_type IS 'audit_seals content type';

CREATE TYPE public.actor_type AS ENUM (
  'user',
  'guest',
  'agent',
  'operator',
  'system',
  'cron'
);
COMMENT ON TYPE public.actor_type IS 'action_logs actor classification';