import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Filter, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ChartFilters {
  dateRange: DateRange | undefined;
  paymentModes: string[];
  machineTypes: string[];
  machines: string[];
  daysOfWeek: string[];
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
  availableMachines?: string[];
}

export const PAYMENT_MODES = [
  { value: "CB", label: "Carte bancaire" },
  { value: "ESP", label: "Espèces" },
  { value: "FI", label: "Fidélité" },
];

export const MACHINE_TYPES = [
  { value: "LL", label: "Lave-linge" },
  { value: "SL", label: "Sèche-linge" },
  { value: "LESSIVE", label: "Lessive" },
  { value: "RECH", label: "Recharge CB" },
];

export const DAYS_OF_WEEK = [
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
  { value: "0", label: "Dimanche" },
];

interface MultiSelectFilterProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  allLabel?: string;
}

function MultiSelectFilter({ label, options, selected, onChange, allLabel = "Tous" }: MultiSelectFilterProps) {
  const allSelected = selected.length === options.length || selected.length === 0;
  
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map(o => o.value));
    }
  };

  const getDisplayText = () => {
    if (allSelected) return allLabel;
    if (selected.length === 0) return "Aucun";
    if (selected.length === 1) {
      return options.find(o => o.value === selected[0])?.label || selected[0];
    }
    return `${selected.length} sélectionnés`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 justify-between min-w-[140px]">
          <span className="truncate text-left">{getDisplayText()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted",
              allSelected && "bg-primary/10"
            )}
            onClick={toggleAll}
          >
            <Checkbox checked={allSelected} />
            <span className="text-sm font-medium">{allLabel}</span>
          </div>
          <div className="border-t my-1" />
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted",
                selected.includes(option.value) && "bg-primary/10"
              )}
              onClick={() => toggleOption(option.value)}
            >
              <Checkbox checked={selected.includes(option.value)} />
              <span className="text-sm">{option.label}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ChartPageFilters({
  dateRange,
  onDateChange,
  filters,
  onFiltersChange,
  showPaymentMode = true,
  showMachineType = true,
  showMachine = true,
  showDayOfWeek = true,
  availableMachines: propMachines,
}: ChartPageFiltersProps) {
  const { currentSiteId } = useCurrentSite();
  const [machines, setMachines] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch unique machines for this site
  useEffect(() => {
    if (!currentSiteId || propMachines) return;

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
  }, [currentSiteId, propMachines]);

  const displayMachines = propMachines || machines;

  const hasActiveFilters = 
    filters.paymentModes.length > 0 && filters.paymentModes.length < PAYMENT_MODES.length ||
    filters.machineTypes.length > 0 && filters.machineTypes.length < MACHINE_TYPES.length ||
    filters.machines.length > 0 && filters.machines.length < displayMachines.length ||
    filters.daysOfWeek.length > 0 && filters.daysOfWeek.length < DAYS_OF_WEEK.length;

  const countActiveFilters = () => {
    let count = 0;
    if (filters.paymentModes.length > 0 && filters.paymentModes.length < PAYMENT_MODES.length) count++;
    if (filters.machineTypes.length > 0 && filters.machineTypes.length < MACHINE_TYPES.length) count++;
    if (filters.machines.length > 0 && filters.machines.length < displayMachines.length) count++;
    if (filters.daysOfWeek.length > 0 && filters.daysOfWeek.length < DAYS_OF_WEEK.length) count++;
    return count;
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
          {countActiveFilters() > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-background text-foreground rounded-full text-xs font-bold">
              {countActiveFilters()}
            </span>
          )}
        </Button>
      </div>

      {/* Filter selectors */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-muted/50 border">
          {showPaymentMode && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mode de paiement</label>
              <MultiSelectFilter
                label="Mode de paiement"
                options={PAYMENT_MODES}
                selected={filters.paymentModes}
                onChange={(values) => onFiltersChange({ ...filters, paymentModes: values })}
                allLabel="Tous les modes"
              />
            </div>
          )}

          {showMachineType && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type de machine</label>
              <MultiSelectFilter
                label="Type de machine"
                options={MACHINE_TYPES}
                selected={filters.machineTypes}
                onChange={(values) => onFiltersChange({ ...filters, machineTypes: values })}
                allLabel="Tous les types"
              />
            </div>
          )}

          {showMachine && displayMachines.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Machines</label>
              <MultiSelectFilter
                label="Machines"
                options={displayMachines.map(m => ({ value: m, label: m }))}
                selected={filters.machines}
                onChange={(values) => onFiltersChange({ ...filters, machines: values })}
                allLabel="Toutes les machines"
              />
            </div>
          )}

          {showDayOfWeek && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Jour de la semaine</label>
              <MultiSelectFilter
                label="Jour"
                options={DAYS_OF_WEEK}
                selected={filters.daysOfWeek}
                onChange={(values) => onFiltersChange({ ...filters, daysOfWeek: values })}
                allLabel="Tous les jours"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Default filters factory - returns all options selected (empty arrays = all)
export function createDefaultFilters(overrides?: Partial<Omit<ChartFilters, 'dateRange'>>): Omit<ChartFilters, 'dateRange'> {
  return {
    paymentModes: [],
    machineTypes: [],
    machines: [],
    daysOfWeek: [],
    ...overrides,
  };
}

// Specific defaults for heatmap - exclude lessive and recharge CB (only LL and SL)
export const heatmapDefaultFilters: Omit<ChartFilters, 'dateRange'> = {
  paymentModes: [],
  machineTypes: ["LL", "SL"], // Only washing and drying machines
  machines: [],
  daysOfWeek: [],
};

// Specific defaults for machine page - only washing machines
export const machinePageDefaultFilters: Omit<ChartFilters, 'dateRange'> = {
  paymentModes: [],
  machineTypes: ["LL"], // Only washing machines
  machines: [],
  daysOfWeek: [],
};

// Default: all selected (empty = all)
export const defaultChartFilters: Omit<ChartFilters, 'dateRange'> = {
  paymentModes: [],
  machineTypes: [],
  machines: [],
  daysOfWeek: [],
};
