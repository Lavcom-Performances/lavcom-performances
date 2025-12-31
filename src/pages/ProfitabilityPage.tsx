import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Euro,
  TrendingUp,
  TrendingDown,
  Clock,
  WashingMachine,
  Target,
  AlertTriangle,
  Users,
  Zap,
  BarChart3,
  Percent,
  Timer,
  Activity,
  Calculator,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { KPISection } from "@/components/dashboard/KPISection";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { useDateRange } from "@/hooks/useDateRange";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
} from "recharts";
import { useViewMode } from "@/hooks/useViewMode";
import { SEOHead } from "@/components/seo/SEOHead";
import { useHasData } from "@/hooks/useHasData";
import { ProfitabilityEmptyState } from "@/components/ui/empty-state";
import { CostsConfigBanner } from "@/components/dashboard/CostsConfigBanner";
import { useProfitability } from "@/hooks/useProfitability";
import { MonthlyProfitabilityChart } from "@/components/dashboard/MonthlyProfitabilityChart";
import { MarginAlertBanner } from "@/components/dashboard/MarginAlertBanner";

// Mock data - CA perdu estimé par machine (will be replaced later with real data)
const lostRevenueData = [
  { machine: "LL 8kg #1", hoursDown: 12, lostRevenue: 97, reason: "Panne pompe" },
  { machine: "SL 18kg #1", hoursDown: 8, lostRevenue: 52, reason: "Maintenance" },
  { machine: "LL 12kg #1", hoursDown: 4, lostRevenue: 38, reason: "Nettoyage" },
];

// Mock data - Rotation par machine
const rotationData = [
  { machine: "LL 8kg #1", cyclesPerDay: 8.2, avgRevenue: 6.80, type: "LL" },
  { machine: "LL 8kg #2", cyclesPerDay: 7.5, avgRevenue: 6.80, type: "LL" },
  { machine: "LL 12kg #1", cyclesPerDay: 5.8, avgRevenue: 8.50, type: "LL" },
  { machine: "SL 18kg #1", cyclesPerDay: 6.4, avgRevenue: 4.20, type: "SL" },
  { machine: "SL 18kg #2", cyclesPerDay: 5.9, avgRevenue: 4.20, type: "SL" },
];

// Mock data - Saturation par créneau
const saturationData = [
  { slot: "7h-10h", saturation: 35, label: "Matin" },
  { slot: "10h-13h", saturation: 55, label: "Fin matinée" },
  { slot: "13h-16h", saturation: 45, label: "Après-midi" },
  { slot: "16h-19h", saturation: 88, label: "Pic" },
  { slot: "19h-22h", saturation: 62, label: "Soir" },
];

// Mock data - Machines sous-performantes
const underperformingMachines = [
  { 
    machine: "SL 18kg #2", 
    currentRevenue: 219, 
    avgRevenue: 365, 
    gap: -40,
    potentialGain: 146,
    issue: "Temps de séchage rallongé"
  },
  { 
    machine: "LL 12kg #1", 
    currentRevenue: 892, 
    avgRevenue: 1089, 
    gap: -18,
    potentialGain: 197,
    issue: "Position moins visible"
  },
];

// Mock data - Mix cycles
const cyclesMixData = [
  { type: "Lavage 30°", count: 1250, revenue: 5000, percentage: 32 },
  { type: "Lavage 40°", count: 1580, revenue: 6320, percentage: 40 },
  { type: "Lavage 60°", count: 680, revenue: 3400, percentage: 17 },
  { type: "Séchage court", count: 890, revenue: 2670, percentage: 15 },
  { type: "Séchage long", count: 420, revenue: 1680, percentage: 11 },
];

// Mock data - Évolution rentabilité
const profitabilityTrend = [
  { month: "Jan", caParMachine: 680, caParHeure: 7.8, tauxOccupation: 62 },
  { month: "Fév", caParMachine: 645, caParHeure: 7.4, tauxOccupation: 58 },
  { month: "Mar", caParMachine: 720, caParHeure: 8.2, tauxOccupation: 65 },
  { month: "Avr", caParMachine: 695, caParHeure: 7.9, tauxOccupation: 63 },
  { month: "Mai", caParMachine: 750, caParHeure: 8.5, tauxOccupation: 68 },
  { month: "Juin", caParMachine: 810, caParHeure: 9.2, tauxOccupation: 72 },
];

