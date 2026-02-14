import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/hooks/useDashboardStats";
import type { KpiObjective } from "@/hooks/useKpiObjectives";

interface OperatorMachinesTableProps {
  stats: DashboardStats;
  categoryObjectives: KpiObjective[];
}

type SortKey = "revenue" | "cycles" | "occupancyRate" | "vsObjective";
type SortDir = "asc" | "desc";

export function OperatorMachinesTable({ stats, categoryObjectives }: OperatorMachinesTableProps) {
  const { t } = useTranslation("app");
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("vsObjective");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const machines = stats.machinePerformance;

  // Derive category objective for each machine
  const getCategoryObjective = (type: "washer" | "dryer") => {
    const cat = type === "washer" ? "WASH" : "DRY";
    return categoryObjectives.find(o => o.category === cat);
  };

  const enrichedMachines = useMemo(() => {
    const bestRevenue = Math.max(...machines.map(m => m.revenue), 1);
    return machines.map(m => {
      const catObj = getCategoryObjective(m.type);
      const objCents = catObj?.objective_amount_cents ?? null;
      const objEuros = objCents ? objCents / 100 : null;
      
      // Allocate category objective evenly among machines of same type
      const sameTypeMachines = machines.filter(x => x.type === m.type);
      const perMachineObjective = objEuros ? objEuros / sameTypeMachines.length : null;
      
      const vsObjective = perMachineObjective ? ((m.revenue - perMachineObjective) / perMachineObjective) * 100 : null;
      const vsBestYear = ((m.revenue / bestRevenue) * 100) - 100;

      let statusTag: "ok" | "underused" | "low_data" = "ok";
      if (m.occupancyRate < 20) statusTag = "underused";
      if (m.cycles < 5) statusTag = "low_data";

      return { ...m, vsObjective, vsBestYear, statusTag, perMachineObjective };
    });
  }, [machines, categoryObjectives]);

  const filtered = useMemo(() => {
    let list = enrichedMachines;
    if (categoryFilter !== "all") {
      list = list.filter(m => m.type === categoryFilter);
    }
    return list.sort((a, b) => {
      let aVal = 0, bVal = 0;
      if (sortKey === "revenue") { aVal = a.revenue; bVal = b.revenue; }
      else if (sortKey === "cycles") { aVal = a.cycles; bVal = b.cycles; }
      else if (sortKey === "occupancyRate") { aVal = a.occupancyRate; bVal = b.occupancyRate; }
      else if (sortKey === "vsObjective") { aVal = a.vsObjective ?? -999; bVal = b.vsObjective ?? -999; }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [enrichedMachines, categoryFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v)) + " €";

  const statusBadge = (tag: string) => {
    if (tag === "underused") return <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Sous-utilisée</Badge>;
    if (tag === "low_data") return <Badge variant="outline" className="text-muted-foreground text-[10px]">Données faibles</Badge>;
    return <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">OK</Badge>;
  };

  if (machines.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold">
          {t("operatorDashboard.machines.title", { defaultValue: "Machines" })}
        </h2>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="washer">Lavage</SelectItem>
              <SelectItem value="dryer">Séchage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Machine</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Catégorie</th>
              <th className="text-right p-3 cursor-pointer select-none" onClick={() => toggleSort("revenue")}>
                <span className="flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground">
                  CA <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="text-right p-3 cursor-pointer select-none" onClick={() => toggleSort("cycles")}>
                <span className="flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground">
                  Cycles <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="text-right p-3 cursor-pointer select-none" onClick={() => toggleSort("occupancyRate")}>
                <span className="flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground">
                  Occupation <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="text-right p-3 cursor-pointer select-none" onClick={() => toggleSort("vsObjective")}>
                <span className="flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground">
                  vs Objectif <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr 
                key={m.id} 
                className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/operations?machine=${m.name}`)}
              >
                <td className="p-3 font-medium">{m.name}</td>
                <td className="p-3 text-muted-foreground capitalize">{m.type === "washer" ? "Lavage" : "Séchage"}</td>
                <td className="p-3 text-right tabular-nums font-medium">{formatCurrency(m.revenue)}</td>
                <td className="p-3 text-right tabular-nums">{m.cycles}</td>
                <td className="p-3 text-right tabular-nums">{m.occupancyRate}%</td>
                <td className="p-3 text-right tabular-nums">
                  {m.vsObjective !== null ? (
                    <span className={cn("font-semibold", m.vsObjective >= 0 ? "text-emerald-600" : "text-amber-600")}>
                      {m.vsObjective >= 0 ? "+" : ""}{Math.round(m.vsObjective)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-center">{statusBadge(m.statusTag)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
