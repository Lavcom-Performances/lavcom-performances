-- Create private bucket for DR evidence
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dr-evidence',
  'dr-evidence',
  false,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'application/json']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for dr-evidence bucket

-- Platform admins can view all DR evidence
CREATE POLICY "Platform admins can view DR evidence"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'dr-evidence'
  AND public.is_platform_admin(auth.uid())
);

-- Platform super admins can upload DR evidence
CREATE POLICY "Platform super admins can upload DR evidence"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'dr-evidence'
  AND public.is_platform_super_admin(auth.uid())
);

-- Platform super admins can update DR evidence
CREATE POLICY "Platform super admins can update DR evidence"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'dr-evidence'
  AND public.is_platform_super_admin(auth.uid())
);

-- Platform super admins can delete DR evidence
CREATE POLICY "Platform super admins can delete DR evidence"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'dr-evidence'
  AND public.is_platform_super_admin(auth.uid())
);