const chartConfig = {
  saturation: { label: "Saturation", color: "hsl(var(--primary))" },
  caParMachine: { label: "CA/Machine", color: "hsl(var(--primary))" },
  caParHeure: { label: "CA/Heure", color: "hsl(var(--chart-cb))" },
  tauxOccupation: { label: "Taux occupation", color: "hsl(var(--chart-seche))" },
  fixed: { label: "Charges fixes", color: "hsl(var(--primary))" },
  variable: { label: "Charges variables", color: "hsl(var(--chart-cb))" },
};

export default function ProfitabilityPage() {
  const { t } = useTranslation("app");
  const { isExpert } = useViewMode();
  const { dateRange, setDateRange } = useDateRange();
  const { hasData, isLoading: dataLoading } = useHasData();
  const profitability = useProfitability(dateRange);
  
  const totalLostRevenue = lostRevenueData.reduce((acc, d) => acc + d.lostRevenue, 0);
  const avgRotation = rotationData.reduce((acc, d) => acc + d.cyclesPerDay, 0) / rotationData.length;
  const peakSaturation = Math.max(...saturationData.map(d => d.saturation));
  const potentialGain = underperformingMachines.reduce((acc, d) => acc + d.potentialGain, 0);

  // Loading state
  if (dataLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // Empty state - no data imported
  if (!hasData) {
    return (
      <>
        <SEOHead 
          title="Analyse de rentabilité"
          description="Analysez la rentabilité de votre laverie automatique et identifiez les leviers d'optimisation."
          url="/profitability"
          noindex={true}
        />
        <div className="p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
              Analyse de Rentabilité
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Identifiez les leviers pour augmenter votre chiffre d'affaires
            </p>
          </div>
          <div className="card-lavcom">
            <ProfitabilityEmptyState />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title="Analyse de rentabilité"
        description="Analysez la rentabilité de votre laverie automatique et identifiez les leviers d'optimisation."
        url="/profitability"
        noindex={true}
      />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Margin alert banner */}
      <MarginAlertBanner dateRange={dateRange} />
      
      {/* Costs config banner */}
      <CostsConfigBanner />
      
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
            Analyse de Rentabilité
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Identifiez les leviers pour augmenter votre chiffre d'affaires
          </p>
        </div>
        <DateRangePicker 
          dateRange={dateRange}
          onDateChange={setDateRange}
        />
      </div>

      {/* KPIs Principaux - Rentabilité réelle */}
      {profitability.hasCosts ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard
            title={t("profitability.revenue")}
            value={`${Math.round(profitability.totalRevenue).toLocaleString("fr-FR")} €`}
            icon={Euro}
            variant="primary"
            subtitle={t("profitability.periodSelected")}
          />
          <KPICard
            title={t("profitability.totalCosts")}
            value={`${Math.round(profitability.totalCosts).toLocaleString("fr-FR")} €`}
            icon={Calculator}
            variant="warning"
            subtitle={`${Math.round(profitability.totalFixedCosts).toLocaleString("fr-FR")} € ${t("profitability.fixed")} + ${Math.round(profitability.totalVariableCosts).toLocaleString("fr-FR")} € ${t("profitability.variable")}`}
          />
          <KPICard
            title={t("profitability.netProfit")}
            value={`${Math.round(profitability.netProfit).toLocaleString("fr-FR")} €`}
            icon={profitability.netProfit >= 0 ? TrendingUp : TrendingDown}
            variant={profitability.netProfit >= 0 ? "success" : "warning"}
            subtitle={t("profitability.afterCosts")}
          />
          <KPICard
            title={t("profitability.margin")}
            value={`${profitability.profitMargin.toFixed(1)}%`}
            icon={Percent}
            variant={profitability.profitMargin >= 30 ? "success" : profitability.profitMargin >= 15 ? "primary" : "warning"}
            subtitle={t("profitability.profitMargin")}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard
            title="CA Perdu (mois)"
            value={`${totalLostRevenue} €`}
            icon={TrendingDown}
            variant="warning"
            subtitle="Pannes & indisponibilités"
          />
          <KPICard
            title="Rotation moy."
            value={`${avgRotation.toFixed(1)} cycles/j`}
            icon={Activity}
            trend={{ value: 5.2, isPositive: true }}
          />
          <KPICard
            title="Saturation max"
            value={`${peakSaturation}%`}
            icon={Zap}
            variant="primary"
            subtitle="16h-19h"
          />
          <KPICard
            title="Gain potentiel"
            value={`${potentialGain} €/mois`}
            icon={Target}
            variant="success"
            subtitle="Machines sous-perf."
          />
        </div>
      )}

      <Tabs defaultValue={profitability.hasCosts ? "profitability" : "losses"} className="space-y-6">
        <TabsList className={isExpert ? "grid w-full grid-cols-5" : "grid w-full grid-cols-3"}>
          {profitability.hasCosts && <TabsTrigger value="profitability">{t("profitability.tabProfitability")}</TabsTrigger>}
          <TabsTrigger value="losses">{t("profitability.tabLosses")}</TabsTrigger>
          <TabsTrigger value="efficiency">{t("profitability.tabEfficiency")}</TabsTrigger>
          {isExpert && <TabsTrigger value="machines">{t("profitability.tabMachines")}</TabsTrigger>}
          {isExpert && <TabsTrigger value="trends">{t("profitability.tabTrends")}</TabsTrigger>}
        </TabsList>

        {/* Onglet Rentabilité */}
        {profitability.hasCosts && (
          <TabsContent value="profitability" className="space-y-6">
            {/* Monthly evolution chart */}
            <MonthlyProfitabilityChart />
            
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Répartition des charges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    {t("profitability.costsBreakdown")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profitability.costsBreakdown.map((cost, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={cost.type === "fixed" ? "default" : "secondary"}>
                              {cost.type === "fixed" ? t("profitability.fixed") : t("profitability.variable")}
                            </Badge>
                            <span className="text-sm font-medium">{cost.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-foreground">{Math.round(cost.value).toLocaleString("fr-FR")} €</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({cost.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={cost.percentage} 
                          className="h-2"
                        />
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{t("profitability.totalCostsLabel")}</span>
                        <span className="text-xl font-bold text-amber-600">
                          {Math.round(profitability.totalCosts).toLocaleString("fr-FR")} €
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Résumé rentabilité */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    {t("profitability.summary")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">{t("profitability.revenue")}</span>
                      <span className="text-2xl font-bold text-foreground">
                        {Math.round(profitability.totalRevenue).toLocaleString("fr-FR")} €
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">- {t("profitability.fixedCosts")}</span>
                        <span className="text-foreground">{Math.round(profitability.totalFixedCosts).toLocaleString("fr-FR")} €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">- {t("profitability.variableCosts")}</span>
                        <span className="text-foreground">{Math.round(profitability.totalVariableCosts).toLocaleString("fr-FR")} €</span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{t("profitability.netResult")}</span>
                        <span className={`text-3xl font-bold ${profitability.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {profitability.netProfit >= 0 ? "+" : ""}{Math.round(profitability.netProfit).toLocaleString("fr-FR")} €
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {t("profitability.marginLabel")}: <span className="font-medium">{profitability.profitMargin.toFixed(1)}%</span>
                      </p>
                    </div>
                    
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-foreground">💡 {t("profitability.perTransaction")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("profitability.avgRevenue")}: {profitability.revenuePerTransaction.toFixed(2)} € | 
                        {t("profitability.avgCost")}: {profitability.costPerTransaction.toFixed(2)} € | 
                        {t("profitability.avgProfit")}: {profitability.profitPerTransaction.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Onglet Pertes */}
        <TabsContent value="losses" className="space-y-6">
          <KPISection title="CA Perdu par Indisponibilité" icon={AlertTriangle}>
            <div className="grid gap-4">
              {lostRevenueData.map((item, index) => (
                <Card key={index} className="border-l-4 border-l-amber-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <WashingMachine className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{item.machine}</span>
                          <Badge variant="outline">{item.reason}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.hoursDown}h d'indisponibilité ce mois
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-600">-{item.lostRevenue} €</p>
                        <p className="text-xs text-muted-foreground">CA perdu estimé</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Total CA Perdu</p>
                      <p className="text-sm text-muted-foreground">
                        Action recommandée : réduire les temps d'intervention
                      </p>
                    </div>
                    <p className="text-3xl font-bold text-amber-600">-{totalLostRevenue} €</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </KPISection>
        </TabsContent>

        {/* Onglet Efficacité */}
        <TabsContent value="efficiency" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Saturation par créneau */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Saturation par Créneau Horaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={saturationData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} unit="%" />
                      <YAxis dataKey="slot" type="category" width={80} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="saturation" radius={4}>
                        {saturationData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={entry.saturation > 80 ? "hsl(var(--destructive))" : 
                                  entry.saturation > 60 ? "hsl(var(--primary))" : 
                                  "hsl(var(--muted-foreground))"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-foreground">💡 Action recommandée</p>
                  <p className="text-sm text-muted-foreground">
                    Proposez -20% sur les créneaux 7h-10h pour désengorger le pic 16h-19h
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Rotation par machine */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Rotation Moyenne par Machine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rotationData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.type === "LL" ? "default" : "secondary"}>
                            {item.type}
                          </Badge>
                          <span className="text-sm font-medium">{item.machine}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-foreground">{item.cyclesPerDay} cycles/j</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({(item.cyclesPerDay * item.avgRevenue).toFixed(0)} €/j)
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={(item.cyclesPerDay / 10) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mix des cycles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Mix des Cycles - Ce qui Marche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {cyclesMixData.map((item, index) => (
                  <div key={index} className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{item.percentage}%</p>
                    <p className="text-sm font-medium text-foreground">{item.type}</p>
                    <p className="text-xs text-muted-foreground">{item.count} cycles</p>
                    <p className="text-xs text-muted-foreground">{item.revenue} €</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Machines - Expert only */}
        {isExpert && <TabsContent value="machines" className="space-y-6">
          <KPISection title="Machines Sous-Performantes" icon={TrendingDown}>
            <div className="grid gap-4">
              {underperformingMachines.map((item, index) => (
                <Card key={index} className="border-l-4 border-l-destructive">
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <WashingMachine className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold text-foreground text-lg">{item.machine}</span>
                          <Badge variant="destructive">{item.gap}% vs moyenne</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cause probable : {item.issue}
                        </p>
                        <div className="flex gap-6 text-sm">
                          <div>
                            <span className="text-muted-foreground">Actuel : </span>
                            <span className="font-medium text-foreground">{item.currentRevenue} €/mois</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Moyenne : </span>
                            <span className="font-medium text-foreground">{item.avgRevenue} €/mois</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center sm:text-right p-4 bg-green-500/10 rounded-lg">
                        <p className="text-sm text-muted-foreground">Gain potentiel</p>
                        <p className="text-2xl font-bold text-green-600">+{item.potentialGain} €</p>
                        <p className="text-xs text-muted-foreground">/mois si corrigé</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </KPISection>

          {/* Tableau récapitulatif performances */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Détaillée par Machine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Machine</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Rotation/j</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">CA/jour</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">CA/heure</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rotationData.map((item, index) => {
                      const caPerDay = item.cyclesPerDay * item.avgRevenue;
                      const caPerHour = caPerDay / 12;
                      const isUnderperforming = underperformingMachines.some(u => u.machine === item.machine);
                      return (
                        <tr key={index} className="border-b border-border/50">
                          <td className="py-3 px-2 font-medium text-foreground">{item.machine}</td>
                          <td className="text-right py-3 px-2 text-foreground">{item.cyclesPerDay}</td>
                          <td className="text-right py-3 px-2 text-foreground">{caPerDay.toFixed(0)} €</td>
                          <td className="text-right py-3 px-2 text-foreground">{caPerHour.toFixed(2)} €</td>
                          <td className="text-center py-3 px-2">
                            {isUnderperforming ? (
                              <Badge variant="destructive">Sous-perf.</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">OK</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>}

        {/* Onglet Tendances - Expert only */}
        {isExpert && <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Évolution de la Rentabilité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitabilityTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="caParMachine" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="CA/Machine (€)"
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="caParHeure" 
                      stroke="hsl(var(--chart-cb))" 
                      strokeWidth={2}
                      name="CA/Heure (€)"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="tauxOccupation" 
                      stroke="hsl(var(--chart-seche))" 
                      strokeWidth={2}
                      name="Taux occupation (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* KPIs de tendance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center p-4">
              <p className="text-sm text-muted-foreground">Tendance CA/Machine</p>
              <p className="text-2xl font-bold text-green-600">+19%</p>
              <p className="text-xs text-muted-foreground">vs 6 mois</p>
            </Card>
            <Card className="text-center p-4">
              <p className="text-sm text-muted-foreground">Tendance CA/Heure</p>
              <p className="text-2xl font-bold text-green-600">+18%</p>
              <p className="text-xs text-muted-foreground">vs 6 mois</p>
            </Card>
            <Card className="text-center p-4">
              <p className="text-sm text-muted-foreground">Tendance Occupation</p>
              <p className="text-2xl font-bold text-green-600">+16%</p>
              <p className="text-xs text-muted-foreground">vs 6 mois</p>
            </Card>
            <Card className="text-center p-4">
              <p className="text-sm text-muted-foreground">Prévision +3 mois</p>
              <p className="text-2xl font-bold text-primary">+8%</p>
              <p className="text-xs text-muted-foreground">CA estimé</p>
            </Card>
          </div>
        </TabsContent>}
      </Tabs>
    </div>
    </>
  );
}
