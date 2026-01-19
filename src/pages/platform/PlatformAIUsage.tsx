import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Bot, 
  Users, 
  DollarSign, 
  Zap, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/seo/SEOHead';
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
  TableRow,
} from '@/components/ui/table';
import { useAdminAIUsage, useAIRateLimitEvents } from '@/hooks/useAIUsage';

type DateRangeOption = '1d' | '7d' | '30d';

export default function PlatformAIUsage() {
  const [dateRange, setDateRange] = useState<DateRangeOption>('7d');
  
  const getDateRange = () => {
    const end = new Date().toISOString().split('T')[0];
    const days = dateRange === '1d' ? 0 : dateRange === '7d' ? 6 : 29;
    const start = subDays(new Date(), days).toISOString().split('T')[0];
    return { start, end };
  };

  const range = getDateRange();
  const { data: usageData, isLoading: usageLoading, refetch: refetchUsage } = useAdminAIUsage(range);
  const { data: rateLimitEvents, isLoading: eventsLoading, refetch: refetchEvents } = useAIRateLimitEvents(100);

  // Aggregate stats
  const stats = usageData?.reduce((acc, row) => ({
    totalRequests: acc.totalRequests + row.request_count,
    totalCost: acc.totalCost + row.estimated_cost_eur,
    totalTokensIn: acc.totalTokensIn + row.tokens_in,
    totalTokensOut: acc.totalTokensOut + row.tokens_out,
    uniqueUsers: acc.uniqueUsers.add(row.actor_id),
  }), {
    totalRequests: 0,
    totalCost: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    uniqueUsers: new Set<string>(),
  });

  // Group by user for the table
  const userStats = usageData?.reduce((acc, row) => {
    const existing = acc.get(row.actor_id);
    if (existing) {
      existing.request_count += row.request_count;
      existing.estimated_cost_eur += row.estimated_cost_eur;
      existing.tokens_in += row.tokens_in;
      existing.tokens_out += row.tokens_out;
    } else {
      acc.set(row.actor_id, { ...row });
    }
    return acc;
  }, new Map<string, typeof usageData[0]>());

  const sortedUserStats = userStats 
    ? Array.from(userStats.values()).sort((a, b) => b.request_count - a.request_count)
    : [];

  const handleRefresh = () => {
    refetchUsage();
    refetchEvents();
  };

  return (
    <>
      <SEOHead 
        title="Utilisation IA | Admin"
        description="Monitoring de l'utilisation de l'IA"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              Utilisation IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitoring des requêtes AI, quotas et événements de limitation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Aujourd'hui</SelectItem>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Requêtes
              </CardTitle>
              <Zap className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalRequests.toLocaleString() ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Coût Estimé
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalCost.toFixed(2) ?? '0.00'}€</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Utilisateurs Actifs
              </CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats?.uniqueUsers.size ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Events Rate Limit
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{rateLimitEvents?.length ?? 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usage by User */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Utilisation par utilisateur
              </CardTitle>
              <CardDescription>
                Top utilisateurs sur la période sélectionnée
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead className="text-right">Requêtes</TableHead>
                      <TableHead className="text-right">Coût</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUserStats.slice(0, 10).map((row) => (
                      <TableRow key={row.actor_id}>
                        <TableCell className="font-mono text-xs">
                          {row.actor_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-right">
                          {row.request_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.estimated_cost_eur.toFixed(2)}€
                        </TableCell>
                      </TableRow>
                    ))}
                    {sortedUserStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Aucune donnée d'utilisation
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Rate Limit Events */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Événements de limitation
              </CardTitle>
              <CardDescription>
                Derniers événements de rate limit et quota
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {rateLimitEvents?.slice(0, 20).map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={event.severity === 'error' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {event.code}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {event.message.slice(0, 50)}...
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {event.created_at && format(new Date(event.created_at), 'dd/MM HH:mm', { locale: fr })}
                      </span>
                    </div>
                  ))}
                  {(!rateLimitEvents || rateLimitEvents.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      Aucun événement de limitation
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Token Stats */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Statistiques Tokens</CardTitle>
            <CardDescription>
              Consommation de tokens sur la période
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Tokens Entrée</p>
                <p className="text-2xl font-bold">{stats?.totalTokensIn.toLocaleString() ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tokens Sortie</p>
                <p className="text-2xl font-bold">{stats?.totalTokensOut.toLocaleString() ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold">
                  {((stats?.totalTokensIn ?? 0) + (stats?.totalTokensOut ?? 0)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coût Moyen/Requête</p>
                <p className="text-2xl font-bold">
                  {stats && stats.totalRequests > 0 
                    ? (stats.totalCost / stats.totalRequests).toFixed(4) 
                    : '0.0000'}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
