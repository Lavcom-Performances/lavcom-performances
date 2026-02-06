import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { TrendingUp, TrendingDown, Calculator, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinProject } from "@/hooks/useFinProjects";
import { useFinForecasts, useComputeForecast, useAnnualSummary } from "@/hooks/useFinForecast";
import { useFinAccess } from "@/hooks/useFinAccess";
import { cn } from "@/lib/utils";

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function KPICard({ title, value, trend, className }: { 
  title: string; 
  value: string; 
  trend?: "up" | "down" | "neutral";
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1 flex items-center gap-2">
          {value}
          {trend === "up" && <TrendingUp className="h-5 w-5 text-primary" />}
          {trend === "down" && <TrendingDown className="h-5 w-5 text-destructive" />}
        </p>
      </CardContent>
    </Card>
  );
}

export default function PrevisionnelPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  const [horizonYears, setHorizonYears] = useState("3");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  const { access } = useFinAccess();
  const { data: project } = useFinProject(projectId || undefined);
  const { data: forecasts, isLoading, refetch } = useFinForecasts(projectId || undefined);
  const computeForecast = useComputeForecast();
  
  const annualSummary = useAnnualSummary(forecasts);
  const isReadOnly = access?.read_only || project?.status === "ARCHIVED";

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sélectionnez un projet pour voir son prévisionnel.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleRecalculate = async () => {
    await computeForecast.mutateAsync({ 
      projectId, 
      horizonYears: parseInt(horizonYears) 
    });
    refetch();
  };

  const monthlyData = selectedYear 
    ? forecasts?.filter(f => f.year === selectedYear) || []
    : [];

  // Calculate total metrics
  const totalRevenue = annualSummary.reduce((s, y) => s + y.total_revenue, 0);
  const totalEbitda = annualSummary.reduce((s, y) => s + y.total_ebitda, 0);
  const finalCashflow = annualSummary[annualSummary.length - 1]?.final_cumulative || 0;
  const breakEvenYear = annualSummary.findIndex(y => y.final_cumulative > 0) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prévisionnel</h1>
          <p className="text-muted-foreground">
            {project?.name} — Projections financières
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={horizonYears} onValueChange={setHorizonYears}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 an</SelectItem>
              <SelectItem value="2">2 ans</SelectItem>
              <SelectItem value="3">3 ans</SelectItem>
              <SelectItem value="4">4 ans</SelectItem>
              <SelectItem value="5">5 ans</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleRecalculate}
            disabled={computeForecast.isPending || isReadOnly}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", computeForecast.isPending && "animate-spin")} />
            {computeForecast.isPending ? "Calcul..." : "Recalculer"}
          </Button>
        </div>
      </div>

      {forecasts?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun prévisionnel</h3>
            <p className="text-muted-foreground text-center mb-4">
              Définissez vos hypothèses puis calculez le prévisionnel
            </p>
            <Button onClick={handleRecalculate} disabled={computeForecast.isPending}>
              <Calculator className="h-4 w-4 mr-2" />
              Calculer maintenant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard 
              title="CA total projeté" 
              value={formatCurrency(totalRevenue)} 
              trend="up"
            />
            <KPICard 
              title="EBITDA cumulé" 
              value={formatCurrency(totalEbitda)} 
              trend={totalEbitda > 0 ? "up" : "down"}
            />
            <KPICard 
              title="Trésorerie finale" 
              value={formatCurrency(finalCashflow)} 
              trend={finalCashflow > 0 ? "up" : "down"}
            />
            <KPICard 
              title="Point mort" 
              value={breakEvenYear > 0 ? `Année ${breakEvenYear}` : "Non atteint"}
              trend={breakEvenYear > 0 ? "up" : "neutral"}
            />
          </div>

          <Tabs defaultValue="annual" className="space-y-4">
            <TabsList>
              <TabsTrigger value="annual">Vue annuelle</TabsTrigger>
              <TabsTrigger value="monthly">Vue mensuelle</TabsTrigger>
            </TabsList>

            <TabsContent value="annual">
              <Card>
                <CardHeader>
                  <CardTitle>Synthèse annuelle</CardTitle>
                  <CardDescription>Projections sur {annualSummary.length} an(s)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Année</TableHead>
                        <TableHead className="text-right">CA</TableHead>
                        <TableHead className="text-right">Charges</TableHead>
                        <TableHead className="text-right">EBITDA</TableHead>
                        <TableHead className="text-right">Cashflow</TableHead>
                        <TableHead className="text-right">Trésorerie</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {annualSummary.map(year => (
                        <TableRow 
                          key={year.year}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedYear(year.year)}
                        >
                          <TableCell className="font-medium">Année {year.year}</TableCell>
                          <TableCell className="text-right">{formatCurrency(year.total_revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(year.total_costs)}</TableCell>
                          <TableCell className="text-right">
                            <span className={cn(year.total_ebitda >= 0 ? "text-primary" : "text-destructive")}>
                              {formatCurrency(year.total_ebitda)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(year.total_cashflow)}</TableCell>
                          <TableCell className="text-right">
                            <span className={cn(year.final_cumulative >= 0 ? "text-primary" : "text-destructive")}>
                              {formatCurrency(year.final_cumulative)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Détail mensuel</CardTitle>
                      <CardDescription>Sélectionnez une année pour voir le détail</CardDescription>
                    </div>
                    <Select 
                      value={selectedYear?.toString() || ""} 
                      onValueChange={v => setSelectedYear(parseInt(v))}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Année" />
                      </SelectTrigger>
                      <SelectContent>
                        {annualSummary.map(y => (
                          <SelectItem key={y.year} value={y.year.toString()}>
                            Année {y.year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedYear ? (
                    <p className="text-center text-muted-foreground py-8">
                      Sélectionnez une année pour afficher le détail mensuel
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mois</TableHead>
                          <TableHead className="text-right">CA</TableHead>
                          <TableHead className="text-right">Charges</TableHead>
                          <TableHead className="text-right">EBITDA</TableHead>
                          <TableHead className="text-right">Trésorerie</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyData.map(row => (
                          <TableRow key={`${row.year}-${row.month}`}>
                            <TableCell className="font-medium">{MONTH_NAMES[row.month - 1]}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(row.revenue))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(row.costs))}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn(Number(row.ebitda) >= 0 ? "text-primary" : "text-destructive")}>
                                {formatCurrency(Number(row.ebitda))}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn(Number(row.cumulative_cashflow) >= 0 ? "text-primary" : "text-destructive")}>
                                {formatCurrency(Number(row.cumulative_cashflow))}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
