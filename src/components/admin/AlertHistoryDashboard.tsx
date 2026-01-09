import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, Bell, Calendar, Clock, Filter, Info, Mail, MessageSquare, RefreshCw, Webhook } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

interface AlertHistoryItem {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  details: Record<string, unknown>;
  recipient: string | null;
  channel: string;
  sent_at: string;
}

const severityConfig = {
  info: { icon: Info, color: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Info" },
  warning: { icon: AlertTriangle, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", label: "Warning" },
  critical: { icon: AlertCircle, color: "bg-destructive/10 text-destructive border-destructive/20", label: "Critique" },
};

const typeConfig = {
  cron: { icon: Clock, label: "Cron", color: "bg-purple-500/10 text-purple-600" },
  webhook: { icon: Webhook, label: "Webhook", color: "bg-orange-500/10 text-orange-600" },
  churn: { icon: AlertTriangle, label: "Churn", color: "bg-red-500/10 text-red-600" },
  system: { icon: Bell, label: "Système", color: "bg-gray-500/10 text-gray-600" },
};

const channelConfig = {
  email: { icon: Mail, label: "Email" },
  slack: { icon: MessageSquare, label: "Slack" },
  webhook: { icon: Webhook, label: "Webhook" },
};

export function AlertHistoryDashboard() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const { data: alerts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["alert-history", typeFilter, severityFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("alert_history")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(100);

      if (typeFilter !== "all") {
        query = query.eq("alert_type", typeFilter);
      }

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }

      if (dateRange?.from) {
        query = query.gte("sent_at", startOfDay(dateRange.from).toISOString());
      }

      if (dateRange?.to) {
        query = query.lte("sent_at", endOfDay(dateRange.to).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AlertHistoryItem[];
    },
  });

  const stats = {
    total: alerts?.length ?? 0,
    critical: alerts?.filter((a) => a.severity === "critical").length ?? 0,
    warning: alerts?.filter((a) => a.severity === "warning").length ?? 0,
    info: alerts?.filter((a) => a.severity === "info").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Historique des alertes
              </CardTitle>
              <CardDescription>
                Visualisez les alertes envoyées par le système
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total alertes</p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
                <p className="text-xs text-muted-foreground">Critiques</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-500/10 border-yellow-500/20">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
                <p className="text-xs text-muted-foreground">Infos</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtres:</span>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="cron">Cron</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="churn">Churn</SelectItem>
                <SelectItem value="system">Système</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sévérité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM", { locale: fr })} -{" "}
                        {format(dateRange.to, "dd/MM", { locale: fr })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: fr })
                    )
                  ) : (
                    "Période"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={fr}
                />
              </PopoverContent>
            </Popover>

            {(typeFilter !== "all" || severityFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter("all");
                  setSeverityFilter("all");
                }}
              >
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Timeline */}
          <ScrollArea className="h-[500px] pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : alerts && alerts.length > 0 ? (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-4">
                  {alerts.map((alert, index) => {
                    const SeverityIcon = severityConfig[alert.severity as keyof typeof severityConfig]?.icon ?? Info;
                    const TypeIcon = typeConfig[alert.alert_type as keyof typeof typeConfig]?.icon ?? Bell;
                    const ChannelIcon = channelConfig[alert.channel as keyof typeof channelConfig]?.icon ?? Mail;
                    const severityStyle = severityConfig[alert.severity as keyof typeof severityConfig];
                    const typeStyle = typeConfig[alert.alert_type as keyof typeof typeConfig];

                    return (
                      <div key={alert.id} className="relative pl-12">
                        {/* Timeline dot */}
                        <div
                          className={`absolute left-3 top-3 h-4 w-4 rounded-full border-2 border-background ${
                            alert.severity === "critical"
                              ? "bg-destructive"
                              : alert.severity === "warning"
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                          }`}
                        />

                        <Card className={`${severityStyle?.color ?? ""} border`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <Badge variant="outline" className={typeStyle?.color ?? ""}>
                                    <TypeIcon className="h-3 w-3 mr-1" />
                                    {typeStyle?.label ?? alert.alert_type}
                                  </Badge>
                                  <Badge variant="outline" className={severityStyle?.color ?? ""}>
                                    <SeverityIcon className="h-3 w-3 mr-1" />
                                    {severityStyle?.label ?? alert.severity}
                                  </Badge>
                                  <Badge variant="outline" className="bg-background">
                                    <ChannelIcon className="h-3 w-3 mr-1" />
                                    {channelConfig[alert.channel as keyof typeof channelConfig]?.label ?? alert.channel}
                                  </Badge>
                                </div>

                                <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {alert.message}
                                </p>

                                {alert.recipient && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    → {alert.recipient}
                                  </p>
                                )}
                              </div>

                              <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                                <div>{format(new Date(alert.sent_at), "dd/MM/yyyy", { locale: fr })}</div>
                                <div>{format(new Date(alert.sent_at), "HH:mm:ss", { locale: fr })}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">Aucune alerte</h3>
                <p className="text-sm text-muted-foreground">
                  Aucune alerte n'a été envoyée pour cette période.
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
