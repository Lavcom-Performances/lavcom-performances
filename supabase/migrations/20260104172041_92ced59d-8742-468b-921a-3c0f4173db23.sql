-- Add trial_used flag to subscriptions table to prevent re-trial abuse
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false;

-- Update existing trial subscriptions to mark trial as used
UPDATE public.subscriptions 
SET trial_used = true 
WHERE plan_type = 'trial' OR trial_start_date IS NOT NULL;