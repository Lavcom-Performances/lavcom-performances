import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ScrollText, 
  Search, 
  Eye,
  Shield,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  AlertTriangle,
  Clock,
  Filter,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { Json } from '@/integrations/supabase/types';

interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  details: Json;
  created_at: string;
  admin_email?: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  GRANT_PLATFORM_ROLE: { 
    label: 'Attribution de rôle', 
    icon: <UserPlus className="h-4 w-4" />, 
    color: 'bg-green-500/20 text-green-400 border-green-500/30' 
  },
  REVOKE_PLATFORM_ROLE: { 
    label: 'Révocation de rôle', 
    icon: <UserMinus className="h-4 w-4" />, 
    color: 'bg-red-500/20 text-red-400 border-red-500/30' 
  },
  UPDATE_PERMISSIONS: { 
    label: 'Modification permissions', 
    icon: <Edit className="h-4 w-4" />, 
    color: 'bg-[#7DD3E8]/20 text-[#7DD3E8] border-[#7DD3E8]/30' 
  },
  DELETE_USER: { 
    label: 'Suppression utilisateur', 
    icon: <Trash2 className="h-4 w-4" />, 
    color: 'bg-red-500/20 text-red-400 border-red-500/30' 
  },
  CREATE_ORGANIZATION: { 
    label: 'Création organisation', 
    icon: <Shield className="h-4 w-4" />, 
    color: 'bg-[#A3C615]/20 text-[#A3C615] border-[#A3C615]/30' 
  },
  SECURITY_ALERT: { 
    label: 'Alerte sécurité', 
    icon: <AlertTriangle className="h-4 w-4" />, 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
  },
};

