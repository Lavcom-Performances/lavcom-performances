import { useState } from "react";
import { 
  Activity, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  Timer,
  Server,
  AlertTriangle,
  BarChart3,
  Settings,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { DateRange } from "react-day-picker";
import { ManualCronTrigger } from "@/components/admin/ManualCronTrigger";
import { CronMonitoringDashboard } from "@/components/admin/CronMonitoringDashboard";
import { CronLogsExport } from "@/components/admin/CronLogsExport";
import { CronAlertSettings } from "@/components/admin/CronAlertSettings";
import { AlertHistoryDashboard } from "@/components/admin/AlertHistoryDashboard";

type CronLog = {
  id: string;
  job_name: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  sites_processed: number | null;
  sites_failed: number | null;
  duration_ms: number | null;
  error_message: string | null;
  details: Record<string, unknown> | null;
};

type CronStats = {
  total: number;
  success: number;
  failed: number;
  running: number;
  avgDuration: number;
  successRate: number;
};

const statusConfig = {
  success: { label: "Terminé", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-100" },
  completed: { label: "Terminé", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-100" },
  error: { label: "Échoué", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  failed: { label: "Échoué", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  running: { label: "En cours", icon: RefreshCw, color: "text-primary", bg: "bg-primary/10" },
  partial: { label: "Partiel", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-100" },
  rate_limited: { label: "Rate limité", icon: Clock, color: "text-orange-500", bg: "bg-orange-100" },
};

export default function AdminCronLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Fetch cron logs for table view
  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['cron-logs', dateRange, statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('cron_logs')
        .select('*')
        .gte('started_at', startOfDay(dateRange.from || subDays(new Date(), 7)).toISOString())
        .lte('started_at', endOfDay(dateRange.to || new Date()).toISOString())
        .order('started_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        query = query.ilike('job_name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CronLog[];
    },
  });

  // Fetch 30 days logs for monitoring dashboard
  const { data: monitoringLogs } = useQuery({
    queryKey: ['cron-logs-monitoring'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_logs')
        .select('*')
        .gte('started_at', subDays(new Date(), 30).toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as CronLog[];
    },
  });

  // Calculate stats
  const stats: CronStats = {
    total: logs?.length || 0,
    success: logs?.filter(l => l.status === 'completed').length || 0,
    failed: logs?.filter(l => l.status === 'failed').length || 0,
    running: logs?.filter(l => l.status === 'running').length || 0,
    avgDuration: logs?.filter(l => l.duration_ms)
      .reduce((acc, l, _, arr) => acc + (l.duration_ms || 0) / arr.length, 0) || 0,
    successRate: logs?.length 
      ? Math.round((logs.filter(l => l.status === 'completed').length / logs.length) * 100) 
      : 0,
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
              Logs des tâches planifiées
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Historique et statistiques des exécutions du cron job
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ManualCronTrigger onSuccess={() => refetch()} />
          <CronLogsExport logs={logs || []} disabled={isLoading} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Tabs for Monitoring vs Logs */}
      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monitoring" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Monitoring (30j)
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            Logs détaillés
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            Historique Alertes
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Paramètres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring">
          <CronMonitoringDashboard logs={monitoringLogs || []} />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertHistoryDashboard />
        </TabsContent>

        <TabsContent value="settings">
          <CronAlertSettings />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Total exécutions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Taux de succès
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{stats.successRate}%</div>
                <p className="text-xs text-muted-foreground">{stats.success} réussis, {stats.failed} échoués</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Durée moyenne
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  En cours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{stats.running}</div>
              </CardContent>
            </Card>
          </div>

      {/* Filters */}
      <div className="card-lavcom p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom de job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="success">Terminé</SelectItem>
              <SelectItem value="error">Échoué</SelectItem>
              <SelectItem value="running">En cours</SelectItem>
              <SelectItem value="partial">Partiel</SelectItem>
              <SelectItem value="rate_limited">Rate limité</SelectItem>
            </SelectContent>
          </Select>

          <DateRangePicker 
            dateRange={dateRange} 
            onDateChange={(range) => range && setDateRange(range)}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="card-lavcom overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Démarré</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Sites traités</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!logs?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun log trouvé pour la période sélectionnée
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const status = statusConfig[log.status as keyof typeof statusConfig] || statusConfig.failed;
                  const StatusIcon = status.icon;
                  const isExpanded = expandedRow === log.id;

                  return (
                    <>
                      <TableRow 
                        key={log.id} 
                        className={cn(
                          "hover:bg-muted/30 cursor-pointer",
                          isExpanded && "bg-muted/20"
                        )}
                        onClick={() => toggleRowExpand(log.id)}
                      >
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{log.job_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(log.started_at), "dd MMM yyyy HH:mm:ss", { locale: fr })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatDuration(log.duration_ms)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-medium">
                              {log.sites_processed || 0}
                            </span>
                            {(log.sites_failed ?? 0) > 0 && (
                              <span className="text-destructive">
                                / {log.sites_failed} échoués
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn("gap-1", status.color, status.bg)}
                          >
                            <StatusIcon className={cn("h-3 w-3", log.status === 'running' && "animate-spin")} />
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded details row */}
                      {isExpanded && (
                        <TableRow key={`${log.id}-details`} className="bg-muted/10">
                          <TableCell colSpan={6} className="p-4">
                            <div className="space-y-3">
                              {log.error_message && (
                                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                                  <p className="text-sm font-medium text-destructive mb-1">Message d'erreur</p>
                                  <p className="text-sm text-destructive/80 font-mono">{log.error_message}</p>
                                </div>
                              )}
                              
                              {log.completed_at && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Terminé à</p>
                                    <p className="font-medium">
                                      {format(new Date(log.completed_at), "dd MMM yyyy HH:mm:ss", { locale: fr })}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {log.details && Object.keys(log.details).length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-2">Détails</p>
                                  <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
