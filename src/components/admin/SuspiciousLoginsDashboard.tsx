import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  Shield, 
  ShieldOff, 
  Monitor, 
  Smartphone, 
  Tablet,
  MapPin,
  Clock,
  Bell,
  BellOff,
  RefreshCw,
  Ban
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SuspiciousLogin {
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
  suspicious_reason: string | null;
  user_email?: string;
}

interface BlockedUser {
  id: string;
  user_id: string;
  blocked_at: string;
  blocked_until: string | null;
  reason: string;
  suspicious_count: number;
  user_email?: string;
}

export function SuspiciousLoginsDashboard() {
  const queryClient = useQueryClient();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [selectedBlockedUser, setSelectedBlockedUser] = useState<BlockedUser | null>(null);

  // Fetch suspicious logins
  const { data: suspiciousLogins, isLoading: loadingLogins, refetch: refetchLogins } = useQuery({
    queryKey: ['suspicious-logins-realtime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_login_history')
        .select('*')
        .eq('is_suspicious', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user emails
      const userIds = [...new Set((data || []).map(log => log.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]));

      return (data || []).map(log => ({
        ...log,
        user_email: emailMap.get(log.user_id) || 'Inconnu',
      })) as SuspiciousLogin[];
    },
  });

  // Fetch blocked users
  const { data: blockedUsers, isLoading: loadingBlocked, refetch: refetchBlocked } = useQuery({
    queryKey: ['blocked-admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_blocked_users')
        .select('*')
        .is('unblocked_at', null)
        .order('blocked_at', { ascending: false });

      if (error) throw error;

      // Get user emails
      const userIds = [...new Set((data || []).map(u => u.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]));

      return (data || []).map(user => ({
        ...user,
        user_email: emailMap.get(user.user_id) || 'Inconnu',
      })) as BlockedUser[];
    },
  });

  // Real-time subscription for new suspicious logins
  useEffect(() => {
    const channel = supabase
      .channel('suspicious-logins-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_login_history',
          filter: 'is_suspicious=eq.true',
        },
        async (payload) => {
          // Refetch to get updated data with emails
          await refetchLogins();
          
          if (notificationsEnabled) {
            const newLog = payload.new as SuspiciousLogin;
            toast.error('🚨 Connexion suspecte détectée !', {
              description: `${newLog.suspicious_reason || 'Activité suspecte'} - ${newLog.country || 'Pays inconnu'}`,
              duration: 10000,
              action: {
                label: 'Voir',
                onClick: () => {
                  // Scroll to the dashboard
                  document.getElementById('suspicious-logins-list')?.scrollIntoView({ behavior: 'smooth' });
                },
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notificationsEnabled, refetchLogins]);

  // Real-time subscription for blocked users
  useEffect(() => {
    const channel = supabase
      .channel('blocked-users-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_blocked_users',
        },
        () => {
          refetchBlocked();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchBlocked]);

  const handleManualBlock = async () => {
    if (!selectedUserId) return;

    try {
      const { error } = await supabase
        .from('admin_blocked_users')
        .upsert({
          user_id: selectedUserId,
          blocked_at: new Date().toISOString(),
          reason: 'Blocage manuel par administrateur',
          suspicious_count: 0,
        });

      if (error) throw error;

      toast.success('Utilisateur bloqué avec succès');
      setBlockDialogOpen(false);
      setSelectedUserId(null);
      refetchBlocked();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Erreur lors du blocage');
    }
  };

  const handleUnblock = async () => {
    if (!selectedBlockedUser) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('admin_blocked_users')
        .update({
          unblocked_at: new Date().toISOString(),
          unblocked_by: user?.id,
        })
        .eq('id', selectedBlockedUser.id);

      if (error) throw error;

      toast.success('Utilisateur débloqué avec succès');
      setUnblockDialogOpen(false);
      setSelectedBlockedUser(null);
      refetchBlocked();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Erreur lors du déblocage');
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const stats = {
    total24h: suspiciousLogins?.filter(log => 
      new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length || 0,
    totalBlocked: blockedUsers?.length || 0,
    uniqueUsers: new Set(suspiciousLogins?.map(log => log.user_id)).size,
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Connexions Suspectes - Temps Réel
          </h2>
          <p className="text-sm text-muted-foreground">
            Surveillance en temps réel des activités suspectes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={notificationsEnabled ? 'text-primary' : 'text-muted-foreground'}
          >
            {notificationsEnabled ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
            {notificationsEnabled ? 'Notifications ON' : 'Notifications OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchLogins();
              refetchBlocked();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dernières 24h</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.total24h}</div>
            <p className="text-xs text-muted-foreground">connexions suspectes</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilisateurs bloqués</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.totalBlocked}</div>
            <p className="text-xs text-muted-foreground">actuellement bloqués</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilisateurs impactés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">utilisateurs uniques</p>
          </CardContent>
        </Card>
      </div>

      {/* Blocked users section */}
      {(blockedUsers?.length || 0) > 0 && (
        <Card className="bg-card border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-orange-500" />
              Utilisateurs Bloqués ({blockedUsers?.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {blockedUsers?.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-orange-500/30"
                >
                  <div className="flex items-center gap-3">
                    <Ban className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium text-foreground">{user.user_email}</p>
                      <p className="text-xs text-muted-foreground">
                        Bloqué le {format(new Date(user.blocked_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        {' • '}{user.reason}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBlockedUser(user);
                      setUnblockDialogOpen(true);
                    }}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Débloquer
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspicious logins list */}
      <Card className="bg-card border-border" id="suspicious-logins-list">
        <CardHeader>
          <CardTitle className="text-lg">Historique des Connexions Suspectes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogins ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : suspiciousLogins?.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">Aucune connexion suspecte détectée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suspiciousLogins?.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/30 gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{log.user_email}</span>
                        <Badge variant="destructive" className="text-xs">
                          {log.suspicious_reason || 'Suspect'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                        </span>
                        {log.country && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[log.city, log.region, log.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {getDeviceIcon(log.device_type)}
                          {log.browser} / {log.os}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedUserId(log.user_id);
                      setBlockDialogOpen(true);
                    }}
                    disabled={blockedUsers?.some(u => u.user_id === log.user_id)}
                  >
                    {blockedUsers?.some(u => u.user_id === log.user_id) ? (
                      <>
                        <ShieldOff className="h-4 w-4 mr-2" />
                        Déjà bloqué
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4 mr-2" />
                        Bloquer
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block confirmation dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Bloquer cet utilisateur ?
            </DialogTitle>
            <DialogDescription>
              L'utilisateur ne pourra plus accéder au back-office admin jusqu'à ce qu'il soit débloqué manuellement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleManualBlock}>
              <Ban className="h-4 w-4 mr-2" />
              Confirmer le blocage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock confirmation dialog */}
      <Dialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Débloquer cet utilisateur ?
            </DialogTitle>
            <DialogDescription>
              L'utilisateur pourra à nouveau accéder au back-office admin.
              <br />
              <span className="font-medium">{selectedBlockedUser?.user_email}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnblockDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUnblock} className="bg-green-600 hover:bg-green-700">
              <Shield className="h-4 w-4 mr-2" />
              Confirmer le déblocage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
