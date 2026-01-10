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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Key, 
  Search, 
  Users, 
  Building2, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  FileText,
  CreditCard,
  UserCog,
  Shield,
  Loader2,
  AlertCircle,
  Filter,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePlatformRole } from '@/hooks/usePlatformRole';

interface UserPermissionRow {
  id: string;
  user_id: string;
  organization_id: string;
  can_view_sites: boolean;
  can_edit_sites: boolean;
  can_delete_sites: boolean;
  can_import_data: boolean;
  can_export_data: boolean;
  can_delete_data: boolean;
  can_view_reports: boolean;
  can_export_reports: boolean;
  can_invite_members: boolean;
  can_manage_roles: boolean;
  can_view_billing: boolean;
  can_manage_billing: boolean;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
  org_name?: string;
}

interface OrganizationWithMembers {
  id: string;
  name: string;
  owner_id: string;
  owner_email?: string;
  members: UserPermissionRow[];
}

const PERMISSION_GROUPS = [
  {
    title: 'Sites',
    icon: Building2,
    permissions: [
      { key: 'can_view_sites', label: 'Voir les sites', icon: Eye },
      { key: 'can_edit_sites', label: 'Modifier les sites', icon: Edit },
      { key: 'can_delete_sites', label: 'Supprimer les sites', icon: Trash2 },
    ],
  },
  {
    title: 'Données',
    icon: FileText,
    permissions: [
      { key: 'can_import_data', label: 'Importer des données', icon: Upload },
      { key: 'can_export_data', label: 'Exporter des données', icon: Download },
      { key: 'can_delete_data', label: 'Supprimer des données', icon: Trash2 },
    ],
  },
  {
    title: 'Rapports',
    icon: FileText,
    permissions: [
      { key: 'can_view_reports', label: 'Voir les rapports', icon: Eye },
      { key: 'can_export_reports', label: 'Exporter les rapports', icon: Download },
    ],
  },
  {
    title: 'Équipe',
    icon: Users,
    permissions: [
      { key: 'can_invite_members', label: 'Inviter des membres', icon: Users },
      { key: 'can_manage_roles', label: 'Gérer les rôles', icon: UserCog },
    ],
  },
  {
    title: 'Facturation',
    icon: CreditCard,
    permissions: [
      { key: 'can_view_billing', label: 'Voir la facturation', icon: Eye },
      { key: 'can_manage_billing', label: 'Gérer la facturation', icon: CreditCard },
    ],
  },
];

