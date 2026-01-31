-- TAEX-234: Add notify_new_device_login column to notification_preferences
-- Default to TRUE for new-device login alerts

ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS notify_new_device_login boolean NOT NULL DEFAULT true;