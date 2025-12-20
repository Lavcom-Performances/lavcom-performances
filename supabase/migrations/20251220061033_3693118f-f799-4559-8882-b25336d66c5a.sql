-- Drop existing foreign key constraint
ALTER TABLE public.operations
DROP CONSTRAINT IF EXISTS operations_import_batch_id_fkey;

-- Re-add with CASCADE delete
ALTER TABLE public.operations
ADD CONSTRAINT operations_import_batch_id_fkey
FOREIGN KEY (import_batch_id) REFERENCES public.import_batches(id) ON DELETE CASCADE;

-- Add RLS policy for deleting import batches
CREATE POLICY "Users can delete their own import batches"
ON public.import_batches FOR DELETE
USING (auth.uid() = user_id);