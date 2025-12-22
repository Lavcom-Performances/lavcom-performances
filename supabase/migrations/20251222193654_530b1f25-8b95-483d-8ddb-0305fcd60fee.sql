-- Add columns to contact_messages for deduplication and spam tracking
ALTER TABLE public.contact_messages 
ADD COLUMN IF NOT EXISTS message_hash text,
ADD COLUMN IF NOT EXISTS duplicate_ignored boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS honeypot_triggered boolean DEFAULT false;

-- Create index for deduplication lookup (email + message_hash within time window)
CREATE INDEX IF NOT EXISTS idx_contact_messages_dedup 
ON public.contact_messages (email, message_hash, created_at DESC);

-- Update ip column comment (never stored in clear, always hashed)
COMMENT ON COLUMN public.contact_messages.ip IS 'Hashed IP address for rate limiting, never stored in clear';

-- Add contact rate limits to the shared rate_limits config
-- (handled in edge function, no DB changes needed for that)