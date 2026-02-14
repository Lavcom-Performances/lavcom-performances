import { useTranslation } from "react-i18next";
import { Trophy, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";
import type { RecordEntry } from "@/hooks/useOperatorDashboard";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface OperatorTrendsAndRecordsProps {
  records: RecordEntry[];
  startDate?: Date;
  endDate?: Date;
}

export function OperatorTrendsAndRecords({ records, startDate, endDate }: OperatorTrendsAndRecordsProps) {
  const { t } = useTranslation("app");

  const formatCurrency = (cents: number) => {
    const euros = cents / 100;
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(euros)) + " €";
  };

  const bestDay = records.find(r => r.label === "best_day");
  const bestMonth = records.find(r => r.label === "best_month");

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-display font-semibold">
          {t("operatorDashboard.trends.title", { defaultValue: "Tendances & Records" })}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 12-month chart */}
        <div className="lg:col-span-2">
          <MonthlyRevenueChart startDate={startDate} endDate={endDate} />
        </div>

        {/* Records */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              {t("operatorDashboard.records.title", { defaultValue: "Vos records" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bestDay && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{t("operatorDashboard.records.bestDay", { defaultValue: "Meilleur jour" })}</span>
                </div>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(bestDay.revenue_cents)}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(bestDay.date), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                <p className="text-[10px] text-muted-foreground italic">
                  {t("operatorDashboard.records.bestDayHelper", { defaultValue: "Identifie les facteurs de succès à reproduire." })}
                </p>
              </div>
            )}

            {bestMonth && (
              <div className="space-y-1 pt-3 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>{t("operatorDashboard.records.bestMonth", { defaultValue: "Meilleur mois" })}</span>
                </div>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(bestMonth.revenue_cents)}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(bestMonth.date + "-01"), "MMMM yyyy", { locale: fr })}
                </p>
                <p className="text-[10px] text-muted-foreground italic">
                  {t("operatorDashboard.records.bestMonthHelper", { defaultValue: "Votre référence pour fixer des objectifs réalistes." })}
                </p>
              </div>
            )}

            {records.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("operatorDashboard.records.noData", { defaultValue: "Pas encore assez de données pour établir des records." })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
