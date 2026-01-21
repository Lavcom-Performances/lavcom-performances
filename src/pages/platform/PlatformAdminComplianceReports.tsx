import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/seo/SEOHead';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  FileText, 
  Download,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldQuestion,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  FileWarning,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { toast } from 'sonner';
import { ManualComplianceReport } from '@/components/platformAdmin/ManualComplianceReport';
import { ComplianceRetentionSettings } from '@/components/platformAdmin/ComplianceRetentionSettings';
import { ComplianceIntegrityTrendsChart } from '@/components/platformAdmin/ComplianceIntegrityTrendsChart';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ComplianceReport {
  id: string;
  generated_at: string;
  period_label: string;
  date_range_start: string;
  date_range_end: string;
  total_archives: number;
  verified_valid: number;
  verified_invalid: number;
  no_checksum: number;
  file_missing: number;
  errors: number;
  integrity_score: number;
  total_storage_bytes: number | null;
  generated_by: string | null;
  report_type: string;
  report_data: unknown;
  created_at: string;
  file_path: string | null;
  sha256_checksum: string | null;
  retention_years: number | null;
}

const PAGE_SIZE = 15;

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getScoreBadgeClass(score: number): string {
  if (score >= 95) {
    return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30';
  }
  if (score >= 80) {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30';
  }
  return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30';
}

function getScoreIcon(score: number) {
  if (score >= 95) return <CheckCircle2 className="h-3 w-3" />;
  if (score >= 80) return <AlertCircle className="h-3 w-3" />;
  return <XCircle className="h-3 w-3" />;
}

