-- Create table for blocked admin users
CREATE TABLE public.admin_blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  reason TEXT NOT NULL DEFAULT 'Multiple suspicious logins detected',
  suspicious_count INTEGER NOT NULL DEFAULT 0,
  blocked_by UUID,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index
CREATE INDEX idx_admin_blocked_users_user_id ON public.admin_blocked_users(user_id);
CREATE INDEX idx_admin_blocked_users_blocked_at ON public.admin_blocked_users(blocked_at DESC);

-- Enable RLS
ALTER TABLE public.admin_blocked_users ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view blocked users
CREATE POLICY "Platform admins can view blocked users"
  ON public.admin_blocked_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_roles
      WHERE platform_roles.user_id = auth.uid()
      AND platform_roles.role IN ('super_admin', 'admin')
    )
  );

-- Only super_admins can insert/update/delete
CREATE POLICY "Super admins can manage blocked users"
  ON public.admin_blocked_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_roles
      WHERE platform_roles.user_id = auth.uid()
      AND platform_roles.role = 'super_admin'
    )
  );

-- Service role can insert (for auto-blocking from edge function)
CREATE POLICY "Service role can insert blocked users"
  ON public.admin_blocked_users
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for admin_login_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_login_history;