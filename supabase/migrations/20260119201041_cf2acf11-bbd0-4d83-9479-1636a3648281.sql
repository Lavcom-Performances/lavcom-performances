-- Enable realtime for audit_logs table to support live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;