import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayCircle, CheckCircle2, XCircle, FileCode2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  runAllImportParserTests, 
  ImportTestSuite, 
  ImportTestResult 
} from '@/lib/csv/importParserTests';

interface ImportParserTestsWidgetProps {
  className?: string;
}

export function ImportParserTestsWidget({ className }: ImportParserTestsWidgetProps) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{
    lmcontrol: ImportTestSuite;
    wiline: ImportTestSuite;
    overall_passed: boolean;
    total_tests: number;
    total_passed: number;
    total_failed: number;
  } | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runTests = async () => {
    setRunning(true);
    setResults(null);

    try {
      // Run tests
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
          failures: [
            ...testResults.lmcontrol.tests.filter(t => !t.ok).map(t => `lmcontrol:${t.test_key}`),
            ...testResults.wiline.tests.filter(t => !t.ok).map(t => `wiline:${t.test_key}`),
          ],
        },
      });

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
        <CardDescription>
          Tests de régression pour les parseurs CSV - détection provider, règles CA, modes de paiement, types produits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button onClick={runTests} disabled={running}>
            {running ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            {running ? 'Exécution...' : 'Lancer Tests Import'}
          </Button>
          
          {lastRun && (
            <span className="text-sm text-muted-foreground">
              Dernier run: {lastRun.toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>

        {running && (
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
                  <div className="text-red-500">{results.total_failed} échec(s)</div>
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
