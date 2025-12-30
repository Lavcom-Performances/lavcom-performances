import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSite } from "@/hooks/useCurrentSite";

export interface ChartFilters {
  dateRange: DateRange | undefined;
  paymentMode: string;
  machineType: string;
  machine: string;
  dayOfWeek: string;
}

interface ChartPageFiltersProps {
  dateRange: DateRange | undefined;
  onDateChange: (range: DateRange | undefined) => void;
  filters: Omit<ChartFilters, 'dateRange'>;
  onFiltersChange: (filters: Omit<ChartFilters, 'dateRange'>) => void;
  showPaymentMode?: boolean;
  showMachineType?: boolean;
  showMachine?: boolean;
  showDayOfWeek?: boolean;
}

const PAYMENT_MODES = [
  { value: "all", label: "Tous les modes" },
  { value: "CB", label: "Carte bancaire" },
  { value: "ESP", label: "Espèces" },
  { value: "FI", label: "Fidélité" },
];

const MACHINE_TYPES = [
  { value: "all", label: "Tous les types" },
  { value: "LL", label: "Lave-linge" },
  { value: "SL", label: "Sèche-linge" },
];

const DAYS_OF_WEEK = [
  { value: "all", label: "Tous les jours" },
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
  { value: "0", label: "Dimanche" },
];

export function ChartPageFilters({
  dateRange,
  onDateChange,
  filters,
  onFiltersChange,
  showPaymentMode = true,
  showMachineType = true,
  showMachine = true,
  showDayOfWeek = true,
}: ChartPageFiltersProps) {
  const { currentSiteId } = useCurrentSite();
  const [machines, setMachines] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch unique machines for this site
  useEffect(() => {
    if (!currentSiteId) return;

    const fetchMachines = async () => {
      const { data } = await supabase
        .from("operations")
        .select("machine_name, machine")
        .eq("site_id", currentSiteId)
        .not("machine_name", "is", null);

      if (data) {
        const uniqueMachines = [...new Set(
          data.map(op => op.machine_name || op.machine).filter(Boolean) as string[]
        )].sort();
        setMachines(uniqueMachines);
      }
    };

    fetchMachines();
  }, [currentSiteId]);

  const handleFilterChange = (key: keyof Omit<ChartFilters, 'dateRange'>, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = 
    filters.paymentMode !== "all" || 
    filters.machineType !== "all" || 
    filters.machine !== "all" || 
    filters.dayOfWeek !== "all";

  const resetFilters = () => {
    onFiltersChange({
      paymentMode: "all",
      machineType: "all",
      machine: "all",
      dayOfWeek: "all",
    });
  };

  return (
    <div className="space-y-4">
      {/* Top row: date picker + filter toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker 
          dateRange={dateRange} 
          onDateChange={onDateChange}
          showPresets
        />
        
        <Button
          variant={showFilters || hasActiveFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtres
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 bg-background text-foreground rounded-full text-xs font-bold">
              {[
                filters.paymentMode !== "all" ? 1 : 0,
                filters.machineType !== "all" ? 1 : 0,
                filters.machine !== "all" ? 1 : 0,
                filters.dayOfWeek !== "all" ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Filter selectors */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-muted/50 border">
          {showPaymentMode && (
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Mode de paiement</label>
              <Select
                value={filters.paymentMode}
                onValueChange={(v) => handleFilterChange("paymentMode", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showMachineType && (
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Type de machine</label>
              <Select
                value={filters.machineType}
                onValueChange={(v) => handleFilterChange("machineType", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MACHINE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showMachine && machines.length > 0 && (
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">Machine</label>
              <Select
                value={filters.machine}
                onValueChange={(v) => handleFilterChange("machine", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les machines</SelectItem>
                  {machines.map((machine) => (
                    <SelectItem key={machine} value={machine}>
                      {machine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showDayOfWeek && (
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Jour de la semaine</label>
              <Select
                value={filters.dayOfWeek}
                onValueChange={(v) => handleFilterChange("dayOfWeek", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Default initial filters
export const defaultChartFilters: Omit<ChartFilters, 'dateRange'> = {
  paymentMode: "all",
  machineType: "all",
  machine: "all",
  dayOfWeek: "all",
};
