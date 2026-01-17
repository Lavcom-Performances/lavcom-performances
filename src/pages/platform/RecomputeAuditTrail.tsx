import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  History,
  Search,
  Filter,
  Clock,
  Database,
  User,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { SEOHead } from '@/components/seo/SEOHead';

interface RecomputeEvent {
  id: number;
  created_at: string;
  severity: 'info' | 'warn' | 'error';
  code: string | null;
  message: string;
  meta: {
    actor?: string;
    site_id?: string;
    site_name?: string;
    date_from?: string;
    date_to?: string;
    duration_ms?: number;
    operations_processed?: number;
    daily_records_written?: number;
    kpi_records_written?: number;
    force_bypass?: boolean;
    range_days?: number;
  } | null;
}

interface Site {
  id: string;
  name: string;
}

export default function RecomputeAuditTrail() {
  const [events, setEvents] = useState<RecomputeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  
  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [forceBypassFilter, setForceBypassFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch sites
  useEffect(() => {
    const fetchSites = async () => {
      const { data } = await supabase
        .from('sites')
        .select('id, name')
        .eq('is_demo', false)
        .order('name')
        .limit(500);
      setSites(data || []);
    };
    fetchSites();
  }, []);

  // Fetch recompute events
  const fetchEvents = async () => {
    setRefreshing(true);
    try {
      let query = supabase
        .from('system_events')
        .select('*')
        .eq('source', 'recompute_analytics')
        .order('created_at', { ascending: false })
        .limit(500);

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents((data as RecomputeEvent[]) || []);
    } catch (err) {
      console.error('Failed to fetch recompute events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [dateRange, severityFilter]);

  // Apply client-side filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Site filter
      if (selectedSiteId !== 'all' && event.meta?.site_id !== selectedSiteId) {
        return false;
      }
      
      // Force bypass filter
      if (forceBypassFilter === 'bypass' && !event.meta?.force_bypass) {
        return false;
      }
      if (forceBypassFilter === 'normal' && event.meta?.force_bypass) {
        return false;
      }
      
      // Search query
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const siteName = event.meta?.site_name?.toLowerCase() || '';
        const message = event.message.toLowerCase();
        const actor = event.meta?.actor?.toLowerCase() || '';
        if (!siteName.includes(search) && !message.includes(search) && !actor.includes(search)) {
          return false;
        }
      }
      
      return true;
    });
  }, [events, selectedSiteId, forceBypassFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredEvents.length;
    const success = filteredEvents.filter(e => e.severity === 'info' && e.code === 'RECOMPUTE_SUCCESS').length;
    const forceBypassed = filteredEvents.filter(e => e.meta?.force_bypass).length;
    const errors = filteredEvents.filter(e => e.severity === 'error').length;
    const totalOperations = filteredEvents.reduce((acc, e) => acc + (e.meta?.operations_processed || 0), 0);
    const avgDuration = filteredEvents.length > 0
      ? Math.round(filteredEvents.reduce((acc, e) => acc + (e.meta?.duration_ms || 0), 0) / filteredEvents.length)
      : 0;
    
    return { total, success, forceBypassed, errors, totalOperations, avgDuration };
  }, [filteredEvents]);

  const getSeverityBadge = (severity: string, code?: string | null) => {
    if (severity === 'info' && code === 'RECOMPUTE_SUCCESS') {
      return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Succès</Badge>;
    }
    if (severity === 'info' && code === 'RECOMPUTE_FORCE_BYPASS') {
      return <Badge className="bg-amber-500"><AlertTriangle className="h-3 w-3 mr-1" /> Force Bypass</Badge>;
    }
    if (severity === 'warn') {
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700"><AlertTriangle className="h-3 w-3 mr-1" /> Warning</Badge>;
    }
    if (severity === 'error') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Erreur</Badge>;
    }
    return <Badge variant="outline">{code || severity}</Badge>;
  };

  return (
    <>
      <SEOHead
        title="Audit Trail Recompute | Admin"
        description="Historique des recalculs analytics"
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-8 w-8" />
              Audit Trail - Recompute Analytics
            </h1>
            <p className="text-muted-foreground">
              Historique complet des opérations de recalcul analytics
            </p>
          </div>
          <Button onClick={fetchEvents} variant="outline" disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Succès</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">Force Bypass</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.forceBypassed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Erreurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Opérations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOperations.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Durée Moy.</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgDuration}ms</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {/* Search */}
              <div className="space-y-2">
                <Label>Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Site, message, acteur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Période</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yy", { locale: fr })} -{" "}
                            {format(dateRange.to, "dd/MM/yy", { locale: fr })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yy", { locale: fr })
                        )
                      ) : (
                        "Période"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Site Filter */}
              <div className="space-y-2">
                <Label>Site</Label>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les sites</SelectItem>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Force Bypass Filter */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={forceBypassFilter} onValueChange={setForceBypassFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="normal">Normal (&lt;90j)</SelectItem>
                    <SelectItem value="bypass">Force Bypass</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Severity Filter */}
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="info">Succès</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Erreur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historique ({filteredEvents.length} événements)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun événement de recalcul trouvé
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Opérations</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Acteur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono text-sm whitespace-nowrap">
                          {format(parseISO(event.created_at), "dd/MM/yy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getSeverityBadge(event.severity, event.code)}
                            {event.meta?.force_bypass && (
                              <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                                <AlertTriangle className="h-2 w-2 mr-1" />
                                Bypass
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{event.meta?.site_name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm whitespace-nowrap">
                          {event.meta?.date_from && event.meta?.date_to ? (
                            <>
                              {event.meta.date_from} → {event.meta.date_to}
                              <span className="text-muted-foreground ml-1">
                                ({event.meta.range_days}j)
                              </span>
                            </>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {event.meta?.operations_processed?.toLocaleString() || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-sm">
                              {event.meta?.duration_ms ? `${event.meta.duration_ms}ms` : '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[120px]" title={event.meta?.actor}>
                              {event.meta?.actor?.split('@')[0] || '-'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
