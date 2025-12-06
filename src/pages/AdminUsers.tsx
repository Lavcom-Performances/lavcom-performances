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
  AlertTriangle
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
import { 
  UserWithPermissions, 
  UserRole, 
  ROLE_DESCRIPTIONS,
  canDeleteUser,
  canManageRole
} from "@/types/permissions";
import { toast } from "sonner";

// Mock data for V1 - current user is SUPER_ADMIN
const CURRENT_USER_ROLE: UserRole = "SUPER_ADMIN";

const mockUsers: UserWithPermissions[] = [
  { id: "1", email: "admin@lavcom.fr", fullName: "Jean Dupont", role: "SUPER_ADMIN", isActive: true, laundromats: ["Laverie Saint-Michel", "Laverie Bastille"] },
  { id: "2", email: "marie@lavcom.fr", fullName: "Marie Martin", role: "ADMIN", isActive: true, laundromats: ["Laverie République"] },
  { id: "3", email: "pierre@lavcom.fr", fullName: "Pierre Durand", role: "CHECKER", isActive: true, laundromats: ["Laverie Saint-Michel"] },
  { id: "4", email: "sophie@lavcom.fr", fullName: "Sophie Bernard", role: "USER", isActive: true, laundromats: ["Laverie Bastille"] },
  { id: "5", email: "guest@example.com", fullName: "Invité Test", role: "GUEST", isActive: false, laundromats: [] },
  { id: "6", email: "nouveau@example.com", fullName: "Nouveau Membre", role: "GUEST", isActive: true, laundromats: [] },
];

const roleConfig: Record<UserRole, { label: string; icon: typeof Shield; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  SUPER_ADMIN: { label: "Super Admin", icon: ShieldCheck, variant: "default" },
  ADMIN: { label: "Admin", icon: Shield, variant: "default" },
  CHECKER: { label: "Contrôleur", icon: Eye, variant: "secondary" },
  USER: { label: "Utilisateur", icon: User, variant: "outline" },
  GUEST: { label: "Invité", icon: UserX, variant: "outline" },
};

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserWithPermissions[]>(mockUsers);
  const [activeTab, setActiveTab] = useState("users");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAdminForTransfer, setSelectedAdminForTransfer] = useState<UserWithPermissions | null>(null);

  const filteredUsers = users.filter((user) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePermissionChange = (userId: string, permissionId: string, value: boolean) => {
    setUsers(prevUsers => 
      prevUsers.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            customPermissions: {
              ...user.customPermissions,
              [permissionId]: value
            }
          };
        }
        return user;
      })
    );
    toast.success("Permission mise à jour");
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    if (!canManageRole(CURRENT_USER_ROLE, targetUser.role)) {
      toast.error("Vous n'avez pas les droits pour modifier ce rôle");
      return;
    }

    setUsers(prevUsers =>
      prevUsers.map(user => {
        if (user.id === userId) {
          return { ...user, role: newRole, customPermissions: {} };
        }
        return user;
      })
    );
    toast.success(`Rôle changé en ${ROLE_DESCRIPTIONS[newRole].label}`);
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    if (!canDeleteUser(CURRENT_USER_ROLE, targetUser.role)) {
      toast.error("Vous ne pouvez pas supprimer cet utilisateur");
      return;
    }

    setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    toast.success("Utilisateur supprimé");
  };

  const handleTransferSuperAdmin = (targetUser: UserWithPermissions) => {
    setSelectedAdminForTransfer(targetUser);
    setTransferDialogOpen(true);
  };

  const confirmTransferSuperAdmin = () => {
    if (!selectedAdminForTransfer) return;

    // Find current super admin (the logged-in user)
    const currentSuperAdmin = users.find(u => u.role === "SUPER_ADMIN");
    
    setUsers(prevUsers =>
      prevUsers.map(user => {
        // Transfer SUPER_ADMIN to selected admin
        if (user.id === selectedAdminForTransfer.id) {
          return { ...user, role: "SUPER_ADMIN" as UserRole };
        }
        // Demote current super admin to ADMIN
        if (user.id === currentSuperAdmin?.id) {
          return { ...user, role: "ADMIN" as UserRole };
        }
        return user;
      })
    );

    toast.success(`${selectedAdminForTransfer.fullName} est maintenant Super Admin`);
    setTransferDialogOpen(false);
    setSelectedAdminForTransfer(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
            Gestion des accès
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gérez les utilisateurs, rôles et permissions
          </p>
        </div>
        <Button variant="lavcom" className="w-full sm:w-auto self-start">
          <Plus className="h-4 w-4" />
          Ajouter un utilisateur
        </Button>
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
            <TabsTrigger value="permissions" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
              <Table2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Permissions et rôles</span>
              <span className="sm:hidden">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="hierarchy" className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Hiérarchie des rôles</span>
              <span className="sm:hidden">Rôles</span>
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
                  <TableHead>Laveries</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const role = roleConfig[user.role];
                  const RoleIcon = role.icon;
                  const canManage = canManageRole(CURRENT_USER_ROLE, user.role);
                  const canDelete = canDeleteUser(CURRENT_USER_ROLE, user.role);
                  
                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.fullName.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.fullName}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
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
                        {user.laundromats.length > 0 ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{user.laundromats.length} laverie(s)</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                          user.isActive 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            user.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                          )} />
                          {user.isActive ? "Actif" : "Inactif"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={!canManage}>
                              Modifier
                            </DropdownMenuItem>
                            {canManage && (
                              <DropdownMenuItem onClick={() => setActiveTab("permissions")}>
                                Gérer les permissions
                              </DropdownMenuItem>
                            )}
                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  Changer le rôle
                                </DropdownMenuLabel>
                                {(['ADMIN', 'CHECKER', 'USER', 'GUEST'] as UserRole[]).map(r => (
                                  <DropdownMenuItem 
                                    key={r}
                                    onClick={() => handleRoleChange(user.id, r)}
                                    disabled={r === user.role}
                                  >
                                    {ROLE_DESCRIPTIONS[r].label}
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                            <DropdownMenuItem disabled={!canManage}>
                              Gérer les laveries
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {/* Transfer Super Admin option - only visible to Super Admin for Admin users */}
                            {CURRENT_USER_ROLE === "SUPER_ADMIN" && user.role === "ADMIN" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleTransferSuperAdmin(user)}
                                  className="text-primary"
                                >
                                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                                  Transférer Super Admin
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive"
                              disabled={!canDelete}
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <div className="card-lavcom p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Ce tableau affiche les permissions de chaque utilisateur. Utilisez les interrupteurs pour modifier les accès.
              <span className="font-medium text-foreground"> Seuls les Super Admins et Admins peuvent modifier les permissions.</span>
            </p>
            <PermissionsTable 
              users={users}
              currentUserRole={CURRENT_USER_ROLE}
              onPermissionChange={handlePermissionChange}
            />
          </div>
        </TabsContent>

        {/* Hierarchy Tab */}
        <TabsContent value="hierarchy" className="space-y-4">
          <RolesInfoCard />
        </TabsContent>
      </Tabs>

      {/* Transfer Super Admin Confirmation Dialog */}
      <AlertDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <AlertDialogTitle className="text-lg">
                Transférer le statut Super Admin
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3">
              <p>
                Vous êtes sur le point de transférer votre statut de <strong>Super Admin</strong> à{" "}
                <strong>{selectedAdminForTransfer?.fullName}</strong>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm">
                <strong>Attention :</strong> Cette action est irréversible. Vous deviendrez Admin 
                et perdrez vos privilèges de Super Admin.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmTransferSuperAdmin}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Confirmer le transfert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
