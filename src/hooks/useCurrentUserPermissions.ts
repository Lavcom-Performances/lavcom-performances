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
// NOTE: 'admin' is DEPRECATED - use 'company_admin' for new code
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
  company_admin: {
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
  // Legacy 'admin' role - DEPRECATED, kept for backwards compatibility
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
    can_import_data: true,
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
    can_import_data: true,
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
  const [isLoadingCustom, setIsLoadingCustom] = useState(true);

  // Check if user owns sites (useSites already filters by user_id)
  // If user has sites returned, they are the owner of those sites
  const isSiteOwner = useMemo(() => {
    if (!user || sitesLoading) return false;
    return sites.length > 0;
  }, [user, sites, sitesLoading]);

  // Fetch custom permissions for current user
  const fetchCustomPermissions = useCallback(async () => {
    if (!user || !organization) {
      setIsLoadingCustom(false);
      return;
    }

    setIsLoadingCustom(true);
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
      setIsLoadingCustom(false);
    }
  }, [user, organization]);

  useEffect(() => {
    fetchCustomPermissions();
  }, [fetchCustomPermissions]);

  // Overall loading state - wait for all data before calculating permissions
  const isLoading = orgLoading || sitesLoading || isLoadingCustom;

  // Calculate effective permissions
  const permissions = useMemo((): CurrentUserPermissions => {
    // While still loading, return minimal permissions to prevent flickering
    // but allow viewing (prevents blank screens)
    if (isLoading) {
      console.log('[Permissions Debug] Still loading, returning view-only permissions');
      return {
        ...DEFAULT_PERMISSIONS_BY_ROLE.guest,
        can_view_sites: true,
        can_view_reports: true,
        can_import_data: true,
      };
    }

    // Debug logging
    console.log('[Permissions Debug]', {
      userRole: userRole?.role,
      isSiteOwner,
      orgLoading,
      sitesLoading,
      hasOrganization: !!organization,
      sitesCount: sites.length,
    });

    // Super admins always have all permissions (check first)
    if (userRole?.role === 'super_admin') {
      console.log('[Permissions Debug] Granting super_admin permissions');
      return DEFAULT_PERMISSIONS_BY_ROLE.super_admin;
    }

    // If user has any role in an organization, use that role's permissions
    if (userRole?.role) {
      const role = userRole.role;
      const defaultPerms = DEFAULT_PERMISSIONS_BY_ROLE[role] || DEFAULT_PERMISSIONS_BY_ROLE.guest;
      console.log('[Permissions Debug] Using role permissions:', role);
      
      // Merge with custom permissions if any
      if (customPermissions) {
        return {
          ...defaultPerms,
          ...customPermissions,
        };
      }
      return defaultPerms;
    }

    // If user has no organization role but owns sites, grant owner permissions
    // This handles the case of first-time users who created sites before organizations
    if (isSiteOwner) {
      console.log('[Permissions Debug] Granting owner permissions (no org role but owns sites)');
      return DEFAULT_PERMISSIONS_BY_ROLE.owner;
    }

    // No role and no sites - guest permissions
    console.log('[Permissions Debug] No role, no sites - guest permissions');
    return DEFAULT_PERMISSIONS_BY_ROLE.guest;
  }, [userRole, customPermissions, isSiteOwner, organization, isLoading, sites.length, orgLoading, sitesLoading]);

  // Helper functions for common permission checks
  const canImport = useMemo(() => permissions.can_import_data, [permissions]);
  const canExport = useMemo(() => permissions.can_export_data, [permissions]);
  const canDelete = useMemo(() => permissions.can_delete_data, [permissions]);
  const canManageTeam = useMemo(() => permissions.can_invite_members || permissions.can_manage_roles, [permissions]);
  const canManageRoles = useMemo(() => permissions.can_manage_roles, [permissions]);
  const isSuperAdmin = useMemo(() => userRole?.role === 'super_admin', [userRole]);
  const isCompanyAdmin = useMemo(() => userRole?.role === 'super_admin' || userRole?.role === 'company_admin' || userRole?.role === 'admin', [userRole]);
  const isAdmin = isCompanyAdmin; // Alias for backwards compatibility

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
    isCompanyAdmin,
    isAdmin,
    role: userRole?.role || 'guest',
    refresh: fetchCustomPermissions,
  };
}
