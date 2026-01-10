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
import { ShieldCheck, UserPlus, Crown, Shield, Calculator, Loader2, Trash2, Search } from 'lucide-react';
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
}

export default function PlatformAdminRoles() {
  const queryClient = useQueryClient();
  const { isPlatformSuperAdmin } = usePlatformRole();
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'super_admin' | 'admin' | 'billing'>('admin');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch platform roles with emails
  const { data: roles, isLoading } = useQuery({
    queryKey: ['platform-roles'],
    queryFn: async () => {
      // First get platform_roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('platform_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (rolesError) throw rolesError;

      // Then get emails from profiles
      const userIds = rolesData?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge
      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
      return (rolesData || []).map(r => ({
        ...r,
        email: emailMap.get(r.user_id) || 'Email inconnu',
      })) as PlatformRoleRow[];
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

  // Grant role mutation
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
        toast.success('Rôle attribué avec succès');
        queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
        logAuditMutation.mutate({
          action: 'GRANT_PLATFORM_ROLE',
          details: { target_email: email, role },
        });
        setNewEmail('');
        setDialogOpen(false);
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
      toast.success('Rôle révoqué');
      queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
      logAuditMutation.mutate({
        action: 'REVOKE_PLATFORM_ROLE',
        details: { target_email: email, role },
      });
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0">
            <Crown className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-gradient-to-r from-[#3D4B7A] to-[#5C6B9A] text-white border-0">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      case 'billing':
        return (
          <Badge className="bg-gradient-to-r from-[#A3C615] to-[#8AAD12] text-white border-0">
            <Calculator className="h-3 w-3 mr-1" />
            Comptable
          </Badge>
        );
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const handleGrant = () => {
    if (!newEmail.trim()) {
      toast.error('Veuillez entrer un email');
      return;
    }
    grantRoleMutation.mutate({ email: newEmail.trim(), role: newRole });
  };

  const filteredRoles = roles?.filter(r => 
    !searchTerm || 
    r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isPlatformSuperAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
          <CardContent className="py-12 text-center">
            <ShieldCheck className="h-12 w-12 text-[#7DD3E8]/50 mx-auto mb-4" />
            <p className="text-[#A8B4D0]">
              Seuls les Super Admins peuvent gérer les rôles plateforme.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Gestion des rôles | Back-office Plateforme"
        description="Attribution des rôles plateforme"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
              <ShieldCheck className="h-6 w-6 text-[#7DD3E8]" />
              Rôles Plateforme
            </h1>
            <p className="text-[#A8B4D0]">
              Gérez les accès au back-office Lavcom
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#A3C615] to-[#8AAD12] hover:opacity-90 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Attribuer un rôle
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#3D4B7A] border-[#5C6B9A]">
              <DialogHeader>
                <DialogTitle className="text-white">Attribuer un rôle plateforme</DialogTitle>
                <DialogDescription className="text-[#A8B4D0]">
                  Entrez l'email d'un utilisateur existant et choisissez son rôle.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Email</label>
                  <Input
                    type="email"
                    placeholder="utilisateur@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="bg-[#2D3B5A] border-[#5C6B9A] text-white placeholder:text-[#7DD3E8]/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Rôle</label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as typeof newRole)}>
                    <SelectTrigger className="bg-[#2D3B5A] border-[#5C6B9A] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#3D4B7A] border-[#5C6B9A]">
                      <SelectItem value="super_admin" className="text-white hover:bg-[#5C6B9A]">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-red-500" />
                          Super Admin (accès complet)
                        </div>
                      </SelectItem>
                      <SelectItem value="admin" className="text-white hover:bg-[#5C6B9A]">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-[#7DD3E8]" />
                          Admin (lecture toutes données)
                        </div>
                      </SelectItem>
                      <SelectItem value="billing" className="text-white hover:bg-[#5C6B9A]">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-[#A3C615]" />
                          Comptable (ventes uniquement)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#5C6B9A] text-white hover:bg-[#5C6B9A]/50">
                  Annuler
                </Button>
                <Button onClick={handleGrant} disabled={grantRoleMutation.isPending} className="bg-gradient-to-r from-[#A3C615] to-[#8AAD12] hover:opacity-90">
                  {grantRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Attribuer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {roles?.filter(r => r.role === 'super_admin').length || 0}
                  </p>
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
                  <p className="text-2xl font-bold text-white">
                    {roles?.filter(r => r.role === 'admin').length || 0}
                  </p>
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
                  <p className="text-2xl font-bold text-white">
                    {roles?.filter(r => r.role === 'billing').length || 0}
                  </p>
                  <p className="text-sm text-[#A8B4D0]">Comptables</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-800/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Crown className="h-5 w-5 text-red-400" />
                Super Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[#A8B4D0]">
              Accès complet : toutes les pages admin, gestion des rôles, exports.
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#3D4B7A]/40 to-[#5C6B9A]/20 border-[#5C6B9A]/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Shield className="h-5 w-5 text-[#7DD3E8]" />
                Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[#A8B4D0]">
              Lecture de toutes les données (users, sites, analytics, ventes).
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#A3C615]/20 to-[#8AAD12]/10 border-[#A3C615]/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Calculator className="h-5 w-5 text-[#A3C615]" />
                Comptable
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[#A8B4D0]">
              Accès uniquement aux ventes et factures (lecture seule).
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72 mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7DD3E8]" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#3D4B7A]/50 border-[#5C6B9A] text-white placeholder:text-[#7DD3E8]/50"
          />
        </div>

        {/* Roles table */}
        <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
          <CardHeader>
            <CardTitle className="text-white">Utilisateurs avec rôle plateforme</CardTitle>
            <CardDescription className="text-[#A8B4D0]">
              {roles?.length || 0} utilisateur{(roles?.length || 0) > 1 ? 's' : ''} avec accès admin
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#5C6B9A]/50 hover:bg-transparent">
                  <TableHead className="text-[#7DD3E8]">Email</TableHead>
                  <TableHead className="text-[#7DD3E8]">Rôle</TableHead>
                  <TableHead className="text-[#7DD3E8]">Attribué le</TableHead>
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
                      <TableCell className="font-medium text-white">{r.email}</TableCell>
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
                            if (confirm(`Révoquer le rôle de ${r.email} ?`)) {
                              revokeRoleMutation.mutate({ roleId: r.id, email: r.email || '', role: r.role });
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
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-[#A8B4D0]">
                      {searchTerm ? 'Aucun résultat trouvé' : 'Aucun rôle plateforme configuré'}
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
