-- Reproducible storage controls for sensitive case evidence and generated bundles.
-- Signed uploads/downloads are issued by the service-role API; browser clients
-- must never receive direct list/read/write access to these buckets.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  false,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bundles', 'bundles', false, 104857600, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Restrictive policies continue to deny these buckets even if a broad
-- permissive storage policy is added later for another product bucket.
CREATE POLICY unhold_private_case_objects_select
  ON storage.objects AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (bucket_id NOT IN ('evidence', 'bundles'));

CREATE POLICY unhold_private_case_objects_insert
  ON storage.objects AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id NOT IN ('evidence', 'bundles'));

CREATE POLICY unhold_private_case_objects_update
  ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (bucket_id NOT IN ('evidence', 'bundles'))
  WITH CHECK (bucket_id NOT IN ('evidence', 'bundles'));

CREATE POLICY unhold_private_case_objects_delete
  ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (bucket_id NOT IN ('evidence', 'bundles'));
