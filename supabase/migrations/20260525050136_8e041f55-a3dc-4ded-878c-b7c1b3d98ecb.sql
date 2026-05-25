CREATE TABLE IF NOT EXISTS public.simulator_lead_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sim_lead_rl_ip_time
  ON public.simulator_lead_rate_limits (ip_hash, created_at DESC);

ALTER TABLE public.simulator_lead_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies = no client access. Only service role (edge function) can read/write.
