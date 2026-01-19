-- Create a private storage bucket for secure file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'secure-files',
  'secure-files',
  false,
  10485760, -- 10MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for secure-files bucket
-- Users can only upload to their own folder (user_id/*)
CREATE POLICY "Users can upload files to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'secure-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only view their own files
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'secure-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only update their own files
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'secure-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'secure-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Platform admins can view all files
CREATE POLICY "Admins can view all files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'secure-files' 
  AND public.is_platform_admin(auth.uid())
);