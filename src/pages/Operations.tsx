import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DateRange } from "react-day-picker";
import { subDays, format, startOfDay, startOfMonth, startOfYear, parseISO, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Download, Upload, Loader2, History, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Lock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OperationsKPIRow } from "@/components/operations/OperationsKPIRow";
import { CSVImportDialog } from "@/components/operations/CSVImportDialog";
import { ImportHistoryDialog } from "@/components/operations/ImportHistoryDialog";
import { OperationsEmptyState } from "@/components/operations/OperationsEmptyState";
import { YearComparisonSection } from "@/components/operations/YearComparisonSection";
import { FiltersCard } from "@/components/ui/filters-card";
import { generateOperationsPdf } from "@/utils/operationsPdfExport";
import { trackPdfDownload } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { useViewMode } from "@/hooks/useViewMode";
import { useOperations } from "@/hooks/useOperations";
import { useSites } from "@/hooks/useSites";
import { SEOHead } from "@/components/seo/SEOHead";
import { useCurrentUserPermissions } from "@/hooks/useCurrentUserPermissions";
import { DataFreshnessIndicator } from "@/components/dashboard/DataFreshnessIndicator";

const paymentModeBadge = (mode: string | null) => {
  if (!mode) return <span className="text-muted-foreground">—</span>;
  
  const modeUpper = mode.toUpperCase();
  switch (modeUpper) {
    case "CB":
      return <span className="badge-cb">CB</span>;
    case "ESP":
      return <span className="badge-esp">ESP</span>;
    case "FI":
      return <span className="badge-fi">FI</span>;
    default:
      return <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">{mode}</span>;
  }
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || value === 0) return <span className="text-muted-foreground">—</span>;
  return <span className="font-medium">{value.toFixed(2)} €</span>;
};

const formatRendu = (value: number | null | undefined) => {
  if (value === null || value === undefined || value === 0) return <span className="text-muted-foreground">—</span>;
  return <span className="badge-rendu">{value.toFixed(2)} €</span>;
};

