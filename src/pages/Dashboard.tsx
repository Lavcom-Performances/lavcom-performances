import { useState } from "react";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { 
  Euro, 
  CreditCard, 
  Banknote, 
  ShoppingCart, 
  TrendingUp,
  Package
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";
import { DailyRevenueChart } from "@/components/dashboard/DailyRevenueChart";
import { PaymentPieChart } from "@/components/dashboard/PaymentPieChart";

import { SalesHeatmap } from "@/components/dashboard/SalesHeatmap";
import { AverageMachinesChart } from "@/components/dashboard/AverageMachinesChart";

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
// ESP = vert (Lavcom green), CB = bleu (#BED7F0), FI = gris (#D9D9D9)
const mockPaymentData = [
  { name: "Carte bancaire", value: 2845, color: "#BED7F0" },
  { name: "Espèces", value: 568, color: "hsl(72, 80%, 43%)" },
  { name: "Fidélité", value: 82, color: "#D9D9D9" },
];


// Mock data - Heatmap (jour x heure)
const mockHeatmapData = [
  // Lundi
  { day: "Lun", hour: 7, cycles: 2 },
  { day: "Lun", hour: 8, cycles: 5 },
  { day: "Lun", hour: 9, cycles: 8 },
  { day: "Lun", hour: 10, cycles: 12 },
  { day: "Lun", hour: 11, cycles: 10 },
  { day: "Lun", hour: 12, cycles: 6 },
  { day: "Lun", hour: 13, cycles: 4 },
  { day: "Lun", hour: 14, cycles: 8 },
  { day: "Lun", hour: 15, cycles: 9 },
  { day: "Lun", hour: 16, cycles: 11 },
  { day: "Lun", hour: 17, cycles: 14 },
  { day: "Lun", hour: 18, cycles: 16 },
  { day: "Lun", hour: 19, cycles: 12 },
  { day: "Lun", hour: 20, cycles: 8 },
  { day: "Lun", hour: 21, cycles: 3 },
  // Mardi
  { day: "Mar", hour: 7, cycles: 1 },
  { day: "Mar", hour: 8, cycles: 4 },
  { day: "Mar", hour: 9, cycles: 7 },
  { day: "Mar", hour: 10, cycles: 10 },
  { day: "Mar", hour: 11, cycles: 8 },
  { day: "Mar", hour: 12, cycles: 5 },
  { day: "Mar", hour: 13, cycles: 3 },
  { day: "Mar", hour: 14, cycles: 6 },
  { day: "Mar", hour: 15, cycles: 8 },
  { day: "Mar", hour: 16, cycles: 10 },
  { day: "Mar", hour: 17, cycles: 13 },
  { day: "Mar", hour: 18, cycles: 15 },
  { day: "Mar", hour: 19, cycles: 11 },
  { day: "Mar", hour: 20, cycles: 7 },
  { day: "Mar", hour: 21, cycles: 2 },
  // Mercredi
  { day: "Mer", hour: 7, cycles: 3 },
  { day: "Mer", hour: 8, cycles: 6 },
  { day: "Mer", hour: 9, cycles: 9 },
  { day: "Mer", hour: 10, cycles: 14 },
  { day: "Mer", hour: 11, cycles: 12 },
  { day: "Mer", hour: 12, cycles: 7 },
  { day: "Mer", hour: 13, cycles: 5 },
  { day: "Mer", hour: 14, cycles: 10 },
  { day: "Mer", hour: 15, cycles: 11 },
  { day: "Mer", hour: 16, cycles: 13 },
  { day: "Mer", hour: 17, cycles: 16 },
  { day: "Mer", hour: 18, cycles: 18 },
  { day: "Mer", hour: 19, cycles: 14 },
  { day: "Mer", hour: 20, cycles: 9 },
  { day: "Mer", hour: 21, cycles: 4 },
  // Jeudi
  { day: "Jeu", hour: 7, cycles: 2 },
  { day: "Jeu", hour: 8, cycles: 5 },
  { day: "Jeu", hour: 9, cycles: 8 },
  { day: "Jeu", hour: 10, cycles: 11 },
  { day: "Jeu", hour: 11, cycles: 9 },
  { day: "Jeu", hour: 12, cycles: 6 },
  { day: "Jeu", hour: 13, cycles: 4 },
  { day: "Jeu", hour: 14, cycles: 7 },
  { day: "Jeu", hour: 15, cycles: 9 },
  { day: "Jeu", hour: 16, cycles: 12 },
  { day: "Jeu", hour: 17, cycles: 14 },
  { day: "Jeu", hour: 18, cycles: 17 },
  { day: "Jeu", hour: 19, cycles: 13 },
  { day: "Jeu", hour: 20, cycles: 8 },
  { day: "Jeu", hour: 21, cycles: 3 },
  // Vendredi
  { day: "Ven", hour: 7, cycles: 3 },
  { day: "Ven", hour: 8, cycles: 7 },
  { day: "Ven", hour: 9, cycles: 10 },
  { day: "Ven", hour: 10, cycles: 13 },
  { day: "Ven", hour: 11, cycles: 11 },
  { day: "Ven", hour: 12, cycles: 8 },
  { day: "Ven", hour: 13, cycles: 6 },
  { day: "Ven", hour: 14, cycles: 9 },
  { day: "Ven", hour: 15, cycles: 12 },
  { day: "Ven", hour: 16, cycles: 15 },
  { day: "Ven", hour: 17, cycles: 18 },
  { day: "Ven", hour: 18, cycles: 20 },
  { day: "Ven", hour: 19, cycles: 16 },
  { day: "Ven", hour: 20, cycles: 10 },
  { day: "Ven", hour: 21, cycles: 5 },
  // Samedi
  { day: "Sam", hour: 7, cycles: 4 },
  { day: "Sam", hour: 8, cycles: 8 },
  { day: "Sam", hour: 9, cycles: 14 },
  { day: "Sam", hour: 10, cycles: 18 },
  { day: "Sam", hour: 11, cycles: 20 },
  { day: "Sam", hour: 12, cycles: 16 },
  { day: "Sam", hour: 13, cycles: 12 },
  { day: "Sam", hour: 14, cycles: 15 },
  { day: "Sam", hour: 15, cycles: 17 },
  { day: "Sam", hour: 16, cycles: 19 },
  { day: "Sam", hour: 17, cycles: 22 },
  { day: "Sam", hour: 18, cycles: 18 },
  { day: "Sam", hour: 19, cycles: 14 },
  { day: "Sam", hour: 20, cycles: 8 },
  { day: "Sam", hour: 21, cycles: 4 },
  // Dimanche
  { day: "Dim", hour: 7, cycles: 1 },
  { day: "Dim", hour: 8, cycles: 3 },
  { day: "Dim", hour: 9, cycles: 6 },
  { day: "Dim", hour: 10, cycles: 10 },
  { day: "Dim", hour: 11, cycles: 12 },
  { day: "Dim", hour: 12, cycles: 9 },
  { day: "Dim", hour: 13, cycles: 7 },
  { day: "Dim", hour: 14, cycles: 8 },
  { day: "Dim", hour: 15, cycles: 10 },
  { day: "Dim", hour: 16, cycles: 11 },
  { day: "Dim", hour: 17, cycles: 13 },
  { day: "Dim", hour: 18, cycles: 10 },
  { day: "Dim", hour: 19, cycles: 7 },
  { day: "Dim", hour: 20, cycles: 4 },
  { day: "Dim", hour: 21, cycles: 2 },
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

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Vue d'ensemble de vos performances
          </p>
        </div>
        <DateRangePicker 
          dateRange={dateRange}
          onDateChange={setDateRange}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="CA Total"
          value="3 495,00 €"
          icon={Euro}
          variant="primary"
          trend={{ value: 12.5, isPositive: true }}
        />
        <KPICard
          title="CA CB"
          value="2 845,00 €"
          icon={CreditCard}
          variant="success"
          subtitle="81% du CA"
        />
        <KPICard
          title="CA Espèces"
          value="568,00 €"
          icon={Banknote}
          subtitle="16% du CA"
        />
        <KPICard
          title="Ventes"
          value="487"
          icon={ShoppingCart}
          trend={{ value: 8.3, isPositive: true }}
        />
        <KPICard
          title="Panier moyen"
          value="7,18 €"
          icon={TrendingUp}
          variant="warning"
        />
        <KPICard
          title="Taux d'occupation"
          value="65%"
          icon={TrendingUp}
          variant="warning"
          subtitle="LL: 65% | SL: 58%"
        />
      </div>

      {/* Charts Row 1: CA par mois + CA par jour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyRevenueChart data={mockMonthlyData} />
        <DailyRevenueChart data={mockDailyData} />
      </div>

      {/* Charts Row 2: Paiements + Moyenne Machines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentPieChart data={mockPaymentData} />
        <AverageMachinesChart data={mockAverageMachinesData} />
      </div>

      {/* Charts Row 3: Heatmap */}
      <div className="grid grid-cols-1 gap-6">
        <SalesHeatmap data={mockHeatmapData} />
      </div>
    </div>
  );
}
