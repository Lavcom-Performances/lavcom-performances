import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { ShieldCheck, UserPlus, Crown, Shield, Calculator, Loader2, Trash2 } from 'lucide-react';
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

  // Grant role mutation
  const grantRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data, error } = await supabase.rpc('grant_platform_role', {
        p_email: email,
        p_role: role as 'super_admin' | 'admin' | 'billing',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const result = data as { success?: boolean; error?: string };
      if (result.success) {
        toast.success('Rôle attribué avec succès');
        queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
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
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('platform_roles')
        .delete()
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rôle révoqué');
      queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge className="bg-red-500">
            <Crown className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge variant="default">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      case 'billing':
        return (
          <Badge variant="secondary">
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

  if (!isPlatformSuperAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Rôles Plateforme
            </h1>
            <p className="text-muted-foreground">
              Gérez les accès au back-office Lavcom
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Attribuer un rôle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Attribuer un rôle plateforme</DialogTitle>
                <DialogDescription>
                  Entrez l'email d'un utilisateur existant et choisissez son rôle.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="utilisateur@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rôle</label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as typeof newRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-red-500" />
                          Super Admin (accès complet)
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          Admin (lecture toutes données)
                        </div>
                      </SelectItem>
                      <SelectItem value="billing">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          Comptable (ventes uniquement)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleGrant} disabled={grantRoleMutation.isPending}>
                  {grantRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Attribuer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Role descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Crown className="h-5 w-5 text-red-500" />
                Super Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Accès complet : toutes les pages admin, gestion des rôles, exports.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-primary" />
                Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Lecture de toutes les données (users, sites, analytics, ventes).
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-5 w-5" />
                Comptable
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Accès uniquement aux ventes et factures (lecture seule).
            </CardContent>
          </Card>
        </div>

        {/* Roles table */}
        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs avec rôle plateforme</CardTitle>
            <CardDescription>
              {roles?.length || 0} utilisateur{(roles?.length || 0) > 1 ? 's' : ''} avec accès admin
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Attribué le</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : roles?.length ? (
                  roles.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.email}</TableCell>
                      <TableCell>{getRoleBadge(r.role)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(r.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Révoquer le rôle de ${r.email} ?`)) {
                              revokeRoleMutation.mutate(r.id);
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
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Aucun rôle plateforme configuré
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
