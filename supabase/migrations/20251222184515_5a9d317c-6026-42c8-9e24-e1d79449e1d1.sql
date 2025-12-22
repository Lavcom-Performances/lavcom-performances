
-- Add RLS policies for contact_messages table
-- This table stores public contact form submissions
-- Service role needs full access for the edge function to insert
-- No user access needed (admin-only via service role)

-- Policy for service role to insert new contact messages (from edge function)
CREATE POLICY "Service role can insert contact messages"
ON public.contact_messages
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy for service role to view all contact messages (for admin purposes)
CREATE POLICY "Service role can view contact messages"
ON public.contact_messages
FOR SELECT
TO service_role
USING (true);

-- Policy for service role to update contact messages (status changes)
CREATE POLICY "Service role can update contact messages"
ON public.contact_messages
FOR UPDATE
TO service_role
USING (true);

-- Policy for service role to delete contact messages
CREATE POLICY "Service role can delete contact messages"
ON public.contact_messages
FOR DELETE
TO service_role
USING (true);
