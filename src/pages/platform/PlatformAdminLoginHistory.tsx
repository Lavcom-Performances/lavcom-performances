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
  History, 
  Search, 
  Shield,
  Monitor,
  Smartphone,
  Tablet,
  AlertTriangle,
  MapPin,
  Filter,
  Download,
  Globe,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePlatformRole } from '@/hooks/usePlatformRole';

interface LoginLog {
  id: string;
  user_id: string;
  created_at: string;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  user_agent: string | null;
  is_suspicious: boolean;
  suspicious_reason: string | null;
  admin_email?: string;
}

export default function PlatformAdminLoginHistory() {
  const { isPlatformSuperAdmin, isPlatformAdmin } = usePlatformRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [suspiciousFilter, setSuspiciousFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<LoginLog | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-login-history', deviceFilter, suspiciousFilter],
    queryFn: async () => {
      let query = supabase
        .from('admin_login_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (deviceFilter !== 'all') {
        query = query.eq('device_type', deviceFilter);
      }

      if (suspiciousFilter === 'suspicious') {
        query = query.eq('is_suspicious', true);
      } else if (suspiciousFilter === 'normal') {
        query = query.eq('is_suspicious', false);
      }

      const { data: logsData, error } = await query;
      if (error) throw error;

      // Get admin emails
      const userIds = [...new Set(logsData?.map(l => l.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      return (logsData || []).map(log => ({
        ...log,
        admin_email: emailMap.get(log.user_id) || 'Inconnu',
      })) as LoginLog[];
    },
    enabled: isPlatformSuperAdmin || isPlatformAdmin,
  });

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.admin_email?.toLowerCase().includes(search) ||
      log.country?.toLowerCase().includes(search) ||
      log.city?.toLowerCase().includes(search) ||
      log.browser?.toLowerCase().includes(search) ||
      log.os?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: logs?.length || 0,
    suspicious: logs?.filter(l => l.is_suspicious).length || 0,
    desktop: logs?.filter(l => l.device_type === 'Desktop').length || 0,
    mobile: logs?.filter(l => l.device_type === 'Mobile').length || 0,
  };

  const exportLogs = () => {
    if (!filteredLogs?.length) return;
    
    const csvContent = [
      ['Date', 'Admin', 'Pays', 'Ville', 'Navigateur', 'OS', 'Appareil', 'Suspect', 'Raison'].join(';'),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
        log.admin_email || '',
        log.country || '',
        log.city || '',
        log.browser || '',
        log.os || '',
        log.device_type || '',
        log.is_suspicious ? 'Oui' : 'Non',
        log.suspicious_reason || '',
      ].join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `admin-logins-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (!isPlatformSuperAdmin && !isPlatformAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
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
        title="Historique des connexions | Back-office Plateforme"
        description="Historique des connexions au back-office admin"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <History className="h-6 w-6 text-primary" />
              Historique des connexions
            </h1>
            <p className="text-muted-foreground">
              Suivi des accès au back-office avec détection d'appareils suspects
            </p>
          </div>
          <Button 
            onClick={exportLogs}
            disabled={!filteredLogs?.length}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Connexions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.suspicious}</p>
                  <p className="text-sm text-muted-foreground">Suspectes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Monitor className="h-8 w-8 text-secondary-foreground" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.desktop}</p>
                  <p className="text-sm text-muted-foreground">Desktop</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Smartphone className="h-8 w-8 text-accent-foreground" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.mobile}</p>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par admin, pays, navigateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-36 bg-background border-input text-foreground">
                <SelectValue placeholder="Appareil" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all" className="text-popover-foreground">Tous</SelectItem>
                <SelectItem value="Desktop" className="text-popover-foreground">Desktop</SelectItem>
                <SelectItem value="Mobile" className="text-popover-foreground">Mobile</SelectItem>
                <SelectItem value="Tablet" className="text-popover-foreground">Tablet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={suspiciousFilter} onValueChange={setSuspiciousFilter}>
              <SelectTrigger className="w-40 bg-background border-input text-foreground">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all" className="text-popover-foreground">Tous</SelectItem>
                <SelectItem value="suspicious" className="text-popover-foreground">Suspects</SelectItem>
                <SelectItem value="normal" className="text-popover-foreground">Normaux</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logs table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Connexions récentes</CardTitle>
            <CardDescription className="text-muted-foreground">
              {filteredLogs?.length || 0} connexion{(filteredLogs?.length || 0) > 1 ? 's' : ''} 
              {searchTerm && ' (filtrées)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Admin</TableHead>
                  <TableHead className="text-muted-foreground">Localisation</TableHead>
                  <TableHead className="text-muted-foreground">Appareil</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground w-20">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell><Skeleton className="h-4 w-32 bg-muted" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40 bg-muted" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32 bg-muted" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 bg-muted" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-muted" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 bg-muted" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLogs?.length ? (
                  filteredLogs.map((log) => (
                    <TableRow 
                      key={log.id} 
                      className={`border-border hover:bg-muted/50 ${log.is_suspicious ? 'bg-destructive/10' : ''}`}
                    >
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex flex-col">
                          <span className="text-foreground">{format(new Date(log.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                          <span className="text-xs">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{log.admin_email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <span>
                            {log.city && log.country 
                              ? `${log.city}, ${log.country}` 
                              : log.country || 'Inconnu'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {getDeviceIcon(log.device_type)}
                          <span className="text-sm">{log.browser} / {log.os}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.is_suspicious ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            Suspect
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="w-fit">
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(log)}
                          className="text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      {searchTerm ? 'Aucun résultat trouvé' : 'Aucune connexion enregistrée'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Details dialog */}
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Détails de la connexion
              </DialogTitle>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date</p>
                    <p className="text-foreground">
                      {format(new Date(selectedLog.created_at), 'dd MMMM yyyy à HH:mm:ss', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Admin</p>
                    <p className="text-foreground">{selectedLog.admin_email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Localisation</p>
                    <p className="text-foreground">
                      {[selectedLog.city, selectedLog.region, selectedLog.country].filter(Boolean).join(', ') || 'Inconnue'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Adresse IP</p>
                    <p className="text-foreground font-mono text-sm">{selectedLog.ip_address || 'Inconnue'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Navigateur</p>
                    <p className="text-foreground">{selectedLog.browser || 'Inconnu'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Système</p>
                    <p className="text-foreground">{selectedLog.os || 'Inconnu'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Appareil</p>
                    <p className="text-foreground">{selectedLog.device_type || 'Inconnu'}</p>
                  </div>
                </div>

                {selectedLog.is_suspicious && (
                  <div className="bg-destructive/20 border border-destructive/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Connexion suspecte</span>
                    </div>
                    <p className="text-sm text-destructive/80">
                      {selectedLog.suspicious_reason || 'Raison inconnue'}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">User Agent</p>
                  <pre className="bg-muted p-4 rounded-lg text-sm text-muted-foreground overflow-auto max-h-24 text-wrap">
                    {selectedLog.user_agent || 'Non disponible'}
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
