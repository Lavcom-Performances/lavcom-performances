import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, ShieldAlert, ShieldX, TrendingUp, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MfaStats {
  total_24h: number;
  verified_24h: number;
  failed_24h: number;
  success_rate: number;
  recent_failures: Array<{
    created_at: string;
    action: string;
    actor_id: string;
  }>;
}

export function MfaMonitoringWidget() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['mfa-monitoring-stats'],
    queryFn: async (): Promise<MfaStats> => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get MFA events from system_events
      const { data: events, error } = await supabase
        .from('system_events')
        .select('code, created_at, meta')
        .eq('source', 'mfa')
        .gte('created_at', last24h.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching MFA stats:', error);
        throw error;
      }

      const verified = events?.filter(e => e.code === 'MFA_CHALLENGE_VERIFIED') || [];
      const failed = events?.filter(e => e.code === 'MFA_CHALLENGE_FAILED') || [];
      const total = verified.length + failed.length;

      // Get recent failures with details
      const recentFailures = failed.slice(0, 5).map(e => ({
        created_at: e.created_at || '',
        action: (e.meta as Record<string, unknown>)?.action as string || 'unknown',
        actor_id: (e.meta as Record<string, unknown>)?.actor_id as string || '',
      }));

      return {
        total_24h: total,
        verified_24h: verified.length,
        failed_24h: failed.length,
        success_rate: total > 0 ? Math.round((verified.length / total) * 100) : 100,
        recent_failures: recentFailures,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-500';
    if (rate >= 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSuccessRateBadge = (rate: number) => {
    if (rate >= 95) return 'default';
    if (rate >= 80) return 'secondary';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">MFA Monitoring</CardTitle>
        </div>
        <CardDescription>
          Vérifications MFA des dernières 24h
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1.5 text-green-500 mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-lg font-semibold">{stats.verified_24h}</span>
                </div>
                <p className="text-xs text-muted-foreground">Vérifiés</p>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1.5 text-red-500 mb-1">
                  <ShieldX className="h-4 w-4" />
                  <span className="text-lg font-semibold">{stats.failed_24h}</span>
                </div>
                <p className="text-xs text-muted-foreground">Échecs</p>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className={`flex items-center justify-center gap-1.5 mb-1 ${getSuccessRateColor(stats.success_rate)}`}>
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-lg font-semibold">{stats.success_rate}%</span>
                </div>
                <p className="text-xs text-muted-foreground">Taux succès</p>
              </div>
            </div>

            {/* Success Rate Badge */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">État global</span>
              <Badge variant={getSuccessRateBadge(stats.success_rate) as 'default' | 'secondary' | 'destructive'}>
                {stats.success_rate >= 95 ? 'Excellent' : stats.success_rate >= 80 ? 'Attention' : 'Alerte'}
              </Badge>
            </div>

            {/* Recent Failures */}
            {stats.failed_24h > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldAlert className="h-4 w-4 text-orange-500" />
                  <span>Échecs récents</span>
                </div>
                <div className="space-y-1.5">
                  {stats.recent_failures.map((failure, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2 bg-red-500/10 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(failure.created_at), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {failure.action}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Activity */}
            {stats.total_24h === 0 && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm">Aucune vérification MFA dans les dernières 24h</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            Impossible de charger les statistiques
          </div>
        )}
      </CardContent>
    </Card>
  );
}
