/**
 * LienLiberator — Supabase generated types shape
 * Generate fresh: npx supabase gen types typescript --project-id <ref> > supabase/database.types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      action_logs: {
        Row: {
          id: string;
          case_id: string;
          actor_type: Database['public']['Enums']['actor_type'];
          actor_id: string | null;
          action: string;
          payload_json: Json;
          ip_hash: string | null;
          request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          actor_type: Database['public']['Enums']['actor_type'];
          actor_id?: string | null;
          action: string;
          payload_json?: Json;
          ip_hash?: string | null;
          request_id?: string | null;
          created_at?: string;
        };
        Update: never; // append-only
        Relationships: [
          {
            foreignKeyName: 'action_logs_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
        ];
      };
      agent_jobs: {
        Row: {
          id: string;
          case_id: string;
          job_type: string;
          agent_role: Database['public']['Enums']['agent_role'] | null;
          status: Database['public']['Enums']['job_status'];
          idempotency_key: string;
          payload_json: Json;
          result_json: Json;
          error_message: string | null;
          attempts: number;
          max_attempts: number;
          scheduled_at: string;
          started_at: string | null;
          completed_at: string | null;
          cost_usd: number;
          langfuse_trace_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          job_type: string;
          agent_role?: Database['public']['Enums']['agent_role'] | null;
          status?: Database['public']['Enums']['job_status'];
          idempotency_key: string;
          payload_json?: Json;
          result_json?: Json;
          error_message?: string | null;
          attempts?: number;
          max_attempts?: number;
          scheduled_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          cost_usd?: number;
          langfuse_trace_id?: string | null;
          created_at?: string;
        };
        Update: {
          status?: Database['public']['Enums']['job_status'];
          result_json?: Json;
          error_message?: string | null;
          attempts?: number;
          started_at?: string | null;
          completed_at?: string | null;
          cost_usd?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'agent_jobs_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_seals: {
        Row: {
          id: string;
          case_id: string | null;
          seal_type: Database['public']['Enums']['seal_type'];
          manifest_sha256: string;
          manifest_json: Json;
          sealed_content_path: string | null;
          sealed_content_bucket: string;
          sealed_by: string | null;
          sealed_by_type: Database['public']['Enums']['actor_type'];
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id?: string | null;
          seal_type: Database['public']['Enums']['seal_type'];
          manifest_sha256: string;
          manifest_json?: Json;
          sealed_content_path?: string | null;
          sealed_content_bucket?: string;
          sealed_by?: string | null;
          sealed_by_type?: Database['public']['Enums']['actor_type'];
          metadata_json?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      bank_disputes: {
        Row: {
          id: string;
          bank_id: string;
          bank_scores_id: string | null;
          dispute_type: string;
          status: Database['public']['Enums']['dispute_status'];
          reporter_email_hash: string | null;
          dispute_text: string;
          evidence_urls: string[];
          resolution_notes: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bank_id: string;
          bank_scores_id?: string | null;
          dispute_type?: string;
          status?: Database['public']['Enums']['dispute_status'];
          reporter_email_hash?: string | null;
          dispute_text: string;
          evidence_urls?: string[];
          resolution_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: Database['public']['Enums']['dispute_status'];
          resolution_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      bank_scores: {
        Row: {
          id: string;
          bank_id: string;
          snapshot_date: string;
          methodology_version: string;
          sample_size: number;
          cases_reported: number;
          cases_open: number;
          cases_resolved: number;
          cases_resolved_positive: number;
          median_days_full_unfreeze: number | null;
          innocent_receiver_release_rate: number | null;
          avg_satisfaction: number | null;
          ombudsman_filings: number;
          pressure_score: number | null;
          is_public: boolean;
          metrics_json: Json;
          computed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bank_id: string;
          snapshot_date?: string;
          methodology_version?: string;
          sample_size?: number;
          cases_reported?: number;
          cases_open?: number;
          cases_resolved?: number;
          cases_resolved_positive?: number;
          median_days_full_unfreeze?: number | null;
          innocent_receiver_release_rate?: number | null;
          avg_satisfaction?: number | null;
          ombudsman_filings?: number;
          pressure_score?: number | null;
          is_public?: boolean;
          metrics_json?: Json;
          computed_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bank_scores']['Insert']>;
        Relationships: [];
      };
      banks: {
        Row: {
          id: string;
          slug: string;
          name: string;
          short_name: string | null;
          bank_type: Database['public']['Enums']['bank_type'];
          ifsc_prefix: string | null;
          nodal_email: string | null;
          nodal_phone: string | null;
          principal_nodal_email: string | null;
          rbi_ombudsman_scheme: string;
          cms_portal_url: string;
          website_url: string | null;
          narration_codes: string[];
          metadata_json: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          short_name?: string | null;
          bank_type?: Database['public']['Enums']['bank_type'];
          ifsc_prefix?: string | null;
          nodal_email?: string | null;
          nodal_phone?: string | null;
          principal_nodal_email?: string | null;
          rbi_ombudsman_scheme?: string;
          cms_portal_url?: string;
          website_url?: string | null;
          narration_codes?: string[];
          metadata_json?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['banks']['Insert']>;
        Relationships: [];
      };
      cases: {
        Row: {
          id: string;
          public_id: string;
          user_id: string | null;
          guest_session_id: string | null;
          bank_id: string | null;
          playbook_id: string | null;
          status: Database['public']['Enums']['case_status'];
          freeze_reason: Database['public']['Enums']['freeze_reason'] | null;
          freeze_type: Database['public']['Enums']['freeze_type'] | null;
          victim_role: Database['public']['Enums']['victim_role'] | null;
          resolution_type: Database['public']['Enums']['resolution_type'] | null;
          frozen_amount_paise: number | null;
          released_amount_paise: number | null;
          account_last4: string | null;
          pan_masked: string | null;
          ncrp_id: string | null;
          external_report_url: string | null;
          state_code: string | null;
          district: string | null;
          narration_codes: string[];
          intake_json: Json;
          classification_confidence: number | null;
          escalation_level: Database['public']['Enums']['escalation_level'];
          swarm_paused: boolean;
          agent_cost_usd: number;
          agent_cost_cap_usd: number;
          user_action_required: boolean;
          next_check_at: string | null;
          next_user_action_type: Database['public']['Enums']['user_action_type'] | null;
          next_user_action_due_at: string | null;
          public_stats_opt_in: boolean;
          satisfaction_score: number | null;
          resolution_confirmed_by: string | null;
          resolution_notes: string | null;
          frozen_since: string | null;
          resolved_at: string | null;
          closed_at: string | null;
          stalled_at: string | null;
          last_activity_at: string;
          erasure_requested_at: string | null;
          erasure_scheduled_at: string | null;
          erasure_completed_at: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          public_id?: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          bank_id?: string | null;
          playbook_id?: string | null;
          status?: Database['public']['Enums']['case_status'];
          freeze_reason?: Database['public']['Enums']['freeze_reason'] | null;
          freeze_type?: Database['public']['Enums']['freeze_type'] | null;
          victim_role?: Database['public']['Enums']['victim_role'] | null;
          frozen_amount_paise?: number | null;
          intake_json?: Json;
          narration_codes?: string[];
          public_stats_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['cases']['Insert']> & {
          status?: Database['public']['Enums']['case_status'];
          resolution_type?: Database['public']['Enums']['resolution_type'] | null;
        };
        Relationships: [];
      };
      consent_records: {
        Row: {
          id: string;
          user_id: string | null;
          guest_session_id: string | null;
          case_id: string | null;
          consent_type: Database['public']['Enums']['consent_type'];
          granted: boolean;
          consent_text_version: string;
          consent_text_hash: string;
          ip_hash: string | null;
          user_agent_hash: string | null;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          case_id?: string | null;
          consent_type: Database['public']['Enums']['consent_type'];
          granted: boolean;
          consent_text_version: string;
          consent_text_hash: string;
          ip_hash?: string | null;
          user_agent_hash?: string | null;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      escalations: {
        Row: {
          id: string;
          case_id: string;
          level: Database['public']['Enums']['escalation_level'];
          channel: Database['public']['Enums']['escalation_channel'];
          status: Database['public']['Enums']['escalation_status'];
          letter_template_id: string | null;
          letter_subject: string | null;
          letter_body: string | null;
          letter_body_html: string | null;
          user_consent_at: string | null;
          user_consent_ip_hash: string | null;
          approved_at: string | null;
          sent_at: string | null;
          sent_proof_evidence_id: string | null;
          response_due_at: string | null;
          response_received_at: string | null;
          response_evidence_id: string | null;
          wait_days: number;
          created_by_agent: Database['public']['Enums']['agent_role'] | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          level: Database['public']['Enums']['escalation_level'];
          channel: Database['public']['Enums']['escalation_channel'];
          status?: Database['public']['Enums']['escalation_status'];
          letter_template_id?: string | null;
          letter_body?: string | null;
          wait_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['escalations']['Insert']> & {
          status?: Database['public']['Enums']['escalation_status'];
          sent_at?: string | null;
          sent_proof_evidence_id?: string | null;
        };
        Relationships: [];
      };
      evidence: {
        Row: {
          id: string;
          case_id: string;
          evidence_type: Database['public']['Enums']['evidence_type'];
          storage_path: string;
          storage_bucket: string;
          original_filename: string | null;
          mime_type: string | null;
          file_size_bytes: number | null;
          sha256: string;
          sha256_verified_at: string | null;
          vision_extracted_json: Json;
          vision_confidence: number | null;
          human_verified: boolean;
          human_verified_by: string | null;
          human_verified_at: string | null;
          forgery_flag: boolean;
          forgery_notes: string | null;
          bundle_id: string | null;
          uploaded_by: string | null;
          guest_session_id: string | null;
          redaction_applied: boolean;
          metadata_json: Json;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          evidence_type: Database['public']['Enums']['evidence_type'];
          storage_path: string;
          storage_bucket?: string;
          sha256: string;
          uploaded_by?: string | null;
          guest_session_id?: string | null;
          created_at?: string;
        };
        Update: {
          sha256_verified_at?: string | null;
          vision_extracted_json?: Json;
          human_verified?: boolean;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      fee_agreements: {
        Row: {
          id: string;
          case_id: string;
          tier: Database['public']['Enums']['fee_tier'];
          contingency_rate: number;
          contingency_cap_paise: number;
          contingency_min_paise: number;
          amount_released_paise: number | null;
          fee_due_paise: number | null;
          fee_collected_paise: number;
          invoice_status: Database['public']['Enums']['invoice_status'];
          invoice_number: string | null;
          invoice_issued_at: string | null;
          invoice_paid_at: string | null;
          e_signed_at: string | null;
          e_sign_ip_hash: string | null;
          resolution_type: Database['public']['Enums']['resolution_type'] | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          tier?: Database['public']['Enums']['fee_tier'];
          contingency_rate?: number;
          e_signed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['fee_agreements']['Insert']> & {
          fee_due_paise?: number | null;
          invoice_status?: Database['public']['Enums']['invoice_status'];
        };
        Relationships: [];
      };
      guest_sessions: {
        Row: {
          id: string;
          device_token_hash: string;
          ip_hash: string | null;
          user_agent_hash: string | null;
          claimed_by: string | null;
          claimed_at: string | null;
          expires_at: string;
          last_seen_at: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          device_token_hash: string;
          expires_at: string;
          ip_hash?: string | null;
          created_at?: string;
        };
        Update: {
          claimed_by?: string | null;
          claimed_at?: string | null;
          last_seen_at?: string;
        };
        Relationships: [];
      };
      human_gate_queue: {
        Row: {
          id: string;
          case_id: string;
          queue_reason: string;
          priority: number;
          status: Database['public']['Enums']['human_gate_status'];
          assigned_to: string | null;
          assigned_at: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          resolution_notes: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          queue_reason: string;
          priority?: number;
          status?: Database['public']['Enums']['human_gate_status'];
        };
        Update: Partial<Database['public']['Tables']['human_gate_queue']['Insert']> & {
          status?: Database['public']['Enums']['human_gate_status'];
          assigned_to?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          case_id: string;
          grantee_user_id: string;
          permission_level: Database['public']['Enums']['permission_level'];
          granted_by: string | null;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          grantee_user_id: string;
          permission_level?: Database['public']['Enums']['permission_level'];
          granted_by?: string | null;
          expires_at?: string | null;
        };
        Update: {
          permission_level?: Database['public']['Enums']['permission_level'];
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      playbooks: {
        Row: {
          id: string;
          slug: string;
          bank_id: string | null;
          freeze_reason: Database['public']['Enums']['freeze_reason'];
          victim_role: Database['public']['Enums']['victim_role'];
          title: string;
          description: string | null;
          steps_json: Json;
          checklist_json: Json;
          timeline_copy_json: Json;
          templates_json: Json;
          panic_checklist_json: Json;
          version: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          freeze_reason: Database['public']['Enums']['freeze_reason'];
          victim_role: Database['public']['Enums']['victim_role'];
          title: string;
          steps_json?: Json;
          checklist_json?: Json;
          timeline_copy_json?: Json;
          templates_json?: Json;
        };
        Update: Partial<Database['public']['Tables']['playbooks']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          phone: string | null;
          email: string | null;
          full_name: string | null;
          role: Database['public']['Enums']['user_role'];
          locale: string;
          timezone: string;
          consent_at: string | null;
          marketing_opt_in: boolean;
          public_stats_opt_in: boolean;
          avatar_url: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone?: string | null;
          email?: string | null;
          full_name?: string | null;
          role?: Database['public']['Enums']['user_role'];
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      swarm_events: {
        Row: {
          id: string;
          case_id: string;
          agent_role: Database['public']['Enums']['agent_role'];
          event_type: string;
          severity: Database['public']['Enums']['swarm_event_severity'];
          message: string;
          message_hi: string | null;
          metadata_json: Json;
          automated: boolean;
          job_id: string | null;
          langfuse_trace_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          agent_role: Database['public']['Enums']['agent_role'];
          event_type: string;
          message: string;
          severity?: Database['public']['Enums']['swarm_event_severity'];
          automated?: boolean;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      user_actions: {
        Row: {
          id: string;
          case_id: string;
          action_type: Database['public']['Enums']['user_action_type'];
          title: string;
          description: string | null;
          title_hi: string | null;
          priority: number;
          due_at: string | null;
          completed_at: string | null;
          dismissed_at: string | null;
          escalation_id: string | null;
          evidence_id: string | null;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          action_type: Database['public']['Enums']['user_action_type'];
          title: string;
          description?: string | null;
          priority?: number;
          due_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
          dismissed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      v_case_timeline: {
        Row: {
          case_id: string;
          public_id: string;
          event_at: string;
          action: string;
          actor_type: Database['public']['Enums']['actor_type'];
          payload_json: Json;
        };
        Relationships: [];
      };
      v_public_bank_rankings: {
        Row: {
          bank_slug: string;
          bank_name: string;
          short_name: string | null;
          snapshot_date: string;
          methodology_version: string;
          sample_size: number;
          pressure_score: number | null;
          median_days_full_unfreeze: number | null;
          innocent_receiver_release_rate: number | null;
          avg_satisfaction: number | null;
          cases_reported: number;
          cases_resolved_positive: number;
          metrics_json: Json;
        };
        Relationships: [];
      };
    };
    Functions: {
      append_swarm_event: {
        Args: {
          p_case_id: string;
          p_agent_role: Database['public']['Enums']['agent_role'];
          p_event_type: string;
          p_message: string;
          p_severity?: Database['public']['Enums']['swarm_event_severity'];
          p_message_hi?: string;
          p_metadata_json?: Json;
          p_automated?: boolean;
          p_job_id?: string;
          p_langfuse_trace?: string;
        };
        Returns: string;
      };
      compute_pressure_score: {
        Args: {
          p_median_days_full_unfreeze?: number;
          p_innocent_receiver_release_rate?: number;
          p_cases_open?: number;
          p_cases_reported?: number;
          p_avg_satisfaction?: number;
          p_ombudsman_filings?: number;
        };
        Returns: number;
      };
      transition_case: {
        Args: {
          p_case_id: string;
          p_to_status: Database['public']['Enums']['case_status'];
          p_trigger: string;
          p_actor_type?: Database['public']['Enums']['actor_type'];
          p_actor_id?: string;
          p_payload_json?: Json;
        };
        Returns: Database['public']['Tables']['cases']['Row'];
      };
      has_case_access: {
        Args: {
          p_case_id: string;
          p_min_level?: Database['public']['Enums']['permission_level'];
        };
        Returns: boolean;
      };
      refresh_leaderboard_mv: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      refresh_bank_score_snapshot: {
        Args: {
          p_bank_id: string;
          p_snapshot_date?: string;
          p_methodology_version?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      actor_type: 'user' | 'guest' | 'agent' | 'operator' | 'system' | 'cron';
      agent_role: 'INTAKE' | 'MONITOR' | 'EVIDENCE' | 'DRAFTER' | 'ESCALATOR' | 'VERIFIER' | 'PRESSURE' | 'HUMAN_OPS';
      bank_type: 'public_sector' | 'private' | 'cooperative' | 'payment_bank' | 'small_finance' | 'foreign' | 'other';
      case_status:
        | 'new'
        | 'intake_scoping'
        | 'monitoring'
        | 'evidence_building'
        | 'escalation'
        | 'awaiting_response'
        | 'verified'
        | 'resolved'
        | 'stalled'
        | 'retried'
        | 'human_escalation'
        | 'closed'
        | 'public_pressure';
      consent_type:
        | 'terms_privacy'
        | 'case_data_processing'
        | 'evidence_upload'
        | 'ai_ocr_processing'
        | 'cross_border_ai'
        | 'public_stats_opt_in'
        | 'whatsapp_sms_reminders'
        | 'fee_agreement'
        | 'escalation_send';
      dispute_status: 'open' | 'under_review' | 'upheld' | 'rejected' | 'withdrawn';
      escalation_channel:
        | 'branch_manager'
        | 'nodal_officer'
        | 'principal_nodal_officer'
        | 'internal_ombudsman'
        | 'rbi_cms'
        | 'consumer_commission'
        | 'rti'
        | 'cpgrams'
        | 'high_court_writ';
      escalation_level: 'L1' | 'L2' | 'L3' | 'L4';
      escalation_status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'response_received' | 'timeout' | 'skipped';
      evidence_type:
        | 'freeze_sms'
        | 'bank_statement'
        | 'passbook_screenshot'
        | 'ncrp_acknowledgement'
        | 'police_fir'
        | 'pan_card'
        | 'aadhaar_masked'
        | 'chat_screenshot'
        | 'letter_sent_proof'
        | 'bank_release_letter'
        | 'court_order'
        | 'other';
      fee_tier: 'free' | 'escalate_999' | 'rbi_1499';
      freeze_reason:
        | 'cyber_upi_chain'
        | 'suspected_mule'
        | 'kyc_expired'
        | 'tax_gst_attachment'
        | 'court_order'
        | 'police_notice_bnss106'
        | 'bank_str'
        | 'cheque_dishonour'
        | 'death_nomination_dispute';
      freeze_type: 'debit_freeze' | 'credit_freeze' | 'total_freeze' | 'partial_lien';
      human_gate_status: 'pending' | 'assigned' | 'resolved' | 'dismissed';
      invoice_status: 'none' | 'issued' | 'paid' | 'waived' | 'disputed';
      job_status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'dead_letter';
      permission_level: 'owner' | 'editor' | 'viewer' | 'parent_readonly';
      resolution_type:
        | 'full_unfreeze'
        | 'partial_release'
        | 'lien_lifted_innocent_receiver'
        | 'stalled'
        | 'closed_user_abandoned'
        | 'referred_legal'
        | 'rejected';
      seal_type: 'evidence_bundle' | 'action_log_export' | 'data_export' | 'audit_manifest';
      swarm_event_severity: 'debug' | 'info' | 'warn' | 'error' | 'human_required';
      user_action_type:
        | 'upload_evidence'
        | 'complete_checklist'
        | 'review_letter'
        | 'approve_escalation'
        | 'mark_letter_sent'
        | 'upload_send_proof'
        | 'confirm_unfreeze'
        | 'confirm_resolution'
        | 'sign_fee_agreement'
        | 'respond_monitoring'
        | 'reopen_case'
        | 'acknowledge_disclaimer'
        | 'contact_human_ops';
      user_role: 'citizen' | 'operator' | 'admin' | 'guest';
      victim_role: 'victim' | 'innocent_receiver';
    };
    CompositeTypes: Record<string, never>;
  };
};

// Convenience exports
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type Case = Tables<'cases'>;
export type CaseStatus = Enums<'case_status'>;
export type Bank = Tables<'banks'>;
export type Playbook = Tables<'playbooks'>;
export type SwarmEvent = Tables<'swarm_events'>;
export type UserAction = Tables<'user_actions'>;