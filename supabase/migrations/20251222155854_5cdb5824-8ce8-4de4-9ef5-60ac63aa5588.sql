-- Create contact_messages table
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  ip TEXT,
  user_agent TEXT
);

-- Enable RLS but create NO policies (client access forbidden)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (no policies = no client access)
COMMENT ON TABLE public.contact_messages IS 'Contact form messages - accessible only via service role';