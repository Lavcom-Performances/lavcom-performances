import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileText, Search, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { WelcomeHeader } from "@/components/dashboard-simulator/layout/WelcomeHeader";
import { DataTable } from "@/components/dashboard-simulator/shared/DataTable";
import { useDashboardReports } from "@/hooks/dashboard-simulator/use-dashboard-reports";
import { useMockUser } from "@/components/auth/RequireAuth";
import { REPORTS_STRINGS } from "@/constants/dashboard-simulator/reports.strings";
import { fillTemplate, formatDateFr } from "@/components/dashboard-simulator/shared/format";
import type { DashboardReport } from "@/types/dashboard-simulator";

export default function ReportsPage() {
  const user = useMockUser();
  const [search, setSearch] = useState("");
  const { data: reports, isLoading } = useDashboardReports({ search });

  const columns: ColumnDef<DashboardReport>[] = [
    {
      accessorKey: "date",
      header: REPORTS_STRINGS.columns.date,
      cell: ({ row }) => (
        <span className="tabular-nums">{formatDateFr(row.original.date)}</span>
      ),
    },
    {
      accessorKey: "description",
      header: REPORTS_STRINGS.columns.description,
    },
    {
      id: "pdf",
      header: REPORTS_STRINGS.columns.pdf,
      cell: () => (
        <Button size="sm" variant="ghost" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          PDF
        </Button>
      ),
    },
    {
      id: "delete",
      header: REPORTS_STRINGS.columns.delete,
      cell: () => (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={REPORTS_STRINGS.columns.delete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <WelcomeHeader
        title={fillTemplate(REPORTS_STRINGS.greeting, { firstName: user.firstName })}
        subtitle={REPORTS_STRINGS.subtitle}
      />

      <Card className="shadow-form">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{REPORTS_STRINGS.tableTitle}</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={REPORTS_STRINGS.searchPlaceholder}
              className="bg-card pl-9 shadow-form"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !reports ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : reports.length === 0 && search.trim().length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="h-6 w-6" />
              </span>
              <h3 className="font-display text-lg font-semibold">{REPORTS_STRINGS.emptyTitle}</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                {REPORTS_STRINGS.emptyDescription}
              </p>
              <Button asChild className="mt-2">
                <Link to="/dashboard-simulator/projects">{REPORTS_STRINGS.emptyCta}</Link>
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={reports}
              emptyMessage={REPORTS_STRINGS.noResults}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
