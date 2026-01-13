/**
 * Company Roles Page - For company_admin users
 * 
 * This is the SaaS route for managing team roles within an organization.
 * NEVER uses /admin/* routes - those are for platform admins only.
 */

import { useState, useMemo, useCallback } from "react";
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
  Webhook,
  Loader2,
  Info,
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
import { usePermissionAuditLogs, PermissionAuditLog } from "@/hooks/usePermissionAuditLogs";
import { PermissionsDashboard } from "@/components/admin/PermissionsDashboard";
import { AuditLogsFilters } from "@/components/admin/AuditLogsFilters";
import { WebhookSettings } from "@/components/admin/WebhookSettings";
import { PermissionTemplates, PermissionTemplateMatch, PERMISSION_TEMPLATES } from "@/components/admin/PermissionTemplates";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", description: "Tous les droits, gestion des rôles" },
  company_admin: { label: "Admin Entreprise", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", description: "Gestion complète de l'organisation" },
  admin: { label: "Admin", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", description: "Gestion complète sauf rôles" },
  checker: { label: "Contrôleur", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", description: "Lecture et vérification" },
  user: { label: "Utilisateur", color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400", description: "Accès basique en lecture" },
  guest: { label: "Invité", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", description: "Accès limité" },
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

export default function CompanyRolesPage() {
  const { t } = useTranslation(['app', 'common']);
  const { isSuperAdmin, isCompanyAdmin, isLoading: permLoading } = useCurrentUserPermissions();
  const { organization, teamMembers, isLoading: orgLoading, updateMemberRole } = useOrganization();
  const { permissions: allPermissions, getUserPermissions, updatePermission, setUserPermissions, refresh: refreshPermissions } = useUserPermissions(organization?.id || null);
  const { logs, isLoading: logsLoading, logPermissionChange } = usePermissionAuditLogs(organization?.id || null);
  const [filteredLogs, setFilteredLogs] = useState<PermissionAuditLog[]>([]);

  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [updatingPermissions, setUpdatingPermissions] = useState<Set<string>>(new Set());

  const handleFilteredLogsChange = useCallback((logs: PermissionAuditLog[]) => {
    setFilteredLogs(logs);
  }, []);

  // Check access - both super_admin and company_admin can manage roles
  const hasRoleManagementAccess = isSuperAdmin || isCompanyAdmin;
  const isLoading = permLoading || orgLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // No access - show informative message (not silent redirect to dashboard!)
  if (!hasRoleManagementAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {t('app:roles.title', 'Gestion des rôles')}
          </h1>
        </div>

        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="h-12 w-12 text-amber-600 dark:text-amber-400 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t('app:roles.accessDenied.title', 'Accès restreint')}
            </h2>
            <p className="text-muted-foreground max-w-md mb-4">
              {t('app:roles.accessDenied.description', 'Seuls les administrateurs de l\'entreprise peuvent gérer les rôles et permissions des membres de l\'équipe.')}
            </p>
            <Alert className="max-w-md">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('app:roles.accessDenied.hint', 'Contactez l\'administrateur de votre organisation si vous avez besoin d\'accéder à cette fonctionnalité.')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Has access - show full page
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
      await updateMemberRole(member.user_id, newRole as "super_admin" | "admin" | "checker" | "user" | "guest" | "company_admin");
      
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

  const handleApplyTemplate = async (userId: string, permissions: Partial<Record<PermissionKey, boolean>>) => {
    const member = teamMembers.find(m => m.user_id === userId);
    if (!member) return;

    const templateName = PERMISSION_TEMPLATES.find(t => 
      Object.entries(t.permissions).every(([key, value]) => permissions[key as PermissionKey] === value)
    )?.name || "Template personnalisé";

    try {
      await setUserPermissions(userId, permissions);
      await logPermissionChange(userId, "template_applied", null, { template: templateName, ...permissions });
      await refreshPermissions();
      toast.success(`Template "${templateName}" appliqué avec succès`);
    } catch (error) {
      toast.error("Erreur lors de l'application du template");
    }
  };

  const getMemberPermissionValue = (member: TeamMember, permKey: PermissionKey): boolean => {
    const perms = getUserPermissions(member.user_id);
    return perms?.[permKey] ?? false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          {t('app:roles.title', 'Gestion des rôles et permissions')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('app:roles.subtitle', 'Gérez les accès et permissions de tous les membres de votre organisation')}
        </p>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <Lock className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground">
          {isSuperAdmin 
            ? t('app:roles.superAdminNote', 'Vous êtes Super Admin. Toutes les modifications sont enregistrées dans les logs d\'audit.')
            : t('app:roles.companyAdminNote', 'Vous êtes Administrateur Entreprise. Vous pouvez gérer les rôles des membres de votre organisation.')
          }
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Membres ({teamMembers.length})
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" />
            Logs d'audit
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
          )}
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          {teamMembers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('app:roles.noMembers', 'Aucun membre dans l\'organisation')}</p>
              </CardContent>
            </Card>
          ) : (
            teamMembers.map((member) => {
              const isExpanded = expandedMembers.has(member.user_id);
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
                              <span className="text-xs text-muted-foreground hidden sm:inline">
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
                              <SelectItem value="company_admin">Admin Entreprise</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="checker">Contrôleur</SelectItem>
                              <SelectItem value="user">Utilisateur</SelectItem>
                              <SelectItem value="guest">Invité</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Quick Actions */}
                        {member.role !== "super_admin" && (
                          <div className="flex flex-wrap items-center gap-2">
                            <PermissionTemplates
                              userId={member.user_id}
                              userName={`${member.first_name} ${member.last_name}`}
                              onApplyTemplate={handleApplyTemplate}
                            />
                            <div className="h-6 w-px bg-border" />
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
                            {memberPerms && (
                              <PermissionTemplateMatch currentPermissions={memberPerms} />
                            )}
                          </div>
                        )}

                        {/* Permission Categories */}
                        {member.role !== "super_admin" && (
                          <div className="grid gap-4">
                            {PERMISSION_CATEGORIES.map((category) => (
                              <Card key={category.id} className="bg-card/50">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center gap-2">
                                    <category.icon className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-sm font-medium">{category.label}</CardTitle>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid gap-3">
                                    {category.permissions.map((perm) => {
                                      const isChecked = getMemberPermissionValue(member, perm.key);
                                      const isUpdating = updatingPermissions.has(`${member.user_id}-${perm.key}`);
                                      
                                      return (
                                        <div key={perm.key} className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <perm.icon className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">{perm.label}</span>
                                          </div>
                                          <Switch
                                            checked={isChecked}
                                            onCheckedChange={(checked) => handlePermissionChange(member, perm.key, checked)}
                                            disabled={isUpdating}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {member.role === "super_admin" && (
                          <Alert>
                            <Shield className="h-4 w-4" />
                            <AlertDescription>
                              Le Super Admin possède tous les droits par défaut et ne peut pas être modifié.
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

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <PermissionsDashboard
            teamMembers={teamMembers}
            getUserPermissions={getUserPermissions}
            logs={logs}
          />
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique des modifications
              </CardTitle>
              <CardDescription>
                Toutes les modifications de rôles et permissions sont enregistrées ici.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogsFilters 
                logs={logs}
                onFilteredLogsChange={handleFilteredLogsChange}
              />
              
              {logsLoading ? (
                <div className="space-y-2 mt-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun log d'audit trouvé</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] mt-4">
                  <div className="space-y-2">
                    {filteredLogs.map((log) => {
                      const member = teamMembers.find(m => m.user_id === log.target_user_id);
                      const performer = teamMembers.find(m => m.user_id === log.performed_by);
                      
                      return (
                        <div 
                          key={log.id} 
                          className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {ACTION_LABELS[log.action] || log.action}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                              </span>
                            </div>
                            <p className="text-sm">
                              <span className="font-medium">
                                {performer ? `${performer.first_name} ${performer.last_name}` : 'Système'}
                              </span>
                              {' a modifié '}
                              <span className="font-medium">
                                {member ? `${member.first_name} ${member.last_name}` : 'Utilisateur inconnu'}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab - Super Admin only */}
        {isSuperAdmin && (
          <TabsContent value="webhooks">
            <WebhookSettings organizationId={organization?.id || null} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
