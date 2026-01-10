-- Create table for trusted admin IPs
CREATE TABLE public.admin_trusted_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(ip_address)
);

-- Enable RLS
ALTER TABLE public.admin_trusted_ips ENABLE ROW LEVEL SECURITY;

-- Only platform super_admins can view and manage trusted IPs
CREATE POLICY "Platform super admins can view trusted IPs"
ON public.admin_trusted_ips
FOR SELECT
USING (is_platform_super_admin(auth.uid()));

CREATE POLICY "Platform super admins can manage trusted IPs"
ON public.admin_trusted_ips
FOR ALL
USING (is_platform_super_admin(auth.uid()));

-- Service role can read for edge functions
CREATE POLICY "Service role can read trusted IPs"
ON public.admin_trusted_ips
FOR SELECT
TO service_role
USING (true);

-- Add comment
COMMENT ON TABLE public.admin_trusted_ips IS 'Whitelist of trusted IP addresses for admin logins that never trigger suspicious alerts';