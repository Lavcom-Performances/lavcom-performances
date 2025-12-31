import { useState, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Download,
  Filter,
  Search,
  Calendar,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import type { PermissionAuditLog } from "@/hooks/usePermissionAuditLogs";

const ACTION_LABELS: Record<string, string> = {
  permission_updated: "Permission modifiée",
  role_changed: "Rôle modifié",
  permissions_reset: "Permissions réinitialisées",
  all_permissions_granted: "Tous les droits accordés",
  all_permissions_revoked: "Tous les droits révoqués",
};

interface AuditLogsFiltersProps {
  logs: PermissionAuditLog[];
  onFilteredLogsChange: (logs: PermissionAuditLog[]) => void;
}

export function AuditLogsFilters({ logs, onFilteredLogsChange }: AuditLogsFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Get unique actions from logs
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action));
    return Array.from(actions);
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(log =>
        log.performer_email?.toLowerCase().includes(query) ||
        log.target_email?.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        JSON.stringify(log.old_values).toLowerCase().includes(query) ||
        JSON.stringify(log.new_values).toLowerCase().includes(query)
      );
    }

    // Action filter
    if (selectedAction !== "all") {
      result = result.filter(log => log.action === selectedAction);
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter(log => new Date(log.created_at) >= dateFrom);
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(log => new Date(log.created_at) <= endOfDay);
    }

    return result;
  }, [logs, searchQuery, selectedAction, dateFrom, dateTo]);

  // Update parent when filters change
  useMemo(() => {
    onFilteredLogsChange(filteredLogs);
  }, [filteredLogs, onFilteredLogsChange]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedAction("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || selectedAction !== "all" || dateFrom || dateTo;

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Action",
      "Effectué par",
      "Utilisateur cible",
      "Anciennes valeurs",
      "Nouvelles valeurs",
      "User Agent",
    ];

    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
      ACTION_LABELS[log.action] || log.action,
      log.performer_email || "",
      log.target_email || "",
      log.old_values ? JSON.stringify(log.old_values) : "",
      log.new_values ? JSON.stringify(log.new_values) : "",
      log.user_agent || "",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par email, action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Action Filter */}
        <Select value={selectedAction} onValueChange={setSelectedAction}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Toutes les actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {uniqueActions.map(action => (
              <SelectItem key={action} value={action}>
                {ACTION_LABELS[action] || action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Date début"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              locale={fr}
            />
          </PopoverContent>
        </Popover>

        {/* Date To */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Date fin"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              locale={fr}
            />
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Effacer
          </Button>
        )}

        {/* Export Button */}
        <Button onClick={exportToCSV} variant="outline" className="gap-2 ml-auto">
          <Download className="h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtres actifs:</span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Recherche: {searchQuery}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSearchQuery("")}
              />
            </Badge>
          )}
          {selectedAction !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Action: {ACTION_LABELS[selectedAction] || selectedAction}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSelectedAction("all")}
              />
            </Badge>
          )}
          {dateFrom && (
            <Badge variant="secondary" className="gap-1">
              Depuis: {format(dateFrom, "dd/MM/yyyy")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setDateFrom(undefined)}
              />
            </Badge>
          )}
          {dateTo && (
            <Badge variant="secondary" className="gap-1">
              Jusqu'au: {format(dateTo, "dd/MM/yyyy")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setDateTo(undefined)}
              />
            </Badge>
          )}
          <span className="text-sm text-muted-foreground ml-2">
            ({filteredLogs.length} résultat{filteredLogs.length > 1 ? "s" : ""})
          </span>
        </div>
      )}
    </div>
  );
}
