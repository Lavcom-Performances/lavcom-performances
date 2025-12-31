import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Shield,
  Users,
  History,
  ChevronDown,
  ChevronRight,
  Lock,
  Check,
  X,
  AlertTriangle,
  Settings2,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  UserPlus,
  CreditCard,
  FileText,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCurrentUserPermissions } from "@/hooks/useCurrentUserPermissions";
import { useOrganization, TeamMember } from "@/hooks/useOrganization";
import { useUserPermissions, PermissionKey } from "@/hooks/useUserPermissions";
import { usePermissionAuditLogs } from "@/hooks/usePermissionAuditLogs";
import { PermissionsDashboard } from "@/components/admin/PermissionsDashboard";
import { supabase } from "@/integrations/supabase/client";

const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-100 text-purple-800", description: "Tous les droits, gestion des rôles" },
  admin: { label: "Admin", color: "bg-blue-100 text-blue-800", description: "Gestion complète sauf rôles" },
  checker: { label: "Contrôleur", color: "bg-green-100 text-green-800", description: "Lecture et vérification" },
  user: { label: "Utilisateur", color: "bg-gray-100 text-gray-800", description: "Accès basique en lecture" },
  guest: { label: "Invité", color: "bg-amber-100 text-amber-800", description: "Accès limité" },
};

const PERMISSION_CATEGORIES = [
  {
    id: "sites",
    label: "Laveries",
    icon: Settings2,
    permissions: [
      { key: "can_view_sites" as PermissionKey, label: "Voir les laveries", icon: Eye },
      { key: "can_edit_sites" as PermissionKey, label: "Modifier les laveries", icon: Edit },
      { key: "can_delete_sites" as PermissionKey, label: "Supprimer les laveries", icon: Trash2 },
    ],
  },
  {
    id: "data",
    label: "Données",
    icon: FileText,
    permissions: [
      { key: "can_import_data" as PermissionKey, label: "Importer des données", icon: Upload },
      { key: "can_export_data" as PermissionKey, label: "Exporter des données", icon: Download },
      { key: "can_delete_data" as PermissionKey, label: "Supprimer des données", icon: Trash2 },
    ],
  },
  {
    id: "reports",
    label: "Rapports",
    icon: FileText,
    permissions: [
      { key: "can_view_reports" as PermissionKey, label: "Voir les rapports", icon: Eye },
      { key: "can_export_reports" as PermissionKey, label: "Exporter les rapports", icon: Download },
    ],
  },
  {
    id: "team",
    label: "Équipe",
    icon: Users,
    permissions: [
      { key: "can_invite_members" as PermissionKey, label: "Inviter des membres", icon: UserPlus },
      { key: "can_manage_roles" as PermissionKey, label: "Gérer les rôles", icon: Shield },
    ],
  },
  {
    id: "billing",
    label: "Facturation",
    icon: CreditCard,
    permissions: [
      { key: "can_view_billing" as PermissionKey, label: "Voir la facturation", icon: Eye },
      { key: "can_manage_billing" as PermissionKey, label: "Gérer la facturation", icon: Edit },
    ],
  },
];

const ACTION_LABELS: Record<string, string> = {
  permission_updated: "Permission modifiée",
  role_changed: "Rôle modifié",
  permissions_reset: "Permissions réinitialisées",
  all_permissions_granted: "Tous les droits accordés",
  all_permissions_revoked: "Tous les droits révoqués",
};