export default function Operations() {
  const { t } = useTranslation(['app', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const { isExpert } = useViewMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sites, getDefaultSite } = useSites();
  const { canImport, canExport, permissions } = useCurrentUserPermissions();
  
  // Get site from URL or default
  const urlSiteId = searchParams.get('site');
  const urlDateStart = searchParams.get('date_start');
  const urlDateEnd = searchParams.get('date_end');
  
  // Track if we came from a drill-down
  const isFromDrillDown = !!urlSiteId;
  
  // Validate site and handle fallback
  const { selectedSite, siteWasInvalid } = useMemo(() => {
    if (urlSiteId) {
      const foundSite = sites.find(s => s.id === urlSiteId);
      if (foundSite) {
        return { selectedSite: foundSite, siteWasInvalid: false };
      }
      return { selectedSite: getDefaultSite(), siteWasInvalid: true };
    }
    return { selectedSite: getDefaultSite(), siteWasInvalid: false };
  }, [urlSiteId, sites, getDefaultSite]);
  
  // Show toast for invalid site (only once)
  useEffect(() => {
    if (siteWasInvalid && sites.length > 0) {
      toast({
        title: t('app:operations.siteNotFound'),
        description: t('app:operations.siteNotFoundDesc'),
        variant: "default",
      });
    }
  }, [siteWasInvalid, sites.length, toast, t]);
  
  // Initialize date range from URL or defaults - use undefined to show all data initially
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (urlDateStart && urlDateEnd) {
      return {
        from: parseISO(urlDateStart),
        to: parseISO(urlDateEnd),
      };
    }
    // No default date filter - show all data
    return undefined;
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [machineFilter, setMachineFilter] = useState<string>("all");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Server-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const paginationState = useMemo(() => ({ page: currentPage, pageSize }), [currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, searchQuery, categoryFilter, paymentFilter, machineFilter, dayFilter, selectedSite?.id]);

  // Sorting
  type SortColumn = "date" | "time" | "machine" | "mode" | "price" | null;
  type SortDirection = "asc" | "desc";
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Day names in French
  const dayNames: Record<number, string> = {
    0: "Dimanche",
    1: "Lundi", 
    2: "Mardi",
    3: "Mercredi",
    4: "Jeudi",
    5: "Vendredi",
    6: "Samedi"
  };

  // Sync date range changes to URL
  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      const params = new URLSearchParams(searchParams);
      params.set('date_start', range.from.toISOString().split('T')[0]);
      params.set('date_end', range.to.toISOString().split('T')[0]);
      setSearchParams(params, { replace: true });
    }
  };

  const { 
    operations: rawOperations, 
    totalCount, 
    totalPages: serverTotalPages,
    monthSummaries,
    isLoading, 
    isEmpty, 
    refetch 
  } = useOperations({
    dateRange,
    searchQuery,
    category: categoryFilter,
    paymentMode: paymentFilter,
    siteId: selectedSite?.id,
  }, paginationState);

  // Get unique machines from current page operations
  const uniqueMachines = useMemo(() => {
    const machines = new Set<string>();
    rawOperations.forEach(op => {
      const machineName = op.machine_name || op.machine;
      if (machineName) machines.add(machineName);
    });
    return Array.from(machines).sort();
  }, [rawOperations]);

  // Apply additional filters (machine, day of week) and sorting
  const operations = useMemo(() => {
    let filtered = rawOperations.filter(op => {
      // Machine filter
      if (machineFilter !== "all") {
        const machineName = op.machine_name || op.machine;
        if (machineName !== machineFilter) return false;
      }
      
      // Day of week filter
      if (dayFilter !== "all") {
        const opDate = parseISO(op.operation_date);
        const dayOfWeek = getDay(opDate);
        if (dayOfWeek.toString() !== dayFilter) return false;
      }
      
      return true;
    });

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let comparison = 0;
        
        switch (sortColumn) {
          case "date":
            const dateA = `${a.operation_date} ${a.operation_time || "00:00"}`;
            const dateB = `${b.operation_date} ${b.operation_time || "00:00"}`;
            comparison = dateA.localeCompare(dateB);
            break;
          case "time":
            comparison = (a.operation_time || "").localeCompare(b.operation_time || "");
            break;
          case "machine":
            const machineA = a.machine_name || a.machine || "";
            const machineB = b.machine_name || b.machine || "";
            comparison = machineA.localeCompare(machineB);
            break;
          case "mode":
            comparison = (a.payment_mode || "").localeCompare(b.payment_mode || "");
            break;
          case "price":
            const priceA = a.price_eur ?? Number(a.amount);
            const priceB = b.price_eur ?? Number(b.amount);
            comparison = priceA - priceB;
            break;
        }
        
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [rawOperations, machineFilter, dayFilter, sortColumn, sortDirection]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const yearStart = startOfYear(new Date());

    const calcKPI = (ops: typeof operations) => ({
      total: ops.reduce((sum, op) => sum + Number(op.amount), 0),
      cb: ops.filter(op => op.payment_mode?.toUpperCase() === "CB").reduce((sum, op) => sum + Number(op.amount), 0),
      esp: ops.filter(op => op.payment_mode?.toUpperCase() === "ESP").reduce((sum, op) => sum + Number(op.amount), 0),
    });

    const todayOps = operations.filter(op => {
      const opDate = startOfDay(parseISO(op.operation_date));
      return opDate.getTime() === today.getTime();
    });
    
    const monthOps = operations.filter(op => {
      const opDate = parseISO(op.operation_date);
      return opDate >= monthStart;
    });
    
    const yearOps = operations.filter(op => {
      const opDate = parseISO(op.operation_date);
      return opDate >= yearStart;
    });

    return {
      day: calcKPI(todayOps),
      month: calcKPI(monthOps),
      year: calcKPI(yearOps),
    };
  }, [operations]);

  // Calculate hourly data for chart
  const hourlyData = useMemo(() => {
    const hours: { [key: number]: { cb: number; esp: number } } = {};
    for (let i = 6; i <= 22; i++) {
      hours[i] = { cb: 0, esp: 0 };
    }
    
    operations.forEach(op => {
      if (op.operation_time) {
        const hour = parseInt(op.operation_time.split(":")[0], 10);
        if (hour >= 6 && hour <= 22) {
          const amount = Number(op.amount);
          if (op.payment_mode?.toUpperCase() === "CB") {
            hours[hour].cb += amount;
          } else if (op.payment_mode?.toUpperCase() === "ESP") {
            hours[hour].esp += amount;
          }
        }
      }
    });

    return Object.entries(hours).map(([hour, data]) => ({
      hour: `${hour}h`,
      cb: data.cb,
      esp: data.esp,
    }));
  }, [operations]);

  // Calculate machine counts
  const machineCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    operations.forEach(op => {
      if (op.machine) {
        counts[op.machine] = (counts[op.machine] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [operations]);

  const handleExportPdf = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: t('app:operations.selectPeriod'),
        description: t('app:operations.selectPeriodDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Transform operations to the format expected by the PDF export
      const pdfOperations = operations.map(op => ({
        id: op.id,
        date: parseISO(op.operation_date),
        label: op.machine || "Inconnu",
        category: "AUTRE",
        paymentMode: op.payment_mode?.toUpperCase() || "ESP",
        amount: Number(op.amount),
        insert: 0,
        rendu: 0,
        detail: op.program || "",
      }));

      generateOperationsPdf({
        laundromatName: selectedSite?.name || "Ma Laverie",
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        operations: pdfOperations,
      });

      trackPdfDownload('operations');
      toast({
        title: t('app:operations.exportSuccess'),
        description: t('app:operations.exportSuccessDesc', { count: operations.length }),
      });
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('app:operations.exportError'),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: t('app:operations.selectPeriod'),
        description: t('app:operations.selectPeriodDesc'),
        variant: "destructive",
      });
      return;
    }

    try {
      // CSV headers
      const headers = [
        'Date',
        'Heure',
        'Machine',
        'Mode',
        'Inséré (€)',
        'Prix (€)',
        'Rendu (€)',
        'Prix CB (€)',
        'Prix ESP (€)'
      ];

      // Transform operations to CSV rows
      const rows = operations.map(op => {
        const modeUpper = op.payment_mode?.toUpperCase();
        const isCB = modeUpper === "CB";
        const isESP = modeUpper === "ESP";
        const price = op.price_eur ?? Number(op.amount);

        return [
          format(parseISO(op.operation_date), "dd/MM/yyyy", { locale: fr }),
          op.operation_time?.slice(0, 5) || "",
          op.machine_name || op.machine || "",
          op.payment_mode?.toUpperCase() || "",
          isESP && op.inserted_eur ? op.inserted_eur.toFixed(2) : "",
          price.toFixed(2),
          isESP && op.change_eur ? op.change_eur.toFixed(2) : "",
          isCB ? price.toFixed(2) : "",
          isESP ? price.toFixed(2) : ""
        ];
      });

      // Build CSV content with BOM for Excel compatibility
      const BOM = '\uFEFF';
      const csvContent = BOM + [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateFromStr = format(dateRange.from, 'yyyy-MM-dd');
      const dateToStr = format(dateRange.to, 'yyyy-MM-dd');
      link.href = url;
      link.download = `operations_${selectedSite?.name || 'laverie'}_${dateFromStr}_${dateToStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export CSV réussi",
        description: `${operations.length} opérations exportées`,
      });
    } catch (error) {
      toast({
        title: t('common:error'),
        description: "Erreur lors de l'export CSV",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: t('app:operations.selectPeriod'),
        description: t('app:operations.selectPeriodDesc'),
        variant: "destructive",
      });
      return;
    }

    try {
      // Excel XML headers
      const headers = [
        'Date',
        'Heure',
        'Machine',
        'Mode',
        'Inséré (€)',
        'Prix (€)',
        'Rendu (€)',
        'Prix CB (€)',
        'Prix ESP (€)'
      ];

      // Transform operations to rows
      const rows = operations.map(op => {
        const modeUpper = op.payment_mode?.toUpperCase();
        const isCB = modeUpper === "CB";
        const isESP = modeUpper === "ESP";
        const price = op.price_eur ?? Number(op.amount);

        return [
          format(parseISO(op.operation_date), "dd/MM/yyyy", { locale: fr }),
          op.operation_time?.slice(0, 5) || "",
          op.machine_name || op.machine || "",
          op.payment_mode?.toUpperCase() || "",
          isESP && op.inserted_eur ? op.inserted_eur.toFixed(2) : "",
          price.toFixed(2),
          isESP && op.change_eur ? op.change_eur.toFixed(2) : "",
          isCB ? price.toFixed(2) : "",
          isESP ? price.toFixed(2) : ""
        ];
      });

      // Build Excel XML content
      const escapeXml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#E0E0E0" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Opérations">
    <Table>
      <Row>
        ${headers.map(h => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}
      </Row>
      ${rows.map(row => `<Row>${row.map(cell => `<Cell><Data ss:Type="String">${escapeXml(String(cell))}</Data></Cell>`).join('')}</Row>`).join('\n      ')}
    </Table>
  </Worksheet>
</Workbook>`;

      // Create and download the file
      const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateFromStr = format(dateRange.from, 'yyyy-MM-dd');
      const dateToStr = format(dateRange.to, 'yyyy-MM-dd');
      link.href = url;
      link.download = `operations_${selectedSite?.name || 'laverie'}_${dateFromStr}_${dateToStr}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Excel réussi",
        description: `${operations.length} opérations exportées`,
      });
    } catch (error) {
      toast({
        title: t('common:error'),
        description: "Erreur lors de l'export Excel",
        variant: "destructive",
      });
    }
  };

  const handleImportComplete = (count: number) => {
    // Refresh operations and calendar KPIs after import
    refetch();
    queryClient.invalidateQueries({ queryKey: ["operationsCalendarKpis", selectedSite?.id] });
    setTimeout(() => {
      setIsImportDialogOpen(false);
    }, 2000);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-lavcom-green mx-auto mb-4" />
          <p className="text-muted-foreground">{t('app:operations.loading')}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (isEmpty) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              {t('app:operations.title')}{selectedSite ? ` — ${selectedSite.name}` : ''}
            </h1>
            <p className="text-muted-foreground">
              {t('app:operations.subtitle')}
            </p>
          </div>
        </div>
        
        <div className="card-lavcom">
          <OperationsEmptyState onImportClick={() => setIsImportDialogOpen(true)} />
        </div>
        
        <CSVImportDialog 
          open={isImportDialogOpen} 
          onOpenChange={setIsImportDialogOpen}
          onImportComplete={handleImportComplete}
        />
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Opérations"
        description="Gérez les opérations et transactions de votre laverie automatique."
        url="/operations"
        noindex={true}
      />
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            {t('app:operations.title')}{selectedSite ? ` — ${selectedSite.name}` : ''}
          </h1>
          <p className="text-muted-foreground">
            {t('app:operations.subtitle')}
          </p>
          <div className="mt-2">
            <DataFreshnessIndicator />
          </div>
        </div>
        <div className="flex gap-2">
          {canImport ? (
            <Button 
              onClick={() => setIsImportDialogOpen(true)}
              className="bg-lavcom-green hover:bg-lavcom-green-dark text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('app:operations.importCsv')}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  disabled
                  className="opacity-50"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {t('app:operations.importCsv')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Vous n'avez pas la permission d'importer des données
              </TooltipContent>
            </Tooltip>
          )}
          <Button 
            variant="outline"
            onClick={() => setIsHistoryDialogOpen(true)}
          >
            <History className="h-4 w-4 mr-2" />
            {t('app:operations.history')}
          </Button>
          {canExport ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  disabled={operations.length === 0 || isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? t('app:operations.exporting') : t('app:operations.export')}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background">
                <DropdownMenuItem onClick={handleExportCsv}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileText className="h-4 w-4 mr-2" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled className="opacity-50">
                  <Lock className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Vous n'avez pas la permission d'exporter des données
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* CSV Import Dialog */}
      <CSVImportDialog 
        open={isImportDialogOpen} 
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={handleImportComplete}
      />

      {/* Import History Dialog */}
      <ImportHistoryDialog
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        onBatchDeleted={refetch}
      />

      {/* Filters */}
      <FiltersCard
        resultCount={operations.length}
        totalCount={rawOperations.length}
        totalAmount={operations.reduce((sum, op) => sum + Number(op.amount), 0)}
        hasActiveFilters={categoryFilter !== "all" || paymentFilter !== "all" || machineFilter !== "all" || dayFilter !== "all"}
        onReset={() => {
          setCategoryFilter("all");
          setPaymentFilter("all");
          setMachineFilter("all");
          setDayFilter("all");
        }}
      >
        {/* Row 1: Date + Search */}
        <div className="flex flex-col lg:flex-row gap-4">
          <DateRangePicker 
            dateRange={dateRange}
            onDateChange={handleDateChange}
          />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une machine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Row 2: Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-background">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              <SelectItem value="LAVE_LINGE">Lave-linge</SelectItem>
              <SelectItem value="SECHE_LINGE">Sèche-linge</SelectItem>
              <SelectItem value="LESSIVE">Lessive</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-background">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="CB">CB</SelectItem>
              <SelectItem value="ESP">ESP</SelectItem>
              <SelectItem value="FI">FI</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={machineFilter} onValueChange={setMachineFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background">
              <SelectValue placeholder="Machine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes machines</SelectItem>
              {uniqueMachines.map(machine => (
                <SelectItem key={machine} value={machine}>{machine}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger className="w-full sm:w-[140px] bg-background">
              <SelectValue placeholder="Jour" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les jours</SelectItem>
              <SelectItem value="1">Lundi</SelectItem>
              <SelectItem value="2">Mardi</SelectItem>
              <SelectItem value="3">Mercredi</SelectItem>
              <SelectItem value="4">Jeudi</SelectItem>
              <SelectItem value="5">Vendredi</SelectItem>
              <SelectItem value="6">Samedi</SelectItem>
              <SelectItem value="0">Dimanche</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FiltersCard>

      {/* KPI Row - CA calendaire + Graph + Machines sur une ligne */}
      <OperationsKPIRow 
        siteId={selectedSite?.id}
        hourlyData={hourlyData}
        machineCounts={machineCounts}
      />

      {/* Year Comparison Section - only in expert mode */}
      {isExpert && rawOperations.length > 0 && (
        <YearComparisonSection operations={rawOperations} />
      )}

      {/* Table */}
      <div className="card-lavcom overflow-hidden" data-operations-table>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead 
                  className="cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center">
                    Date
                    <SortIcon column="date" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("time")}
                >
                  <div className="flex items-center">
                    Heure
                    <SortIcon column="time" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("machine")}
                >
                  <div className="flex items-center">
                    Machine
                    <SortIcon column="machine" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("mode")}
                >
                  <div className="flex items-center">
                    Mode
                    <SortIcon column="mode" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Inséré</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("price")}
                >
                  <div className="flex items-center justify-end">
                    Prix
                    <SortIcon column="price" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Rendu</TableHead>
                <TableHead className="text-right">Prix CB</TableHead>
                <TableHead className="text-right">Prix ESP</TableHead>
                <TableHead className="text-center w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.map((op) => {
                const modeUpper = op.payment_mode?.toUpperCase();
                const isCB = modeUpper === "CB";
                const isESP = modeUpper === "ESP";
                const price = op.price_eur ?? Number(op.amount);
                
                // Check if this operation is NOT counted in revenue
                // For WiLine: only "Démarrage" type is counted
                // For LM Control: operations are counted if they have a valid sale type
                const typeValue = op.type?.toLowerCase() || '';
                const isRechargeOrCredit = typeValue.includes('rechargement') || 
                                            typeValue.includes('crédit') || 
                                            typeValue.includes('credit') ||
                                            typeValue.includes('annulation') ||
                                            typeValue.includes('remboursement');
                const isNotCounted = isRechargeOrCredit;
                
                return (
                  <TableRow 
                    key={op.id} 
                    className={cn(
                      "hover:bg-muted/30",
                      isNotCounted && "row-not-counted"
                    )}
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(parseISO(op.operation_date), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {op.operation_time?.slice(0, 5) || "—"}
                    </TableCell>
                    <TableCell className="font-medium">{op.machine_name || op.machine || "—"}</TableCell>
                    <TableCell>{paymentModeBadge(op.payment_mode)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(isESP ? op.inserted_eur : null)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRendu(isESP ? op.change_eur : null)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(isCB ? price : null)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(isESP ? price : null)}
                    </TableCell>
                    <TableCell className="text-center">
                      {isNotCounted && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="badge-not-counted inline-flex items-center gap-0.5 cursor-help">
                              <Ban className="h-3 w-3" />
                              <span className="hidden sm:inline">Hors CA</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Non comptabilisé dans le CA</p>
                            <p className="text-xs text-muted-foreground">Type: {op.type || 'N/A'}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {operations.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune opération trouvée</p>
            <p className="text-sm">Essayez de modifier vos filtres</p>
          </div>
        )}
        
        {/* Server-side Pagination */}
        {totalCount > 0 && (
          <div className="p-4 border-t space-y-3">
            {/* Quick month navigation from server data */}
            {monthSummaries.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Aller au mois :</span>
                <div className="flex flex-wrap gap-1">
                  {monthSummaries.slice(0, 12).map(summary => {
                    const [year, m] = summary.month.split('-');
                    const monthName = format(new Date(parseInt(year), parseInt(m) - 1, 1), 'MMM yyyy', { locale: fr });
                    const targetPage = Math.floor(summary.firstRowIndex / pageSize) + 1;
                    return (
                      <Button
                        key={summary.month}
                        variant={currentPage === targetPage ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setCurrentPage(targetPage)}
                        title={`${summary.count.toLocaleString('fr-FR')} opérations`}
                      >
                        {monthName}
                        <span className="ml-1 opacity-60">({summary.count})</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Main pagination row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} sur {totalCount.toLocaleString('fr-FR')} opérations
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* First page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="hidden sm:flex"
                >
                  Début
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Précédent</span>
                </Button>
                
                {/* Page input for direct navigation */}
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Page</span>
                  <Input
                    type="number"
                    min={1}
                    max={serverTotalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= serverTotalPages) {
                        setCurrentPage(page);
                      }
                    }}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-sm text-muted-foreground">/ {serverTotalPages}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(serverTotalPages, p + 1))}
                  disabled={currentPage >= serverTotalPages}
                >
                  <span className="hidden sm:inline mr-1">Suivant</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Last page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(serverTotalPages)}
                  disabled={currentPage >= serverTotalPages}
                  className="hidden sm:flex"
                >
                  Fin
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
