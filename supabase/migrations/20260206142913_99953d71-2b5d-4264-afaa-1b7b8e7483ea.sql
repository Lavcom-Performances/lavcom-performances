-- Create storage bucket for financial exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('fin-exports', 'fin-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read their own exports
CREATE POLICY "Users can read their own exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'fin-exports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to insert their own exports
CREATE POLICY "Users can upload their own exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fin-exports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);