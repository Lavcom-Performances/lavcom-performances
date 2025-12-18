import { useState, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { subDays, format, startOfDay, startOfMonth, startOfYear, isWithinInterval, getHours } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Download, Filter, Upload } from "lucide-react";
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
import { generateOperationsPdf } from "@/utils/operationsPdfExport";
import { useToast } from "@/hooks/use-toast";
import { useViewMode } from "@/hooks/useViewMode";

// Mock data for V1 - more complete dataset
const mockOperations = [
  { id: "1", date: new Date(), label: "Lave-linge 3", category: "LAVE_LINGE", paymentMode: "CB", amount: 4.00, insert: 0, rendu: 0, detail: "CB" },
  { id: "2", date: new Date(), label: "Lave-linge 4", category: "LAVE_LINGE", paymentMode: "ESP", amount: 4.00, insert: 4.00, rendu: 0, detail: "TUBE" },
  { id: "3", date: new Date(), label: "Lave-linge 5", category: "LAVE_LINGE", paymentMode: "ESP", amount: 4.00, insert: 10.00, rendu: 6.00, detail: "CAISSE" },
  { id: "4", date: new Date(), label: "Lave-linge 6", category: "LAVE_LINGE", paymentMode: "CB", amount: 4.00, insert: 0, rendu: 0, detail: "CB" },
  { id: "5", date: new Date(), label: "Sèche-linge 1", category: "SECHE_LINGE", paymentMode: "ESP", amount: 2.00, insert: 2.00, rendu: 0, detail: "TUBE" },
  { id: "6", date: new Date(), label: "Sèche-linge 2", category: "SECHE_LINGE", paymentMode: "ESP", amount: 2.00, insert: 2.00, rendu: 0, detail: "TUBE" },
  { id: "7", date: new Date(), label: "Lessive 7", category: "LESSIVE", paymentMode: "ESP", amount: 1.00, insert: 1.00, rendu: 0, detail: "CAISSE" },
  { id: "8", date: subDays(new Date(), 1), label: "Lave-linge 5", category: "LAVE_LINGE", paymentMode: "ESP", amount: 4.00, insert: 4.00, rendu: 0, detail: "CAISSE" },
  { id: "9", date: subDays(new Date(), 1), label: "Lave-linge 6", category: "LAVE_LINGE", paymentMode: "CB", amount: 4.00, insert: 0, rendu: 0, detail: "REJETÉ" },
  { id: "10", date: subDays(new Date(), 2), label: "Sèche-linge 1", category: "SECHE_LINGE", paymentMode: "ESP", amount: 2.00, insert: 3.90, rendu: 1.00, detail: "CAISSE" },
  { id: "11", date: subDays(new Date(), 2), label: "Lave-linge 4", category: "LAVE_LINGE", paymentMode: "ESP", amount: 8.00, insert: 8.00, rendu: 0, detail: "TUBE" },
  { id: "12", date: subDays(new Date(), 3), label: "Sèche-linge 1", category: "SECHE_LINGE", paymentMode: "ESP", amount: 1.00, insert: 1.00, rendu: 0, detail: "CAISSE" },
  { id: "13", date: subDays(new Date(), 3), label: "Lave-linge 3", category: "LAVE_LINGE", paymentMode: "CB", amount: 8.00, insert: 0, rendu: 0, detail: "CB" },
  { id: "14", date: subDays(new Date(), 4), label: "Sèche-linge 2", category: "SECHE_LINGE", paymentMode: "ESP", amount: 1.00, insert: 2.00, rendu: 1.00, detail: "BILLET" },
  { id: "15", date: subDays(new Date(), 5), label: "Sèche-linge 1", category: "SECHE_LINGE", paymentMode: "ESP", amount: 1.00, insert: 10.00, rendu: 9.00, detail: "CAISSE" },
  { id: "16", date: subDays(new Date(), 6), label: "Lave-linge 6", category: "LAVE_LINGE", paymentMode: "ESP", amount: 4.00, insert: 7.80, rendu: 3.00, detail: "TUBE" },
];

const paymentModeBadge = (mode: string) => {
  switch (mode) {
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

const categoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    LAVE_LINGE: "Lave-linge",
    SECHE_LINGE: "Sèche-linge",
    LESSIVE: "Lessive",
    RECHARGE_CB: "Recharge CB",
    RECHARGE_ESP: "Recharge ESP",
    AUTRE: "Autre",
  };
  return labels[category] || category;
};

