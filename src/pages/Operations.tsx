import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DateRange } from "react-day-picker";
import { subDays, format, startOfDay, startOfMonth, startOfYear, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Download, Upload, Loader2, History } from "lucide-react";
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
import { OperationsKPIRow } from "@/components/operations/OperationsKPIRow";
import { HourlyBarChart } from "@/components/operations/HourlyBarChart";
import { MachineCountList } from "@/components/operations/MachineCountList";
import { CSVImportDialog } from "@/components/operations/CSVImportDialog";
import { ImportHistoryDialog } from "@/components/operations/ImportHistoryDialog";
import { OperationsEmptyState } from "@/components/operations/OperationsEmptyState";
import { generateOperationsPdf } from "@/utils/operationsPdfExport";
import { trackPdfDownload } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { useViewMode } from "@/hooks/useViewMode";
import { useOperations } from "@/hooks/useOperations";
import { useSites } from "@/hooks/useSites";

const paymentModeBadge = (mode: string | null) => {
  if (!mode) return <span className="text-muted-foreground">-</span>;
  
  const modeUpper = mode.toUpperCase();
  switch (modeUpper) {
    case "CB":
      return <span className="badge-cb">CB</span>;
    case "ESP":
      return <span className="badge-esp">ESP</span>;
    case "FI":
      return <span className="badge-fi">FI</span>;
    default:
      return <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">{mode}</span>;
  }
};

export default function Operations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isExpert } = useViewMode();
  const { toast } = useToast();
  const { sites, getDefaultSite } = useSites();
  
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
        title: "Site non trouvé",
        description: "Affichage de votre laverie par défaut.",
        variant: "default",
      });
    }
  }, [siteWasInvalid, sites.length, toast]);
  
  // Initialize date range from URL or defaults
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (urlDateStart && urlDateEnd) {
      return {
        from: parseISO(urlDateStart),
        to: parseISO(urlDateEnd),
      };
    }
    return {
      from: subDays(new Date(), 30),
      to: new Date(),
    };
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const { operations, isLoading, isEmpty, refetch } = useOperations({
    dateRange,
    searchQuery,
    category: categoryFilter,
    paymentMode: paymentFilter,
    siteId: selectedSite?.id,
  });

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
        title: "Sélectionnez une période",
        description: "Veuillez définir une plage de dates pour l'export.",
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
        title: "Export réussi",
        description: `${operations.length} opérations exportées en PDF.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportComplete = (count: number) => {
    // Refresh operations after import
    refetch();
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
          <p className="text-muted-foreground">Chargement des opérations...</p>
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
              Opérations{selectedSite ? ` — ${selectedSite.name}` : ''}
            </h1>
            <p className="text-muted-foreground">
              Journal chronologique des transactions
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Opérations{selectedSite ? ` — ${selectedSite.name}` : ''}
          </h1>
          <p className="text-muted-foreground">
            Journal chronologique des transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsImportDialogOpen(true)}
            className="bg-lavcom-green hover:bg-lavcom-green-dark text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importer CSV
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsHistoryDialogOpen(true)}
          >
            <History className="h-4 w-4 mr-2" />
            Historique
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExporting || operations.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Export..." : "Exporter"}
          </Button>
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
      <div className="card-lavcom p-4">
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
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full lg:w-[180px]">
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
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous paiements</SelectItem>
              <SelectItem value="CB">Carte bancaire</SelectItem>
              <SelectItem value="ESP">Espèces</SelectItem>
              <SelectItem value="FI">Fidélité</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs + Chart + Machine counts */}
      <div className={cn(
        "grid gap-4",
        isExpert ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"
      )}>
        {/* KPIs Column */}
        <div className={cn(
          "card-lavcom p-4 space-y-3",
          isExpert ? "lg:col-span-4" : ""
        )}>
          <OperationsKPIRow 
            label="JOUR" 
            total={kpis.day.total} 
            cb={kpis.day.cb} 
            esp={kpis.day.esp}
          />
          <OperationsKPIRow 
            label="MOIS" 
            total={kpis.month.total} 
            cb={kpis.month.cb} 
            esp={kpis.month.esp}
            isHighlighted
          />
          <OperationsKPIRow 
            label="ANNÉE" 
            total={kpis.year.total} 
            cb={kpis.year.cb} 
            esp={kpis.year.esp}
          />
        </div>

        {/* Expert: Hourly Chart */}
        {isExpert && (
          <div className="lg:col-span-5 card-lavcom p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">CA par heure</h3>
            <div className="flex items-center gap-4 mb-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-cb))' }}></div>
                <span>CB</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-esp))' }}></div>
                <span>ESP</span>
              </div>
            </div>
            <HourlyBarChart data={hourlyData} />
          </div>
        )}

        {/* Expert: Machine counts */}
        {isExpert && (
          <div className="lg:col-span-3 card-lavcom p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Machines utilisées</h3>
            <MachineCountList machines={machineCounts} />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card-lavcom overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Heure</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Programme</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.slice(0, 100).map((op) => (
              <TableRow key={op.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">
                  {format(parseISO(op.operation_date), "dd/MM/yyyy", { locale: fr })}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {op.operation_time || "-"}
                </TableCell>
                <TableCell className="font-medium">{op.machine || "-"}</TableCell>
                <TableCell>{paymentModeBadge(op.payment_mode)}</TableCell>
                <TableCell className="text-right font-medium">
                  {Number(op.amount).toFixed(2)} €
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {op.program || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {operations.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune opération trouvée</p>
            <p className="text-sm">Essayez de modifier vos filtres</p>
          </div>
        )}
        
        {operations.length > 100 && (
          <div className="p-4 text-center text-sm text-muted-foreground border-t">
            Affichage limité aux 100 premières opérations. Affinez vos filtres pour voir plus de détails.
          </div>
        )}
      </div>
    </div>
  );
}