export default function PlatformAdminAuditLogs() {
  const { isPlatformSuperAdmin, isPlatformAdmin } = usePlatformRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch audit logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data: logsData, error } = await query;
      if (error) throw error;

      // Get admin emails
      const adminIds = [...new Set(logsData?.map(l => l.admin_user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', adminIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      return (logsData || []).map(log => ({
        ...log,
        admin_email: emailMap.get(log.admin_user_id) || 'Inconnu',
      })) as AuditLog[];
    },
    enabled: isPlatformSuperAdmin || isPlatformAdmin,
  });

  const getActionBadge = (action: string) => {
    const config = ACTION_CONFIG[action] || { 
      label: action, 
      icon: <Clock className="h-4 w-4" />, 
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' 
    };

    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1.5`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const detailsStr = JSON.stringify(log.details || {}).toLowerCase();
    return (
      log.admin_email?.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      detailsStr.includes(search)
    );
  });

  const exportLogs = () => {
    if (!filteredLogs?.length) return;
    
    const csvContent = [
      ['Date', 'Admin', 'Action', 'Détails'].join(';'),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
        log.admin_email || '',
        log.action,
        JSON.stringify(log.details || {}).replace(/;/g, ','),
      ].join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

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
        title="Logs d'audit | Back-office Plateforme"
        description="Historique des actions administratives"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
              <ScrollText className="h-6 w-6 text-[#7DD3E8]" />
              Logs d'Audit
            </h1>
            <p className="text-[#A8B4D0]">
              Historique complet des actions administratives
            </p>
          </div>
          <Button 
            onClick={exportLogs}
            disabled={!filteredLogs?.length}
            className="bg-gradient-to-r from-[#A3C615] to-[#8AAD12] hover:opacity-90 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <ScrollText className="h-8 w-8 text-[#7DD3E8]" />
                <div>
                  <p className="text-2xl font-bold text-white">{logs?.length || 0}</p>
                  <p className="text-sm text-[#A8B4D0]">Total logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <UserPlus className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {logs?.filter(l => l.action === 'GRANT_PLATFORM_ROLE').length || 0}
                  </p>
                  <p className="text-sm text-[#A8B4D0]">Attributions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <UserMinus className="h-8 w-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {logs?.filter(l => l.action === 'REVOKE_PLATFORM_ROLE').length || 0}
                  </p>
                  <p className="text-sm text-[#A8B4D0]">Révocations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Edit className="h-8 w-8 text-[#FCD259]" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {logs?.filter(l => l.action === 'UPDATE_PERMISSIONS').length || 0}
                  </p>
                  <p className="text-sm text-[#A8B4D0]">Modifications</p>
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
              placeholder="Rechercher par admin, action, détails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#3D4B7A]/50 border-[#5C6B9A] text-white placeholder:text-[#7DD3E8]/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#7DD3E8]" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48 bg-[#3D4B7A]/50 border-[#5C6B9A] text-white">
                <SelectValue placeholder="Filtrer par action" />
              </SelectTrigger>
              <SelectContent className="bg-[#3D4B7A] border-[#5C6B9A]">
                <SelectItem value="all" className="text-white hover:bg-[#5C6B9A]">Toutes les actions</SelectItem>
                <SelectItem value="GRANT_PLATFORM_ROLE" className="text-white hover:bg-[#5C6B9A]">Attribution de rôle</SelectItem>
                <SelectItem value="REVOKE_PLATFORM_ROLE" className="text-white hover:bg-[#5C6B9A]">Révocation de rôle</SelectItem>
                <SelectItem value="UPDATE_PERMISSIONS" className="text-white hover:bg-[#5C6B9A]">Modification permissions</SelectItem>
                <SelectItem value="DELETE_USER" className="text-white hover:bg-[#5C6B9A]">Suppression utilisateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logs table */}
        <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
          <CardHeader>
            <CardTitle className="text-white">Historique des actions</CardTitle>
            <CardDescription className="text-[#A8B4D0]">
              {filteredLogs?.length || 0} entrée{(filteredLogs?.length || 0) > 1 ? 's' : ''} 
              {searchTerm && ' (filtrées)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#5C6B9A]/50 hover:bg-transparent">
                  <TableHead className="text-[#7DD3E8]">Date</TableHead>
                  <TableHead className="text-[#7DD3E8]">Admin</TableHead>
                  <TableHead className="text-[#7DD3E8]">Action</TableHead>
                  <TableHead className="text-[#7DD3E8]">Cible</TableHead>
                  <TableHead className="text-[#7DD3E8] w-20">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-[#5C6B9A]/50">
                      <TableCell><Skeleton className="h-4 w-32 bg-[#5C6B9A]/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40 bg-[#5C6B9A]/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32 bg-[#5C6B9A]/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32 bg-[#5C6B9A]/50" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 bg-[#5C6B9A]/50" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLogs?.length ? (
                  filteredLogs.map((log) => {
                    const details = log.details as Record<string, unknown> | null;
                    const targetEmail = details?.target_email as string || '-';
                    
                    return (
                      <TableRow key={log.id} className="border-[#5C6B9A]/50 hover:bg-[#5C6B9A]/20">
                        <TableCell className="text-[#A8B4D0] text-sm">
                          <div className="flex flex-col">
                            <span className="text-white">{format(new Date(log.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                            <span className="text-xs">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-white">{log.admin_email}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="text-[#A8B4D0]">{targetEmail}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedLog(log)}
                            className="text-[#7DD3E8] hover:text-white hover:bg-[#5C6B9A]/50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-[#A8B4D0]">
                      <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      {searchTerm ? 'Aucun résultat trouvé' : 'Aucun log d\'audit enregistré'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Details dialog */}
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-lg bg-[#3D4B7A] border-[#5C6B9A]">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-[#7DD3E8]" />
                Détails du log
              </DialogTitle>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#7DD3E8] mb-1">Date</p>
                    <p className="text-white">
                      {format(new Date(selectedLog.created_at), 'dd MMMM yyyy à HH:mm:ss', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#7DD3E8] mb-1">Admin</p>
                    <p className="text-white">{selectedLog.admin_email}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-[#7DD3E8] mb-1">Action</p>
                  {getActionBadge(selectedLog.action)}
                </div>

                <div>
                  <p className="text-sm text-[#7DD3E8] mb-2">Détails JSON</p>
                  <pre className="bg-[#2D3B5A] p-4 rounded-lg text-sm text-[#A8B4D0] overflow-auto max-h-48">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
