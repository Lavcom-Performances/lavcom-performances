import React from 'react';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { toast } from 'sonner';

interface ProtectedActionProps {
  children: React.ReactNode;
  permission: keyof ReturnType<typeof useCurrentUserPermissions>['permissions'];
  fallback?: React.ReactNode;
  showToast?: boolean;
  toastMessage?: string;
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function ProtectedAction({ 
  children, 
  permission, 
  fallback = null,
  showToast = false,
  toastMessage = "Vous n'avez pas les permissions nécessaires pour cette action"
}: ProtectedActionProps) {
  const { permissions, isLoading } = useCurrentUserPermissions();

  if (isLoading) {
    return null;
  }

  const hasPermission = permissions[permission];

  if (!hasPermission) {
    if (showToast) {
      // Return a wrapper that shows toast on interaction
      return React.cloneElement(children as React.ReactElement, {
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          toast.error(toastMessage);
        },
        disabled: true,
        className: `${(children as React.ReactElement).props.className || ''} opacity-50 cursor-not-allowed`
      });
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook-based permission check for use in callbacks
 */
export function usePermissionCheck() {
  const { permissions, isLoading, isSuperAdmin, isAdmin, role } = useCurrentUserPermissions();

  const checkPermission = (
    permission: keyof typeof permissions,
    options?: { showToast?: boolean; toastMessage?: string }
  ): boolean => {
    if (isLoading) return false;
    
    const hasPermission = permissions[permission];
    
    if (!hasPermission && options?.showToast) {
      toast.error(options.toastMessage || "Vous n'avez pas les permissions nécessaires pour cette action");
    }
    
    return hasPermission;
  };

  const requirePermission = (
    permission: keyof typeof permissions,
    action: () => void | Promise<void>,
    options?: { showToast?: boolean; toastMessage?: string }
  ) => {
    return async () => {
      if (checkPermission(permission, { showToast: true, ...options })) {
        await action();
      }
    };
  };

  return {
    permissions,
    isLoading,
    isSuperAdmin,
    isAdmin,
    role,
    checkPermission,
    requirePermission,
  };
}
