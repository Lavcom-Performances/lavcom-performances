import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/seo/SEOHead';
import { Input } from '@/components/ui/input';
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
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Archive, 
  Search, 
  Download,
  Shield,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileCheck,
  HardDrive,
  Clock,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { ArchiveCleanupSettings } from '@/components/platformAdmin/ArchiveCleanupSettings';
import { BulkArchiveVerification } from '@/components/platformAdmin/BulkArchiveVerification';

interface AuditArchive {
  id: string;
  user_id: string;
  file_path: string;
  date_range_start: string;
  date_range_end: string;
  records_count: number;
  file_size_bytes: number | null;
  sha256_checksum: string | null;
  created_at: string;
}

interface VerificationResult {
  valid: boolean;
  stored_checksum: string | null;
  computed_checksum: string | null;
  message: string;
}

const PAGE_SIZE = 20;

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getScopeFromPath(path: string): string {
  const parts = path.split('/');
  return parts[0] || 'unknown';
}

function getScopeBadgeClass(scope: string): string {
  if (scope === 'platform') {
    return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400';
  }
  if (scope === 'org') {
    return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400';
  }
  if (scope === 'user') {
    return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400';
  }
  return 'bg-muted text-muted-foreground';
}

export default function PlatformAdminArchives() {
  const { isPlatformSuperAdmin, isPlatformAdmin, isLoading: roleLoading } = usePlatformRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 90),
    to: new Date(),
  });
  const [page, setPage] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  const canAccess = isPlatformSuperAdmin || isPlatformAdmin;

  // Fetch all platform-level archives
  const { data: archivesData, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['platform-archives', scopeFilter, searchTerm, dateRange?.from, dateRange?.to, page],
    queryFn: async () => {
      let query = supabase
        .from('audit_log_archives')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Date filter on archive creation
      if (dateRange?.from) {
        query = query.gte('created_at', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
      }

      // Scope filter by file_path prefix
      if (scopeFilter === 'platform') {
        query = query.ilike('file_path', 'platform/%');
      } else if (scopeFilter === 'org') {
        query = query.ilike('file_path', 'org/%');
      } else if (scopeFilter === 'user') {
        query = query.ilike('file_path', 'user/%');
      }

      // Search by file_path
      if (searchTerm.trim()) {
        query = query.ilike('file_path', `%${searchTerm.trim()}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      return {
        archives: (data || []) as AuditArchive[],
        totalCount: count || 0,
      };
    },
    enabled: canAccess,
    staleTime: 30 * 1000,
  });

  const totalPages = Math.ceil((archivesData?.totalCount || 0) / PAGE_SIZE);
  const archives = archivesData?.archives || [];

  // Download archive via signed URL
  const handleDownload = useCallback(async (archive: AuditArchive) => {
    setDownloadingId(archive.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expirée, veuillez vous reconnecter');
        return;
      }

      const response = await supabase.functions.invoke('get-audit-archive-download-url', {
        body: { archive_id: archive.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get download URL');
      }

      const { signed_url, file_name } = response.data;
      
      // Open signed URL in new tab to trigger download
      const link = document.createElement('a');
      link.href = signed_url;
      link.download = file_name || 'archive.csv';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Téléchargement démarré');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : 'Échec du téléchargement');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  // Verify archive integrity
  const handleVerify = useCallback(async (archive: AuditArchive) => {
    setVerifyingId(archive.id);
    setVerificationResult(null);
    setShowVerificationDialog(true);

    try {
      const response = await supabase.functions.invoke('verify-archive-integrity', {
        body: { archive_id: archive.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Verification failed');
      }

      setVerificationResult(response.data as VerificationResult);
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        valid: false,
        stored_checksum: null,
        computed_checksum: null,
        message: error instanceof Error ? error.message : 'Échec de la vérification',
      });
    } finally {
      setVerifyingId(null);
    }
  }, []);

  // Reset page on filter change
  const handleFilterChange = useCallback((setter: (val: string) => void, value: string) => {
    setPage(0);
    setter(value);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setPage(0);
    setDateRange(range);
  }, []);

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
        <SEOHead title="Accès refusé | Archives" noindex />
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
        title="Archives d'audit | Back-office Plateforme"
        description="Gestion des archives d'audit avec vérification d'intégrité"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Archive className="h-6 w-6 text-primary" />
              Archives d'Audit
            </h1>
            <p className="text-muted-foreground">
              Téléchargement et vérification d'intégrité des archives
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/admin/compliance-reports'}>
            <FileCheck className="h-4 w-4 mr-2" />
            Voir les Rapports de Conformité
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Archive className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{archivesData?.totalCount || 0}</p>
                  <p className="text-sm text-muted-foreground">Total archives</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <HardDrive className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {formatFileSize(archives.reduce((sum, a) => sum + (a.file_size_bytes || 0), 0))}
                  </p>
                  <p className="text-sm text-muted-foreground">Taille totale (page)</p>
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
                    {archives.filter(a => a.sha256_checksum).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Avec checksum</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {dateRange?.from ? format(dateRange.from, 'dd MMM', { locale: fr }) : '-'}
                    {' → '}
                    {dateRange?.to ? format(dateRange.to, 'dd MMM', { locale: fr }) : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Période</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Archive Cleanup Settings - Only for Super Admins */}
        {isPlatformSuperAdmin && (
          <div className="space-y-6 mb-6">
            <ArchiveCleanupSettings onCleanupComplete={() => refetch()} />
            <BulkArchiveVerification />
          </div>
        )}

        {/* Filters */}
        <Card className="bg-card border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date range */}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Période de création</label>
                <DateRangePicker 
                  dateRange={dateRange} 
                  onDateChange={handleDateRangeChange}
                />
              </div>

              {/* Scope filter */}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Type d'archive</label>
                <Select 
                  value={scopeFilter} 
                  onValueChange={(v) => handleFilterChange(setScopeFilter, v)}
                >
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all" className="text-popover-foreground">Tous les types</SelectItem>
                    <SelectItem value="platform" className="text-popover-foreground">Platform</SelectItem>
                    <SelectItem value="org" className="text-popover-foreground">Organisation</SelectItem>
                    <SelectItem value="user" className="text-popover-foreground">Utilisateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Recherche (chemin)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par chemin..."
                    value={searchTerm}
                    onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                    className="pl-9 bg-background border-input text-foreground"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archives table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Liste des Archives</CardTitle>
            <CardDescription>
              Archives disponibles avec option de vérification d'intégrité SHA256
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
                <p>Erreur lors du chargement des archives</p>
              </div>
            ) : archives.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune archive trouvée</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Type</TableHead>
                        <TableHead className="text-muted-foreground">Chemin</TableHead>
                        <TableHead className="text-muted-foreground">Période couverte</TableHead>
                        <TableHead className="text-muted-foreground text-right">Enregistrements</TableHead>
                        <TableHead className="text-muted-foreground text-right">Taille</TableHead>
                        <TableHead className="text-muted-foreground">Checksum</TableHead>
                        <TableHead className="text-muted-foreground">Créée le</TableHead>
                        <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archives.map((archive) => {
                        const scope = getScopeFromPath(archive.file_path);
                        return (
                          <TableRow key={archive.id} className="border-border">
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={getScopeBadgeClass(scope)}
                              >
                                {scope}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-foreground max-w-[200px] truncate" title={archive.file_path}>
                              {archive.file_path}
                            </TableCell>
                            <TableCell className="text-foreground">
                              <span className="text-sm">
                                {format(new Date(archive.date_range_start), 'dd/MM/yy')}
                                {' → '}
                                {format(new Date(archive.date_range_end), 'dd/MM/yy')}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium text-foreground">
                              {archive.records_count.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-foreground">
                              {formatFileSize(archive.file_size_bytes)}
                            </TableCell>
                            <TableCell>
                              {archive.sha256_checksum ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Présent
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Absent
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(archive.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleVerify(archive)}
                                  disabled={!archive.sha256_checksum || verifyingId === archive.id}
                                  title={!archive.sha256_checksum ? 'Pas de checksum' : 'Vérifier l\'intégrité'}
                                >
                                  {verifyingId === archive.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileCheck className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleDownload(archive)}
                                  disabled={downloadingId === archive.id}
                                >
                                  {downloadingId === archive.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Page {page + 1} sur {totalPages} ({archivesData?.totalCount} archives)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
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
      </div>

      {/* Verification result dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Vérification d'intégrité
            </DialogTitle>
            <DialogDescription>
              Comparaison du checksum SHA256 stocké avec le fichier actuel
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {verifyingId ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Vérification en cours...</p>
              </div>
            ) : verificationResult ? (
              <div className="space-y-4">
                <div className={`flex items-center gap-3 p-4 rounded-lg ${
                  verificationResult.valid 
                    ? 'bg-green-50 dark:bg-green-500/10' 
                    : 'bg-red-50 dark:bg-red-500/10'
                }`}>
                  {verificationResult.valid ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <p className={`font-semibold ${
                      verificationResult.valid 
                        ? 'text-green-700 dark:text-green-400' 
                        : 'text-red-700 dark:text-red-400'
                    }`}>
                      {verificationResult.valid ? 'Intégrité vérifiée ✓' : 'Échec de la vérification'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {verificationResult.message}
                    </p>
                  </div>
                </div>

                {verificationResult.stored_checksum && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Checksum stocké</p>
                      <code className="text-xs font-mono text-foreground bg-muted p-2 rounded block break-all">
                        {verificationResult.stored_checksum}
                      </code>
                    </div>
                    {verificationResult.computed_checksum && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Checksum calculé</p>
                        <code className="text-xs font-mono text-foreground bg-muted p-2 rounded block break-all">
                          {verificationResult.computed_checksum}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerificationDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
