import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, AlertTriangle, CheckCircle, Info, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SystemEvent {
  id: number;
  created_at: string;
  env: string;
  source: string;
  severity: string;
  code: string | null;
  message: string;
  meta: Record<string, unknown> | null;
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    badge: 'destructive',
  },
  error: {
    icon: AlertCircle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    badge: 'default',
  },
  warn: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    badge: 'secondary',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    badge: 'outline',
  },
};

const sourceLabels: Record<string, string> = {
  'stripe-webhook': 'Stripe',
  import: 'Import',
  cron: 'Cron',
  auth: 'Auth',
  api: 'API',
};

export function SystemStatusWidget() {
  const { data: events, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['system-events-widget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .in('severity', ['critical', 'error'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as SystemEvent[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: counts } = useQuery({
    queryKey: ['system-events-counts'],
    queryFn: async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get counts for last 24h
      const { data: criticalData } = await supabase
        .from('system_events')
        .select('id', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .gte('created_at', last24h.toISOString());

      const { data: errorData } = await supabase
        .from('system_events')
        .select('id', { count: 'exact', head: true })
        .eq('severity', 'error')
        .gte('created_at', last24h.toISOString());

      return {
        critical: criticalData?.length ?? 0,
        error: errorData?.length ?? 0,
      };
    },
  });

  const hasIssues = (events?.length ?? 0) > 0;
  const hasCritical = events?.some(e => e.severity === 'critical');

  return (
    <Card className={hasCritical ? 'border-red-500/50' : hasIssues ? 'border-orange-500/50' : 'border-green-500/50'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasCritical ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : hasIssues ? (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <CardTitle className="text-base">Statut Système</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/status" className="flex items-center gap-1">
                Détails
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
        <CardDescription>
          {hasCritical
            ? 'Incidents critiques détectés'
            : hasIssues
            ? 'Erreurs récentes'
            : 'Tous les systèmes opérationnels'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        {counts && (counts.critical > 0 || counts.error > 0) && (
          <div className="flex gap-4 mb-4 text-sm">
            {counts.critical > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">{counts.critical} critique(s) / 24h</span>
              </div>
            )}
            {counts.error > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">{counts.error} erreur(s) / 24h</span>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-2">
            {events.map((event) => {
              const config = severityConfig[event.severity as keyof typeof severityConfig] || severityConfig.info;
              const Icon = config.icon;

              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 p-2 rounded-lg ${config.bg}`}
                >
                  <Icon className={`h-4 w-4 mt-0.5 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={config.badge as any} className="text-xs">
                        {sourceLabels[event.source] || event.source}
                      </Badge>
                      {event.code && (
                        <code className="text-xs text-muted-foreground">{event.code}</code>
                      )}
                    </div>
                    <p className="text-sm truncate mt-1">{event.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-600 py-4 justify-center">
            <CheckCircle className="h-5 w-5" />
            <span>Aucun incident récent</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
