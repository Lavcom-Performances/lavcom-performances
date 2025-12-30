import { useState, useMemo } from "react";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, subYears, addYears, startOfQuarter, endOfQuarter } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateChange: (range: DateRange | undefined) => void;
  className?: string;
  showPresets?: boolean;
}

type PresetKey = "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear" | "lastYear" | "allTime" | "custom";

export function DateRangePicker({ 
  dateRange, 
  onDateChange, 
  className,
  showPresets = true,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | null>(null);
  const today = new Date();
  
  // Calendar display month - track independently for navigation
  const [calendarMonth, setCalendarMonth] = useState<Date>(dateRange?.from || today);
  
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
      if (range.from) {
        setCalendarMonth(range.from);
      }
    }
    setIsOpen(false);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setSelectedPreset("custom");
    onDateChange(range);
  };

  // Year navigation
  const handlePreviousYear = () => {
    setCalendarMonth(subYears(calendarMonth, 1));
  };

  const handleNextYear = () => {
    setCalendarMonth(addYears(calendarMonth, 1));
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
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Quick presets sidebar */}
            {showPresets && (
              <div className="border-r p-2 space-y-1 min-w-[110px] bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Période
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
              </div>
            )}
            
            {/* Calendar with year navigation */}
            <div className="p-3">
              {/* Year navigation buttons */}
              <div className="flex items-center justify-center gap-2 mb-3 pb-2 border-b">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePreviousYear}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {format(subYears(calendarMonth, 1), "yyyy")}
                </Button>
                <span className="font-semibold text-sm min-w-[50px] text-center">
                  {format(calendarMonth, "yyyy")}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNextYear}
                  className="h-7 px-2"
                >
                  {format(addYears(calendarMonth, 1), "yyyy")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <Calendar
                initialFocus
                mode="range"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={dateRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                locale={fr}
                className="pointer-events-auto"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}