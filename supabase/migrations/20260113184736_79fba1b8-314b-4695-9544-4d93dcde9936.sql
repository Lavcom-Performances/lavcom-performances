-- Step 1: Add new enum value 'company_admin' to app_role
-- This must be committed BEFORE it can be used
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company_admin';