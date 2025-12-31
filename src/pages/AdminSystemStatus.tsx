import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, AlertTriangle, AlertCircle, Info, XCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SEOHead } from '@/components/seo/SEOHead';

interface SystemEvent {
  id: number;
  created_at: string;
  env: string;
  source: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
  code: string | null;
  message: string;
  meta: Record<string, unknown> | null;
}

const severityConfig = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Info' },
  warn: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Warning' },
  error: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Erreur' },
  critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critique' },
};

const sourceLabels: Record<string, string> = {
  'stripe-webhook': 'Stripe Webhook',
  'import': 'Import CSV',
  'cron': 'Analytics Cron',
};

export default function AdminSystemStatus() {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const fetchEvents = async () => {
    try {
      let query = supabase
        .from('system_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter);
      }
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents((data as SystemEvent[]) || []);
    } catch (err) {
      console.error('Failed to fetch system events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [sourceFilter, severityFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  // Count by severity for summary
  const counts = events.reduce((acc, e) => {
    acc[e.severity] = (acc[e.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasRecentCritical = events.some(
    e => e.severity === 'critical' && new Date(e.created_at) > new Date(Date.now() - 60 * 60 * 1000)
  );

  return (
    <>
      <SEOHead
        title="Statut Système | Admin"
        description="Surveillance des événements système"
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Statut Système</h1>
            <p className="text-muted-foreground">Derniers événements et incidents système</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className={hasRecentCritical ? 'border-red-500' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Statut Global</CardTitle>
              {hasRecentCritical ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${hasRecentCritical ? 'text-red-500' : 'text-green-500'}`}>
                {hasRecentCritical ? 'Incident' : 'OK'}
              </div>
              <p className="text-xs text-muted-foreground">
                {events.length} événements récents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critiques</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.critical || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Erreurs</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.error || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.warn || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sources</SelectItem>
              <SelectItem value="stripe-webhook">Stripe Webhook</SelectItem>
              <SelectItem value="import">Import CSV</SelectItem>
              <SelectItem value="cron">Analytics Cron</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sévérité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sévérités</SelectItem>
              <SelectItem value="critical">Critique</SelectItem>
              <SelectItem value="error">Erreur</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle>Événements Récents</CardTitle>
            <CardDescription>100 derniers événements système</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>Aucun événement trouvé</p>
                <p className="text-sm">Le système fonctionne normalement</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const config = severityConfig[event.severity];
                  const Icon = config.icon;

                  return (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg border ${config.bg}`}
                    >
                      <div className="flex items-start gap-4">
                        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                            <Badge variant="secondary">
                              {sourceLabels[event.source] || event.source}
                            </Badge>
                            {event.code && (
                              <Badge variant="outline" className="font-mono text-xs">
                                {event.code}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {event.env}
                            </Badge>
                          </div>
                          <p className="mt-1 font-medium">{event.message}</p>
                          {event.meta && Object.keys(event.meta).length > 0 && (
                            <pre className="mt-2 text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(event.meta, null, 2)}
                            </pre>
                          )}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {format(new Date(event.created_at), "dd MMM yyyy 'à' HH:mm:ss", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
