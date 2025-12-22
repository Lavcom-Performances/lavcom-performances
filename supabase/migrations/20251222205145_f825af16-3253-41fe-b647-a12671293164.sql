-- Add column to track if trial reminder was sent
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS trial_reminder_sent boolean DEFAULT false;