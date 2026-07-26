-- Email deadline reminders — DPDP opt-in consent type.
--
-- The reminder email address and the opt-in flag live in cases.intake_json
-- (reminder_email / reminder_opt_in), reusing the intake PATCH pattern — so no
-- new column is required. This enum value lets recordConsent() capture an
-- append-only DPDP grant for the *email* channel specifically, mirroring the
-- existing whatsapp_sms_reminders value. Append-only: never UPDATE/DELETE.
ALTER TYPE public.consent_type ADD VALUE IF NOT EXISTS 'email_reminders';
