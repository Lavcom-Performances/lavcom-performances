import { useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

type CronLog = {
  id: string;
  job_name: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  sites_processed: number | null;
  sites_failed: number | null;
  duration_ms: number | null;
};

interface CronMonitoringDashboardProps {
  logs: CronLog[];
}

export function CronMonitoringDashboard({ logs }: CronMonitoringDashboardProps) {
  // Generate last 30 days data
  const chartData = useMemo(() => {
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });

    return last30Days.map(day => {
      const dayStart = startOfDay(day);
      const dayStr = format(day, "yyyy-MM-dd");
      
      const dayLogs = logs.filter(log => {
        const logDate = format(new Date(log.started_at), "yyyy-MM-dd");
        return logDate === dayStr;
      });

      const success = dayLogs.filter(l => l.status === "success" || l.status === "completed").length;
      const failed = dayLogs.filter(l => l.status === "error" || l.status === "failed").length;
      const partial = dayLogs.filter(l => l.status === "partial").length;
      const rateLimited = dayLogs.filter(l => l.status === "rate_limited").length;
      
      const avgDuration = dayLogs.filter(l => l.duration_ms)
        .reduce((acc, l, _, arr) => acc + (l.duration_ms || 0) / arr.length, 0);

      return {
        date: format(day, "dd/MM", { locale: fr }),
        fullDate: format(day, "dd MMM yyyy", { locale: fr }),
        success,
        failed,
        partial,
        rateLimited,
        total: dayLogs.length,
        avgDuration: Math.round(avgDuration / 1000), // Convert to seconds
      };
    });
  }, [logs]);

  // Summary stats for the period
  const periodStats = useMemo(() => {
    const totalExecutions = chartData.reduce((acc, d) => acc + d.total, 0);
    const totalSuccess = chartData.reduce((acc, d) => acc + d.success, 0);
    const totalFailed = chartData.reduce((acc, d) => acc + d.failed, 0);
    const successRate = totalExecutions > 0 
      ? Math.round((totalSuccess / totalExecutions) * 100) 
      : 0;
    
    const avgDurations = chartData.filter(d => d.avgDuration > 0).map(d => d.avgDuration);
    const avgDuration = avgDurations.length > 0 
      ? Math.round(avgDurations.reduce((a, b) => a + b, 0) / avgDurations.length)
      : 0;

    return {
      totalExecutions,
      totalSuccess,
      totalFailed,
      successRate,
      avgDuration,
    };
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* Period Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Exécutions (30j)</p>
            <p className="text-2xl font-bold">{periodStats.totalExecutions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Succès</p>
            <p className="text-2xl font-bold text-emerald-600">{periodStats.totalSuccess}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Échecs</p>
            <p className="text-2xl font-bold text-destructive">{periodStats.totalFailed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Taux de succès</p>
            <p className="text-2xl font-bold">{periodStats.successRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Durée moy.</p>
            <p className="text-2xl font-bold">{periodStats.avgDuration}s</p>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Bar Chart - Success/Failures per day */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Exécutions par jour (30 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={2}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload?.fullDate) {
                      return payload[0].payload.fullDate;
                    }
                    return "";
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="success" 
                  name="Succès" 
                  stackId="a" 
                  fill="hsl(142.1 76.2% 36.3%)" 
                  radius={[0, 0, 0, 0]} 
                />
                <Bar 
                  dataKey="partial" 
                  name="Partiel" 
                  stackId="a" 
                  fill="hsl(45.4 93.4% 47.5%)" 
                  radius={[0, 0, 0, 0]} 
                />
                <Bar 
                  dataKey="failed" 
                  name="Échec" 
                  stackId="a" 
                  fill="hsl(var(--destructive))" 
                  radius={[0, 0, 0, 0]} 
                />
                <Bar 
                  dataKey="rateLimited" 
                  name="Rate limité" 
                  stackId="a" 
                  fill="hsl(24.6 95% 53.1%)" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Duration Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Durée moyenne d'exécution (secondes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={2}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  unit="s"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value}s`, "Durée moyenne"]}
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload?.fullDate) {
                      return payload[0].payload.fullDate;
                    }
                    return "";
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgDuration" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
