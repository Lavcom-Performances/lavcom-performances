-- TAEX-210: AI Usage Daily Table for quota management
-- Tracks daily AI usage per user for cost control and abuse prevention

CREATE TABLE public.ai_usage_daily (
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  actor_id UUID NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  tokens_in BIGINT NOT NULL DEFAULT 0,
  tokens_out BIGINT NOT NULL DEFAULT 0,
  estimated_cost_eur NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (date, actor_id)
);

-- Enable Row Level Security
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own AI usage"
ON public.ai_usage_daily
FOR SELECT
USING (auth.uid() = actor_id);

-- Platform admins can view all usage
CREATE POLICY "Platform admins can view all AI usage"
ON public.ai_usage_daily
FOR SELECT
USING (is_platform_admin(auth.uid()) OR is_platform_super_admin(auth.uid()));

-- Service role can manage all usage (for edge functions)
CREATE POLICY "Service role can manage AI usage"
ON public.ai_usage_daily
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_ai_usage_daily_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_usage_daily_updated_at
BEFORE UPDATE ON public.ai_usage_daily
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_usage_daily_updated_at();

-- Create indexes for faster queries
CREATE INDEX idx_ai_usage_daily_actor_id ON public.ai_usage_daily(actor_id);
CREATE INDEX idx_ai_usage_daily_date ON public.ai_usage_daily(date DESC);

-- Function to atomically increment AI usage and check limits
-- Returns: { allowed: boolean, current_count: number, current_cost: number, reason?: string }
CREATE OR REPLACE FUNCTION public.rpc_increment_ai_usage(
  p_actor_id UUID,
  p_tokens_in BIGINT DEFAULT 0,
  p_tokens_out BIGINT DEFAULT 0,
  p_estimated_cost NUMERIC DEFAULT 0,
  p_daily_request_limit INTEGER DEFAULT 200,
  p_daily_cost_limit NUMERIC DEFAULT 5.0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_current_count INTEGER;
  v_current_cost NUMERIC;
  v_result JSONB;
BEGIN
  -- Upsert usage record atomically
  INSERT INTO ai_usage_daily (date, actor_id, request_count, tokens_in, tokens_out, estimated_cost_eur)
  VALUES (v_today, p_actor_id, 1, p_tokens_in, p_tokens_out, p_estimated_cost)
  ON CONFLICT (date, actor_id) DO UPDATE SET
    request_count = ai_usage_daily.request_count + 1,
    tokens_in = ai_usage_daily.tokens_in + EXCLUDED.tokens_in,
    tokens_out = ai_usage_daily.tokens_out + EXCLUDED.tokens_out,
    estimated_cost_eur = ai_usage_daily.estimated_cost_eur + EXCLUDED.estimated_cost_eur,
    updated_at = now()
  RETURNING request_count, estimated_cost_eur INTO v_current_count, v_current_cost;

  -- Check if limits exceeded (after increment)
  IF v_current_count > p_daily_request_limit THEN
    -- Rollback the increment
    UPDATE ai_usage_daily 
    SET request_count = request_count - 1,
        tokens_in = tokens_in - p_tokens_in,
        tokens_out = tokens_out - p_tokens_out,
        estimated_cost_eur = estimated_cost_eur - p_estimated_cost
    WHERE date = v_today AND actor_id = p_actor_id;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_current_count - 1,
      'current_cost', v_current_cost - p_estimated_cost,
      'reason', 'daily_request_limit_exceeded'
    );
  END IF;

  IF v_current_cost > p_daily_cost_limit THEN
    -- Rollback the increment
    UPDATE ai_usage_daily 
    SET request_count = request_count - 1,
        tokens_in = tokens_in - p_tokens_in,
        tokens_out = tokens_out - p_tokens_out,
        estimated_cost_eur = estimated_cost_eur - p_estimated_cost
    WHERE date = v_today AND actor_id = p_actor_id;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_current_count - 1,
      'current_cost', v_current_cost - p_estimated_cost,
      'reason', 'daily_cost_limit_exceeded'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_current_count,
    'current_cost', v_current_cost,
    'reason', null
  );
END;
$$;

-- Function to get user's current daily usage
CREATE OR REPLACE FUNCTION public.rpc_get_ai_usage_today(p_actor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT request_count, tokens_in, tokens_out, estimated_cost_eur
  INTO v_result
  FROM ai_usage_daily
  WHERE date = CURRENT_DATE AND actor_id = p_actor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'request_count', 0,
      'tokens_in', 0,
      'tokens_out', 0,
      'estimated_cost_eur', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'request_count', v_result.request_count,
    'tokens_in', v_result.tokens_in,
    'tokens_out', v_result.tokens_out,
    'estimated_cost_eur', v_result.estimated_cost_eur
  );
END;
$$;