export default function RolesManagement() {
  const { isSuperAdmin, isLoading: permLoading } = useCurrentUserPermissions();
  const { organization, teamMembers, isLoading: orgLoading, updateMemberRole } = useOrganization();
  const { permissions: allPermissions, getUserPermissions, updatePermission, setUserPermissions, refresh: refreshPermissions } = useUserPermissions(organization?.id || null);
  const { logs, isLoading: logsLoading, logPermissionChange } = usePermissionAuditLogs(organization?.id || null);

  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [updatingPermissions, setUpdatingPermissions] = useState<Set<string>>(new Set());

  // Redirect non super-admins
  if (!permLoading && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const toggleMemberExpand = (memberId: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handlePermissionChange = async (member: TeamMember, permissionKey: PermissionKey, newValue: boolean) => {
    const key = `${member.user_id}-${permissionKey}`;
    setUpdatingPermissions(prev => new Set(prev).add(key));

    const currentPerms = getUserPermissions(member.user_id);
    const oldValue = currentPerms?.[permissionKey] ?? false;

    try {
      const result = await updatePermission(member.user_id, permissionKey, newValue);
      if (result.error) {
        toast.error(result.error);
      } else {
        // Log the change
        await logPermissionChange(
          member.user_id,
          "permission_updated",
          { [permissionKey]: oldValue },
          { [permissionKey]: newValue }
        );
        toast.success("Permission mise à jour");
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdatingPermissions(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: string) => {
    if (!organization) return;

    const oldRole = member.role;
    try {
      await updateMemberRole(member.user_id, newRole as "super_admin" | "admin" | "checker" | "user" | "guest");
      
      // Log the change
      await logPermissionChange(
        member.user_id,
        "role_changed",
        { role: oldRole },
        { role: newRole }
      );
      
      toast.success(`Rôle modifié en ${ROLE_LABELS[newRole]?.label || newRole}`);
    } catch (error) {
      toast.error("Erreur lors du changement de rôle");
    }
  };

  const handleGrantAllPermissions = async (member: TeamMember) => {
    const allPerms: Partial<Record<PermissionKey, boolean>> = {};
    PERMISSION_CATEGORIES.forEach(cat => {
      cat.permissions.forEach(perm => {
        allPerms[perm.key] = true;
      });
    });

    try {
      await setUserPermissions(member.user_id, allPerms);
      await logPermissionChange(member.user_id, "all_permissions_granted", null, allPerms);
      await refreshPermissions();
      toast.success("Tous les droits accordés");
    } catch (error) {
      toast.error("Erreur lors de l'attribution des droits");
    }
  };

  const handleRevokeAllPermissions = async (member: TeamMember) => {
    const allPerms: Partial<Record<PermissionKey, boolean>> = {};
    PERMISSION_CATEGORIES.forEach(cat => {
      cat.permissions.forEach(perm => {
        allPerms[perm.key] = false;
      });
    });

    try {
      await setUserPermissions(member.user_id, allPerms);
      await logPermissionChange(member.user_id, "all_permissions_revoked", null, allPerms);
      await refreshPermissions();
      toast.success("Tous les droits révoqués");
    } catch (error) {
      toast.error("Erreur lors de la révocation des droits");
    }
  };

  const getMemberPermissionValue = (member: TeamMember, permKey: PermissionKey): boolean => {
    const perms = getUserPermissions(member.user_id);
    return perms?.[permKey] ?? false;
  };

  const isLoading = permLoading || orgLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Gestion des rôles et permissions
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez les accès et permissions de tous les membres de votre organisation
        </p>
      </div>

      <Alert className="border-purple-200 bg-purple-50/50">
        <Lock className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          Cette page est réservée aux <strong>Super Admins</strong>. Les modifications sont enregistrées dans les logs d'audit.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Membres ({teamMembers.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" />
            Logs d'audit
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <PermissionsDashboard
            teamMembers={teamMembers}
            getUserPermissions={getUserPermissions}
            logs={logs}
          />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          {teamMembers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun membre dans l'organisation</p>
              </CardContent>
            </Card>
          ) : (
            teamMembers.map((member) => {
              const isExpanded = expandedMembers.has(member.user_id);
              const isSelf = member.user_id === organization?.owner_id;
              const memberPerms = getUserPermissions(member.user_id);
              const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.user;

              return (
                <Card key={member.user_id} className="overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleMemberExpand(member.user_id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {member.first_name} {member.last_name}
                                {member.role === "super_admin" && (
                                  <Badge variant="outline" className="gap-1">
                                    <Shield className="h-3 w-3" />
                                    Owner
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription>{member.email}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
                            {!isExpanded && (
                              <span className="text-xs text-muted-foreground">
                                Cliquez pour modifier
                              </span>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="border-t pt-6 space-y-6">
                        {/* Role Selection */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium">Rôle</p>
                            <p className="text-sm text-muted-foreground">{roleInfo.description}</p>
                          </div>
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member, value)}
                            disabled={member.role === "super_admin"}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_admin" disabled>Super Admin</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="checker">Contrôleur</SelectItem>
                              <SelectItem value="user">Utilisateur</SelectItem>
                              <SelectItem value="guest">Invité</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Quick Actions */}
                        {member.role !== "super_admin" && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGrantAllPermissions(member)}
                              className="gap-1"
                            >
                              <Check className="h-4 w-4" />
                              Tout autoriser
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeAllPermissions(member)}
                              className="gap-1 text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                              Tout révoquer
                            </Button>
                          </div>
                        )}

                        {/* Permission Categories */}
                        {member.role !== "super_admin" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {PERMISSION_CATEGORIES.map((category) => (
                              <Card key={category.id} className="bg-muted/20">
                                <CardHeader className="py-3 px-4">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <category.icon className="h-4 w-4 text-muted-foreground" />
                                    {category.label}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="py-2 px-4 space-y-2">
                                  {category.permissions.map((perm) => {
                                    const permValue = getMemberPermissionValue(member, perm.key);
                                    const isUpdating = updatingPermissions.has(`${member.user_id}-${perm.key}`);

                                    return (
                                      <div
                                        key={perm.key}
                                        className="flex items-center justify-between py-1"
                                      >
                                        <div className="flex items-center gap-2">
                                          <perm.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                          <span className="text-sm">{perm.label}</span>
                                        </div>
                                        <Switch
                                          checked={permValue}
                                          onCheckedChange={(value) =>
                                            handlePermissionChange(member, perm.key, value)
                                          }
                                          disabled={isUpdating}
                                        />
                                      </div>
                                    );
                                  })}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {member.role === "super_admin" && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Les Super Admins ont automatiquement tous les droits et ne peuvent pas être modifiés.
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique des modifications
              </CardTitle>
              <CardDescription>
                Toutes les modifications de permissions et de rôles sont enregistrées
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune modification enregistrée</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">
                              {ACTION_LABELS[log.action] || log.action}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Par <span className="font-medium">{log.performer_email}</span> sur{" "}
                              <span className="font-medium">{log.target_email}</span>
                            </p>
                            {log.old_values && log.new_values && (
                              <div className="flex items-center gap-2 text-xs mt-2">
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                  {JSON.stringify(log.old_values)}
                                </span>
                                <span>→</span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                  {JSON.stringify(log.new_values)}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
