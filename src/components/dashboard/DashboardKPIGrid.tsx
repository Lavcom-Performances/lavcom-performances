import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Euro, 
  CreditCard, 
  Banknote, 
  ShoppingCart, 
  TrendingUp,
  Clock,
  RefreshCw,
} from "lucide-react";
import { KPICard } from "./KPICard";
import { useDashboardKpis } from "@/hooks/useAnalyticsRpc";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useRefreshState } from "@/hooks/useRefreshState";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.2,
    }
  },
};

interface DashboardKPIGridProps {
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export function DashboardKPIGrid({ dateRange }: DashboardKPIGridProps) {
  const { t } = useTranslation(['app']);
  const { currentSiteId } = useCurrentSite();
  const { isRefreshing } = useRefreshState();

  const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
  const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

  const { data: kpis, isLoading, isFetching } = useDashboardKpis(
    currentSiteId ?? '',
    startDate,
    endDate
  );

  const showRefreshingState = isLoading || isFetching || (currentSiteId ? isRefreshing(currentSiteId) : false);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M €`;
    }
    if (value >= 10000) {
      return `${(value / 1000).toFixed(0)}K €`;
    }
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(Math.round(value)) + ' €';
  };

  const stats = useMemo(() => {
    if (!kpis) {
      return {
        totalRevenue: 0,
        revenueByCard: 0,
        revenueByCash: 0,
        totalTransactions: 0,
        averageBasket: 0,
        uniqueMachines: 0,
        peakHour: 0,
      };
    }
    return {
      totalRevenue: Number(kpis.total_revenue) || 0,
      revenueByCard: Number(kpis.revenue_cb) || 0,
      revenueByCash: Number(kpis.revenue_esp) || 0,
      totalTransactions: Number(kpis.total_transactions) || 0,
      averageBasket: Number(kpis.average_basket) || 0,
      uniqueMachines: Number(kpis.unique_machines) || 0,
      peakHour: Number(kpis.peak_hour) || 0,
    };
  }, [kpis]);

  const cardPercentage = stats.totalRevenue > 0 
    ? Math.round((stats.revenueByCard / stats.totalRevenue) * 100) 
    : 0;
  const cashPercentage = stats.totalRevenue > 0 
    ? Math.round((stats.revenueByCash / stats.totalRevenue) * 100) 
    : 0;

  if (showRefreshingState) {
    return (
      <div className="space-y-3">
        {(isFetching || (currentSiteId && isRefreshing(currentSiteId))) && !isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>{t('app:dashboard.refreshing', { defaultValue: 'Mise à jour...' })}</span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      data-tutorial="kpis" 
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <KPICard
          title={t('app:dashboard.kpi.totalRevenue')}
          value={formatCurrency(stats.totalRevenue)}
          icon={Euro}
          variant="primary"
          helpText={t('app:dashboard.help.totalRevenue')}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <KPICard
          title={t('app:dashboard.kpi.revenueCard')}
          value={formatCurrency(stats.revenueByCard)}
          icon={CreditCard}
          variant="success"
          subtitle={`${cardPercentage}% ${t('app:dashboard.kpi.ofRevenue')}`}
          helpText={t('app:dashboard.help.revenueCard')}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <KPICard
          title={t('app:dashboard.kpi.revenueCash')}
          value={formatCurrency(stats.revenueByCash)}
          icon={Banknote}
          subtitle={`${cashPercentage}% ${t('app:dashboard.kpi.ofRevenue')}`}
          helpText={t('app:dashboard.help.revenueCash')}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <KPICard
          title={t('app:dashboard.kpi.transactions')}
          value={stats.totalTransactions.toLocaleString('fr-FR')}
          icon={ShoppingCart}
          helpText={t('app:dashboard.help.transactions')}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <KPICard
          title={t('app:dashboard.kpi.avgBasket')}
          value={`${stats.averageBasket.toFixed(2)} €`}
          icon={TrendingUp}
          helpText={t('app:dashboard.help.avgBasket')}
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <KPICard
          title={t('app:dashboard.kpi.peakHour')}
          value={stats.peakHour > 0 ? `${stats.peakHour}h` : '—'}
          icon={Clock}
          subtitle={stats.uniqueMachines > 0 ? `${stats.uniqueMachines} machines` : undefined}
          helpText={t('app:dashboard.help.peakHour', { defaultValue: 'Heure de pointe' })}
        />
      </motion.div>
    </motion.div>
  );
}