export default function PlatformAdminPermissions() {
  const queryClient = useQueryClient();
  const { isPlatformSuperAdmin, isPlatformAdmin } = usePlatformRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserPermissionRow | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<Partial<UserPermissionRow>>({});

  // Fetch all organizations with their permissions
  const { data: organizations, isLoading } = useQuery({
    queryKey: ['platform-permissions-overview'],
    queryFn: async () => {
      // Get all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');
      
      if (orgsError) throw orgsError;

      // Get all user_permissions
      const { data: permissions, error: permError } = await supabase
        .from('user_permissions')
        .select('*');

      if (permError) throw permError;

      // Get all profiles for emails
      const userIds = [...new Set([
        ...(permissions?.map(p => p.user_id) || []),
        ...(orgs?.map(o => o.owner_id) || []),
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build organization structures
      const result: OrganizationWithMembers[] = (orgs || []).map(org => {
        const orgPermissions = permissions?.filter(p => p.organization_id === org.id) || [];
        const ownerProfile = profileMap.get(org.owner_id);
        
        return {
          id: org.id,
          name: org.name,
          owner_id: org.owner_id,
          owner_email: ownerProfile?.email,
          members: orgPermissions.map(p => {
            const profile = profileMap.get(p.user_id);
            return {
              ...p,
              user_email: profile?.email || 'Email inconnu',
              user_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
            };
          }),
        };
      });

      return result;
    },
    enabled: isPlatformSuperAdmin || isPlatformAdmin,
  });

  // Log audit mutation
  const logAuditMutation = useMutation({
    mutationFn: async ({ action, details }: { action: string; details: Record<string, unknown> }) => {
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

  // Update permissions mutation (only for super_admin)
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ id, updates, userEmail }: { id: string; updates: Partial<UserPermissionRow>; userEmail?: string }) => {
      const { error } = await supabase
        .from('user_permissions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
      return { userEmail, updates };
    },
    onSuccess: ({ userEmail, updates }) => {
      toast.success('Permissions mises à jour');
      queryClient.invalidateQueries({ queryKey: ['platform-permissions-overview'] });
      
      // Log audit
      logAuditMutation.mutate({
        action: 'UPDATE_PERMISSIONS',
        details: { target_email: userEmail || '', changes: updates },
      });
      
      setSelectedUser(null);
      setEditedPermissions({});
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleOpenEdit = (user: UserPermissionRow) => {
    setSelectedUser(user);
    setEditedPermissions({
      can_view_sites: user.can_view_sites,
      can_edit_sites: user.can_edit_sites,
      can_delete_sites: user.can_delete_sites,
      can_import_data: user.can_import_data,
      can_export_data: user.can_export_data,
      can_delete_data: user.can_delete_data,
      can_view_reports: user.can_view_reports,
      can_export_reports: user.can_export_reports,
      can_invite_members: user.can_invite_members,
      can_manage_roles: user.can_manage_roles,
      can_view_billing: user.can_view_billing,
      can_manage_billing: user.can_manage_billing,
    });
  };

  const handleSavePermissions = () => {
    if (!selectedUser) return;
    updatePermissionsMutation.mutate({
      id: selectedUser.id,
      updates: editedPermissions,
      userEmail: selectedUser.user_email,
    });
  };

  const filteredOrganizations = organizations?.filter(org => {
    // Filter by org
    if (orgFilter !== 'all' && org.id !== orgFilter) return false;
    
    // Filter by search
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      org.name.toLowerCase().includes(search) ||
      org.owner_email?.toLowerCase().includes(search) ||
      org.members.some(m => 
        m.user_email?.toLowerCase().includes(search) ||
        m.user_name?.toLowerCase().includes(search)
      )
    );
  });

  const countPermissions = (user: UserPermissionRow) => {
    let count = 0;
    PERMISSION_GROUPS.forEach(group => {
      group.permissions.forEach(perm => {
        if (user[perm.key as keyof UserPermissionRow]) count++;
      });
    });
    return count;
  };

  const totalPermissions = organizations?.reduce((acc, org) => acc + org.members.length, 0) || 0;
  const fullAccessCount = organizations?.reduce((acc, org) => 
    acc + org.members.filter(m => countPermissions(m) === 12).length, 0
  ) || 0;
  const restrictedCount = totalPermissions - fullAccessCount;

  if (!isPlatformSuperAdmin && !isPlatformAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-[#7DD3E8]/50 mx-auto mb-4" />
            <p className="text-[#A8B4D0]">
              Accès réservé aux administrateurs plateforme.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Permissions utilisateurs | Back-office Plateforme"
        description="Gestion des permissions détaillées par organisation"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
              <Key className="h-6 w-6 text-[#7DD3E8]" />
              Permissions Utilisateurs
            </h1>
            <p className="text-[#A8B4D0]">
              Vue détaillée des permissions par organisation
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-[#7DD3E8]" />
                <div>
                  <p className="text-2xl font-bold text-white">{organizations?.length || 0}</p>
                  <p className="text-sm text-[#A8B4D0]">Organisations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-[#A3C615]" />
                <div>
                  <p className="text-2xl font-bold text-white">{totalPermissions}</p>
                  <p className="text-sm text-[#A8B4D0]">Permissions configurées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{fullAccessCount}</p>
                  <p className="text-sm text-[#A8B4D0]">Accès complet</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-[#FCD259]" />
                <div>
                  <p className="text-2xl font-bold text-white">{restrictedCount}</p>
                  <p className="text-sm text-[#A8B4D0]">Accès restreint</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7DD3E8]" />
            <Input
              placeholder="Rechercher par organisation, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#3D4B7A]/50 border-[#5C6B9A] text-white placeholder:text-[#7DD3E8]/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#7DD3E8]" />
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-56 bg-[#3D4B7A]/50 border-[#5C6B9A] text-white">
                <SelectValue placeholder="Filtrer par organisation" />
              </SelectTrigger>
              <SelectContent className="bg-[#3D4B7A] border-[#5C6B9A]">
                <SelectItem value="all" className="text-white hover:bg-[#5C6B9A]">Toutes les organisations</SelectItem>
                {organizations?.map(org => (
                  <SelectItem key={org.id} value={org.id} className="text-white hover:bg-[#5C6B9A]">
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Organizations list */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
                <CardHeader>
                  <Skeleton className="h-6 w-48 bg-[#5C6B9A]/50" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full bg-[#5C6B9A]/50" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrganizations?.length ? (
          <Accordion type="multiple" className="space-y-4">
            {filteredOrganizations.map((org) => (
              <AccordionItem 
                key={org.id} 
                value={org.id}
                className="bg-[#3D4B7A]/30 border border-[#5C6B9A]/50 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:bg-[#5C6B9A]/20 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <Building2 className="h-5 w-5 text-[#7DD3E8]" />
                    <div>
                      <p className="font-semibold text-white">{org.name}</p>
                      <p className="text-sm text-[#A8B4D0]">
                        Propriétaire: {org.owner_email} • {org.members.length} membre{org.members.length !== 1 ? 's' : ''} avec permissions
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {org.members.length === 0 ? (
                    <div className="text-center py-6 text-[#A8B4D0]">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Aucune permission personnalisée configurée</p>
                      <p className="text-sm">Les membres utilisent les permissions par défaut de leur rôle</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#5C6B9A]/50 hover:bg-transparent">
                          <TableHead className="text-[#7DD3E8]">Utilisateur</TableHead>
                          <TableHead className="text-[#7DD3E8]">Permissions</TableHead>
                          <TableHead className="text-[#7DD3E8]">Dernière modification</TableHead>
                          <TableHead className="text-[#7DD3E8] w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {org.members.map((member) => {
                          const permCount = countPermissions(member);
                          const isFullAccess = permCount === 12;
                          
                          return (
                            <TableRow key={member.id} className="border-[#5C6B9A]/50 hover:bg-[#5C6B9A]/20">
                              <TableCell>
                                <div>
                                  <p className="font-medium text-white">{member.user_email}</p>
                                  {member.user_name && (
                                    <p className="text-sm text-[#A8B4D0]">{member.user_name}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={isFullAccess 
                                    ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                    : "bg-[#FCD259]/20 text-[#FCD259] border-[#FCD259]/30"
                                  }
                                >
                                  {isFullAccess ? (
                                    <><CheckCircle className="h-3 w-3 mr-1" /> Accès complet</>
                                  ) : (
                                    <>{permCount} / 12 permissions</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-[#A8B4D0]">
                                {format(new Date(member.updated_at), 'dd MMM yyyy', { locale: fr })}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(member)}
                                  className="text-[#7DD3E8] hover:text-white hover:bg-[#5C6B9A]/50"
                                  disabled={!isPlatformSuperAdmin}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-[#7DD3E8]/50 mx-auto mb-4" />
              <p className="text-[#A8B4D0]">
                {searchTerm ? 'Aucune organisation trouvée' : 'Aucune organisation configurée'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit permissions dialog */}
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-lg bg-[#3D4B7A] border-[#5C6B9A]">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Key className="h-5 w-5 text-[#7DD3E8]" />
                Modifier les permissions
              </DialogTitle>
              <DialogDescription className="text-[#A8B4D0]">
                {selectedUser?.user_email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.title} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#7DD3E8]">
                    <group.icon className="h-4 w-4" />
                    {group.title}
                  </div>
                  <div className="space-y-2 pl-6">
                    {group.permissions.map((perm) => (
                      <div key={perm.key} className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-white/80">
                          <perm.icon className="h-3.5 w-3.5 text-[#7DD3E8]" />
                          {perm.label}
                        </Label>
                        <Switch
                          checked={editedPermissions[perm.key as keyof typeof editedPermissions] as boolean || false}
                          onCheckedChange={(checked) => 
                            setEditedPermissions(prev => ({ ...prev, [perm.key]: checked }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setSelectedUser(null)}
                className="border-[#5C6B9A] text-white hover:bg-[#5C6B9A]/50"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSavePermissions} 
                disabled={updatePermissionsMutation.isPending}
                className="bg-gradient-to-r from-[#A3C615] to-[#8AAD12] hover:opacity-90 text-white"
              >
                {updatePermissionsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
