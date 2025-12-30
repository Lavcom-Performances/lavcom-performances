import { useState, useMemo } from "react";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, subYears, startOfQuarter, endOfQuarter } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateChange: (range: DateRange | undefined) => void;
  className?: string;
  showPresets?: boolean;
}

type PresetKey = "today" | "thisWeek" | "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear" | "lastYear" | "allTime" | "custom";

const getPresetLabel = (key: PresetKey): string => {
  const labels: Record<PresetKey, string> = {
    today: "Aujourd'hui",
    thisWeek: "Cette semaine",
    thisMonth: "Ce mois",
    lastMonth: "Mois dernier",
    thisQuarter: "Ce trimestre",
    thisYear: "Cette année",
    lastYear: "Année dernière",
    allTime: "Tout",
    custom: "Personnalisé",
  };
  return labels[key];
};

export function DateRangePicker({ 
  dateRange, 
  onDateChange, 
  className,
  showPresets = true,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | null>(null);
  const today = new Date();
  
  // Generate available years (current year and 5 years back)
  const availableYears = useMemo(() => {
    const currentYear = today.getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, [today]);

  // Quick presets
  const presets: { key: PresetKey; label: string; getRange: () => DateRange }[] = [
    {
      key: "thisMonth",
      label: "Ce mois",
      getRange: () => ({ from: startOfMonth(today), to: endOfMonth(today) }),
    },
    {
      key: "lastMonth",
      label: "Mois dernier",
      getRange: () => {
        const lastMonth = subMonths(today, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      },
    },
    {
      key: "thisQuarter",
      label: "Ce trimestre",
      getRange: () => ({ from: startOfQuarter(today), to: endOfQuarter(today) }),
    },
    {
      key: "thisYear",
      label: format(today, "yyyy"),
      getRange: () => ({ from: startOfYear(today), to: endOfYear(today) }),
    },
    {
      key: "lastYear",
      label: format(subYears(today, 1), "yyyy"),
      getRange: () => {
        const lastYear = subYears(today, 1);
        return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
      },
    },
    {
      key: "allTime",
      label: "Tout",
      getRange: () => ({ from: undefined, to: undefined } as unknown as DateRange),
    },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getRange();
    setSelectedPreset(preset.key);
    if (preset.key === "allTime") {
      onDateChange(undefined);
    } else {
      onDateChange(range);
    }
    setIsOpen(false);
  };

  const handleYearSelect = (year: string) => {
    const yearNum = parseInt(year, 10);
    const yearDate = new Date(yearNum, 0, 1);
    onDateChange({
      from: startOfYear(yearDate),
      to: endOfYear(yearDate),
    });
    setSelectedPreset("custom");
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setSelectedPreset("custom");
    onDateChange(range);
  };

  // Determine display text
  const displayText = useMemo(() => {
    if (!dateRange || (!dateRange.from && !dateRange.to)) {
      return "Toutes les dates";
    }
    if (dateRange.from && dateRange.to) {
      // Check if it's a full year
      const fromYear = dateRange.from.getFullYear();
      const toYear = dateRange.to.getFullYear();
      if (
        fromYear === toYear &&
        dateRange.from.getMonth() === 0 &&
        dateRange.from.getDate() === 1 &&
        dateRange.to.getMonth() === 11 &&
        dateRange.to.getDate() === 31
      ) {
        return `Année ${fromYear}`;
      }
      // Check if same month
      if (
        fromYear === toYear &&
        dateRange.from.getMonth() === dateRange.to.getMonth()
      ) {
        return format(dateRange.from, "MMMM yyyy", { locale: fr });
      }
      return `${format(dateRange.from, "dd MMM yy", { locale: fr })} - ${format(dateRange.to, "dd MMM yy", { locale: fr })}`;
    }
    if (dateRange.from) {
      return `Depuis ${format(dateRange.from, "dd MMM yyyy", { locale: fr })}`;
    }
    return "Sélectionner une période";
  }, [dateRange]);

  return (
    <div data-tutorial="date-range" className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "min-w-[200px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="flex-1">{displayText}</span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Quick presets sidebar */}
            {showPresets && (
              <div className="border-r p-2 space-y-1 min-w-[140px] bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Raccourcis
                </p>
                {presets.map((preset) => (
                  <Button
                    key={preset.key}
                    variant={selectedPreset === preset.key ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-sm h-8"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
                
                <div className="pt-2 border-t mt-2">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                    Année
                  </p>
                  <Select onValueChange={handleYearSelect}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {/* Calendar */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from || today}
                selected={dateRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                locale={fr}
                className="pointer-events-auto"
                captionLayout="dropdown-buttons"
                fromYear={today.getFullYear() - 5}
                toYear={today.getFullYear() + 1}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}