export default function PlatformAdminComplianceReports() {
  const { isPlatformSuperAdmin, isPlatformAdmin, isLoading: roleLoading } = usePlatformRole();
  const [page, setPage] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<string, { valid: boolean; message: string } | null>>({});

  const canAccess = isPlatformSuperAdmin || isPlatformAdmin;

  const { data: reportsData, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['compliance-reports', page],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from('compliance_reports')
        .select('*', { count: 'exact' })
        .order('generated_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      return {
        reports: (data || []) as ComplianceReport[],
        totalCount: count || 0,
      };
    },
    enabled: canAccess,
    staleTime: 30 * 1000,
  });

  const totalPages = Math.ceil((reportsData?.totalCount || 0) / PAGE_SIZE);
  const reports = reportsData?.reports || [];

  const handleExportPDF = useCallback((report: ComplianceReport) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('Compliance Report', 14, 20);
      
      doc.setFontSize(12);
      doc.text(report.period_label, 14, 30);
      
      // Reset colors
      doc.setTextColor(0, 0, 0);
      
      // Score section
      let yPos = 55;
      doc.setFontSize(14);
      doc.text('Integrity Score', 14, yPos);
      
      const scoreColor = report.integrity_score >= 95 ? [34, 197, 94] : 
                        report.integrity_score >= 80 ? [245, 158, 11] : [220, 38, 38];
      doc.setTextColor(...scoreColor as [number, number, number]);
      doc.setFontSize(32);
      doc.text(`${report.integrity_score}%`, pageWidth - 14, yPos, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      
      // Summary table
      yPos = 75;
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Archives Verified', report.total_archives.toString()],
          ['Valid Archives', report.verified_valid.toString()],
          ['Invalid Archives', report.verified_invalid.toString()],
          ['Missing Files', report.file_missing.toString()],
          ['Without Checksum', report.no_checksum.toString()],
          ['Errors', report.errors.toString()],
          ['Total Storage', formatFileSize(report.total_storage_bytes)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      // Report metadata
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || yPos + 60;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Report generated: ${format(new Date(report.generated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}`, 14, finalY + 15);
      doc.text(`Period: ${format(new Date(report.date_range_start), 'dd/MM/yyyy')} - ${format(new Date(report.date_range_end), 'dd/MM/yyyy')}`, 14, finalY + 22);
      doc.text(`Report type: ${report.report_type === 'scheduled' ? 'Monthly Scheduled' : 'Manual'}`, 14, finalY + 29);
      
      // Compliance status
      const statusY = finalY + 45;
      const statusColor = report.integrity_score >= 95 ? [240, 253, 244] : [254, 242, 242];
      const statusTextColor = report.integrity_score >= 95 ? [22, 101, 52] : [153, 27, 27];
      
      doc.setFillColor(...statusColor as [number, number, number]);
      doc.roundedRect(14, statusY, pageWidth - 28, 30, 3, 3, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(...statusTextColor as [number, number, number]);
      doc.text(
        report.integrity_score >= 95 
          ? '✓ Compliance Status: Satisfactory' 
          : '⚠ Compliance Status: Action Required',
        20, statusY + 12
      );
      
      doc.setFontSize(9);
      doc.text(
        report.integrity_score >= 95
          ? 'All audit log archives have been verified and maintain data integrity.'
          : 'Some archives have integrity issues that may affect compliance.',
        20, statusY + 22
      );
      
      // Save
      const fileName = `compliance-report-${format(new Date(report.generated_at), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast.success('Rapport PDF téléchargé');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Erreur lors de l\'export PDF');
    }
  }, []);

  // Handle secure download with signed URL
  const handleSecureDownload = useCallback(async (report: ComplianceReport) => {
    if (!report.file_path) {
      // Fallback to local PDF generation if no file is stored
      handleExportPDF(report);
      return;
    }

    setDownloadingId(report.id);

    try {
      const response = await supabase.functions.invoke('get-compliance-report-download-url', {
        body: { report_id: report.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Échec de la génération du lien');
      }

      const data = response.data;
      if (!data.success || !data.signed_url) {
        throw new Error(data.error || 'Lien de téléchargement invalide');
      }

      // Open the signed URL to download
      window.open(data.signed_url, '_blank');
      toast.success('Téléchargement sécurisé démarré');
    } catch (error) {
      console.error('Secure download error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur de téléchargement');
      // Fallback to local PDF generation
      handleExportPDF(report);
    } finally {
      setDownloadingId(null);
    }
  }, [handleExportPDF]);

  // Handle integrity verification
  const handleVerifyIntegrity = useCallback(async (report: ComplianceReport) => {
    setVerifyingId(report.id);
    setVerificationResults(prev => ({ ...prev, [report.id]: null }));

    try {
      const response = await supabase.functions.invoke('verify-compliance-report-integrity', {
        body: { report_id: report.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Échec de la vérification');
      }

      const data = response.data;
      setVerificationResults(prev => ({ 
        ...prev, 
        [report.id]: { 
          valid: data.valid, 
          message: data.message 
        } 
      }));

      if (data.valid) {
        toast.success('Intégrité vérifiée', {
          description: data.message,
        });
      } else {
        toast.warning('Problème d\'intégrité', {
          description: data.message,
        });
      }
    } catch (error) {
      console.error('Verify integrity error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur de vérification');
      setVerificationResults(prev => ({ 
        ...prev, 
        [report.id]: { 
          valid: false, 
          message: error instanceof Error ? error.message : 'Erreur de vérification' 
        } 
      }));
    } finally {
      setVerifyingId(null);
    }
  }, []);

  // Get verification icon based on result
  const getVerificationIcon = (reportId: string, hasChecksum: boolean) => {
    if (verifyingId === reportId) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    const result = verificationResults[reportId];
    if (result === undefined) {
      return <Shield className="h-4 w-4" />;
    }
    
    if (result === null) {
      return <ShieldQuestion className="h-4 w-4 text-muted-foreground" />;
    }
    
    if (result.valid) {
      return <ShieldCheck className="h-4 w-4 text-green-500" />;
    }
    
    return <ShieldX className="h-4 w-4 text-red-500" />;
  };

  // Loading state
  if (roleLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Access denied
  if (!canAccess) {
    return (
      <div className="container mx-auto py-8 px-4">
        <SEOHead title="Accès refusé | Rapports de Conformité" noindex />
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Accès réservé aux administrateurs plateforme.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Rapports de Conformité | Back-office Plateforme"
        description="Historique des rapports de conformité et vérification d'intégrité"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <FileText className="h-6 w-6 text-primary" />
              Rapports de Conformité
            </h1>
            <p className="text-muted-foreground">
              Historique des vérifications d'intégrité et rapports de conformité
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{reportsData?.totalCount || 0}</p>
                  <p className="text-sm text-muted-foreground">Total rapports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {reports.filter(r => r.report_type === 'scheduled').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Planifiés (page)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <FileCheck className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {reports.filter(r => r.integrity_score >= 95).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Score ≥ 95% (page)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <FileWarning className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {reports.filter(r => r.integrity_score < 95).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Problèmes (page)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integrity Trends Chart */}
        <div className="mb-6">
          <ComplianceIntegrityTrendsChart />
        </div>

        {/* Manual Report Generation */}
        {isPlatformSuperAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ManualComplianceReport onReportGenerated={() => refetch()} />
            <ComplianceRetentionSettings onCleanupComplete={() => refetch()} />
          </div>
        )}

        {/* Reports table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Historique des Rapports</CardTitle>
            <CardDescription>
              Tous les rapports de conformité générés automatiquement ou manuellement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : queryError ? (
              <div className="text-center py-8 text-destructive">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Erreur lors du chargement des rapports</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun rapport de conformité trouvé</p>
                <p className="text-sm mt-2">Les rapports mensuels seront générés automatiquement le 1er de chaque mois</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Période</TableHead>
                        <TableHead className="text-muted-foreground">Type</TableHead>
                        <TableHead className="text-muted-foreground text-center">Score</TableHead>
                        <TableHead className="text-muted-foreground text-right">Total</TableHead>
                        <TableHead className="text-muted-foreground text-right">Valides</TableHead>
                        <TableHead className="text-muted-foreground text-right">Problèmes</TableHead>
                        <TableHead className="text-muted-foreground text-right">Stockage</TableHead>
                        <TableHead className="text-muted-foreground">Généré le</TableHead>
                        <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id} className="border-border">
                          <TableCell className="font-medium text-foreground">
                            {report.period_label}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={report.report_type === 'scheduled' 
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400'
                                : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400'
                              }
                            >
                              {report.report_type === 'scheduled' ? 'Planifié' : 'Manuel'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={getScoreBadgeClass(report.integrity_score)}>
                              {getScoreIcon(report.integrity_score)}
                              <span className="ml-1">{report.integrity_score}%</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-foreground">
                            {report.total_archives}
                          </TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400">
                            {report.verified_valid}
                          </TableCell>
                          <TableCell className="text-right">
                            {(report.verified_invalid + report.file_missing) > 0 ? (
                              <span className="text-red-600 dark:text-red-400">
                                {report.verified_invalid + report.file_missing}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-foreground">
                            {formatFileSize(report.total_storage_bytes)}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {format(new Date(report.generated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Checksum warning */}
                              {!report.sha256_checksum && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Checksum manquant</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              {/* Verify integrity button */}
                              {report.sha256_checksum && report.file_path && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleVerifyIntegrity(report)}
                                        disabled={verifyingId === report.id}
                                        className="h-8 px-2"
                                      >
                                        {getVerificationIcon(report.id, !!report.sha256_checksum)}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {verificationResults[report.id] !== undefined ? (
                                        verificationResults[report.id]?.valid 
                                          ? 'Intégrité vérifiée ✓'
                                          : 'Problème d\'intégrité !'
                                      ) : (
                                        'Vérifier l\'intégrité'
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                              {/* Download button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => report.file_path ? handleSecureDownload(report) : handleExportPDF(report)}
                                disabled={downloadingId === report.id}
                                className="h-8 px-2"
                              >
                                {downloadingId === report.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : report.file_path ? (
                                  <Lock className="h-4 w-4 mr-1" />
                                ) : (
                                  <Download className="h-4 w-4 mr-1" />
                                )}
                                {report.file_path ? 'JSON' : 'PDF'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {page + 1} sur {totalPages} • {reportsData?.totalCount} rapport(s)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="mt-6 text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg">
          <p className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Les rapports de conformité mensuels sont générés automatiquement le 1er de chaque mois à 6h UTC.
            Ils vérifient l'intégrité de toutes les archives du mois précédent et envoient un email aux administrateurs plateforme.
          </p>
        </div>
      </div>
    </>
  );
}