export default function Operations() {
  const { isExpert } = useViewMode();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const filteredOperations = mockOperations.filter((op) => {
    const matchesSearch = op.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || op.category === categoryFilter;
    const matchesPayment = paymentFilter === "all" || op.paymentMode === paymentFilter;
    
    // Date filter
    if (dateRange?.from && dateRange?.to) {
      const opDate = startOfDay(op.date);
      const isInRange = isWithinInterval(opDate, { start: startOfDay(dateRange.from), end: startOfDay(dateRange.to) });
      return matchesSearch && matchesCategory && matchesPayment && isInRange;
    }
    
    return matchesSearch && matchesCategory && matchesPayment;
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const yearStart = startOfYear(new Date());

    const calcKPI = (ops: typeof mockOperations) => ({
      total: ops.reduce((sum, op) => sum + op.amount, 0),
      cb: ops.filter(op => op.paymentMode === "CB").reduce((sum, op) => sum + op.amount, 0),
      esp: ops.filter(op => op.paymentMode === "ESP").reduce((sum, op) => sum + op.amount, 0),
    });

    const todayOps = filteredOperations.filter(op => startOfDay(op.date).getTime() === today.getTime());
    const monthOps = filteredOperations.filter(op => op.date >= monthStart);
    const yearOps = filteredOperations.filter(op => op.date >= yearStart);

    return {
      day: calcKPI(todayOps),
      month: calcKPI(monthOps),
      year: calcKPI(yearOps),
    };
  }, [filteredOperations]);

  // Calculate hourly data for chart
  const hourlyData = useMemo(() => {
    const hours: { [key: number]: { cb: number; esp: number } } = {};
    for (let i = 6; i <= 22; i++) {
      hours[i] = { cb: 0, esp: 0 };
    }
    
    filteredOperations.forEach(op => {
      const hour = getHours(op.date);
      if (hour >= 6 && hour <= 22) {
        if (op.paymentMode === "CB") {
          hours[hour].cb += op.amount;
        } else if (op.paymentMode === "ESP") {
          hours[hour].esp += op.amount;
        }
      }
    });

    return Object.entries(hours).map(([hour, data]) => ({
      hour: `${hour}h`,
      cb: data.cb,
      esp: data.esp,
    }));
  }, [filteredOperations]);

  // Calculate machine counts
  const machineCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredOperations.forEach(op => {
      counts[op.label] = (counts[op.label] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOperations]);

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
      
      generateOperationsPdf({
        laundromatName: "Laverie Démo",
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        operations: filteredOperations,
      });

      toast({
        title: "Export réussi",
        description: `${filteredOperations.length} opérations exportées en PDF.`,
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
    // In a real app, we would refresh the operations list here
    // For now, we just close the dialog after a delay
    setTimeout(() => {
      setIsImportDialogOpen(false);
    }, 2000);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Opérations
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
            onClick={handleExportPdf}
            disabled={isExporting || filteredOperations.length === 0}
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

      {/* Filters */}
      <div className="card-lavcom p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <DateRangePicker 
            dateRange={dateRange}
            onDateChange={setDateRange}
          />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
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
              <SelectItem value="RECHARGE_CB">Recharge CB</SelectItem>
              <SelectItem value="RECHARGE_ESP">Recharge ESP</SelectItem>
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
              <TableHead>Sélection</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Insert</TableHead>
              <TableHead className="text-right">Rendu</TableHead>
              <TableHead className="text-right">Prix</TableHead>
              <TableHead>Détail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOperations.map((op) => (
              <TableRow key={op.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">
                  {format(op.date, "dd/MM/yyyy", { locale: fr })}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(op.date, "HH:mm:ss", { locale: fr })}
                </TableCell>
                <TableCell className="font-medium">{op.label}</TableCell>
                <TableCell>{paymentModeBadge(op.paymentMode)}</TableCell>
                <TableCell className="text-right">
                  {op.insert > 0 ? `${op.insert.toFixed(2)} €` : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {op.rendu > 0 ? `${op.rendu.toFixed(2)} €` : "-"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {op.amount.toFixed(2)} €
                </TableCell>
                <TableCell className={cn(
                  "text-sm",
                  op.detail === "REJETÉ" ? "text-destructive font-medium" : "text-muted-foreground"
                )}>
                  {op.detail || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredOperations.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune opération trouvée</p>
            <p className="text-sm">Essayez de modifier vos filtres</p>
          </div>
        )}
      </div>
    </div>
  );
}
