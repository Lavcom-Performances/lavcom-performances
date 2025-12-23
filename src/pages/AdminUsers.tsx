import { useState } from "react";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Shield, 
  ShieldCheck, 
  User, 
  Eye,
  Building2,
  UserX,
  Table2,
  Users,
  ArrowRightLeft,
  AlertTriangle,
  Mail,
  Clock,
  X,
  Loader2,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { PermissionsTable } from "@/components/admin/PermissionsTable";
import { RolesInfoCard } from "@/components/admin/RolesInfoCard";
import { InviteUserDialog } from "@/components/admin/InviteUserDialog";
import { CreateOrganizationDialog } from "@/components/admin/CreateOrganizationDialog";
import { SiteAccessManager } from "@/components/admin/SiteAccessManager";
import { useOrganization, TeamMember, TeamInvitation } from "@/hooks/useOrganization";
import { 
  ROLE_DESCRIPTIONS,
  canDeleteUser,
  canManageRole
} from "@/types/permissions";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

type AppRole = 'super_admin' | 'admin' | 'checker' | 'user' | 'guest';

const roleConfig: Record<AppRole, { label: string; icon: typeof Shield; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  super_admin: { label: "Super Admin", icon: ShieldCheck, variant: "default" },
  admin: { label: "Admin", icon: Shield, variant: "default" },
  checker: { label: "Contrôleur", icon: Eye, variant: "secondary" },
  user: { label: "Utilisateur", icon: User, variant: "outline" },
  guest: { label: "Invité", icon: UserX, variant: "outline" },
};

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedMemberForTransfer, setSelectedMemberForTransfer] = useState<TeamMember | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMemberToDelete, setSelectedMemberToDelete] = useState<TeamMember | null>(null);

  const {
    organization,
    userRole,
    teamMembers,
    invitations,
    isLoading,
    isAdmin,
    isSuperAdmin,
    createOrganization,
    sendInvitation,
    cancelInvitation,
    updateMemberRole,
    removeMember
  } = useOrganization();

  const filteredMembers = teamMembers.filter((member) =>
    (member.first_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (member.last_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoleChange = async (memberId: string, newRole: AppRole) => {
    const result = await updateMemberRole(memberId, newRole);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Rôle mis à jour`);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMemberToDelete) return;
    
    const result = await removeMember(selectedMemberToDelete.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Membre supprimé");
    }
    setDeleteDialogOpen(false);
    setSelectedMemberToDelete(null);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invitation annulée");
    }
  };

  const getFullName = (member: TeamMember) => {
    if (member.first_name && member.last_name) {
      return `${member.first_name} ${member.last_name}`;
    }
    if (member.first_name) return member.first_name;
    if (member.last_name) return member.last_name;
    return member.email.split('@')[0];
  };

  const getInitials = (member: TeamMember) => {
    if (member.first_name && member.last_name) {
      return `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();
    }
    return member.email.slice(0, 2).toUpperCase();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // No organization state
  if (!organization) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Créez votre organisation</h1>
          <p className="text-muted-foreground mb-6">
            Pour gérer votre équipe et inviter des collaborateurs, vous devez d'abord créer une organisation.
          </p>
          <Button variant="lavcom" size="lg" onClick={() => setCreateOrgDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer mon organisation
          </Button>
        </div>

        <CreateOrganizationDialog
          open={createOrgDialogOpen}
          onOpenChange={setCreateOrgDialogOpen}
          onCreate={createOrganization}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
            Gestion des accès
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {organization.name} • {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <Button 
            variant="lavcom" 
            className="w-full sm:w-auto self-start"
            onClick={() => setInviteDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Ajouter un utilisateur
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-full sm:w-auto inline-flex">
            <TabsTrigger value="users" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Utilisateurs</span>
              <span className="xs:hidden">Users</span>
            </TabsTrigger>
            {invitations.length > 0 && (
              <TabsTrigger value="invitations" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
                <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Invitations</span>
                <Badge variant="secondary" className="ml-1">{invitations.length}</Badge>
              </TabsTrigger>
            )}
            <TabsTrigger value="sites" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Laveries</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
              <Table2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="hierarchy" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Rôles</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Search */}
          <div className="card-lavcom p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="card-lavcom overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Membre depuis</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucun membre trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => {
                      const role = roleConfig[member.role];
                      const RoleIcon = role.icon;
                      const isCurrentUser = member.user_id === userRole?.user_id;
                      const canManage = isAdmin && !isCurrentUser && (isSuperAdmin || member.role !== 'super_admin');
                      const canDelete = isSuperAdmin && !isCurrentUser && member.role !== 'super_admin';

                      return (
                        <TableRow key={member.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {getInitials(member)}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">
                                  {getFullName(member)}
                                  {isCurrentUser && <span className="text-muted-foreground ml-1">(vous)</span>}
                                </p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={role.variant} className="gap-1">
                              <RoleIcon className="h-3 w-3" />
                              {role.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(member.created_at), "dd MMM yyyy", { locale: fr })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                              member.is_active 
                                ? "bg-emerald-100 text-emerald-700" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                member.is_active ? "bg-emerald-500" : "bg-muted-foreground"
                              )} />
                              {member.is_active ? "Actif" : "Inactif"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {canManage && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    Changer le rôle
                                  </DropdownMenuLabel>
                                  {(['admin', 'checker', 'user', 'guest'] as AppRole[]).map(r => (
                                    <DropdownMenuItem 
                                      key={r}
                                      onClick={() => handleRoleChange(member.id, r)}
                                      disabled={r === member.role}
                                    >
                                      {roleConfig[r].label}
                                    </DropdownMenuItem>
                                  ))}
                                  {canDelete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => {
                                          setSelectedMemberToDelete(member);
                                          setDeleteDialogOpen(true);
                                        }}
                                      >
                                        Retirer de l'équipe
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          <div className="card-lavcom overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const role = roleConfig[invitation.role];
                    const RoleIcon = role.icon;
                    const isExpired = new Date(invitation.expires_at) < new Date();

                    return (
                      <TableRow key={invitation.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{invitation.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.variant} className="gap-1">
                            <RoleIcon className="h-3 w-3" />
                            {role.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={cn(
                            "flex items-center gap-1 text-sm",
                            isExpired ? "text-destructive" : "text-muted-foreground"
                          )}>
                            <Clock className="h-3 w-3" />
                            {format(new Date(invitation.expires_at), "dd MMM yyyy", { locale: fr })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleCancelInvitation(invitation.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Sites Access Tab */}
        <TabsContent value="sites" className="space-y-4">
          <SiteAccessManager 
            organizationId={organization.id}
            teamMembers={teamMembers}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <div className="card-lavcom p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Ce tableau affiche les permissions de chaque rôle.
              <span className="font-medium text-foreground"> Seuls les Super Admins et Admins peuvent modifier les permissions.</span>
            </p>
            <RolesInfoCard />
          </div>
        </TabsContent>

        {/* Hierarchy Tab */}
        <TabsContent value="hierarchy" className="space-y-4">
          <RolesInfoCard />
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={sendInvitation}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Delete Member Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMemberToDelete && (
                <>
                  <strong>{getFullName(selectedMemberToDelete)}</strong> sera retiré de l'organisation 
                  et n'aura plus accès aux données.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMember}
              className="bg-destructive hover:bg-destructive/90"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
