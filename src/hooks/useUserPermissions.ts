import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAuditLog } from './useAuditLog';

export interface UserPermissions {
  id: string;
  user_id: string;
  organization_id: string;
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
  created_at: string;
  updated_at: string;
}

export type PermissionKey = keyof Omit<UserPermissions, 'id' | 'user_id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useUserPermissions(organizationId: string | null) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Map<string, UserPermissions>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const { logInsert, logUpdate, logDelete } = useAuditLog('user_permissions', { source: 'useUserPermissions' });

  const fetchPermissions = useCallback(async () => {
    if (!organizationId || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Error fetching permissions:', error);
        return;
      }

      const permMap = new Map<string, UserPermissions>();
      (data || []).forEach((p: UserPermissions) => {
        permMap.set(p.user_id, p);
      });
      setPermissions(permMap);
    } catch (error) {
      console.error('Error in fetchPermissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const getUserPermissions = useCallback((userId: string): UserPermissions | null => {
    return permissions.get(userId) || null;
  }, [permissions]);

  const updatePermission = async (
    userId: string,
    permission: PermissionKey,
    value: boolean
  ): Promise<{ success?: boolean; error?: string }> => {
    if (!organizationId) return { error: 'Aucune organisation' };

    try {
      // Check if permissions exist for this user
      const existingPerms = permissions.get(userId);

      if (existingPerms) {
        const oldValue = existingPerms[permission];
        
        // Update existing permissions
        const { error } = await supabase
          .from('user_permissions')
          .update({ [permission]: value })
          .eq('id', existingPerms.id);

        if (error) throw error;

        // Log the permission update
        logUpdate(existingPerms.id, {
          target_user_id: userId,
          organization_id: organizationId,
          permission_changed: permission,
          old_value: oldValue,
          new_value: value,
        });

        // Update local state
        setPermissions(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, { ...existingPerms, [permission]: value });
          return newMap;
        });
      } else {
        // Create new permissions record
        const { data, error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            organization_id: organizationId,
            [permission]: value
          })
          .select()
          .single();

        if (error) throw error;

        // Log the permission creation
        logInsert(data.id, {
          target_user_id: userId,
          organization_id: organizationId,
          initial_permission: permission,
          initial_value: value,
        });

        // Update local state
        setPermissions(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, data as UserPermissions);
          return newMap;
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating permission:', error);
      return { error: error.message || 'Erreur lors de la mise à jour' };
    }
  };

  const setUserPermissions = async (
    userId: string,
    perms: Partial<Record<PermissionKey, boolean>>
  ): Promise<{ success?: boolean; error?: string }> => {
    if (!organizationId) return { error: 'Aucune organisation' };

    try {
      const existingPerms = permissions.get(userId);

      if (existingPerms) {
        // Capture old values for audit
        const oldValues: Partial<Record<PermissionKey, boolean>> = {};
        Object.keys(perms).forEach((key) => {
          oldValues[key as PermissionKey] = existingPerms[key as PermissionKey];
        });

        const { error } = await supabase
          .from('user_permissions')
          .update(perms)
          .eq('id', existingPerms.id);

        if (error) throw error;

        // Log the bulk permission update
        logUpdate(existingPerms.id, {
          target_user_id: userId,
          organization_id: organizationId,
          permissions_changed: Object.keys(perms),
          old_values: oldValues,
          new_values: perms,
        });

        setPermissions(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, { ...existingPerms, ...perms } as UserPermissions);
          return newMap;
        });
      } else {
        const { data, error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            organization_id: organizationId,
            ...perms
          })
          .select()
          .single();

        if (error) throw error;

        // Log the permission creation
        logInsert(data.id, {
          target_user_id: userId,
          organization_id: organizationId,
          initial_permissions: perms,
        });

        setPermissions(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, data as UserPermissions);
          return newMap;
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error setting permissions:', error);
      return { error: error.message || 'Erreur lors de la mise à jour' };
    }
  };

  const deleteUserPermissions = async (userId: string): Promise<{ success?: boolean; error?: string }> => {
    if (!organizationId) return { error: 'Aucune organisation' };

    try {
      const existingPerms = permissions.get(userId);

      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      // Log the permission deletion
      if (existingPerms) {
        logDelete(existingPerms.id, {
          target_user_id: userId,
          organization_id: organizationId,
          deleted_permissions: existingPerms,
        });
      }

      setPermissions(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting permissions:', error);
      return { error: error.message || 'Erreur lors de la suppression' };
    }
  };

  return {
    permissions,
    isLoading,
    getUserPermissions,
    updatePermission,
    setUserPermissions,
    deleteUserPermissions,
    refresh: fetchPermissions
  };
}
