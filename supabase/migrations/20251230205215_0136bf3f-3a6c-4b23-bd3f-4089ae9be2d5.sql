-- Add missing columns to subscriptions table for Stripe integration
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS last_invoice_url text,
ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
ON public.subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
ON public.subscriptions(stripe_customer_id);

-- Create stripe_events table for webhook idempotence
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone DEFAULT now(),
  payload jsonb
);

-- RLS for stripe_events (service role only)
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage stripe events"
  ON public.stripe_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.stripe_events IS 'Tracks processed Stripe webhook events for idempotence';