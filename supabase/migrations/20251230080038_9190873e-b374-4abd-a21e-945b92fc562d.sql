-- Create table for expert requests
CREATE TABLE public.expert_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_type TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expert_requests ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage requests
CREATE POLICY "Service role can manage expert requests"
ON public.expert_requests
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_expert_requests_updated_at
BEFORE UPDATE ON public.expert_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();