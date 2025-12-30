-- Create cron_logs table for tracking cron job executions
CREATE TABLE public.cron_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running',
  sites_processed INTEGER DEFAULT 0,
  sites_failed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage cron logs
CREATE POLICY "Service role can manage cron logs"
ON public.cron_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Add index for querying by job name and date
CREATE INDEX idx_cron_logs_job_name ON public.cron_logs(job_name);
CREATE INDEX idx_cron_logs_started_at ON public.cron_logs(started_at DESC);

-- Auto-cleanup old logs (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_cron_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.cron_logs 
  WHERE started_at < now() - interval '30 days';
END;
$$;