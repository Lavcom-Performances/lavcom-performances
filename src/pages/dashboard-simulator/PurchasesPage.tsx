import { useState } from "react";
import { Download, Plus, Receipt, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { WelcomeHeader } from "@/components/dashboard-simulator/layout/WelcomeHeader";
import { DataTable } from "@/components/dashboard-simulator/shared/DataTable";
import { PackSummaryCard } from "@/components/dashboard-simulator/overview/PackSummaryCard";
import { useDashboardInvoices } from "@/hooks/dashboard-simulator/use-dashboard-invoices";
import { useMockUser } from "@/components/auth/RequireAuth";
import { PURCHASES_STRINGS } from "@/constants/dashboard-simulator/purchases.strings";
import {
  fillTemplate,
  formatDateFr,
  formatEuro,
} from "@/components/dashboard-simulator/shared/format";
import type { DashboardInvoice } from "@/types/dashboard-simulator";

export default function PurchasesPage() {
  const user = useMockUser();
  const [search, setSearch] = useState("");
  const { data: invoices, isLoading } = useDashboardInvoices({ search });

  const columns: ColumnDef<DashboardInvoice>[] = [
    {
      accessorKey: "date",
      header: PURCHASES_STRINGS.columns.date,
      cell: ({ row }) => <span className="tabular-nums">{formatDateFr(row.original.date)}</span>,
    },
    { accessorKey: "description", header: PURCHASES_STRINGS.columns.description },
    {
      accessorKey: "amount",
      header: PURCHASES_STRINGS.columns.amount,
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{formatEuro(row.original.amount)}</span>
      ),
    },
    {
      id: "pdf",
      header: PURCHASES_STRINGS.columns.pdf,
      cell: () => (
        <Button size="sm" variant="ghost" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          PDF
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <WelcomeHeader
        title={fillTemplate(PURCHASES_STRINGS.greeting, { firstName: user.firstName })}
        subtitle={PURCHASES_STRINGS.subtitle}
      />

      <PackSummaryCard />

      <div className="grid gap-4 md:grid-cols-2">
        {PURCHASES_STRINGS.addons.map((addon) => (
          <Card key={addon.id} className="shadow-form">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{addon.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{addon.description}</p>
                </div>
                <span className="whitespace-nowrap text-lg font-bold text-primary">
                  {addon.price}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{PURCHASES_STRINGS.oneOffPayment}</p>
              <Button className="w-full gap-2">
                <Plus className="h-4 w-4" />
                {PURCHASES_STRINGS.addToCart}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-form">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{PURCHASES_STRINGS.invoicesTitle}</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={PURCHASES_STRINGS.invoicesTitle}
              className="bg-card pl-9 shadow-form"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !invoices ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : invoices.length === 0 && search.trim().length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Receipt className="h-6 w-6" />
              </span>
              <h3 className="font-display text-lg font-semibold">{PURCHASES_STRINGS.emptyTitle}</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                {PURCHASES_STRINGS.emptyDescription}
              </p>
            </div>
          ) : (
            <DataTable columns={columns} data={invoices} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
