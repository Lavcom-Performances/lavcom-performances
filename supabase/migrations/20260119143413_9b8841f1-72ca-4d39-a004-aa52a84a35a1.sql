-- Create file_metadata table for tracking uploaded files
CREATE TABLE public.file_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  shared_with UUID[] DEFAULT '{}',
  share_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, file_path)
);

-- Enable Row Level Security
ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own file metadata"
ON public.file_metadata
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = ANY(shared_with) OR is_public = true);

CREATE POLICY "Users can create their own file metadata"
ON public.file_metadata
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own file metadata"
ON public.file_metadata
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own file metadata"
ON public.file_metadata
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_file_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_file_metadata_updated_at
BEFORE UPDATE ON public.file_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_file_metadata_updated_at();

-- Create index for faster queries
CREATE INDEX idx_file_metadata_user_id ON public.file_metadata(user_id);
CREATE INDEX idx_file_metadata_tags ON public.file_metadata USING GIN(tags);
CREATE INDEX idx_file_metadata_shared_with ON public.file_metadata USING GIN(shared_with);