-- =============================================================================
-- LienLiberator — Migration 014: Seed major private/public banks
-- =============================================================================
-- The guided intake now asks "Which bank froze your account?". Only SBI was
-- seeded (010). Seed the other most-reported banks so bank_slug validation
-- passes. Nodal emails are deliberately NULL here: recipient emails must come
-- from lib/banks/official-contacts.ts entries that carry a source URL and a
-- verified date — never from this table.

INSERT INTO public.banks (
  slug, name, short_name, bank_type, ifsc_prefix,
  nodal_email, nodal_phone, principal_nodal_email,
  narration_codes, metadata_json
) VALUES
  (
    'hdfc-bank',
    'HDFC Bank',
    'HDFC',
    'private',
    'HDFC',
    NULL,
    '18002026161',
    NULL,
    ARRAY['CFCFRMS', 'LIEN', 'DEBIT FREEZE', 'CREDIT FREEZE'],
    jsonb_build_object(
      'helpline', '18002026161',
      'cyber_helpline', '1930',
      'website', 'https://www.hdfcbank.com'
    )
  ),
  (
    'axis-bank',
    'Axis Bank',
    'Axis',
    'private',
    'UTIB',
    NULL,
    '18604195555',
    NULL,
    ARRAY['CFCFRMS', 'LIEN', 'DEBIT FREEZE', 'CREDIT FREEZE'],
    jsonb_build_object(
      'helpline', '18604195555',
      'cyber_helpline', '1930',
      'website', 'https://www.axisbank.com'
    )
  ),
  (
    'icici-bank',
    'ICICI Bank',
    'ICICI',
    'private',
    'ICIC',
    NULL,
    '18001080',
    NULL,
    ARRAY['CFCFRMS', 'LIEN', 'DEBIT FREEZE', 'CREDIT FREEZE'],
    jsonb_build_object(
      'helpline', '18001080',
      'cyber_helpline', '1930',
      'website', 'https://www.icicibank.com'
    )
  )
ON CONFLICT (slug) DO NOTHING;
