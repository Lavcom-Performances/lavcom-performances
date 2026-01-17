import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  PlayCircle, 
  CheckCircle2, 
  XCircle, 
  FileCode2, 
  Loader2,
  Clock,
  RefreshCw,
  Mail,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  runAllImportParserTests, 
  ImportTestSuite, 
  ImportTestResult 
} from '@/lib/csv/importParserTests';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';

interface ImportParserTestsWidgetProps {
  className?: string;
}

interface LastRunInfo {
  executed_at: string;
  severity: string;
  code: string;
  passed: number;
  failed: number;
  total: number;
}

export function ImportParserTestsWidget({ className }: ImportParserTestsWidgetProps) {
  const [running, setRunning] = useState(false);
  const [runningCron, setRunningCron] = useState(false);
  const [lastCronRun, setLastCronRun] = useState<LastRunInfo | null>(null);
  const [loadingLastRun, setLoadingLastRun] = useState(true);
  const [results, setResults] = useState<{
    lmcontrol: ImportTestSuite;
    wiline: ImportTestSuite;
    overall_passed: boolean;
    total_tests: number;
    total_passed: number;
    total_failed: number;
  } | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  // Fetch last cron run status
  const fetchLastCronRun = async () => {
    setLoadingLastRun(true);
    try {
      const { data, error } = await supabase
        .from('system_events')
        .select('created_at, severity, code, meta')
        .eq('source', 'smoke_tests_import')
        .in('code', ['IMPORT_PARSER_TESTS_SUCCESS', 'IMPORT_PARSER_TESTS_FAILED', 'IMPORT_TESTS_PASS', 'IMPORT_TESTS_FAIL'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        const meta = data.meta as Record<string, unknown> | null;
        setLastCronRun({
          executed_at: data.created_at,
          severity: data.severity,
          code: data.code || '',
          passed: (meta?.total_passed as number) || (meta?.lmcontrol_passed as number || 0) + (meta?.wiline_passed as number || 0) || 0,
          failed: (meta?.total_failed as number) || (meta?.lmcontrol_failed as number || 0) + (meta?.wiline_failed as number || 0) || 0,
          total: (meta?.total_tests as number) || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch last cron run:', err);
    } finally {
      setLoadingLastRun(false);
    }
  };

  useEffect(() => {
    fetchLastCronRun();
  }, []);

  const runTests = async () => {
    setRunning(true);
    setResults(null);

    try {
      // Run tests locally
      const testResults = runAllImportParserTests();
      setResults(testResults);
      setLastRun(new Date());

      // Log to system_events
      const severity = testResults.overall_passed ? 'info' : 'error';
      const code = testResults.overall_passed ? 'IMPORT_TESTS_PASS' : 'IMPORT_TESTS_FAIL';
      
      await supabase.rpc('rpc_log_system_event', {
        p_env: 'prod',
        p_source: 'smoke_tests_import',
        p_severity: severity,
        p_code: code,
        p_message: testResults.overall_passed 
          ? `Import parser tests passed: ${testResults.total_passed}/${testResults.total_tests}`
          : `Import parser tests failed: ${testResults.total_failed} failures`,
        p_meta: {
          lmcontrol_passed: testResults.lmcontrol.passed,
          lmcontrol_failed: testResults.lmcontrol.failed,
          wiline_passed: testResults.wiline.passed,
          wiline_failed: testResults.wiline.failed,
          total_tests: testResults.total_tests,
          total_passed: testResults.total_passed,
          total_failed: testResults.total_failed,
          triggered_by: 'manual_local',
          failures: [
            ...testResults.lmcontrol.tests.filter(t => !t.ok).map(t => `lmcontrol:${t.test_key}`),
            ...testResults.wiline.tests.filter(t => !t.ok).map(t => `wiline:${t.test_key}`),
          ],
        },
      });

      // Refresh last run info
      await fetchLastCronRun();

      if (testResults.overall_passed) {
        toast.success(`Tous les tests passés (${testResults.total_passed}/${testResults.total_tests})`);
      } else {
        toast.error(`${testResults.total_failed} test(s) échoué(s)`);
      }
    } catch (err) {
      console.error('Import parser tests failed:', err);
      toast.error('Erreur lors des tests');
    } finally {
      setRunning(false);
    }
  };

  const runCronTests = async () => {
    setRunningCron(true);
    setResults(null);

    try {
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('import-parser-tests-cron', {
        method: 'POST',
      });

      if (error) {
        throw error;
      }

      // Transform the response to match our local test format
      if (data) {
        setResults({
          lmcontrol: data.lmcontrol,
          wiline: data.wiline,
          overall_passed: data.success,
          total_tests: data.summary.total_tests,
          total_passed: data.summary.passed,
          total_failed: data.summary.failed,
        });
        setLastRun(new Date());
        
        // Refresh last run info
        await fetchLastCronRun();

        if (data.success) {
          toast.success(`Tests cron passés (${data.summary.passed}/${data.summary.total_tests})`);
        } else {
          toast.error(`Tests cron: ${data.summary.failed} échec(s) - Alerte envoyée`);
        }
      }
    } catch (err) {
      console.error('Cron import parser tests failed:', err);
      toast.error('Erreur lors des tests cron');
    } finally {
      setRunningCron(false);
    }
  };

  const renderTestSuite = (suite: ImportTestSuite, title: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <FileCode2 className="h-4 w-4" />
          {title}
        </h4>
        <div className="flex items-center gap-2">
          {suite.failed === 0 ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {suite.passed}/{suite.tests.length}
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              {suite.failed} échoué(s)
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{suite.duration_ms}ms</span>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">Test</th>
              <th className="px-3 py-1.5 text-left font-medium">Statut</th>
              <th className="px-3 py-1.5 text-left font-medium">Détails</th>
            </tr>
          </thead>
          <tbody>
            {suite.tests.map((test) => (
              <tr key={test.test_key} className="border-t">
                <td className="px-3 py-1.5 font-mono text-xs">{test.test_key}</td>
                <td className="px-3 py-1.5">
                  {test.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground max-w-[300px] truncate">
                  {test.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode2 className="h-5 w-5" />
          Tests Parsers Import (LM Control + WiLine)
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          Tests de régression quotidiens avec alertes Email/Slack en cas d'échec
          <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
            <Mail className="h-3 w-3" />
            <MessageSquare className="h-3 w-3" />
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last Cron Run Status */}
        <div className="p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Dernier Run Cron</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchLastCronRun}
              disabled={loadingLastRun}
            >
              <RefreshCw className={`h-3 w-3 ${loadingLastRun ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {loadingLastRun ? (
            <Skeleton className="h-6 w-48 mt-2" />
          ) : lastCronRun ? (
            <div className="mt-2 flex items-center gap-3">
              {lastCronRun.severity === 'info' || lastCronRun.code.includes('SUCCESS') || lastCronRun.code.includes('PASS') ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  PASS
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  FAIL
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {lastCronRun.passed}/{lastCronRun.total || (lastCronRun.passed + lastCronRun.failed)} tests
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastCronRun.executed_at), { addSuffix: true, locale: fr })}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Aucun run enregistré</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={runTests} disabled={running || runningCron} variant="outline">
            {running ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            {running ? 'Exécution...' : 'Tests Locaux'}
          </Button>
          
          <Button onClick={runCronTests} disabled={running || runningCron}>
            {runningCron ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            {runningCron ? 'Exécution...' : 'Tests Cron (avec alertes)'}
          </Button>
          
          {lastRun && (
            <span className="text-sm text-muted-foreground">
              Dernier run: {lastRun.toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>

        {(running || runningCron) && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {results && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className={`text-2xl font-bold ${results.overall_passed ? 'text-green-500' : 'text-red-500'}`}>
                {results.overall_passed ? 'PASS' : 'FAIL'}
              </div>
              <div className="text-sm">
                <div>{results.total_passed}/{results.total_tests} tests passés</div>
                {results.total_failed > 0 && (
                  <div className="text-red-500 flex items-center gap-1">
                    {results.total_failed} échec(s)
                    <span className="text-xs text-muted-foreground">
                      (alerte envoyée)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* LM Control Tests */}
            {renderTestSuite(results.lmcontrol, 'LM Control Parser')}

            {/* WiLine Tests */}
            {renderTestSuite(results.wiline, 'WiLine Parser')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
