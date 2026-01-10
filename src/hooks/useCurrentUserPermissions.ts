import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import { useSites } from './useSites';

export interface CurrentUserPermissions {
  can_view_sites: boolean;
  can_edit_sites: boolean;
  can_delete_sites: boolean;
  can_import_data: boolean;
  can_export_data: boolean;
  can_delete_data: boolean;
  can_view_reports: boolean;
  can_export_reports: boolean;
  can_invite_members: boolean;
  can_manage_roles: boolean;
  can_view_billing: boolean;
  can_manage_billing: boolean;
}

// Default permissions by role
const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, CurrentUserPermissions> = {
  super_admin: {
    can_view_sites: true,
    can_edit_sites: true,
    can_delete_sites: true,
    can_import_data: true,
    can_export_data: true,
    can_delete_data: true,
    can_view_reports: true,
    can_export_reports: true,
    can_invite_members: true,
    can_manage_roles: true,
    can_view_billing: true,
    can_manage_billing: true,
  },
  admin: {
    can_view_sites: true,
    can_edit_sites: true,
    can_delete_sites: true,
    can_import_data: true,
    can_export_data: true,
    can_delete_data: true,
    can_view_reports: true,
    can_export_reports: true,
    can_invite_members: true,
    can_manage_roles: false,
    can_view_billing: true,
    can_manage_billing: false,
  },
  checker: {
    can_view_sites: true,
    can_edit_sites: true,
    can_delete_sites: false,
    can_import_data: true,
    can_export_data: true,
    can_delete_data: false,
    can_view_reports: true,
    can_export_reports: true,
    can_invite_members: false,
    can_manage_roles: false,
    can_view_billing: false,
    can_manage_billing: false,
  },
  user: {
    can_view_sites: true,
    can_edit_sites: false,
    can_delete_sites: false,
    can_import_data: false,
    can_export_data: false,
    can_delete_data: false,
    can_view_reports: true,
    can_export_reports: false,
    can_invite_members: false,
    can_manage_roles: false,
    can_view_billing: false,
    can_manage_billing: false,
  },
  guest: {
    can_view_sites: true,
    can_edit_sites: false,
    can_delete_sites: false,
    can_import_data: false,
    can_export_data: false,
    can_delete_data: false,
    can_view_reports: true,
    can_export_reports: false,
    can_invite_members: false,
    can_manage_roles: false,
    can_view_billing: false,
    can_manage_billing: false,
  },
  // Special case: site owner without organization
  owner: {
    can_view_sites: true,
    can_edit_sites: true,
    can_delete_sites: true,
    can_import_data: true,
    can_export_data: true,
    can_delete_data: true,
    can_view_reports: true,
    can_export_reports: true,
    can_invite_members: false,
    can_manage_roles: false,
    can_view_billing: true,
    can_manage_billing: true,
  },
};

export function useCurrentUserPermissions() {
  const { user } = useAuth();
  const { userRole, organization, isLoading: orgLoading } = useOrganization();
  const { sites, isLoading: sitesLoading } = useSites();
  const [customPermissions, setCustomPermissions] = useState<Partial<CurrentUserPermissions> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user owns sites (useSites already filters by user_id)
  // If user has sites returned, they are the owner of those sites
  const isSiteOwner = useMemo(() => {
    if (!user || sitesLoading) return false;
    return sites.length > 0;
  }, [user, sites, sitesLoading]);

  // Fetch custom permissions for current user
  const fetchCustomPermissions = useCallback(async () => {
    if (!user || !organization) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching custom permissions:', error);
      } else if (data) {
        setCustomPermissions({
          can_view_sites: data.can_view_sites,
          can_edit_sites: data.can_edit_sites,
          can_delete_sites: data.can_delete_sites,
          can_import_data: data.can_import_data,
          can_export_data: data.can_export_data,
          can_delete_data: data.can_delete_data,
          can_view_reports: data.can_view_reports,
          can_export_reports: data.can_export_reports,
          can_invite_members: data.can_invite_members,
          can_manage_roles: data.can_manage_roles,
          can_view_billing: data.can_view_billing,
          can_manage_billing: data.can_manage_billing,
        });
      } else {
        setCustomPermissions(null);
      }
    } catch (error) {
      console.error('Error in fetchCustomPermissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, organization]);

  useEffect(() => {
    fetchCustomPermissions();
  }, [fetchCustomPermissions]);

  // Calculate effective permissions
  const permissions = useMemo((): CurrentUserPermissions => {
    // If user has no organization role but owns sites, grant owner permissions
    // This handles the case of first-time users who created sites before organizations
    if (!userRole && isSiteOwner) {
      return DEFAULT_PERMISSIONS_BY_ROLE.owner;
    }

    const role = userRole?.role || 'guest';
    const defaultPerms = DEFAULT_PERMISSIONS_BY_ROLE[role] || DEFAULT_PERMISSIONS_BY_ROLE.guest;

    // Super admins always have all permissions
    if (role === 'super_admin') {
      return DEFAULT_PERMISSIONS_BY_ROLE.super_admin;
    }

    // For other roles, merge with custom permissions (custom takes precedence)
    if (customPermissions) {
      return {
        ...defaultPerms,
        ...customPermissions,
      };
    }

    return defaultPerms;
  }, [userRole, customPermissions, isSiteOwner]);

  // Helper functions for common permission checks
  const canImport = useMemo(() => permissions.can_import_data, [permissions]);
  const canExport = useMemo(() => permissions.can_export_data, [permissions]);
  const canDelete = useMemo(() => permissions.can_delete_data, [permissions]);
  const canManageTeam = useMemo(() => permissions.can_invite_members || permissions.can_manage_roles, [permissions]);
  const canManageRoles = useMemo(() => permissions.can_manage_roles, [permissions]);
  const isSuperAdmin = useMemo(() => userRole?.role === 'super_admin', [userRole]);
  const isAdmin = useMemo(() => userRole?.role === 'super_admin' || userRole?.role === 'admin', [userRole]);

  return {
    permissions,
    customPermissions,
    isLoading,
    canImport,
    canExport,
    canDelete,
    canManageTeam,
    canManageRoles,
    isSuperAdmin,
    isAdmin,
    role: userRole?.role || 'guest',
    refresh: fetchCustomPermissions,
  };
}
