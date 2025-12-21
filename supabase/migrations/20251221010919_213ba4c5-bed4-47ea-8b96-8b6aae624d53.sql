-- Create rate_limits table for tracking request rates
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope text NOT NULL,
  identifier text NOT NULL,
  ip_hash text,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_rate_limits_scope_identifier ON public.rate_limits (scope, identifier);
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits (window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (edge functions use service role)
CREATE POLICY "Service role full access" 
ON public.rate_limits 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to clean old rate limit entries (older than 24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '24 hours';
END;
$$;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_rate_limits_updated_at
BEFORE UPDATE ON public.rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();