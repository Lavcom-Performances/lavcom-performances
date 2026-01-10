import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/seo/SEOHead';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Key, 
  Search, 
  Crown, 
  Shield, 
  Calculator,
  Loader2,
  UserPlus,
  Mail,
  Trash2,
  Eye,
  Edit,
  FileText,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePlatformRole } from '@/hooks/usePlatformRole';

interface PlatformRoleRow {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'billing';
  created_at: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

// Permission definitions for each role
const ROLE_PERMISSIONS = {
  super_admin: {
    label: 'Super Admin',
    icon: Crown,
    color: 'text-red-400',
    bgColor: 'bg-gradient-to-r from-red-500 to-red-600',
    borderColor: 'border-red-800/30',
    bgCard: 'from-red-900/20 to-red-800/10',
    permissions: [
      { key: 'all_pages', label: 'Accès à toutes les pages', icon: Eye },
      { key: 'manage_roles', label: 'Gérer les rôles et permissions', icon: Shield },
      { key: 'manage_users', label: 'Gérer tous les utilisateurs', icon: Settings },
      { key: 'view_billing', label: 'Voir la facturation', icon: FileText },
      { key: 'export_data', label: 'Exporter toutes les données', icon: FileText },
      { key: 'invite_admins', label: 'Inviter des administrateurs', icon: UserPlus },
    ],
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'text-[#7DD3E8]',
    bgColor: 'bg-gradient-to-r from-[#3D4B7A] to-[#5C6B9A]',
    borderColor: 'border-[#5C6B9A]/50',
    bgCard: 'from-[#3D4B7A]/40 to-[#5C6B9A]/20',
    permissions: [
      { key: 'view_users', label: 'Voir tous les utilisateurs', icon: Eye },
      { key: 'view_sites', label: 'Voir toutes les laveries', icon: Eye },
      { key: 'view_analytics', label: 'Voir les analytics', icon: Eye },
      { key: 'view_sales', label: 'Voir les ventes', icon: Eye },
      { key: 'export_data', label: 'Exporter les données', icon: FileText },
    ],
  },
  billing: {
    label: 'Comptable',
    icon: Calculator,
    color: 'text-[#A3C615]',
    bgColor: 'bg-gradient-to-r from-[#A3C615] to-[#8AAD12]',
    borderColor: 'border-[#A3C615]/30',
    bgCard: 'from-[#A3C615]/20 to-[#8AAD12]/10',
    permissions: [
      { key: 'view_sales', label: 'Voir les ventes', icon: Eye },
      { key: 'view_invoices', label: 'Voir les factures', icon: FileText },
      { key: 'export_billing', label: 'Exporter la facturation', icon: FileText },
    ],
  },
};

export default function PlatformAdminPermissions() {
  const queryClient = useQueryClient();
  const { isPlatformSuperAdmin } = usePlatformRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'super_admin' | 'admin' | 'billing'>('admin');

  // Fetch platform roles with user info
  const { data: roles, isLoading } = useQuery({
    queryKey: ['platform-admin-users'],
    queryFn: async () => {
      const { data: rolesData, error: rolesError } = await supabase
        .from('platform_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (rolesError) throw rolesError;

      const userIds = rolesData?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return (rolesData || []).map(r => {
        const profile = profileMap.get(r.user_id);
        return {
          ...r,
          email: profile?.email || 'Email inconnu',
          first_name: profile?.first_name,
          last_name: profile?.last_name,
        };
      }) as PlatformRoleRow[];
    },
    enabled: isPlatformSuperAdmin,
  });

  // Log audit mutation
  const logAuditMutation = useMutation({
    mutationFn: async ({ action, details }: { action: string; details: Record<string, string> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase
        .from('admin_audit_logs')
        .insert([{
          admin_user_id: user.id,
          action,
          details: details as unknown as Json,
        }]);
    },
  });

  // Grant role mutation (invite)
  const grantRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data, error } = await supabase.rpc('grant_platform_role', {
        p_email: email,
        p_role: role as 'super_admin' | 'admin' | 'billing',
      });
      if (error) throw error;
      return { data, email, role };
    },
    onSuccess: ({ data, email, role }) => {
      const result = data as { success?: boolean; error?: string };
      if (result.success) {
        toast.success('Accès accordé avec succès');
        queryClient.invalidateQueries({ queryKey: ['platform-admin-users'] });
        logAuditMutation.mutate({
          action: 'GRANT_ADMIN_ACCESS',
          details: { target_email: email, role },
        });
        setNewEmail('');
        setInviteDialogOpen(false);
      } else {
        toast.error(result.error || 'Erreur lors de l\'attribution');
      }
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Revoke role mutation
  const revokeRoleMutation = useMutation({
    mutationFn: async ({ roleId, email, role }: { roleId: string; email: string; role: string }) => {
      const { error } = await supabase
        .from('platform_roles')
        .delete()
        .eq('id', roleId);
      if (error) throw error;
      return { email, role };
    },
    onSuccess: ({ email, role }) => {
      toast.success('Accès révoqué');
      queryClient.invalidateQueries({ queryKey: ['platform-admin-users'] });
      logAuditMutation.mutate({
        action: 'REVOKE_ADMIN_ACCESS',
        details: { target_email: email, role },
      });
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleInvite = () => {
    if (!newEmail.trim()) {
      toast.error('Veuillez entrer un email');
      return;
    }
    grantRoleMutation.mutate({ email: newEmail.trim(), role: newRole });
  };

  const filteredRoles = roles?.filter(r => {
    if (roleFilter !== 'all' && r.role !== roleFilter) return false;
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      r.email?.toLowerCase().includes(search) ||
      r.first_name?.toLowerCase().includes(search) ||
      r.last_name?.toLowerCase().includes(search)
    );
  });

  const stats = {
    super_admin: roles?.filter(r => r.role === 'super_admin').length || 0,
    admin: roles?.filter(r => r.role === 'admin').length || 0,
    billing: roles?.filter(r => r.role === 'billing').length || 0,
    total: roles?.length || 0,
  };

  const getRoleBadge = (role: 'super_admin' | 'admin' | 'billing') => {
    const config = ROLE_PERMISSIONS[role];
    const Icon = config.icon;
    return (
      <Badge className={`${config.bgColor} text-white border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (!isPlatformSuperAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-[#7DD3E8]/50 mx-auto mb-4" />
            <p className="text-[#A8B4D0]">
              Seuls les Super Admins peuvent gérer les permissions du back-office.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Permissions Back-office | Administration"
        description="Gestion des accès au back-office Lavcom"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
              <Key className="h-6 w-6 text-[#7DD3E8]" />
              Permissions Back-office
            </h1>
            <p className="text-[#A8B4D0]">
              Gérez les accès des administrateurs au back-office Lavcom
            </p>
          </div>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#A3C615] to-[#8AAD12] hover:opacity-90 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Inviter un administrateur
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#2D3B5A] border-[#5C6B9A]">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[#7DD3E8]" />
                  Inviter un administrateur
                </DialogTitle>
                <DialogDescription className="text-[#A8B4D0]">
                  L'utilisateur doit déjà avoir un compte sur la plateforme. Il recevra les accès au back-office selon le rôle attribué.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Email de l'utilisateur</label>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="bg-[#3D4B7A] border-[#5C6B9A] text-white placeholder:text-[#7DD3E8]/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Rôle</label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as typeof newRole)}>
                    <SelectTrigger className="bg-[#3D4B7A] border-[#5C6B9A] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#3D4B7A] border-[#5C6B9A]">
                      <SelectItem value="super_admin" className="text-white hover:bg-[#5C6B9A]">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-red-400" />
                          Super Admin — accès complet
                        </div>
                      </SelectItem>
                      <SelectItem value="admin" className="text-white hover:bg-[#5C6B9A]">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-[#7DD3E8]" />
                          Admin — lecture toutes données
                        </div>
                      </SelectItem>
                      <SelectItem value="billing" className="text-white hover:bg-[#5C6B9A]">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-[#A3C615]" />
                          Comptable — ventes et factures
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show permissions for selected role */}
                <div className="mt-4 p-4 bg-[#3D4B7A]/50 rounded-lg">
                  <p className="text-sm font-medium text-[#7DD3E8] mb-2">Permissions accordées :</p>
                  <ul className="space-y-1">
                    {ROLE_PERMISSIONS[newRole].permissions.map((perm) => (
                      <li key={perm.key} className="text-sm text-[#A8B4D0] flex items-center gap-2">
                        <perm.icon className="h-3 w-3" />
                        {perm.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setInviteDialogOpen(false)} 
                  className="border-[#5C6B9A] text-white hover:bg-[#5C6B9A]/50"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleInvite} 
                  disabled={grantRoleMutation.isPending} 
                  className="bg-gradient-to-r from-[#A3C615] to-[#8AAD12] hover:opacity-90"
                >
                  {grantRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Inviter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.super_admin}</p>
                  <p className="text-sm text-[#A8B4D0]">Super Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-[#7DD3E8]" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.admin}</p>
                  <p className="text-sm text-[#A8B4D0]">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Calculator className="h-8 w-8 text-[#A3C615]" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.billing}</p>
                  <p className="text-sm text-[#A8B4D0]">Comptables</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Key className="h-8 w-8 text-[#FCD259]" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-sm text-[#A8B4D0]">Total accès</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role permissions cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {(['super_admin', 'admin', 'billing'] as const).map((role) => {
            const config = ROLE_PERMISSIONS[role];
            const Icon = config.icon;
            return (
              <Card key={role} className={`bg-gradient-to-br ${config.bgCard} ${config.borderColor} border`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    {config.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {config.permissions.map((perm) => (
                      <li key={perm.key} className="text-sm text-[#A8B4D0] flex items-center gap-2">
                        <perm.icon className="h-3 w-3 text-[#7DD3E8]" />
                        {perm.label}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7DD3E8]" />
            <Input
              placeholder="Rechercher par email ou nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#3D4B7A]/50 border-[#5C6B9A] text-white placeholder:text-[#7DD3E8]/50"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48 bg-[#3D4B7A]/50 border-[#5C6B9A] text-white">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent className="bg-[#3D4B7A] border-[#5C6B9A]">
              <SelectItem value="all" className="text-white hover:bg-[#5C6B9A]">Tous les rôles</SelectItem>
              <SelectItem value="super_admin" className="text-white hover:bg-[#5C6B9A]">Super Admin</SelectItem>
              <SelectItem value="admin" className="text-white hover:bg-[#5C6B9A]">Admin</SelectItem>
              <SelectItem value="billing" className="text-white hover:bg-[#5C6B9A]">Comptable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users table */}
        <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
          <CardHeader>
            <CardTitle className="text-white">Administrateurs avec accès</CardTitle>
            <CardDescription className="text-[#A8B4D0]">
              {stats.total} utilisateur{stats.total > 1 ? 's' : ''} avec accès au back-office
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#5C6B9A]/50 hover:bg-transparent">
                  <TableHead className="text-[#7DD3E8]">Utilisateur</TableHead>
                  <TableHead className="text-[#7DD3E8]">Rôle</TableHead>
                  <TableHead className="text-[#7DD3E8]">Accès depuis</TableHead>
                  <TableHead className="text-[#7DD3E8] w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="border-[#5C6B9A]/50">
                      <TableCell><Skeleton className="h-4 w-48 bg-[#5C6B9A]/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 bg-[#5C6B9A]/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 bg-[#5C6B9A]/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 bg-[#5C6B9A]/50" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredRoles?.length ? (
                  filteredRoles.map((r) => (
                    <TableRow key={r.id} className="border-[#5C6B9A]/50 hover:bg-[#5C6B9A]/20">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{r.email}</p>
                          {(r.first_name || r.last_name) && (
                            <p className="text-sm text-[#A8B4D0]">
                              {r.first_name} {r.last_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(r.role)}</TableCell>
                      <TableCell className="text-sm text-[#A8B4D0]">
                        {format(new Date(r.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={() => {
                            if (confirm(`Révoquer l'accès de ${r.email} ?`)) {
                              revokeRoleMutation.mutate({ 
                                roleId: r.id, 
                                email: r.email || '', 
                                role: r.role 
                              });
                            }
                          }}
                          disabled={revokeRoleMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-[#5C6B9A]/50">
                    <TableCell colSpan={4} className="text-center py-8 text-[#A8B4D0]">
                      {searchTerm || roleFilter !== 'all' 
                        ? 'Aucun utilisateur trouvé avec ces critères' 
                        : 'Aucun administrateur configuré'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
