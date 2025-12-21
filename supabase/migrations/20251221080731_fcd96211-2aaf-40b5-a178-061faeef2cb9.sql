-- Create table for login logs
CREATE TABLE public.login_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT,
  ip_hash TEXT,
  is_new_device BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own login logs
CREATE POLICY "Users can view their own login logs"
ON public.login_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Allow inserts for authenticated users on their own records
CREATE POLICY "Users can insert their own login logs"
ON public.login_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_login_logs_user_id ON public.login_logs(user_id);
CREATE INDEX idx_login_logs_user_device ON public.login_logs(user_id, ip_hash, browser, os);