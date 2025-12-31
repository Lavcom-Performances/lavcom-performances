import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Mail, Trash2, Loader2, Crown, Shield, Eye, Edit, ChevronDown, Check, X, Info } from "lucide-react";
import { useOrganization, UserRole } from "@/hooks/useOrganization";
import { InviteUserDialog } from "@/components/admin/InviteUserDialog";
import { CreateOrganizationDialog } from "@/components/admin/CreateOrganizationDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

type RoleType = UserRole['role'];

const ROLE_OPTIONS: { value: RoleType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'super_admin', label: 'Super Admin', description: 'Accès complet et gestion des admins', icon: <Crown className="h-4 w-4 text-amber-500" /> },
  { value: 'admin', label: 'Admin', description: 'Gestion complète de l\'organisation', icon: <Shield className="h-4 w-4 text-blue-500" /> },
  { value: 'checker', label: 'Éditeur', description: 'Peut modifier les données', icon: <Edit className="h-4 w-4 text-emerald-500" /> },
  { value: 'user', label: 'Utilisateur', description: 'Peut voir et exporter', icon: <Eye className="h-4 w-4 text-primary" /> },
  { value: 'guest', label: 'Lecteur', description: 'Lecture seule', icon: <Eye className="h-4 w-4 text-muted-foreground" /> },
];

// Permissions matrix
const PERMISSIONS = [
  { key: 'view_sites', label: 'Voir les laveries', category: 'Laveries' },
  { key: 'edit_sites', label: 'Modifier les laveries', category: 'Laveries' },
  { key: 'create_sites', label: 'Créer des laveries', category: 'Laveries' },
  { key: 'delete_sites', label: 'Supprimer des laveries', category: 'Laveries' },
  { key: 'view_operations', label: 'Voir les opérations', category: 'Données' },
  { key: 'import_data', label: 'Importer des données', category: 'Données' },
  { key: 'export_data', label: 'Exporter des données', category: 'Données' },
  { key: 'delete_operations', label: 'Supprimer des opérations', category: 'Données' },
  { key: 'view_reports', label: 'Voir les rapports', category: 'Rapports' },
  { key: 'generate_pdf', label: 'Générer des PDF', category: 'Rapports' },
  { key: 'view_team', label: 'Voir l\'équipe', category: 'Équipe' },
  { key: 'invite_members', label: 'Inviter des membres', category: 'Équipe' },
  { key: 'manage_roles', label: 'Gérer les rôles', category: 'Équipe' },
  { key: 'remove_members', label: 'Retirer des membres', category: 'Équipe' },
  { key: 'view_billing', label: 'Voir la facturation', category: 'Facturation' },
  { key: 'manage_billing', label: 'Gérer l\'abonnement', category: 'Facturation' },
] as const;

type PermissionKey = typeof PERMISSIONS[number]['key'];

const ROLE_PERMISSIONS: Record<RoleType, PermissionKey[]> = {
  super_admin: [
    'view_sites', 'edit_sites', 'create_sites', 'delete_sites',
    'view_operations', 'import_data', 'export_data', 'delete_operations',
    'view_reports', 'generate_pdf',
    'view_team', 'invite_members', 'manage_roles', 'remove_members',
    'view_billing', 'manage_billing'
  ],
  admin: [
    'view_sites', 'edit_sites', 'create_sites', 'delete_sites',
    'view_operations', 'import_data', 'export_data', 'delete_operations',
    'view_reports', 'generate_pdf',
    'view_team', 'invite_members', 'manage_roles', 'remove_members',
    'view_billing', 'manage_billing'
  ],
  checker: [
    'view_sites', 'edit_sites',
    'view_operations', 'import_data', 'export_data',
    'view_reports', 'generate_pdf',
    'view_team'
  ],
  user: [
    'view_sites',
    'view_operations', 'export_data',
    'view_reports', 'generate_pdf',
    'view_team'
  ],
  guest: [
    'view_sites',
    'view_operations',
    'view_reports',
    'view_team'
  ]
};

