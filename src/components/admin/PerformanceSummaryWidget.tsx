/**
 * PerformanceSummaryWidget.tsx
 * 
 * Admin widget showing performance metrics from system_events
 * Displays avg load time, slow query count, recent performance issues
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, Clock, RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { PERFORMANCE_THRESHOLDS } from "@/lib/performanceMonitor";

interface PerfEvent {
  id: number;
  created_at: string;
  severity: string;
  message: string;
  meta: {
    page?: string;
    widget?: string;
    duration_ms?: number;
    date_range_days?: number;
  } | null;
}

interface PerformanceStats {
  avgLoadTime: number;
  slowCount: number;
  criticalCount: number;
  totalEvents: number;
  recentEvents: PerfEvent[];
}

export function PerformanceSummaryWidget() {
  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-performance-stats"],
    queryFn: async (): Promise<PerformanceStats> => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch performance events from last 24h
      const { data: events, error } = await supabase
        .from("system_events")
        .select("*")
        .eq("source", "perf")
        .gte("created_at", last24h.toISOString())
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const perfEvents = (events || []) as PerfEvent[];
      
      // Calculate stats
      let totalDuration = 0;
      let slowCount = 0;
      let criticalCount = 0;

      perfEvents.forEach(event => {
        const duration = event.meta?.duration_ms || 0;
        totalDuration += duration;
        
        if (duration >= PERFORMANCE_THRESHOLDS.CRITICAL_QUERY_MS) {
          criticalCount++;
        } else if (duration >= PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS) {
          slowCount++;
        }
      });

      const avgLoadTime = perfEvents.length > 0 
        ? Math.round(totalDuration / perfEvents.length) 
        : 0;

      return {
        avgLoadTime,
        slowCount,
        criticalCount,
        totalEvents: perfEvents.length,
        recentEvents: perfEvents.slice(0, 5),
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error": return "text-red-500";
      case "warn": return "text-amber-500";
      default: return "text-blue-500";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "error": return <Badge variant="destructive">Critique</Badge>;
      case "warn": return <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">Lent</Badge>;
      default: return <Badge variant="outline">Info</Badge>;
    }
  };

  // Determine overall status
  const getOverallStatus = () => {
    if (!stats) return { icon: Activity, color: "text-muted-foreground", label: "Chargement..." };
    
    if (stats.criticalCount > 0) {
      return { icon: AlertTriangle, color: "text-red-500", label: "Problèmes critiques" };
    }
    if (stats.slowCount > 5) {
      return { icon: TrendingDown, color: "text-amber-500", label: "Performance dégradée" };
    }
    if (stats.avgLoadTime < 1500) {
      return { icon: Zap, color: "text-green-500", label: "Performances optimales" };
    }
    return { icon: TrendingUp, color: "text-blue-500", label: "Performances normales" };
  };

  const status = getOverallStatus();
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${status.color}`} />
            <CardTitle className="text-base">Performance (24h)</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription>{status.label}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.avgLoadTime}ms</div>
                <div className="text-xs text-muted-foreground">Temps moyen</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${stats.slowCount > 5 ? "text-amber-500" : ""}`}>
                  {stats.slowCount}
                </div>
                <div className="text-xs text-muted-foreground">Requêtes lentes</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${stats.criticalCount > 0 ? "text-red-500" : ""}`}>
                  {stats.criticalCount}
                </div>
                <div className="text-xs text-muted-foreground">Critiques</div>
              </div>
            </div>

            {/* Thresholds info */}
            <div className="text-xs text-muted-foreground mb-4 flex gap-4 justify-center">
              <span>Lent: &gt;{PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS}ms</span>
              <span>Critique: &gt;{PERFORMANCE_THRESHOLDS.CRITICAL_QUERY_MS}ms</span>
            </div>

            {/* Recent Events */}
            {stats.recentEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Événements récents</h4>
                {stats.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                  >
                    <Clock className={`h-4 w-4 mt-0.5 ${getSeverityColor(event.severity)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(event.severity)}
                        <span className="font-medium truncate">
                          {event.meta?.page || "Unknown"} / {event.meta?.widget || "Unknown"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {event.meta?.duration_ms}ms • {event.meta?.date_range_days} jours •{" "}
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: fr })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {stats.totalEvents === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>Aucun problème de performance détecté</p>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
