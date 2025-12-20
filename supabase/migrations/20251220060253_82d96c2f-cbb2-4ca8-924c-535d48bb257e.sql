-- Create sites/laundromats table
CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create operations table for imported transactions
CREATE TABLE public.operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  operation_date DATE NOT NULL,
  operation_time TIME,
  amount NUMERIC(10, 2) NOT NULL,
  machine TEXT,
  program TEXT,
  payment_mode TEXT,
  raw_data JSONB,
  import_batch_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create import_batches table to track imports
CREATE TABLE public.import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  ignored_rows INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key from operations to import_batches
ALTER TABLE public.operations
ADD CONSTRAINT operations_import_batch_id_fkey
FOREIGN KEY (import_batch_id) REFERENCES public.import_batches(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_operations_user_id ON public.operations(user_id);
CREATE INDEX idx_operations_site_id ON public.operations(site_id);
CREATE INDEX idx_operations_date ON public.operations(operation_date);
CREATE INDEX idx_sites_user_id ON public.sites(user_id);

-- Enable RLS on all tables
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sites
CREATE POLICY "Users can view their own sites"
ON public.sites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sites"
ON public.sites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sites"
ON public.sites FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sites"
ON public.sites FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for operations
CREATE POLICY "Users can view their own operations"
ON public.operations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own operations"
ON public.operations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own operations"
ON public.operations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own operations"
ON public.operations FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for import_batches
CREATE POLICY "Users can view their own import batches"
ON public.import_batches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own import batches"
ON public.import_batches FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at on sites
CREATE TRIGGER update_sites_updated_at
BEFORE UPDATE ON public.sites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();