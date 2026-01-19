-- Create a function to notify on critical audit log inserts
-- This uses pg_net to call the edge function asynchronously
CREATE OR REPLACE FUNCTION public.notify_critical_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  critical_actions TEXT[] := ARRAY['DELETE', 'permission_updated', 'role_changed', 'permissions_reset', 'all_permissions_granted', 'all_permissions_revoked', 'member_removed'];
  critical_tables TEXT[] := ARRAY['user_permissions', 'user_roles', 'organizations', 'sites', 'subscriptions'];
  is_critical BOOLEAN := FALSE;
  edge_function_url TEXT;
  anon_key TEXT;
BEGIN
  -- Check if this is a critical action
  IF NEW.action = ANY(critical_actions) THEN
    is_critical := TRUE;
  ELSIF NEW.action = 'DELETE' AND NEW.target_table = ANY(critical_tables) THEN
    is_critical := TRUE;
  END IF;

  -- Only proceed if critical
  IF NOT is_critical THEN
    RETURN NEW;
  END IF;

  -- Get edge function URL from vault or construct it
  edge_function_url := 'https://betvwipgtcrhmludzgxw.supabase.co/functions/v1/send-audit-alert';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldHZ3aXBndGNyaG1sdWR6Z3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODgzMTEsImV4cCI6MjA4MDc2NDMxMX0.Y9aBXfBFv2-G9d8sg7_CRMkQIQ-OhmFOIixvWpdyrho';

  -- Call edge function asynchronously via pg_net
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'logId', NEW.id,
      'actorId', NEW.actor_id,
      'action', NEW.action,
      'targetTable', NEW.target_table,
      'targetId', NEW.target_id,
      'metadata', NEW.metadata
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'notify_critical_audit_log failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on audit_logs table
DROP TRIGGER IF EXISTS trigger_notify_critical_audit_log ON public.audit_logs;
CREATE TRIGGER trigger_notify_critical_audit_log
  AFTER INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_critical_audit_log();