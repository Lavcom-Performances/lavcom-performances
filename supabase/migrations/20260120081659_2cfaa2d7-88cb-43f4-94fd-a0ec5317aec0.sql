-- TAEX-214: Privacy & Data Access Controls for Archived Audit Logs

-- 1. Add sha256 checksum column for tamper evidence
ALTER TABLE public.audit_log_archives 
ADD COLUMN IF NOT EXISTS sha256_checksum TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.audit_log_archives.sha256_checksum IS 'SHA256 hash of the archive file for tamper evidence';

-- 2. Drop existing permissive policy for users viewing their own archives
DROP POLICY IF EXISTS "Users can view their own audit archives" ON storage.objects;

-- 3. Create stricter policies for audit-archives bucket

-- Platform admins can read all platform archives (prefix: platform/)
CREATE POLICY "Platform admins can view platform archives"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audit-archives' 
  AND (storage.foldername(name))[1] = 'platform'
  AND public.is_platform_admin(auth.uid())
);

-- Users can only view their own user-scoped archives (prefix: user/{user_id}/)
CREATE POLICY "Users can view own archives"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audit-archives' 
  AND (storage.foldername(name))[1] = 'user'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Organization members can view org archives (prefix: org/{org_id}/)
-- Only if they belong to that organization
CREATE POLICY "Org members can view org archives"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audit-archives' 
  AND (storage.foldername(name))[1] = 'org'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = (storage.foldername(name))[2]::uuid
  )
);

-- Service role retains full access for writing/deleting
-- (existing policy "Service role can manage audit archives" already covers this)