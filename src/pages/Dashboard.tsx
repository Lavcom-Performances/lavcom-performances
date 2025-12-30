import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { 
  Euro, 
  CreditCard, 
  Banknote, 
  ShoppingCart, 
  TrendingUp,
  Percent,
  Clock,
  WashingMachine,
  Loader2,
  Settings,
  ArrowLeft,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { DashboardKPIGrid } from "@/components/dashboard/DashboardKPIGrid";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";
import { YearComparisonChart } from "@/components/dashboard/YearComparisonChart";
import { DailyRevenueChart } from "@/components/dashboard/DailyRevenueChart";
import { PaymentPieChart } from "@/components/dashboard/PaymentPieChart";
import { SalesHeatmap } from "@/components/dashboard/SalesHeatmap";
import { KPISection } from "@/components/dashboard/KPISection";
import { MiniProgressCard } from "@/components/dashboard/MiniProgressCard";
import { ComparisonCard } from "@/components/dashboard/ComparisonCard";
import { MachinePerformanceTable } from "@/components/dashboard/MachinePerformanceTable";
import { WeekdayPerformanceChart } from "@/components/dashboard/WeekdayPerformanceChart";
import { ProfitabilityKPIs } from "@/components/dashboard/ProfitabilityKPIs";
import { ProfitabilitySection } from "@/components/dashboard/ProfitabilitySection";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { GoalsConfigDialog } from "@/components/dashboard/GoalsConfigDialog";
import { SiteComparisonSection } from "@/components/dashboard/SiteComparisonSection";
import { PdfPreviewDialog } from "@/components/dashboard/PdfPreviewDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { calculateProfitabilityMetrics, LaundryCosts } from "@/types/costs";
import { useViewMode } from "@/hooks/useViewMode";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useSites } from "@/hooks/useSites";
import { useUserGoals } from "@/hooks/useUserGoals";
import { useDateRange } from "@/hooks/useDateRange";
import { SEOHead } from "@/components/seo/SEOHead";
import { generateDashboardPdf } from "@/utils/dashboardPdfExport";

// Animation variants for staggered cards
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.3,
    }
  },
};

// Default costs for profitability calculation (user can configure these later)
const defaultCosts: LaundryCosts = {
  fixed_rent: 850,
  fixed_lease: 450,
  fixed_subscriptions: 120,
  fixed_insurance: 85,
  fixed_cleaning: 200,
  fixed_other: 50,
  var_energy_water_percent: 12,
  var_detergent_percent: 3,
};

