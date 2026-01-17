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
import { DangerZoneDialog } from '@/components/ui/danger-zone-dialog';
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
    colorClass: 'text-red-600 dark:text-red-400',
    badgeBg: 'bg-red-600 dark:bg-red-500',
    cardBg: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800/30',
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
    colorClass: 'text-cyan-600 dark:text-[#7DD3E8]',
    badgeBg: 'bg-cyan-600 dark:bg-[#3D4B7A]',
    cardBg: 'bg-cyan-50 dark:bg-[#3D4B7A]/20',
    borderColor: 'border-cyan-200 dark:border-[#5C6B9A]/50',
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
    colorClass: 'text-lime-600 dark:text-[#A3C615]',
    badgeBg: 'bg-lime-600 dark:bg-[#A3C615]',
    cardBg: 'bg-lime-50 dark:bg-[#A3C615]/10',
    borderColor: 'border-lime-200 dark:border-[#A3C615]/30',
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
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; email: string; role: string } | null>(null);

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

  // Send invitation email mutation
  const sendInvitationEmailMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-admin-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email, role }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'envoi');
      }

      return response.json();
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
    onSuccess: async ({ data, email, role }) => {
      const result = data as { success?: boolean; error?: string };
      if (result.success) {
        toast.success('Accès accordé avec succès');
        queryClient.invalidateQueries({ queryKey: ['platform-admin-users'] });
        logAuditMutation.mutate({
          action: 'GRANT_ADMIN_ACCESS',
          details: { target_email: email, role },
        });
        
        // Send invitation email
        try {
          await sendInvitationEmailMutation.mutateAsync({ email, role });
          toast.success('Email d\'invitation envoyé');
        } catch {
          toast.info('Accès accordé, mais l\'email n\'a pas pu être envoyé');
        }
        
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
      <Badge className={`${config.badgeBg} text-white border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (!isPlatformSuperAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
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
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Key className="h-6 w-6 text-primary" />
              Permissions Back-office
            </h1>
            <p className="text-muted-foreground">
              Gérez les accès des administrateurs au back-office Lavcom
            </p>
          </div>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <UserPlus className="h-4 w-4 mr-2" />
                Inviter un administrateur
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Inviter un administrateur
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  L'utilisateur doit déjà avoir un compte sur la plateforme. Il recevra un email avec les instructions de connexion.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email de l'utilisateur</label>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Rôle</label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as typeof newRole)}>
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="super_admin" className="text-popover-foreground">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-red-500" />
                          Super Admin — accès complet
                        </div>
                      </SelectItem>
                      <SelectItem value="admin" className="text-popover-foreground">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-cyan-500" />
                          Admin — lecture toutes données
                        </div>
                      </SelectItem>
                      <SelectItem value="billing" className="text-popover-foreground">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-lime-600" />
                          Comptable — ventes et factures
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show permissions for selected role */}
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-primary mb-2">Permissions accordées :</p>
                  <ul className="space-y-1">
                    {ROLE_PERMISSIONS[newRole].permissions.map((perm) => (
                      <li key={perm.key} className="text-sm text-muted-foreground flex items-center gap-2">
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
                  className="border-input text-foreground hover:bg-accent"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleInvite} 
                  disabled={grantRoleMutation.isPending} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.super_admin}</p>
                  <p className="text-sm text-muted-foreground">Super Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-cyan-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.admin}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Calculator className="h-8 w-8 text-lime-600" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.billing}</p>
                  <p className="text-sm text-muted-foreground">Comptables</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Key className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total accès</p>
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
              <Card key={role} className={`${config.cardBg} ${config.borderColor} border`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <Icon className={`h-5 w-5 ${config.colorClass}`} />
                    {config.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {config.permissions.map((perm) => (
                      <li key={perm.key} className="text-sm text-muted-foreground flex items-center gap-2">
                        <perm.icon className="h-3 w-3 text-primary" />
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par email ou nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48 bg-background border-input text-foreground">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all" className="text-popover-foreground">Tous les rôles</SelectItem>
              <SelectItem value="super_admin" className="text-popover-foreground">Super Admin</SelectItem>
              <SelectItem value="admin" className="text-popover-foreground">Admin</SelectItem>
              <SelectItem value="billing" className="text-popover-foreground">Comptable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Administrateurs avec accès</CardTitle>
            <CardDescription className="text-muted-foreground">
              {stats.total} utilisateur{stats.total > 1 ? 's' : ''} avec accès au back-office
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Utilisateur</TableHead>
                  <TableHead className="text-muted-foreground">Rôle</TableHead>
                  <TableHead className="text-muted-foreground">Accès depuis</TableHead>
                  <TableHead className="text-muted-foreground w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell><Skeleton className="h-4 w-48 bg-muted" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 bg-muted" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 bg-muted" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 bg-muted" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredRoles?.length ? (
                  filteredRoles.map((r) => (
                    <TableRow key={r.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{r.email}</p>
                          {(r.first_name || r.last_name) && (
                            <p className="text-sm text-muted-foreground">
                              {r.first_name} {r.last_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(r.role)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(r.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setRevokeTarget({ id: r.id, email: r.email || '', role: r.role })}
                          disabled={revokeRoleMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-border">
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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

        {/* Danger Zone Dialog for role revocation */}
        <DangerZoneDialog
          open={!!revokeTarget}
          onOpenChange={(open) => !open && setRevokeTarget(null)}
          title="Révoquer l'accès administrateur"
          description={
            <>
              Vous êtes sur le point de révoquer l'accès de <strong>{revokeTarget?.email}</strong> au back-office.
              Cette personne ne pourra plus accéder aux fonctionnalités d'administration.
            </>
          }
          confirmText={revokeTarget?.email || ''}
          onConfirm={() => {
            if (revokeTarget) {
              revokeRoleMutation.mutate({ 
                roleId: revokeTarget.id, 
                email: revokeTarget.email, 
                role: revokeTarget.role 
              });
              setRevokeTarget(null);
            }
          }}
          isLoading={revokeRoleMutation.isPending}
          actionLabel="Révoquer l'accès"
          cancelLabel="Annuler"
        />
      </div>
    </>
  );
}
