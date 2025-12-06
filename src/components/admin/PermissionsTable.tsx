import { useState } from "react";
import { Check, X, Info } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  UserWithPermissions,
  AVAILABLE_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  canManageRole,
  UserRole,
} from "@/types/permissions";

interface PermissionsTableProps {
  users: UserWithPermissions[];
  currentUserRole: UserRole;
  onPermissionChange?: (userId: string, permissionId: string, value: boolean) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  dashboard: { label: 'Tableau de bord', color: 'bg-blue-100 text-blue-800' },
  operations: { label: 'Opérations', color: 'bg-green-100 text-green-800' },
  charts: { label: 'Graphiques', color: 'bg-purple-100 text-purple-800' },
  settings: { label: 'Paramètres', color: 'bg-orange-100 text-orange-800' },
  admin: { label: 'Administration', color: 'bg-red-100 text-red-800' },
};

export function PermissionsTable({ users, currentUserRole, onPermissionChange }: PermissionsTableProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const getUserPermission = (user: UserWithPermissions, permissionId: string): boolean => {
    // Custom permissions override default
    if (user.customPermissions && permissionId in user.customPermissions) {
      return user.customPermissions[permissionId];
    }
    // Default to role permissions
    return DEFAULT_ROLE_PERMISSIONS[user.role].includes(permissionId);
  };

  const canEditUser = (user: UserWithPermissions): boolean => {
    return canManageRole(currentUserRole, user.role);
  };

  // Group permissions by category
  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[200px]">
              Permission
            </TableHead>
            {users.map((user) => (
              <TableHead key={user.id} className="text-center min-w-[120px]">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-medium text-xs truncate max-w-[100px]">
                    {user.fullName.split(' ')[0]}
                  </span>
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-1.5 py-0"
                    style={{ 
                      borderColor: ROLE_DESCRIPTIONS[user.role].color,
                      color: ROLE_DESCRIPTIONS[user.role].color 
                    }}
                  >
                    {ROLE_DESCRIPTIONS[user.role].label}
                  </Badge>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedPermissions).map(([category, permissions]) => (
            <>
              {/* Category header row */}
              <TableRow key={`category-${category}`} className="bg-muted/30">
                <TableCell 
                  colSpan={users.length + 1} 
                  className="sticky left-0 bg-muted/30 z-10"
                >
                  <span className={cn(
                    "inline-flex px-2 py-0.5 rounded text-xs font-semibold",
                    CATEGORY_LABELS[category]?.color
                  )}>
                    {CATEGORY_LABELS[category]?.label || category}
                  </span>
                </TableCell>
              </TableRow>
              
              {/* Permission rows */}
              {permissions.map((permission) => (
                <TableRow key={permission.id} className="hover:bg-muted/20">
                  <TableCell className="sticky left-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{permission.name}</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{permission.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                  
                  {users.map((user) => {
                    const hasPermission = getUserPermission(user, permission.id);
                    const canEdit = canEditUser(user);
                    const cellId = `${user.id}-${permission.id}`;
                    
                    return (
                      <TableCell 
                        key={cellId}
                        className={cn(
                          "text-center transition-colors",
                          hoveredCell === cellId && canEdit && "bg-muted/40"
                        )}
                        onMouseEnter={() => setHoveredCell(cellId)}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {canEdit && onPermissionChange ? (
                          <div className="flex justify-center">
                            <Switch
                              checked={hasPermission}
                              onCheckedChange={(checked) => 
                                onPermissionChange(user.id, permission.id, checked)
                              }
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            {hasPermission ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Check className="h-4 w-4 text-emerald-600" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                <X className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
