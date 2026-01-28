/**
 * performanceMonitor.ts
 * 
 * Client-side performance monitoring for slow queries
 * Logs events to system_events via edge function
 */

import { supabase } from "@/integrations/supabase/client";

interface PerformanceEvent {
  page: string;
  widget: string;
  durationMs: number;
  dateRangeDays: number;
  siteId?: string;
}

// Threshold for slow queries (ms)
const SLOW_QUERY_THRESHOLD = 2000;
const CRITICAL_QUERY_THRESHOLD = 5000;

// Batch events to reduce API calls
let eventQueue: PerformanceEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

/**
 * Measure and optionally log a query's duration
 */
export async function measureQuery<T>(
  page: string,
  widget: string,
  dateRangeDays: number,
  queryFn: () => Promise<T>,
  siteId?: string
): Promise<{ data: T; durationMs: number }> {
  const startTime = performance.now();
  
  try {
    const data = await queryFn();
    const durationMs = Math.round(performance.now() - startTime);
    
    // Log if slow
    if (durationMs >= SLOW_QUERY_THRESHOLD) {
      logSlowQuery({
        page,
        widget,
        durationMs,
        dateRangeDays,
        siteId,
      });
    }
    
    return { data, durationMs };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    
    // Log failed queries too
    logSlowQuery({
      page,
      widget: `${widget}_error`,
      durationMs,
      dateRangeDays,
      siteId,
    });
    
    throw error;
  }
}

/**
 * Queue a slow query event for batched logging
 */
function logSlowQuery(event: PerformanceEvent): void {
  eventQueue.push(event);
  
  // Schedule flush if not already scheduled
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 5000);
  }
}

/**
 * Flush queued events to the server
 */
async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;
  
  const events = [...eventQueue];
  eventQueue = [];
  flushTimer = null;
  
  try {
    // Send events to edge function for logging
    await supabase.functions.invoke('log-performance', {
      body: { events },
    });
  } catch (error) {
    // Don't spam console - performance logging is best-effort
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Performance] Failed to log events:', error);
    }
  }
}

/**
 * Calculate date range in days
 */
export function calculateDateRangeDays(from?: Date, to?: Date): number {
  if (!from || !to) return 0;
  const diffMs = to.getTime() - from.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date range exceeds the guardrail threshold (90 days)
 */
export function exceedsDateRangeGuardrail(from?: Date, to?: Date): boolean {
  const days = calculateDateRangeDays(from, to);
  return days > 90;
}

/**
 * Get severity level based on query duration
 */
export function getQuerySeverity(durationMs: number): 'info' | 'warn' | 'error' {
  if (durationMs >= CRITICAL_QUERY_THRESHOLD) return 'error';
  if (durationMs >= SLOW_QUERY_THRESHOLD) return 'warn';
  return 'info';
}

// Export thresholds for UI display
export const PERFORMANCE_THRESHOLDS = {
  SLOW_QUERY_MS: SLOW_QUERY_THRESHOLD,
  CRITICAL_QUERY_MS: CRITICAL_QUERY_THRESHOLD,
  DATE_RANGE_GUARDRAIL_DAYS: 90,
};