export default function TeamContent() {
  const { 
    organization, 
    teamMembers, 
    invitations, 
    isLoading, 
    isAdmin,
    isSuperAdmin,
    sendInvitation,
    cancelInvitation,
    updateMemberRole,
    removeMember,
    createOrganization,
    userRole
  } = useOrganization();
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const handleSendInvitation = async (email: string, role: RoleType) => {
    try {
      await sendInvitation(email, role);
      toast.success("Invitation envoyée");
      setInviteDialogOpen(false);
      return { success: true };
    } catch (error) {
      toast.error("Erreur lors de l'envoi de l'invitation");
      return { error: "Erreur" };
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      toast.success("Invitation annulée");
    } catch (error) {
      toast.error("Erreur lors de l'annulation");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      toast.success("Membre retiré de l'équipe");
    } catch (error) {
      toast.error("Erreur lors du retrait");
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: RoleType) => {
    setUpdatingRole(memberId);
    try {
      await updateMemberRole(memberId, newRole);
      toast.success("Rôle mis à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du rôle");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleCreateOrganization = async (name: string) => {
    try {
      await createOrganization(name);
      toast.success("Organisation créée");
      setCreateOrgDialogOpen(false);
      return { success: true };
    } catch (error) {
      toast.error("Erreur lors de la création");
      return { error: "Erreur" };
    }
  };

  const getRoleOption = (role: string) => ROLE_OPTIONS.find(r => r.value === role);

  const getRoleBadge = (role: string) => {
    const option = getRoleOption(role);
    if (!option) return <Badge variant="outline">{role}</Badge>;
    
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">{option.icon}<span className="ml-1">{option.label}</span></Badge>;
      case 'admin':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">{option.icon}<span className="ml-1">{option.label}</span></Badge>;
      case 'checker':
        return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">{option.icon}<span className="ml-1">{option.label}</span></Badge>;
      case 'user':
        return <Badge variant="secondary">{option.icon}<span className="ml-1">{option.label}</span></Badge>;
      case 'guest':
        return <Badge variant="outline" className="text-muted-foreground">{option.icon}<span className="ml-1">{option.label}</span></Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const canEditRole = (memberRole: RoleType) => {
    if (isSuperAdmin) return memberRole !== 'super_admin'; // Super admin can edit all except other super admins
    if (isAdmin) return memberRole !== 'super_admin' && memberRole !== 'admin'; // Admin can edit non-admins
    return false;
  };

  const getAvailableRoles = (): RoleType[] => {
    if (isSuperAdmin) return ['admin', 'checker', 'user', 'guest'];
    if (isAdmin) return ['checker', 'user', 'guest'];
    return [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gestion d'équipe
            </CardTitle>
            <CardDescription>
              Créez une organisation pour inviter des membres dans votre équipe
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Pas d'organisation</h3>
            <p className="text-muted-foreground mb-4">
              Créez une organisation pour collaborer avec votre équipe
            </p>
            <Button onClick={() => setCreateOrgDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Créer une organisation
            </Button>
          </CardContent>
        </Card>

        <CreateOrganizationDialog
          open={createOrgDialogOpen}
          onOpenChange={setCreateOrgDialogOpen}
          onCreate={handleCreateOrganization}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Permissions Matrix */}
      <Card>
        <Collapsible>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Permissions par rôle
              </CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="h-4 w-4" />
                <span className="text-sm">Cliquez pour voir les détails</span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Role headers */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Permission</th>
                      {ROLE_OPTIONS.map((role) => (
                        <th key={role.value} className="text-center px-2 py-3 min-w-[80px]">
                          <div className="flex flex-col items-center gap-1">
                            {role.icon}
                            <span className="text-xs font-medium">{role.label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const categories = [...new Set(PERMISSIONS.map(p => p.category))];
                      return categories.map((category) => (
                        <>
                          <tr key={`cat-${category}`} className="bg-muted/50">
                            <td colSpan={ROLE_OPTIONS.length + 1} className="py-2 px-2 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                              {category}
                            </td>
                          </tr>
                          {PERMISSIONS.filter(p => p.category === category).map((permission) => (
                            <tr key={permission.key} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-2 pr-4 text-sm">{permission.label}</td>
                              {ROLE_OPTIONS.map((role) => {
                                const hasPermission = ROLE_PERMISSIONS[role.value].includes(permission.key);
                                return (
                                  <td key={`${permission.key}-${role.value}`} className="text-center py-2">
                                    {hasPermission ? (
                                      <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                                    ) : (
                                      <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              
              {/* Quick legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span>Autorisé</span>
                </div>
                <div className="flex items-center gap-1">
                  <X className="h-3 w-3 text-muted-foreground/40" />
                  <span>Non autorisé</span>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Équipe - {organization.name}
              </CardTitle>
              <CardDescription>
                {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''} dans votre organisation
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Inviter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-medium text-primary">
                    {member.email?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{member.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {canEditRole(member.role) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto p-0 hover:bg-transparent"
                            disabled={updatingRole === member.id}
                          >
                            <div className="flex items-center gap-1">
                              {getRoleBadge(member.role)}
                              {updatingRole === member.id ? (
                                <Loader2 className="h-3 w-3 ml-1 animate-spin" />
                              ) : (
                                <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
                              )}
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          {getAvailableRoles().map((roleValue) => {
                            const option = getRoleOption(roleValue);
                            if (!option) return null;
                            return (
                              <DropdownMenuItem
                                key={roleValue}
                                onClick={() => handleUpdateRole(member.id, roleValue)}
                                className="flex items-start gap-2 py-2"
                              >
                                {option.icon}
                                <div>
                                  <p className="font-medium">{option.label}</p>
                                  <p className="text-xs text-muted-foreground">{option.description}</p>
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      getRoleBadge(member.role)
                    )}
                    {member.user_id === userRole?.user_id && (
                      <Badge variant="outline" className="text-xs">Vous</Badge>
                    )}
                  </div>
                </div>
              </div>
              {isAdmin && member.role !== 'super_admin' && member.user_id !== userRole?.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Invitations en attente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(invitation.role)}
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                        En attente
                      </Badge>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleSendInvitation}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
