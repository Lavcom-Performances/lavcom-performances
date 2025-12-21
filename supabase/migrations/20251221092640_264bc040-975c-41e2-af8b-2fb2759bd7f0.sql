-- Add configurable log retention to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS log_retention_days integer NOT NULL DEFAULT 90;

-- Add check constraint for reasonable values (7-365 days)
ALTER TABLE public.profiles 
ADD CONSTRAINT log_retention_days_range CHECK (log_retention_days >= 7 AND log_retention_days <= 365);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.log_retention_days IS 'Number of days to retain login logs (7-365)';