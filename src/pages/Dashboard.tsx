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
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { PaymentModeChart } from "@/components/dashboard/PaymentModeChart";

// Mock data for V1
const mockRevenueData = [
  { date: "01/12", cb: 245, esp: 89 },
  { date: "02/12", cb: 312, esp: 124 },
  { date: "03/12", cb: 287, esp: 98 },
  { date: "04/12", cb: 356, esp: 145 },
  { date: "05/12", cb: 298, esp: 112 },
];

const mockCategoryData = [
  { name: "Lave-linge", value: 1850, color: "hsl(199, 89%, 48%)" },
  { name: "Sèche-linge", value: 980, color: "hsl(25, 95%, 53%)" },
  { name: "Lessive", value: 245, color: "hsl(280, 65%, 60%)" },
  { name: "Recharges", value: 420, color: "hsl(142, 71%, 45%)" },
];

const mockPaymentData = [
  { name: "Carte bancaire", value: 2845, color: "hsl(142, 71%, 45%)" },
  { name: "Espèces", value: 568, color: "hsl(217, 91%, 60%)" },
  { name: "Fidélité", value: 82, color: "hsl(262, 83%, 58%)" },
];

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
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
          title="CA Produits"
          value="665,00 €"
          icon={Package}
          subtitle="Lessive + Recharges"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={mockRevenueData} />
        <CategoryPieChart data={mockCategoryData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentModeChart data={mockPaymentData} />
        <div className="kpi-card h-[400px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">Heatmap des ventes</p>
            <p className="text-sm">Disponible prochainement</p>
          </div>
        </div>
      </div>
    </div>
  );
}
