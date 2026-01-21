/**
 * Permission Tests Widget - TAEX-225
 * 
 * Displays permission regression test status and allows manual trigger (super_admin only).
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, PlayCircle, RefreshCw, CheckCircle2, XCircle, 
  AlertTriangle, ChevronDown, ChevronUp 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TestResult {
  test_key: string;
  category: 'route_access' | 'rls_isolation' | 'feature_flags' | 'platform_tables';
  ok: boolean;
  details: string;
  expected?: unknown;
  actual?: unknown;
  suite?: string;
}

interface TestSuite {
  category: string;
  tests: TestResult[];
  passed: number;
  failed: number;
}

interface TestResponse {
  success: boolean;
  summary: {
    total_tests: number;
    passed: number;
    failed: number;
    duration_ms: number;
    executed_at: string;
  };
  route_access: TestSuite;
  rls_isolation: TestSuite;
  platform_tables: TestSuite;
  feature_flags: TestSuite;
  failed_tests: TestResult[];
}

interface LastRunInfo {
  executed_at: string;
  severity: string;
  code: string;
  passed: number;
  failed: number;
  total: number;
}

interface PermissionTestsWidgetProps {
  className?: string;
}

export function PermissionTestsWidget({ className }: PermissionTestsWidgetProps) {
  const { isPlatformSuperAdmin } = usePlatformRole();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResponse | null>(null);
  const [lastRun, setLastRun] = useState<LastRunInfo | null>(null);
  const [loadingLastRun, setLoadingLastRun] = useState(true);
  const [expandedSuites, setExpandedSuites] = useState<Record<string, boolean>>({});

  // Fetch last cron run info
  const fetchLastCronRun = async () => {
    try {
      setLoadingLastRun(true);
      const { data, error } = await supabase
        .from('system_events')
        .select('created_at, severity, code, meta')
        .eq('source', 'permission_tests')
        .in('code', ['PERMISSION_TESTS_SUCCESS', 'PERMISSION_TESTS_FAILED'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch last permission test run:', error);
        return;
      }

      if (data) {
        const meta = data.meta as Record<string, unknown>;
        const routeAccess = meta?.route_access as { passed: number; failed: number } | undefined;
        const rlsIsolation = meta?.rls_isolation as { passed: number; failed: number } | undefined;
        const platformTables = meta?.platform_tables as { passed: number; failed: number } | undefined;
        const featureFlags = meta?.feature_flags as { passed: number; failed: number } | undefined;

        const passed = (routeAccess?.passed || 0) + (rlsIsolation?.passed || 0) + 
                       (platformTables?.passed || 0) + (featureFlags?.passed || 0);
        const failed = (routeAccess?.failed || 0) + (rlsIsolation?.failed || 0) + 
                       (platformTables?.failed || 0) + (featureFlags?.failed || 0);

        setLastRun({
          executed_at: meta?.executed_at as string || data.created_at,
          severity: data.severity,
          code: data.code || '',
          passed,
          failed,
          total: passed + failed,
        });
      }
    } catch (err) {
      console.error('Error fetching last permission test run:', err);
    } finally {
      setLoadingLastRun(false);
    }
  };

  useEffect(() => {
    fetchLastCronRun();
  }, []);

  const runTests = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('permission-tests-cron');
      
      if (error) throw error;
      
      const response = data as TestResponse;
      setResults(response);
      
      if (response.success) {
        toast.success(`Tous les ${response.summary.total_tests} tests ont réussi`);
      } else {
        toast.error(`${response.summary.failed} test(s) en échec`);
      }
      
      // Refresh last run info
      await fetchLastCronRun();
    } catch (err) {
      console.error('Permission tests failed:', err);
      toast.error('Erreur lors des tests de permissions');
    } finally {
      setRunning(false);
    }
  };

  const toggleSuite = (suite: string) => {
    setExpandedSuites(prev => ({ ...prev, [suite]: !prev[suite] }));
  };

  const renderTestSuite = (suite: TestSuite, suiteKey: string) => {
    const isExpanded = expandedSuites[suiteKey] ?? false;
    const hasFailed = suite.failed > 0;

    return (
      <Collapsible key={suiteKey} open={isExpanded} onOpenChange={() => toggleSuite(suiteKey)}>
        <CollapsibleTrigger asChild>
          <div className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted/50 ${hasFailed ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
            <div className="flex items-center gap-3">
              {hasFailed ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              <span className="font-medium">{suite.category}</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={hasFailed ? "destructive" : "default"} className={!hasFailed ? "bg-green-500" : ""}>
                {suite.passed}/{suite.tests.length}
              </Badge>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 ml-8 space-y-1">
            {suite.tests.map((test) => (
              <div 
                key={test.test_key} 
                className={`flex items-center gap-2 p-2 rounded text-sm ${test.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400 bg-red-500/10'}`}
              >
                {test.ok ? (
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="font-mono text-xs">{test.test_key}</span>
                <span className="text-muted-foreground">—</span>
                <span className="truncate">{test.details}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Tests de Permissions (RLS + Routes)
        </CardTitle>
        <CardDescription>
          Vérification des accès routes, isolation multi-tenant et feature flags
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last cron run status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {loadingLastRun ? (
              <Skeleton className="h-5 w-5 rounded-full" />
            ) : lastRun ? (
              lastRun.code === 'PERMISSION_TESTS_SUCCESS' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )
            ) : (
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <span className="font-medium">Dernier run (cron)</span>
              {loadingLastRun ? (
                <Skeleton className="h-4 w-32 mt-1" />
              ) : lastRun ? (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(lastRun.executed_at), 'dd/MM/yyyy HH:mm', { locale: fr })} — {lastRun.passed}/{lastRun.total} tests
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Jamais exécuté</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchLastCronRun}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {isPlatformSuperAdmin && (
            <Button onClick={runTests} disabled={running}>
              <PlayCircle className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Exécution...' : 'Lancer les tests'}
            </Button>
          )}
        </div>

        {/* Results */}
        {running && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {results && !running && (
          <div className="space-y-4">
            {/* Summary */}
            <div className={`p-4 rounded-lg border ${results.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center gap-3">
                {results.success ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <p className={`font-semibold ${results.success ? 'text-green-600' : 'text-red-600'}`}>
                    {results.success ? 'Tous les tests ont réussi' : `${results.summary.failed} test(s) en échec`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {results.summary.passed}/{results.summary.total_tests} tests — {results.summary.duration_ms}ms
                  </p>
                </div>
              </div>
            </div>

            {/* Test suites */}
            <div className="space-y-2">
              {renderTestSuite(results.route_access, 'route_access')}
              {renderTestSuite(results.rls_isolation, 'rls_isolation')}
              {renderTestSuite(results.platform_tables, 'platform_tables')}
              {renderTestSuite(results.feature_flags, 'feature_flags')}
            </div>

            {/* Failed tests summary */}
            {results.failed_tests.length > 0 && (
              <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Tests en échec ({results.failed_tests.length})
                </h4>
                <div className="space-y-2">
                  {results.failed_tests.map((test, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-mono text-xs text-red-600">{test.test_key}</span>
                      <p className="text-muted-foreground">{test.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info box */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <h4 className="font-medium mb-2">Tests inclus</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Route Access:</strong> Vérification /admin/* pour chaque rôle</li>
            <li>• <strong>RLS Isolation:</strong> RLS activé sur tables critiques</li>
            <li>• <strong>Platform Tables:</strong> Accès platform_* limité aux admins</li>
            <li>• <strong>Feature Flags:</strong> Kill switches appliqués aux endpoints</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
