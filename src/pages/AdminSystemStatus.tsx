import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  RefreshCw, AlertTriangle, AlertCircle, Info, XCircle, CheckCircle2, 
  PlayCircle, Database, ShieldAlert, CreditCard, Loader2, HardDrive 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SEOHead } from '@/components/seo/SEOHead';
import { toast } from 'sonner';
import { ImportParserTestsWidget } from '@/components/admin/ImportParserTestsWidget';
import { RecomputeAnalyticsWidget } from '@/components/admin/RecomputeAnalyticsWidget';
import { DREvidenceWidget } from '@/components/admin/DREvidenceWidget';

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

interface DataQuality {
  total_operations: number;
  missing_site_id: number;
  missing_operation_date: number;
  suspicious_amounts_centimes: number;
  esp_topup_missing_sales_candidates: number;
}

interface SmokeTestResult {
  test_key: string;
  ok: boolean;
  details: string;
}

interface Site {
  id: string;
  name: string;
  city: string | null;
}

const severityConfig = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Info' },
  warn: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Warning' },
  error: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Erreur' },
  critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critique' },
};

const sourceLabels: Record<string, string> = {
  'stripe-webhook': 'Stripe Webhook',
  'stripe_reconcile': 'Stripe Reconcile',
  'import': 'Import CSV',
  'import_rate_limit': 'Import Rate Limit',
  'cron': 'Analytics Cron',
  'smoke-test': 'Smoke Test',
  'smoke_tests_import': 'Import Parser Tests',
  'recompute_analytics': 'Recompute Analytics',
  'site_delete': 'Site Deletion',
  'member_remove': 'Member Removal',
  'backup_drill': 'Backup Drill',
  'dr_drill_reminder': 'DR Drill Reminder',
  'export': 'Export',
};

const testLabels: Record<string, string> = {
  'T1_ops_exist': 'T1: Opérations existent',
  'T2_calendar_kpis': 'T2: KPIs Calendrier',
  'T3_dashboard_kpis': 'T3: Dashboard KPIs',
  'T4_monthly_revenue': 'T4: Revenus mensuels',
  'T5_recommendations': 'T5: Recommandations',
};

