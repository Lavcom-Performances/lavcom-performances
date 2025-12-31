import { useMemo } from "react";
import {
  BarChart3,
  Users,
  Shield,
  Eye,
  Edit,
  Trash2,
  Upload,
  Download,
  UserPlus,
  CreditCard,
  FileText,
  TrendingUp,
  PieChart,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TeamMember } from "@/hooks/useOrganization";
import { PermissionKey } from "@/hooks/useUserPermissions";
import { PermissionAuditLog } from "@/hooks/usePermissionAuditLogs";

interface PermissionsDashboardProps {
  teamMembers: TeamMember[];
  getUserPermissions: (userId: string) => Partial<Record<PermissionKey, boolean>> | null;
  logs: PermissionAuditLog[];
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-500" },
  admin: { label: "Admin", color: "bg-blue-500" },
  checker: { label: "Contrôleur", color: "bg-green-500" },
  user: { label: "Utilisateur", color: "bg-gray-500" },
  guest: { label: "Invité", color: "bg-amber-500" },
};

const PERMISSION_INFO: Record<PermissionKey, { label: string; icon: typeof Eye; category: string }> = {
  can_view_sites: { label: "Voir laveries", icon: Eye, category: "Laveries" },
  can_edit_sites: { label: "Modifier laveries", icon: Edit, category: "Laveries" },
  can_delete_sites: { label: "Supprimer laveries", icon: Trash2, category: "Laveries" },
  can_import_data: { label: "Importer données", icon: Upload, category: "Données" },
  can_export_data: { label: "Exporter données", icon: Download, category: "Données" },
  can_delete_data: { label: "Supprimer données", icon: Trash2, category: "Données" },
  can_view_reports: { label: "Voir rapports", icon: Eye, category: "Rapports" },
  can_export_reports: { label: "Exporter rapports", icon: Download, category: "Rapports" },
  can_invite_members: { label: "Inviter membres", icon: UserPlus, category: "Équipe" },
  can_manage_roles: { label: "Gérer rôles", icon: Shield, category: "Équipe" },
  can_view_billing: { label: "Voir facturation", icon: Eye, category: "Facturation" },
  can_manage_billing: { label: "Gérer facturation", icon: CreditCard, category: "Facturation" },
};

export function PermissionsDashboard({ teamMembers, getUserPermissions, logs }: PermissionsDashboardProps) {
  // Statistics calculations
  const stats = useMemo(() => {
    // Role distribution
    const roleDistribution: Record<string, number> = {};
    teamMembers.forEach(member => {
      roleDistribution[member.role] = (roleDistribution[member.role] || 0) + 1;
    });

    // Permission usage (how many users have each permission)
    const permissionUsage: Record<PermissionKey, number> = {} as Record<PermissionKey, number>;
    const permissionKeys = Object.keys(PERMISSION_INFO) as PermissionKey[];
    
    permissionKeys.forEach(key => {
      permissionUsage[key] = 0;
    });

    const nonSuperAdminMembers = teamMembers.filter(m => m.role !== 'super_admin');
    nonSuperAdminMembers.forEach(member => {
      const perms = getUserPermissions(member.user_id);
      if (perms) {
        permissionKeys.forEach(key => {
          if (perms[key]) {
            permissionUsage[key]++;
          }
        });
      }
    });

    // Recent activity stats (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLogs = logs.filter(log => new Date(log.created_at) > sevenDaysAgo);
    
    const activityByAction: Record<string, number> = {};
    recentLogs.forEach(log => {
      activityByAction[log.action] = (activityByAction[log.action] || 0) + 1;
    });

    // Category stats
    const categoryStats: Record<string, { granted: number; total: number }> = {};
    const categories = [...new Set(Object.values(PERMISSION_INFO).map(p => p.category))];
    
    categories.forEach(cat => {
      categoryStats[cat] = { granted: 0, total: 0 };
    });

    permissionKeys.forEach(key => {
      const info = PERMISSION_INFO[key];
      categoryStats[info.category].granted += permissionUsage[key];
      categoryStats[info.category].total += nonSuperAdminMembers.length;
    });

    return {
      roleDistribution,
      permissionUsage,
      recentLogs,
      activityByAction,
      categoryStats,
      totalMembers: teamMembers.length,
      nonSuperAdminCount: nonSuperAdminMembers.length,
    };
  }, [teamMembers, getUserPermissions, logs]);

  const maxPermissionCount = stats.nonSuperAdminCount || 1;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalMembers}</p>
                <p className="text-sm text-muted-foreground">Membres total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.roleDistribution['super_admin'] || 0}</p>
                <p className="text-sm text-muted-foreground">Super Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.recentLogs.length}</p>
                <p className="text-sm text-muted-foreground">Actions (7j)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(stats.permissionUsage).reduce((a, b) => a + b, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Permissions actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribution des rôles
            </CardTitle>
            <CardDescription>Répartition des membres par rôle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(ROLE_LABELS).map(([role, info]) => {
                const count = stats.roleDistribution[role] || 0;
                const percentage = stats.totalMembers > 0 ? (count / stats.totalMembers) * 100 : 0;

                return (
                  <div key={role} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${info.color}`} />
                        <span className="text-sm font-medium">{info.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Category Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Permissions par catégorie
            </CardTitle>
            <CardDescription>Taux d'activation des permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.categoryStats).map(([category, data]) => {
                const percentage = data.total > 0 ? (data.granted / data.total) * 100 : 0;

                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category}</span>
                      <span className="text-sm text-muted-foreground">
                        {data.granted}/{data.total} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Permission Usage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Détail des permissions
            </CardTitle>
            <CardDescription>
              Nombre d'utilisateurs ayant chaque permission (hors Super Admins)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.entries(PERMISSION_INFO) as [PermissionKey, typeof PERMISSION_INFO[PermissionKey]][]).map(([key, info]) => {
                const count = stats.permissionUsage[key] || 0;
                const percentage = (count / maxPermissionCount) * 100;
                const Icon = info.icon;

                return (
                  <div
                    key={key}
                    className="p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{info.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {count}/{stats.nonSuperAdminCount}
                      </Badge>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">{info.category}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {stats.recentLogs.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Activité récente (7 derniers jours)
              </CardTitle>
              <CardDescription>Types d'actions effectuées</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.activityByAction).map(([action, count]) => {
                  const actionLabels: Record<string, string> = {
                    permission_updated: "Permissions modifiées",
                    role_changed: "Rôles modifiés",
                    permissions_reset: "Réinitialisations",
                    all_permissions_granted: "Tous droits accordés",
                    all_permissions_revoked: "Tous droits révoqués",
                  };

                  return (
                    <div
                      key={action}
                      className="px-4 py-2 bg-muted rounded-lg flex items-center gap-2"
                    >
                      <span className="text-sm font-medium">
                        {actionLabels[action] || action}
                      </span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