export default function Dashboard() {
  const { t } = useTranslation(['app', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isExpert } = useViewMode();
  const { user } = useAuth();
  const { sites, getDefaultSite } = useSites();
  const { dateRange, setDateRange } = useDateRange();
  
  // Get site from URL or default
  const urlSiteId = searchParams.get('site');
  
  // Track if we came from a drill-down (site param in URL)
  const isFromDrillDown = !!urlSiteId;
  
  // Validate site and handle fallback
  const { selectedSite, siteWasInvalid } = useMemo(() => {
    if (urlSiteId) {
      const foundSite = sites.find(s => s.id === urlSiteId);
      if (foundSite) {
        return { selectedSite: foundSite, siteWasInvalid: false };
      }
      // Site not found - fallback to default
      return { selectedSite: getDefaultSite(), siteWasInvalid: true };
    }
    return { selectedSite: getDefaultSite(), siteWasInvalid: false };
  }, [urlSiteId, sites, getDefaultSite]);
  
  // Show toast for invalid site (only once)
  useEffect(() => {
    if (siteWasInvalid && sites.length > 0) {
      toast.warning(t('app:dashboard.siteNotFound'));
    }
  }, [siteWasInvalid, sites.length, t]);
  
  // Show toast for valid drill-down (only on Dashboard)
  useEffect(() => {
    if (isFromDrillDown && selectedSite && !siteWasInvalid && sites.length > 0) {
      toast.success(t('app:dashboard.siteSelected', { name: selectedSite.name }));
    }
  }, [isFromDrillDown, selectedSite?.id, siteWasInvalid, sites.length, t]);
  
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  // Handle return to multi-site view
  const handleReturnToMultiSites = () => {
    const params = new URLSearchParams();
    if (dateRange?.from) {
      params.set('date_start', format(dateRange.from, 'yyyy-MM-dd'));
    }
    if (dateRange?.to) {
      params.set('date_end', format(dateRange.to, 'yyyy-MM-dd'));
    }
    params.set('tab', 'comparatifs');
    navigate(`/dashboard?${params.toString()}`);
  };

  const { stats, isLoading, isEmpty, refetch, dataSource } = useDashboardStats(dateRange, selectedSite?.id);
  const { goals } = useUserGoals(selectedSite?.id);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Handle analytics recalculation
  const handleRecalculateAnalytics = async () => {
    if (!selectedSite?.id || !user) return;
    
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-analytics", {
        body: {
          site_id: selectedSite.id,
          user_id: user.id,
          start_date: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
          end_date: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        },
      });

      if (error) throw error;

      toast.success(t('app:dashboard.analytics.recalculated', { 
        count: data?.operations_processed || 0 
      }));
      
      // Refetch dashboard data
      await refetch();
    } catch (err: any) {
      console.error("Error recalculating analytics:", err);
      toast.error(t('app:dashboard.analytics.error'));
    } finally {
      setIsRecalculating(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(Math.round(value)) + ' €';
  };

  // Calculate profitability metrics
  const profitabilityMetrics = calculateProfitabilityMetrics(
    defaultCosts, 
    stats.totalRevenue, 
    stats.totalTransactions
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-lavcom-green mx-auto mb-4" />
          <p className="text-muted-foreground">{t('app:dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
              {t('app:dashboard.title')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('app:dashboard.subtitle')}
            </p>
          </div>
        </div>
        
        <div className="card-lavcom">
          <DashboardEmptyState />
        </div>
      </div>
    );
  }

  // Calculate derived values
  const cardPercentage = stats.totalRevenue > 0 
    ? Math.round((stats.revenueByCard / stats.totalRevenue) * 100) 
    : 0;
  const cashPercentage = stats.totalRevenue > 0 
    ? Math.round((stats.revenueByCash / stats.totalRevenue) * 100) 
    : 0;

  // Previous period values for comparison (estimate based on trend)
  const previousRevenue = stats.revenueTrend !== 0 
    ? stats.totalRevenue / (1 + stats.revenueTrend / 100)
    : stats.totalRevenue;
  const previousTransactions = stats.transactionsTrend !== 0
    ? stats.totalTransactions / (1 + stats.transactionsTrend / 100)
    : stats.totalTransactions;

  // Get tab from URL for default tab
  const urlTab = searchParams.get('tab');
  const defaultTab = urlTab === 'comparatifs' ? 'comparatifs' : 'analyses';

  // Export PDF handler
  const handleExportPdf = async (options: { selectedCharts: string[]; selectedTables: string[]; orientation: "portrait" | "landscape" }) => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error(t('app:dashboard.export.noDateRange'));
      return;
    }

    toast.info(t('app:dashboard.export.generating'));

    try {
      await generateDashboardPdf({
        siteName: selectedSite?.name || t('app:dashboard.allSites'),
        dateRange: {
          from: dateRange.from,
          to: dateRange.to,
        },
        kpis: {
          totalRevenue: stats.totalRevenue,
          revenueByCard: stats.revenueByCard,
          revenueByCash: stats.revenueByCash,
          totalTransactions: stats.totalTransactions,
          averageBasket: stats.averageBasket,
          cardPercentage,
          cashPercentage,
        },
        monthlyData: stats.monthlyData,
        paymentData: stats.paymentData,
        machinePerformance: stats.machinePerformance.map(m => ({
          machine: m.name,
          revenue: m.revenue,
          transactions: m.cycles,
        })),
      }, options.selectedCharts, options.selectedTables, options.orientation);

      toast.success(t('app:dashboard.export.success'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('app:dashboard.export.error'));
    }
  };

  return (
    <>
      <SEOHead 
        title="Tableau de bord"
        description="Tableau de bord de gestion de votre laverie automatique. Suivez vos revenus, transactions et performances en temps réel."
        url="/dashboard"
        noindex={true}
      />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {/* Back to multi-sites button */}
            {isFromDrillDown && !siteWasInvalid && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReturnToMultiSites}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{t('app:dashboard.multiSiteView')}</span>
              </Button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
                {t('app:dashboard.title')}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('app:dashboard.subtitle')}
                {selectedSite && <span className="ml-1">• {selectedSite.name}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRecalculateAnalytics}
              disabled={isRecalculating || !selectedSite}
              className="gap-2"
            >
              {isRecalculating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{t('app:dashboard.analytics.refresh')}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPdfPreviewOpen(true)}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">{t('app:dashboard.export.button')}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setGoalsDialogOpen(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t('app:dashboard.objectives')}</span>
            </Button>
          </div>
        </div>
        <DateRangePicker 
          dateRange={dateRange}
          onDateChange={setDateRange}
        />
      </div>

      <GoalsConfigDialog 
        open={goalsDialogOpen} 
        onOpenChange={setGoalsDialogOpen}
        siteId={selectedSite?.id}
      />

      <PdfPreviewDialog
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        onConfirm={handleExportPdf}
      />

      <Tabs defaultValue={defaultTab === 'comparatifs' ? 'comparison' : 'overview'} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview">{t('app:dashboard.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="financial">{t('app:dashboard.tabs.financial')}</TabsTrigger>
          <TabsTrigger value="operations">{t('app:dashboard.tabs.operations')}</TabsTrigger>
          <TabsTrigger value="comparison">{t('app:dashboard.tabs.comparison')}</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards principales - Using RPC function */}
          <DashboardKPIGrid dateRange={dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined} />

          {/* Expert: Nouveaux KPIs Rentabilité */}
          {isExpert && stats.totalRevenue > 0 && (
            <ProfitabilityKPIs
              lostRevenue={0}
              avgRotation={stats.totalTransactions > 0 ? stats.totalTransactions / 30 : 0}
              peakSaturation={0}
              peakSlot="—"
            />
          )}

          {/* Expert: Objectifs et comparaisons rapides */}
          {isExpert && (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <MiniProgressCard 
                  title="Objectif mensuel" 
                  current={stats.totalRevenue} 
                  target={goals.monthly_revenue_goal} 
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <MiniProgressCard 
                  title="Cycles réalisés" 
                  current={stats.totalTransactions} 
                  target={goals.monthly_transactions_goal} 
                  unit="cycles"
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <ComparisonCard 
                  title="CA Période" 
                  current={formatCurrency(stats.totalRevenue)} 
                  previous={formatCurrency(previousRevenue)}
                  currentLabel="Actuel"
                  previousLabel="Précédent"
                  percentageChange={stats.revenueTrend}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <ComparisonCard 
                  title="Transactions" 
                  current={stats.totalTransactions.toString()} 
                  previous={Math.round(previousTransactions).toString()}
                  currentLabel="Actuel"
                  previousLabel="Précédent"
                  percentageChange={stats.transactionsTrend}
                />
              </motion.div>
            </motion.div>
          )}

          {/* Charts Row 1 */}
          <motion.div 
            data-tutorial="charts" 
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
          >
            <MonthlyRevenueChart startDate={dateRange?.from} endDate={dateRange?.to} />
            {isExpert && stats.dailyData.length > 0 && <DailyRevenueChart data={stats.dailyData} />}
          </motion.div>

          {/* Charts Row 2 */}
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
          >
            <PaymentPieChart data={stats.paymentData} />
            {isExpert && <WeekdayPerformanceChart data={stats.weekdayData} />}
          </motion.div>

          {/* Expert: Heatmap */}
          {isExpert && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
            >
              <SalesHeatmap data={stats.heatmapData} />
            </motion.div>
          )}
        </TabsContent>

        {/* Financier */}
        <TabsContent value="financial" className="space-y-6">
          <KPISection title="Performance financière" icon={Euro}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <KPICard
                title="CA Total"
                value={formatCurrency(stats.totalRevenue)}
                icon={Euro}
                variant="primary"
                trend={stats.revenueTrend !== 0 ? { value: Math.abs(stats.revenueTrend), isPositive: stats.revenueTrend > 0 } : undefined}
              />
              <KPICard
                title="CA/Machine"
                value={stats.machinePerformance.length > 0 
                  ? formatCurrency(stats.totalRevenue / stats.machinePerformance.length)
                  : "—"}
                icon={WashingMachine}
                subtitle={stats.machinePerformance.length > 0 
                  ? `Moy. ${stats.machinePerformance.length} machines`
                  : ""}
              />
              <KPICard
                title="CA/Jour"
                value={formatCurrency(stats.totalRevenue / 30)}
                icon={Clock}
                subtitle="Moyenne"
              />
              <KPICard
                title="Panier moyen"
                value={`${stats.averageBasket.toFixed(2)} €`}
                icon={ShoppingCart}
              />
              <KPICard
                title="CA CB"
                value={formatCurrency(stats.revenueByCard)}
                icon={CreditCard}
                subtitle={`${cardPercentage}%`}
              />
              <KPICard
                title="Marge brute"
                value={stats.totalRevenue > 0 && profitabilityMetrics.estimated_profit_month !== undefined
                  ? `${Math.round((profitabilityMetrics.estimated_profit_month / stats.totalRevenue) * 100)}%`
                  : "—"}
                icon={Percent}
                variant={profitabilityMetrics.estimated_profit_month > 0 ? "success" : "default"}
              />
            </div>
          </KPISection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MiniProgressCard 
              title="Objectif CA mensuel" 
              current={stats.totalRevenue} 
              target={goals.monthly_revenue_goal} 
            />
            <MiniProgressCard 
              title="Objectif CA annuel" 
              current={stats.totalRevenue * 12} 
              target={goals.annual_revenue_goal} 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <MonthlyRevenueChart />
            <YearComparisonChart />
          </div>

          <PaymentPieChart data={stats.paymentData} />

          {/* Section Rentabilité */}
          <ProfitabilitySection 
            metrics={profitabilityMetrics}
            costs={defaultCosts}
          />

          {stats.machinePerformance.length > 0 && (
            <MachinePerformanceTable machines={stats.machinePerformance} />
          )}
        </TabsContent>

        {/* Opérations */}
        <TabsContent value="operations" className="space-y-6">
          <KPISection title="Performance opérationnelle" icon={WashingMachine}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <KPICard
                title="Taux occupation"
                value="—"
                icon={Percent}
                variant="default"
                subtitle="Données insuffisantes"
              />
              <KPICard
                title="Cycles/jour"
                value={(stats.totalTransactions / 30).toFixed(1)}
                icon={Clock}
              />
              <KPICard
                title="Temps moyen cycle"
                value="—"
                icon={Clock}
                subtitle="Non disponible"
              />
              <KPICard
                title="Machines actives"
                value={stats.machinePerformance.length > 0 
                  ? `${stats.machinePerformance.length}`
                  : "—"}
                icon={WashingMachine}
                variant="success"
              />
              <KPICard
                title="Heure pointe"
                value="—"
                icon={TrendingUp}
                subtitle="À calculer"
              />
              <KPICard
                title="Disponibilité"
                value="—"
                icon={Percent}
                subtitle="Non disponible"
              />
            </div>
          </KPISection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeekdayPerformanceChart data={stats.weekdayData} />
            {stats.machinePerformance.length > 0 && (
              <MachinePerformanceTable machines={stats.machinePerformance} />
            )}
          </div>

          <SalesHeatmap data={stats.heatmapData} />
        </TabsContent>

        {/* Comparatifs */}
        <TabsContent value="comparison" className="space-y-6">
          {/* KPIs comparatifs du site actuel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ComparisonCard 
              title="CA Période" 
              current={formatCurrency(stats.totalRevenue)} 
              previous={formatCurrency(previousRevenue)}
              currentLabel="Actuel"
              previousLabel="Précédent"
              percentageChange={stats.revenueTrend}
            />
            <ComparisonCard 
              title="Transactions" 
              current={stats.totalTransactions.toString()} 
              previous={Math.round(previousTransactions).toString()}
              currentLabel="Actuel"
              previousLabel="Précédent"
              percentageChange={stats.transactionsTrend}
            />
            <ComparisonCard 
              title="Panier moyen" 
              current={`${stats.averageBasket.toFixed(2)} €`} 
              previous="—"
              currentLabel="Actuel"
              previousLabel="Précédent"
              percentageChange={0}
            />
            <ComparisonCard 
              title="CA CB" 
              current={formatCurrency(stats.revenueByCard)} 
              previous="—"
              currentLabel="Actuel"
              previousLabel="Précédent"
              percentageChange={0}
            />
          </div>

          {/* Section comparaison multi-sites */}
          <SiteComparisonSection dateRange={dateRange} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonthlyRevenueChart />
            <WeekdayPerformanceChart data={stats.weekdayData} />
          </div>

          {stats.machinePerformance.length > 0 && (
            <MachinePerformanceTable machines={stats.machinePerformance} />
          )}
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
