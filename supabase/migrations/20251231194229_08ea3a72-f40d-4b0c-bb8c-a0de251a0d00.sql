-- Table system_events pour centraliser les logs d'observabilité
CREATE TABLE IF NOT EXISTS public.system_events (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  env text NOT NULL DEFAULT 'prod',
  source text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warn','error','critical')),
  code text,
  message text NOT NULL,
  meta jsonb
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_source ON public.system_events(source);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON public.system_events(severity);

-- RLS
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- Lecture réservée aux admins
CREATE POLICY "Admins can view system events"
ON public.system_events FOR SELECT
USING (public.is_admin());

-- Pas d'insert depuis le client
CREATE POLICY "No client insert on system events"
ON public.system_events FOR INSERT
WITH CHECK (false);

-- Fonction SECURITY DEFINER pour écrire depuis edge functions
CREATE OR REPLACE FUNCTION public.rpc_log_system_event(
  p_env text,
  p_source text,
  p_severity text,
  p_code text,
  p_message text,
  p_meta jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.system_events(env, source, severity, code, message, meta)
  VALUES (COALESCE(p_env, 'prod'), p_source, p_severity, p_code, p_message, p_meta);
END;
$$;