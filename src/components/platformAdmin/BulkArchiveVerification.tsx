import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  FileCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Download,
  Calendar,
  Shield,
  FileWarning,
} from 'lucide-react';
import { toast } from 'sonner';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VerificationResult {
  archive_id: string;
  file_path: string;
  date_range_start: string;
  date_range_end: string;
  records_count: number;
  file_size_bytes: number | null;
  stored_checksum: string | null;
  computed_checksum: string | null;
  status: 'valid' | 'invalid' | 'no_checksum' | 'file_missing' | 'error';
  message: string;
}

interface BulkVerificationReport {
  generated_at: string;
  date_range_start: string;
  date_range_end: string;
  total_archives: number;
  verified_valid: number;
  verified_invalid: number;
  no_checksum: number;
  file_missing: number;
  errors: number;
  results: VerificationResult[];
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getStatusBadge(status: VerificationResult['status']) {
  switch (status) {
    case 'valid':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Valide
        </Badge>
      );
    case 'invalid':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Invalide
        </Badge>
      );
    case 'no_checksum':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          Sans checksum
        </Badge>
      );
    case 'file_missing':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30">
          <FileWarning className="h-3 w-3 mr-1" />
          Fichier manquant
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          Erreur
        </Badge>
      );
  }
}

export function BulkArchiveVerification() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 90),
    to: new Date(),
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [report, setReport] = useState<BulkVerificationReport | null>(null);

  const handleVerify = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Veuillez sélectionner une période');
      return;
    }

    setIsVerifying(true);
    setReport(null);

    try {
      const response = await supabase.functions.invoke('verify-archives-bulk', {
        body: {
          date_from: startOfDay(dateRange.from).toISOString(),
          date_to: endOfDay(dateRange.to).toISOString(),
          limit: 100,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Échec de la vérification');
      }

      const data = response.data;
      if (!data.success) {
        throw new Error(data.error || 'Échec de la vérification');
      }

      setReport(data.report);

      const r = data.report as BulkVerificationReport;
      if (r.verified_invalid > 0 || r.file_missing > 0) {
        toast.warning(
          `Vérification terminée: ${r.verified_invalid} archive(s) invalide(s), ${r.file_missing} fichier(s) manquant(s)`,
          { duration: 8000 }
        );
      } else if (r.total_archives === 0) {
        toast.info('Aucune archive trouvée dans cette période');
      } else {
        toast.success(`Vérification terminée: ${r.verified_valid} archive(s) valide(s)`);
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur inattendue');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportReport = () => {
    if (!report) return;

    const csvHeader = [
      'ID Archive',
      'Chemin',
      'Période début',
      'Période fin',
      'Enregistrements',
      'Taille',
      'Statut',
      'Message',
      'Checksum stocké',
      'Checksum calculé',
    ].join(';');

    const csvRows = report.results.map(r => [
      r.archive_id,
      r.file_path,
      r.date_range_start,
      r.date_range_end,
      r.records_count,
      r.file_size_bytes || '',
      r.status,
      `"${r.message.replace(/"/g, '""')}"`,
      r.stored_checksum || '',
      r.computed_checksum || '',
    ].join(';'));

    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-verification-archives-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Rapport exporté');
  };

  const integrityScore = report && report.total_archives > 0
    ? Math.round((report.verified_valid / report.total_archives) * 100)
    : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Vérification en Masse des Archives
        </CardTitle>
        <CardDescription>
          Vérifiez l'intégrité de plusieurs archives et générez un rapport de conformité
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date range selection */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Période des archives à vérifier
            </label>
            <DateRangePicker
              dateRange={dateRange}
              onDateChange={setDateRange}
            />
          </div>
          <Button
            onClick={handleVerify}
            disabled={isVerifying || !dateRange?.from || !dateRange?.to}
            className="flex items-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Vérification en cours...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4" />
                Lancer la vérification
              </>
            )}
          </Button>
        </div>

        {/* Report summary */}
        {report && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{report.total_archives}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{report.verified_valid}</p>
                <p className="text-xs text-green-600 dark:text-green-500">Valides</p>
              </div>
              <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{report.verified_invalid}</p>
                <p className="text-xs text-red-600 dark:text-red-500">Invalides</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{report.no_checksum}</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">Sans checksum</p>
              </div>
              <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{report.file_missing}</p>
                <p className="text-xs text-red-600 dark:text-red-500">Manquants</p>
              </div>
            </div>

            {/* Integrity score */}
            {report.total_archives > 0 && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Score d'intégrité</span>
                  <span className={`text-lg font-bold ${
                    integrityScore >= 90 ? 'text-green-600 dark:text-green-400' :
                    integrityScore >= 70 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {integrityScore}%
                  </span>
                </div>
                <Progress 
                  value={integrityScore} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Basé sur {report.verified_valid} archive(s) valide(s) sur {report.total_archives} vérifiée(s)
                </p>
              </div>
            )}

            {/* Export button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportReport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exporter le rapport CSV
              </Button>
            </div>

            {/* Results table */}
            {report.results.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b border-border">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Détail des vérifications
                  </h4>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Chemin</TableHead>
                        <TableHead className="text-muted-foreground">Période</TableHead>
                        <TableHead className="text-muted-foreground text-right">Enreg.</TableHead>
                        <TableHead className="text-muted-foreground text-right">Taille</TableHead>
                        <TableHead className="text-muted-foreground">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.results.map((result) => (
                        <TableRow key={result.archive_id} className="border-border">
                          <TableCell className="font-mono text-xs text-foreground max-w-[200px] truncate" title={result.file_path}>
                            {result.file_path}
                          </TableCell>
                          <TableCell className="text-foreground text-sm">
                            {format(new Date(result.date_range_start), 'dd/MM/yy', { locale: fr })}
                            {' → '}
                            {format(new Date(result.date_range_end), 'dd/MM/yy', { locale: fr })}
                          </TableCell>
                          <TableCell className="text-right font-medium text-foreground">
                            {result.records_count.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-foreground">
                            {formatFileSize(result.file_size_bytes)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(result.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Report metadata */}
            <div className="text-xs text-muted-foreground flex items-center gap-4">
              <span>
                Rapport généré le {format(new Date(report.generated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </span>
              <span>•</span>
              <span>
                Période: {format(new Date(report.date_range_start), 'dd/MM/yyyy', { locale: fr })} → {format(new Date(report.date_range_end), 'dd/MM/yyyy', { locale: fr })}
              </span>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p>
            La vérification compare le checksum SHA256 stocké lors de l'archivage avec celui recalculé à partir du fichier actuel.
            Un écart indique une possible corruption ou modification non autorisée.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
