import { useState } from "react";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { 
  Euro, 
  CreditCard, 
  Banknote, 
  ShoppingCart, 
  TrendingUp,
  Target,
  Percent,
  Clock,
  WashingMachine
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";
import { DailyRevenueChart } from "@/components/dashboard/DailyRevenueChart";
import { PaymentPieChart } from "@/components/dashboard/PaymentPieChart";
import { SalesHeatmap } from "@/components/dashboard/SalesHeatmap";
import { AverageMachinesChart } from "@/components/dashboard/AverageMachinesChart";
import { KPISection } from "@/components/dashboard/KPISection";
import { MiniProgressCard } from "@/components/dashboard/MiniProgressCard";
import { ComparisonCard } from "@/components/dashboard/ComparisonCard";
import { MachinePerformanceTable } from "@/components/dashboard/MachinePerformanceTable";
import { WeekdayPerformanceChart } from "@/components/dashboard/WeekdayPerformanceChart";
import { TransactionStats } from "@/components/dashboard/TransactionStats";
import { MaintenanceAlerts } from "@/components/dashboard/MaintenanceAlerts";
import { LaundryComparisonTable } from "@/components/dashboard/LaundryComparisonTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock data - CA par mois
const mockMonthlyData = [
  { month: "Jan", revenue: 4250 },
  { month: "Fév", revenue: 3890 },
  { month: "Mar", revenue: 4520 },
  { month: "Avr", revenue: 4180 },
  { month: "Mai", revenue: 4750 },
  { month: "Juin", revenue: 5120 },
  { month: "Juil", revenue: 5890 },
  { month: "Août", revenue: 4980 },
  { month: "Sep", revenue: 4650 },
  { month: "Oct", revenue: 4890 },
  { month: "Nov", revenue: 5240 },
  { month: "Déc", revenue: 3495 },
];

// Mock data - CA par jour
const mockDailyData = [
  { date: "01/12", revenue: 334 },
  { date: "02/12", revenue: 436 },
  { date: "03/12", revenue: 385 },
  { date: "04/12", revenue: 501 },
  { date: "05/12", revenue: 410 },
  { date: "06/12", revenue: 589 },
  { date: "07/12", revenue: 840 },
];

// Mock data - Répartition des paiements
const mockPaymentData = [
  { name: "Carte bancaire", value: 2845, color: "#BED7F0" },
  { name: "Espèces", value: 568, color: "hsl(72, 80%, 43%)" },
  { name: "Fidélité", value: 82, color: "#D9D9D9" },
];

// Mock data - Heatmap
const mockHeatmapData = [
  { day: "Lun", hour: 7, cycles: 2 }, { day: "Lun", hour: 8, cycles: 5 }, { day: "Lun", hour: 9, cycles: 8 },
  { day: "Lun", hour: 10, cycles: 12 }, { day: "Lun", hour: 11, cycles: 10 }, { day: "Lun", hour: 12, cycles: 6 },
  { day: "Lun", hour: 13, cycles: 4 }, { day: "Lun", hour: 14, cycles: 8 }, { day: "Lun", hour: 15, cycles: 9 },
  { day: "Lun", hour: 16, cycles: 11 }, { day: "Lun", hour: 17, cycles: 14 }, { day: "Lun", hour: 18, cycles: 16 },
  { day: "Lun", hour: 19, cycles: 12 }, { day: "Lun", hour: 20, cycles: 8 }, { day: "Lun", hour: 21, cycles: 3 },
  { day: "Mar", hour: 7, cycles: 1 }, { day: "Mar", hour: 8, cycles: 4 }, { day: "Mar", hour: 9, cycles: 7 },
  { day: "Mar", hour: 10, cycles: 10 }, { day: "Mar", hour: 11, cycles: 8 }, { day: "Mar", hour: 12, cycles: 5 },
  { day: "Mar", hour: 13, cycles: 3 }, { day: "Mar", hour: 14, cycles: 6 }, { day: "Mar", hour: 15, cycles: 8 },
  { day: "Mar", hour: 16, cycles: 10 }, { day: "Mar", hour: 17, cycles: 13 }, { day: "Mar", hour: 18, cycles: 15 },
  { day: "Mar", hour: 19, cycles: 11 }, { day: "Mar", hour: 20, cycles: 7 }, { day: "Mar", hour: 21, cycles: 2 },
  { day: "Mer", hour: 7, cycles: 3 }, { day: "Mer", hour: 8, cycles: 6 }, { day: "Mer", hour: 9, cycles: 9 },
  { day: "Mer", hour: 10, cycles: 14 }, { day: "Mer", hour: 11, cycles: 12 }, { day: "Mer", hour: 12, cycles: 7 },
  { day: "Mer", hour: 13, cycles: 5 }, { day: "Mer", hour: 14, cycles: 10 }, { day: "Mer", hour: 15, cycles: 11 },
  { day: "Mer", hour: 16, cycles: 13 }, { day: "Mer", hour: 17, cycles: 16 }, { day: "Mer", hour: 18, cycles: 18 },
  { day: "Mer", hour: 19, cycles: 14 }, { day: "Mer", hour: 20, cycles: 9 }, { day: "Mer", hour: 21, cycles: 4 },
  { day: "Jeu", hour: 7, cycles: 2 }, { day: "Jeu", hour: 8, cycles: 5 }, { day: "Jeu", hour: 9, cycles: 8 },
  { day: "Jeu", hour: 10, cycles: 11 }, { day: "Jeu", hour: 11, cycles: 9 }, { day: "Jeu", hour: 12, cycles: 6 },
  { day: "Jeu", hour: 13, cycles: 4 }, { day: "Jeu", hour: 14, cycles: 7 }, { day: "Jeu", hour: 15, cycles: 9 },
  { day: "Jeu", hour: 16, cycles: 12 }, { day: "Jeu", hour: 17, cycles: 14 }, { day: "Jeu", hour: 18, cycles: 17 },
  { day: "Jeu", hour: 19, cycles: 13 }, { day: "Jeu", hour: 20, cycles: 8 }, { day: "Jeu", hour: 21, cycles: 3 },
  { day: "Ven", hour: 7, cycles: 3 }, { day: "Ven", hour: 8, cycles: 7 }, { day: "Ven", hour: 9, cycles: 10 },
  { day: "Ven", hour: 10, cycles: 13 }, { day: "Ven", hour: 11, cycles: 11 }, { day: "Ven", hour: 12, cycles: 8 },
  { day: "Ven", hour: 13, cycles: 6 }, { day: "Ven", hour: 14, cycles: 9 }, { day: "Ven", hour: 15, cycles: 12 },
  { day: "Ven", hour: 16, cycles: 15 }, { day: "Ven", hour: 17, cycles: 18 }, { day: "Ven", hour: 18, cycles: 20 },
  { day: "Ven", hour: 19, cycles: 16 }, { day: "Ven", hour: 20, cycles: 10 }, { day: "Ven", hour: 21, cycles: 5 },
  { day: "Sam", hour: 7, cycles: 4 }, { day: "Sam", hour: 8, cycles: 8 }, { day: "Sam", hour: 9, cycles: 14 },
  { day: "Sam", hour: 10, cycles: 18 }, { day: "Sam", hour: 11, cycles: 20 }, { day: "Sam", hour: 12, cycles: 16 },
  { day: "Sam", hour: 13, cycles: 12 }, { day: "Sam", hour: 14, cycles: 15 }, { day: "Sam", hour: 15, cycles: 17 },
  { day: "Sam", hour: 16, cycles: 19 }, { day: "Sam", hour: 17, cycles: 22 }, { day: "Sam", hour: 18, cycles: 18 },
  { day: "Sam", hour: 19, cycles: 14 }, { day: "Sam", hour: 20, cycles: 8 }, { day: "Sam", hour: 21, cycles: 4 },
  { day: "Dim", hour: 7, cycles: 1 }, { day: "Dim", hour: 8, cycles: 3 }, { day: "Dim", hour: 9, cycles: 6 },
  { day: "Dim", hour: 10, cycles: 10 }, { day: "Dim", hour: 11, cycles: 12 }, { day: "Dim", hour: 12, cycles: 9 },
  { day: "Dim", hour: 13, cycles: 7 }, { day: "Dim", hour: 14, cycles: 8 }, { day: "Dim", hour: 15, cycles: 10 },
  { day: "Dim", hour: 16, cycles: 11 }, { day: "Dim", hour: 17, cycles: 13 }, { day: "Dim", hour: 18, cycles: 10 },
  { day: "Dim", hour: 19, cycles: 7 }, { day: "Dim", hour: 20, cycles: 4 }, { day: "Dim", hour: 21, cycles: 2 },
];

// Mock data - Moyenne machines par jour
const mockAverageMachinesData = [
  { day: "Lun", average: 42.5 },
  { day: "Mar", average: 38.2 },
  { day: "Mer", average: 45.8 },
  { day: "Jeu", average: 41.3 },
  { day: "Ven", average: 52.1 },
  { day: "Sam", average: 68.4 },
  { day: "Dim", average: 35.6 },
];

// Mock data - Performance par machine
const mockMachinePerformance = [
  { id: "LL1", name: "Lave-Linge 8kg #1", type: "washer" as const, revenue: 1245, cycles: 312, occupancyRate: 78 },
  { id: "LL2", name: "Lave-Linge 8kg #2", type: "washer" as const, revenue: 1089, cycles: 285, occupancyRate: 71 },
  { id: "LL3", name: "Lave-Linge 12kg", type: "washer" as const, revenue: 892, cycles: 198, occupancyRate: 62 },
  { id: "SL1", name: "Sèche-Linge #1", type: "dryer" as const, revenue: 678, cycles: 245, occupancyRate: 58 },
  { id: "SL2", name: "Sèche-Linge #2", type: "dryer" as const, revenue: 591, cycles: 212, occupancyRate: 52 },
];

// Mock data - Performance par jour de la semaine
const mockWeekdayData = [
  { day: "Lun", revenue: 485, transactions: 68 },
  { day: "Mar", revenue: 412, transactions: 58 },
  { day: "Mer", revenue: 534, transactions: 75 },
  { day: "Jeu", revenue: 467, transactions: 66 },
  { day: "Ven", revenue: 598, transactions: 84 },
  { day: "Sam", revenue: 892, transactions: 125 },
  { day: "Dim", revenue: 356, transactions: 50 },
];

// Mock data - Alertes maintenance
const mockMaintenanceAlerts = [
  { machineId: "LL3", machineName: "Lave-Linge 12kg", type: "washer" as const, status: "critical" as const, message: "500 cycles depuis dernière maintenance", lastMaintenance: "15/09/2024", cyclesSinceMaintenance: 500 },
  { machineId: "SL2", machineName: "Sèche-Linge #2", type: "dryer" as const, status: "warning" as const, message: "350 cycles - maintenance recommandée", lastMaintenance: "28/10/2024", cyclesSinceMaintenance: 350 },
];

// Mock data - Comparaison laveries
const mockLaundriesComparison = [
  { id: "L1", name: "Laverie Centre-Ville", revenue: 5240, transactions: 732, occupancyRate: 72, trend: 8.5 },
  { id: "L2", name: "Laverie Gare", revenue: 4180, transactions: 584, occupancyRate: 65, trend: -2.3 },
  { id: "L3", name: "Laverie Université", revenue: 3890, transactions: 543, occupancyRate: 58, trend: 12.1 },
];

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Vue d'ensemble complète de vos performances
          </p>
        </div>
        <DateRangePicker 
          dateRange={dateRange}
          onDateChange={setDateRange}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="financial">Financier</TabsTrigger>
          <TabsTrigger value="operations">Opérations</TabsTrigger>
          <TabsTrigger value="comparison">Comparatifs</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards principales */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <KPICard
              title="CA Total"
              value="3 495 €"
              icon={Euro}
              variant="primary"
              trend={{ value: 12.5, isPositive: true }}
            />
            <KPICard
              title="CA CB"
              value="2 845 €"
              icon={CreditCard}
              variant="success"
              subtitle="81% du CA"
            />
            <KPICard
              title="CA Espèces"
              value="568 €"
              icon={Banknote}
              subtitle="16% du CA"
            />
            <KPICard
              title="Transactions"
              value="487"
              icon={ShoppingCart}
              trend={{ value: 8.3, isPositive: true }}
            />
            <KPICard
              title="Panier moyen"
              value="7,18 €"
              icon={TrendingUp}
              trend={{ value: 3.2, isPositive: true }}
            />
            <KPICard
              title="Taux occupation"
              value="65%"
              icon={Percent}
              subtitle="LL: 68% | SL: 55%"
            />
          </div>

          {/* Objectifs et comparaisons rapides */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniProgressCard 
              title="Objectif mensuel" 
              current={3495} 
              target={4500} 
            />
            <MiniProgressCard 
              title="Cycles réalisés" 
              current={487} 
              target={600} 
              unit="cycles"
            />
            <ComparisonCard 
              title="CA Mois" 
              current="3 495 €" 
              previous="3 108 €"
              currentLabel="Dec 2024"
              previousLabel="Dec 2023"
              percentageChange={12.5}
            />
            <ComparisonCard 
              title="Transactions" 
              current="487" 
              previous="452"
              currentLabel="Ce mois"
              previousLabel="N-1"
              percentageChange={7.7}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonthlyRevenueChart data={mockMonthlyData} />
            <DailyRevenueChart data={mockDailyData} />
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaymentPieChart data={mockPaymentData} />
            <WeekdayPerformanceChart data={mockWeekdayData} />
          </div>

          {/* Heatmap */}
          <SalesHeatmap data={mockHeatmapData} />
        </TabsContent>

        {/* Financier */}
        <TabsContent value="financial" className="space-y-6">
          <KPISection title="Performance financière" icon={Euro}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <KPICard
                title="CA Total"
                value="3 495 €"
                icon={Euro}
                variant="primary"
                trend={{ value: 12.5, isPositive: true }}
              />
              <KPICard
                title="CA/Machine"
                value="699 €"
                icon={WashingMachine}
                subtitle="Moy. 5 machines"
              />
              <KPICard
                title="CA/m²"
                value="87,38 €"
                icon={Target}
                subtitle="40m² surface"
              />
              <KPICard
                title="Panier moyen"
                value="7,18 €"
                icon={ShoppingCart}
                trend={{ value: 3.2, isPositive: true }}
              />
              <KPICard
                title="CA/Heure"
                value="8,12 €"
                icon={Clock}
                subtitle="12h/jour ouvert"
              />
              <KPICard
                title="Marge brute"
                value="68%"
                icon={Percent}
                variant="success"
              />
            </div>
          </KPISection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MiniProgressCard 
              title="Objectif CA mensuel" 
              current={3495} 
              target={4500} 
            />
            <MiniProgressCard 
              title="Objectif CA annuel" 
              current={55860} 
              target={54000} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonthlyRevenueChart data={mockMonthlyData} />
            <PaymentPieChart data={mockPaymentData} />
          </div>

          <MachinePerformanceTable machines={mockMachinePerformance} />
        </TabsContent>

        {/* Opérations */}
        <TabsContent value="operations" className="space-y-6">
          <KPISection title="Performance opérationnelle" icon={WashingMachine}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <KPICard
                title="Taux occupation"
                value="65%"
                icon={Percent}
                variant="warning"
                subtitle="LL: 68% | SL: 55%"
              />
              <KPICard
                title="Cycles/jour"
                value="69,6"
                icon={Clock}
                trend={{ value: 5.2, isPositive: true }}
              />
              <KPICard
                title="Temps moyen cycle"
                value="45 min"
                icon={Clock}
                subtitle="LL: 50 | SL: 35"
              />
              <KPICard
                title="Machines actives"
                value="5/5"
                icon={WashingMachine}
                variant="success"
              />
              <KPICard
                title="Heure pointe"
                value="18h"
                icon={TrendingUp}
                subtitle="22 cycles/h max"
              />
              <KPICard
                title="Disponibilité"
                value="98,2%"
                icon={Target}
                variant="success"
              />
            </div>
          </KPISection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MachinePerformanceTable machines={mockMachinePerformance} />
            <MaintenanceAlerts alerts={mockMaintenanceAlerts} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AverageMachinesChart data={mockAverageMachinesData} />
            <TransactionStats 
              totalTransactions={487}
              avgTransactionsPerDay={69.6}
              failedTransactions={12}
              failedRate={2.4}
              peakHour="18h-19h"
              peakTransactions={45}
            />
          </div>

          <SalesHeatmap data={mockHeatmapData} />
        </TabsContent>

        {/* Comparatifs */}
        <TabsContent value="comparison" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ComparisonCard 
              title="CA Mensuel" 
              current="3 495 €" 
              previous="3 108 €"
              currentLabel="Dec 2024"
              previousLabel="Dec 2023"
              percentageChange={12.5}
            />
            <ComparisonCard 
              title="Transactions" 
              current="487" 
              previous="452"
              currentLabel="Ce mois"
              previousLabel="Mois dernier"
              percentageChange={7.7}
            />
            <ComparisonCard 
              title="Panier moyen" 
              current="7,18 €" 
              previous="6,87 €"
              currentLabel="Ce mois"
              previousLabel="N-1"
              percentageChange={4.5}
            />
          </div>

          <LaundryComparisonTable laundries={mockLaundriesComparison} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeekdayPerformanceChart data={mockWeekdayData} />
            <MonthlyRevenueChart data={mockMonthlyData} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