export default function AdminSystemStatus() {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Data quality state
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [loadingQuality, setLoadingQuality] = useState(true);

  // Smoke test state
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [smokeTestResults, setSmokeTestResults] = useState<SmokeTestResult[]>([]);
  const [runningSmokeTest, setRunningSmokeTest] = useState(false);

  // Billing health state
  const [runningReconcile, setRunningReconcile] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{
    total_checked: number;
    fixed_count: number;
    anomalies: Record<string, number>;
    last_run?: string;
  } | null>(null);

  // Backup drill state
  const [runningBackupDrill, setRunningBackupDrill] = useState(false);
  const [backupDrillResult, setBackupDrillResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(null);

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

  const fetchDataQuality = async () => {
    try {
      setLoadingQuality(true);
      const { data, error } = await supabase.rpc('rpc_data_quality_check');
      
      if (error) throw error;
      if (data && data.length > 0) {
        setDataQuality(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch data quality:', err);
    } finally {
      setLoadingQuality(false);
    }
  };

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, city')
        .eq('is_demo', false)
        .order('name')
        .limit(50);

      if (error) throw error;
      setSites(data || []);
      if (data && data.length > 0) {
        setSelectedSiteId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch sites:', err);
    }
  };

  const runSmokeTest = async () => {
    if (!selectedSiteId) {
      toast.error('Sélectionnez un site');
      return;
    }

    setRunningSmokeTest(true);
    setSmokeTestResults([]);

    try {
      const { data, error } = await supabase.rpc('rpc_run_smoke_tests', {
        p_site_id: selectedSiteId
      });

      if (error) throw error;

      const results = data as SmokeTestResult[];
      setSmokeTestResults(results);

      // Check for failures
      const failures = results.filter(r => !r.ok);
      if (failures.length > 0) {
        // Log system event for failures
        await supabase.rpc('rpc_log_system_event', {
          p_env: 'prod',
          p_source: 'smoke-test',
          p_severity: 'error',
          p_code: 'SMOKE_FAIL',
          p_message: `Smoke test failed: ${failures.length} test(s) en échec`,
          p_meta: { site_id: selectedSiteId, failures: failures.map(f => f.test_key) }
        });
        toast.error(`${failures.length} test(s) en échec`);
      } else {
        toast.success('Tous les tests sont passés');
      }
    } catch (err) {
      console.error('Smoke test failed:', err);
      toast.error('Erreur lors du smoke test');
    } finally {
      setRunningSmokeTest(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [sourceFilter, severityFilter]);

  useEffect(() => {
    fetchDataQuality();
    fetchSites();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents();
    fetchDataQuality();
  };

  // Count by severity for summary
  const counts = events.reduce((acc, e) => {
    acc[e.severity] = (acc[e.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasRecentCritical = events.some(
    e => e.severity === 'critical' && new Date(e.created_at) > new Date(Date.now() - 60 * 60 * 1000)
  );

  const hasDataQualityIssues = dataQuality && (
    dataQuality.missing_site_id > 0 ||
    dataQuality.missing_operation_date > 0 ||
    dataQuality.suspicious_amounts_centimes > 0
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

        {/* Data Quality Section */}
        <Card className={hasDataQualityIssues ? 'border-orange-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Qualité des Données
            </CardTitle>
            <CardDescription>
              Vérification de la cohérence des opérations (Data Contract)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingQuality ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : dataQuality ? (
              <div className="grid gap-4 md:grid-cols-5">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="text-2xl font-bold">{dataQuality.total_operations.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total opérations</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${dataQuality.missing_site_id > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                  <div className={`text-2xl font-bold ${dataQuality.missing_site_id > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {dataQuality.missing_site_id}
                  </div>
                  <p className="text-xs text-muted-foreground">Site ID manquant</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${dataQuality.missing_operation_date > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                  <div className={`text-2xl font-bold ${dataQuality.missing_operation_date > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {dataQuality.missing_operation_date}
                  </div>
                  <p className="text-xs text-muted-foreground">Date manquante</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${dataQuality.suspicious_amounts_centimes > 0 ? 'bg-orange-500/10' : 'bg-green-500/10'}`}>
                  <div className={`text-2xl font-bold ${dataQuality.suspicious_amounts_centimes > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                    {dataQuality.suspicious_amounts_centimes}
                  </div>
                  <p className="text-xs text-muted-foreground">Montants suspects (centimes?)</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${dataQuality.esp_topup_missing_sales_candidates > 0 ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
                  <div className={`text-2xl font-bold ${dataQuality.esp_topup_missing_sales_candidates > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {dataQuality.esp_topup_missing_sales_candidates}
                  </div>
                  <p className="text-xs text-muted-foreground">ESP topup sans vente</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Données non disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Recompute Analytics Section */}
        <RecomputeAnalyticsWidget />

        {/* Import Parser Tests Section */}
        <ImportParserTestsWidget />

        {/* Smoke Test Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Smoke Test (Tests Anti-Régression)
            </CardTitle>
            <CardDescription>
              Exécuter les 5 tests de cohérence sur un site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Sélectionner un site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name} {site.city && `(${site.city})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={runSmokeTest} 
                disabled={runningSmokeTest || !selectedSiteId}
              >
                <PlayCircle className={`h-4 w-4 mr-2 ${runningSmokeTest ? 'animate-spin' : ''}`} />
                {runningSmokeTest ? 'Exécution...' : 'Lancer Smoke Test'}
              </Button>
            </div>

            {smokeTestResults.length > 0 && (
              <div className="mt-4 border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Test</th>
                      <th className="px-4 py-2 text-left font-medium">Statut</th>
                      <th className="px-4 py-2 text-left font-medium">Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smokeTestResults.map((result) => (
                      <tr key={result.test_key} className="border-t">
                        <td className="px-4 py-3 font-medium">
                          {testLabels[result.test_key] || result.test_key}
                        </td>
                        <td className="px-4 py-3">
                          {result.ok ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              KO
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                          {result.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Health Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Santé Facturation (Stripe ↔ DB)
            </CardTitle>
            <CardDescription>
              Réconciliation des abonnements Stripe avec la base de données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={async () => {
                  setRunningReconcile(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('stripe-reconcile-cron');
                    if (error) throw error;
                    setReconcileResult({
                      ...data,
                      last_run: new Date().toISOString(),
                    });
                    const anomalyValues = Object.values(data.anomalies || {}) as number[];
                    const totalAnomalies = anomalyValues.reduce((a, b) => a + b, 0);
                    if (totalAnomalies > 0 || data.fixed_count > 0) {
                      toast.warning(`${data.fixed_count} correction(s), ${totalAnomalies} anomalie(s) détectée(s)`);
                    } else {
                      toast.success('Réconciliation OK - Aucune anomalie');
                    }
                    fetchEvents();
                  } catch (err) {
                    console.error('Reconcile failed:', err);
                    toast.error('Erreur lors de la réconciliation');
                  } finally {
                    setRunningReconcile(false);
                  }
                }}
                disabled={runningReconcile}
                variant="outline"
              >
                {runningReconcile ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                {runningReconcile ? 'Exécution...' : 'Lancer Réconciliation'}
              </Button>
              {reconcileResult?.last_run && (
                <span className="text-sm text-muted-foreground">
                  Dernier run: {format(new Date(reconcileResult.last_run), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </span>
              )}
            </div>

            {reconcileResult && (
              <div className="grid gap-4 md:grid-cols-4 mt-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="text-2xl font-bold">{reconcileResult.total_checked}</div>
                  <p className="text-xs text-muted-foreground">Abonnements vérifiés</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${reconcileResult.fixed_count > 0 ? 'bg-green-500/10' : 'bg-muted/50'}`}>
                  <div className={`text-2xl font-bold ${reconcileResult.fixed_count > 0 ? 'text-green-500' : ''}`}>
                    {reconcileResult.fixed_count}
                  </div>
                  <p className="text-xs text-muted-foreground">Corrections appliquées</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${(reconcileResult.anomalies?.MISSING_STRIPE_IDS || 0) > 0 ? 'bg-red-500/10' : 'bg-muted/50'}`}>
                  <div className={`text-2xl font-bold ${(reconcileResult.anomalies?.MISSING_STRIPE_IDS || 0) > 0 ? 'text-red-500' : ''}`}>
                    {reconcileResult.anomalies?.MISSING_STRIPE_IDS || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">IDs Stripe manquants</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${(reconcileResult.anomalies?.STATUS_MISMATCH || 0) > 0 ? 'bg-orange-500/10' : 'bg-muted/50'}`}>
                  <div className={`text-2xl font-bold ${(reconcileResult.anomalies?.STATUS_MISMATCH || 0) > 0 ? 'text-orange-500' : ''}`}>
                    {reconcileResult.anomalies?.STATUS_MISMATCH || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Statuts incohérents</p>
                </div>
              </div>
            )}

            {reconcileResult && Object.values(reconcileResult.anomalies || {}).some(v => (v as number) > 0) && (
              <div className="mt-4 p-4 rounded-lg border border-orange-500/30 bg-orange-500/5">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Détail des anomalies
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {Object.entries(reconcileResult.anomalies || {}).map(([key, value]) => (
                    (value as number) > 0 && (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-medium">{value as number}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup Drill Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Backup Drill (Test de Récupération)
            </CardTitle>
            <CardDescription>
              Déclencher manuellement le rappel de test de récupération mensuel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={async () => {
                  setRunningBackupDrill(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('backup-drill-reminder');
                    if (error) throw error;
                    setBackupDrillResult({
                      success: data?.success ?? true,
                      message: data?.message || 'Rappel backup drill enregistré',
                      timestamp: new Date().toISOString(),
                    });
                    toast.success('Rappel backup drill déclenché avec succès');
                    fetchEvents();
                  } catch (err) {
                    console.error('Backup drill failed:', err);
                    toast.error('Erreur lors du déclenchement du backup drill');
                    setBackupDrillResult({
                      success: false,
                      message: err instanceof Error ? err.message : 'Erreur inconnue',
                      timestamp: new Date().toISOString(),
                    });
                  } finally {
                    setRunningBackupDrill(false);
                  }
                }}
                disabled={runningBackupDrill}
                variant="outline"
              >
                {runningBackupDrill ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                {runningBackupDrill ? 'Exécution...' : 'Déclencher Backup Drill'}
              </Button>
              {backupDrillResult?.timestamp && (
                <span className="text-sm text-muted-foreground">
                  Dernier run: {format(new Date(backupDrillResult.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </span>
              )}
            </div>

            {backupDrillResult && (
              <div className={`p-4 rounded-lg ${backupDrillResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div className="flex items-center gap-2">
                  {backupDrillResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`font-medium ${backupDrillResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {backupDrillResult.success ? 'Succès' : 'Échec'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{backupDrillResult.message}</p>
              </div>
            )}

            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-medium mb-2">À propos du Backup Drill</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Rappel automatique le 1er de chaque mois à 08:00 UTC</li>
                <li>• Enregistre un événement dans system_events</li>
                <li>• Envoie un email aux administrateurs (si configuré)</li>
                <li>• Consulter <code className="bg-muted px-1 rounded">docs/ops/backup-restore.md</code> pour la procédure</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* DR Evidence Section */}
        <DREvidenceWidget />

        <div className="flex gap-4">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sources</SelectItem>
              <SelectItem value="stripe-webhook">Stripe Webhook</SelectItem>
              <SelectItem value="stripe_reconcile">Stripe Reconcile</SelectItem>
              <SelectItem value="import">Import CSV</SelectItem>
              <SelectItem value="cron">Analytics Cron</SelectItem>
              <SelectItem value="smoke-test">Smoke Test</SelectItem>
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
