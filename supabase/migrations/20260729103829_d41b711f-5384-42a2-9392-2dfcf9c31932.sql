
DROP POLICY IF EXISTS "Super admins can view backup files" ON public.backup_files;
CREATE POLICY "Super admins can view backup files"
ON public.backup_files FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));
