import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface SubscriptionMetrics {
  active_subscriptions: number;
  trial_subscriptions: number;
  past_due_subscriptions: number;
  canceled_subscriptions: number;
  monthly_subscriptions: number;
  annual_subscriptions: number;
  total_laundries_subscribed: number;
  mrr_estimated: number;
  churn_current_month: number;
  new_subscriptions_current_month: number;
  trial_conversions_current_month: number;
  trials_expiring_soon: number;
  status_breakdown: Array<{ status: string; count: number }>;
  monthly_trend: Array<{
    month: string;
    active: number;
    new: number;
    churned: number;
  }>;
}

interface SubscriptionMetricsExportProps {
  metrics: SubscriptionMetrics | null;
  disabled?: boolean;
}

export function SubscriptionMetricsExport({ metrics, disabled }: SubscriptionMetricsExportProps) {
  const exportToCSV = () => {
    if (!metrics) return;

    const date = new Date().toISOString().split('T')[0];
    
    // Build CSV content
    const lines: string[] = [];
    
    // Header section
    lines.push("Rapport Métriques Abonnements");
    lines.push(`Date d'export,${date}`);
    lines.push("");
    
    // KPIs section
    lines.push("=== INDICATEURS CLÉS ===");
    lines.push("Métrique,Valeur");
    lines.push(`Abonnements actifs,${metrics.active_subscriptions}`);
    lines.push(`Abonnements en essai,${metrics.trial_subscriptions}`);
    lines.push(`Abonnements impayés,${metrics.past_due_subscriptions}`);
    lines.push(`Abonnements annulés,${metrics.canceled_subscriptions}`);
    lines.push(`Abonnements mensuels,${metrics.monthly_subscriptions}`);
    lines.push(`Abonnements annuels,${metrics.annual_subscriptions}`);
    lines.push(`Laveries abonnées,${metrics.total_laundries_subscribed}`);
    lines.push(`MRR estimé (€),${metrics.mrr_estimated?.toFixed(2) || 0}`);
    lines.push(`Churn ce mois,${metrics.churn_current_month}`);
    lines.push(`Nouveaux abonnements ce mois,${metrics.new_subscriptions_current_month}`);
    lines.push(`Conversions essai ce mois,${metrics.trial_conversions_current_month}`);
    lines.push(`Essais expirant sous 7j,${metrics.trials_expiring_soon}`);
    lines.push("");
    
    // Status breakdown
    if (metrics.status_breakdown?.length) {
      lines.push("=== RÉPARTITION PAR STATUT ===");
      lines.push("Statut,Nombre");
      metrics.status_breakdown.forEach(item => {
        lines.push(`${item.status},${item.count}`);
      });
      lines.push("");
    }
    
    // Monthly trend
    if (metrics.monthly_trend?.length) {
      lines.push("=== TENDANCE MENSUELLE (6 derniers mois) ===");
      lines.push("Mois,Actifs,Nouveaux,Churned");
      metrics.monthly_trend.forEach(item => {
        const monthDate = new Date(item.month);
        const monthLabel = monthDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        lines.push(`${monthLabel},${item.active},${item.new},${item.churned}`);
      });
    }

    // Create and download file
    const csvContent = lines.join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `metriques-abonnements-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToCSV}
      disabled={disabled || !metrics}
    >
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
