import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";
import { useSearchParams } from "react-router-dom";

interface DateRangeContextType {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  formattedRange: {
    from: string | undefined;
    to: string | undefined;
  };
  isCurrentMonth: boolean;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

const STORAGE_KEY = "lavcom_date_range";

// Get default range (current month)
function getDefaultRange(): DateRange {
  const now = new Date();
  return {
    from: startOfMonth(now),
    to: endOfMonth(now),
  };
}

// Load from localStorage
function loadFromStorage(): DateRange | undefined {
  if (typeof window === "undefined") return getDefaultRange();
  
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        from: parsed.from ? parseISO(parsed.from) : undefined,
        to: parsed.to ? parseISO(parsed.to) : undefined,
      };
    } catch {
      return getDefaultRange();
    }
  }
  return getDefaultRange();
}

// Save to localStorage
function saveToStorage(range: DateRange | undefined) {
  if (typeof window === "undefined") return;
  
  if (range?.from || range?.to) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      from: range.from ? format(range.from, "yyyy-MM-dd") : null,
      to: range.to ? format(range.to, "yyyy-MM-dd") : null,
    }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL params first, then localStorage, then default
  const [dateRange, setDateRangeState] = useState<DateRange | undefined>(() => {
    const urlFrom = searchParams.get("date_start");
    const urlTo = searchParams.get("date_end");
    
    if (urlFrom && urlTo) {
      return {
        from: parseISO(urlFrom),
        to: parseISO(urlTo),
      };
    }
    
    return loadFromStorage();
  });

  // Sync to URL and localStorage when range changes
  const setDateRange = useCallback((range: DateRange | undefined) => {
    setDateRangeState(range);
    saveToStorage(range);
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (range?.from && range?.to) {
      params.set("date_start", format(range.from, "yyyy-MM-dd"));
      params.set("date_end", format(range.to, "yyyy-MM-dd"));
    } else {
      params.delete("date_start");
      params.delete("date_end");
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // Formatted range for API calls
  const formattedRange = useMemo(() => ({
    from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  }), [dateRange]);

  // Check if current month is selected
  const isCurrentMonth = useMemo(() => {
    const defaultRange = getDefaultRange();
    return (
      dateRange?.from?.getTime() === defaultRange.from?.getTime() &&
      dateRange?.to?.getTime() === defaultRange.to?.getTime()
    );
  }, [dateRange]);

  return (
    <DateRangeContext.Provider value={{ 
      dateRange, 
      setDateRange, 
      formattedRange,
      isCurrentMonth,
    }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error("useDateRange must be used within a DateRangeProvider");
  }
  return context;
}

// Hook for pages that don't need the provider (standalone usage)
export function useDateRangeLocal() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [dateRange, setDateRangeState] = useState<DateRange | undefined>(() => {
    const urlFrom = searchParams.get("date_start");
    const urlTo = searchParams.get("date_end");
    
    if (urlFrom && urlTo) {
      return {
        from: parseISO(urlFrom),
        to: parseISO(urlTo),
      };
    }
    
    return loadFromStorage();
  });

  const setDateRange = useCallback((range: DateRange | undefined) => {
    setDateRangeState(range);
    saveToStorage(range);
    
    const params = new URLSearchParams(searchParams);
    if (range?.from && range?.to) {
      params.set("date_start", format(range.from, "yyyy-MM-dd"));
      params.set("date_end", format(range.to, "yyyy-MM-dd"));
    } else {
      params.delete("date_start");
      params.delete("date_end");
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const formattedRange = useMemo(() => ({
    from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  }), [dateRange]);

  return { dateRange, setDateRange, formattedRange };
}
