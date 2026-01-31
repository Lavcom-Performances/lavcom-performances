import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb,
  Target,
  Clock,
  Calendar,
  Zap,
  Download,
  Loader2,
  Euro,
  Megaphone,
  Users,
  ShoppingCart,
  Sun,
  Heart,
  TrendingUp as TrendUp,
  Repeat,
  Crown,
  type LucideIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { useDateRange } from "@/hooks/useDateRange";
import { generateRecommendationsReport, getRecommendationsData } from "@/utils/recommendationsPdfExport";
import { generateMarketingRecommendations, getMockAnalyticsData } from "@/utils/marketingRecommendations";
import { trackPdfDownload } from "@/lib/analytics";
import type { Recommendation } from "@/types/recommendations";
import { SEOHead } from "@/components/seo/SEOHead";
import { useHasData } from "@/hooks/useHasData";
import { RecommendationsEmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

// Translation prefix for this page
const T_PREFIX = "profitability.recommendations";

// Map recommendation IDs to specific icons
const getMarketingIcon = (recoId: string): LucideIcon => {
  // Fidélisation
  if (recoId.includes("loyalty") || recoId.includes("frequency")) return Heart;
  if (recoId.includes("momentum") || recoId.includes("capitalize")) return TrendUp;
  
  // Panier moyen
  if (recoId.includes("basket") || recoId.includes("big-loads")) return ShoppingCart;
  if (recoId.includes("premium")) return Crown;
  
  // Saisonnalité
  if (recoId.includes("season") || recoId.includes("morning")) return Sun;
  if (recoId.includes("sunday") || recoId.includes("push")) return Calendar;
  
  // Visibilité / Communication
  if (recoId.includes("drop") || recoId.includes("visibility")) return Users;
  if (recoId.includes("card") || recoId.includes("promote")) return Zap;
  if (recoId.includes("highlight") || recoId.includes("dryer")) return Repeat;
  
  // Par défaut
  return Megaphone;
};

type EffortLevel = "low" | "medium" | "high";

interface InsightCardProps {
  title: string;
  description: string;
  type: "success" | "warning" | "info" | "action";
  icon: React.ElementType;
  metric?: string;
  financialImpact?: number;
  effort?: EffortLevel;
  t: (key: string) => string;
}

function InsightCard({ title, description, type, icon: Icon, metric, financialImpact, effort, t }: InsightCardProps) {
  // Couleurs Lavcom exactes du logo
  // Vert lime (#A5C800) = point fort (success)
  // Jaune/Or (#FCD259) = problème (warning)
  // Cyan/Teal (#6DBFB8) = opportunité (info/action)
  
  const borderColors = {
    success: "border-l-[#A5C800]",
    warning: "border-l-[#FCD259]",
    info: "border-l-[#6DBFB8]",
    action: "border-l-[#6DBFB8]",
  };

  const iconColors = {
    success: "text-[#A5C800]",
    warning: "text-[#FCD259]",
    info: "text-[#6DBFB8]",
    action: "text-[#6DBFB8]",
  };

  const metricColors = {
    success: "text-[#A5C800]",
    warning: "text-[#d4a843]",
    info: "text-[#6DBFB8]",
    action: "text-[#6DBFB8]",
  };

  const effortConfig = {
    low: { 
      label: t(`${T_PREFIX}.page.effortLow`), 
      className: "bg-[#A5C800] text-white hover:bg-[#A5C800] border-0" 
    },
    medium: { 
      label: t(`${T_PREFIX}.page.effortMedium`), 
      className: "bg-[#FCD259] text-gray-800 hover:bg-[#FCD259] border-0" 
    },
    high: { 
      label: t(`${T_PREFIX}.page.effortHigh`), 
      className: "bg-red-500 text-white hover:bg-red-500 border-0" 
    },
  };

  return (
    <Card className={`border-l-4 ${borderColors[type]} bg-card hover:shadow-md transition-shadow h-full flex flex-col overflow-hidden`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColors[type]}`} />
            <CardTitle className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{title}</CardTitle>
          </div>
          {metric && (
            <span className={`text-base font-bold shrink-0 ${metricColors[type]}`}>{metric}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 pt-0">
        <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-4">{description}</p>
        
        {(financialImpact !== undefined || effort) && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-border">
            {financialImpact !== undefined && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                  {t(`${T_PREFIX}.page.estimatedImpact`)}
                </span>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                  <Euro className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    +{financialImpact} {t(`${T_PREFIX}.page.perMonth`)}
                  </span>
                </div>
              </div>
            )}
            {effort && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                  {t(`${T_PREFIX}.page.effort`)}
                </span>
                <Badge className={`${effortConfig[effort].className} text-[10px] px-2 py-0.5 whitespace-nowrap`}>
                  {effortConfig[effort].label}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RecommendationsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { dateRange, setDateRange } = useDateRange();
  const { hasData, isLoading: dataLoading } = useHasData();
  const { t } = useTranslation("app");

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = getRecommendationsData();
      generateRecommendationsReport(data);
      trackPdfDownload('recommendations');
      toast({
        title: t("profitability.pdfExported"),
        description: t(`${T_PREFIX}.page.downloadPdf`),
      });
    } catch (error) {
      toast({
        title: t("errors.title"),
        description: t("errors.generic"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // These insights would be dynamically generated from real data
  const performanceInsights = [
    {
      title: t(`${T_PREFIX}.page.insights.annualDecline.title`),
      description: t(`${T_PREFIX}.page.insights.annualDecline.description`),
      type: "warning" as const,
      icon: TrendingDown,
      metric: "-27%",
      financialImpact: 2500,
      effort: "high" as EffortLevel,
    },
    {
      title: t(`${T_PREFIX}.page.insights.dryer2Underperforming.title`),
      description: t(`${T_PREFIX}.page.insights.dryer2Underperforming.description`),
      type: "warning" as const,
      icon: AlertTriangle,
      metric: "219€",
      financialImpact: 146,
      effort: "medium" as EffortLevel,
    },
    {
      title: t(`${T_PREFIX}.page.insights.sundayBest.title`),
      description: t(`${T_PREFIX}.page.insights.sundayBest.description`),
      type: "success" as const,
      icon: TrendingUp,
      metric: "21%",
      financialImpact: 85,
      effort: "low" as EffortLevel,
    },
  ];

  const optimizationInsights = [
    {
      title: t(`${T_PREFIX}.page.insights.peakHours.title`),
      description: t(`${T_PREFIX}.page.insights.peakHours.description`),
      type: "action" as const,
      icon: Clock,
      metric: "25%",
      financialImpact: 320,
      effort: "medium" as EffortLevel,
    },
    {
      title: t(`${T_PREFIX}.page.insights.offPeakHours.title`),
      description: t(`${T_PREFIX}.page.insights.offPeakHours.description`),
      type: "info" as const,
      icon: Lightbulb,
      metric: "4%",
      financialImpact: 180,
      effort: "low" as EffortLevel,
    },
    {
      title: t(`${T_PREFIX}.page.insights.cardMajority.title`),
      description: t(`${T_PREFIX}.page.insights.cardMajority.description`),
      type: "success" as const,
      icon: Zap,
      metric: "81%",
      financialImpact: 50,
      effort: "low" as EffortLevel,
    },
  ];

  const actionItems = [
    {
      title: t(`${T_PREFIX}.page.insights.dryer2Diagnostic.title`),
      description: t(`${T_PREFIX}.page.insights.dryer2Diagnostic.description`),
      type: "action" as const,
      icon: Target,
      financialImpact: 146,
      effort: "medium" as EffortLevel,
    },
    {
      title: t(`${T_PREFIX}.page.insights.offPeakCampaign.title`),
      description: t(`${T_PREFIX}.page.insights.offPeakCampaign.description`),
      type: "action" as const,
      icon: Calendar,
      financialImpact: 250,
      effort: "low" as EffortLevel,
    },
    {
      title: t(`${T_PREFIX}.page.insights.competitionAnalysis.title`),
      description: t(`${T_PREFIX}.page.insights.competitionAnalysis.description`),
      type: "action" as const,
      icon: Lightbulb,
      financialImpact: 500,
      effort: "high" as EffortLevel,
    },
  ];

  // Generate marketing recommendations from analytics data
  const analyticsData = getMockAnalyticsData();
  // Wrap t function to match TranslateFunction signature
  const translateFn = (key: string, options?: Record<string, unknown>) => String(t(key, options));
  const marketingRecommendations = generateMarketingRecommendations(analyticsData, translateFn);

  // Convert marketing recommendations to InsightCard format with specific icons
  const marketingInsights = marketingRecommendations.map((reco: Recommendation) => ({
    title: reco.title,
    description: reco.description,
    type: "info" as const,
    icon: getMarketingIcon(reco.id),
    financialImpact: reco.impactEstimate ? parseInt(reco.impactEstimate.replace(/[^\d]/g, "")) : undefined,
    effort: reco.difficulty || ("medium" as EffortLevel),
  }));

  // Loading state
  if (dataLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  // Empty state - no data imported
  if (!hasData) {
    return (
      <>
        <SEOHead 
          title={t(`${T_PREFIX}.title`)}
          description={t(`${T_PREFIX}.page.subtitle`)}
          url="/recommendations"
          noindex={true}
        />
        <div className="p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              {t(`${T_PREFIX}.title`)}
            </h1>
            <p className="text-muted-foreground">
              {t(`${T_PREFIX}.page.subtitle`)}
            </p>
          </div>
          <div className="card-lavcom">
            <RecommendationsEmptyState />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title={t(`${T_PREFIX}.title`)}
        description={t(`${T_PREFIX}.page.subtitle`)}
        url="/recommendations"
        noindex={true}
      />
      <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              {t(`${T_PREFIX}.title`)}
            </h1>
            <p className="text-muted-foreground">
              {t(`${T_PREFIX}.page.subtitle`)}
            </p>
          </div>
          <Button 
            onClick={handleExportPDF} 
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t(`${T_PREFIX}.page.generating`)}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t(`${T_PREFIX}.page.downloadPdf`)}
              </>
            )}
          </Button>
        </div>
        <DateRangePicker 
          dateRange={dateRange}
          onDateChange={setDateRange}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 p-4 bg-muted/50 rounded-lg border border-border">
        <span className="text-sm font-medium text-muted-foreground">{t(`${T_PREFIX}.page.legend`)} :</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-[#A5C800]" />
          <span className="text-sm text-foreground">{t(`${T_PREFIX}.page.legendStrength`)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-[#FCD259]" />
          <span className="text-sm text-foreground">{t(`${T_PREFIX}.page.legendProblem`)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-[#6DBFB8]" />
          <span className="text-sm text-foreground">{t(`${T_PREFIX}.page.legendOpportunity`)}</span>
        </div>
      </div>

      {/* Performance Insights */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t(`${T_PREFIX}.page.sections.performance`)}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {performanceInsights.map((insight, index) => (
            <InsightCard key={index} {...insight} t={t} />
          ))}
        </div>
      </section>

      {/* Optimization Insights */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          {t(`${T_PREFIX}.page.sections.optimization`)}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {optimizationInsights.map((insight, index) => (
            <InsightCard key={index} {...insight} t={t} />
          ))}
        </div>
      </section>

      {/* Action Items */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {t(`${T_PREFIX}.page.sections.actions`)}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actionItems.map((item, index) => (
            <InsightCard key={index} {...item} t={t} />
          ))}
        </div>
      </section>

      {/* Marketing Recommendations Section */}
      {marketingInsights.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {t(`${T_PREFIX}.page.sections.marketing`)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(`${T_PREFIX}.page.marketingIntro`)}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketingInsights.map((insight, index) => (
              <InsightCard key={index} {...insight} t={t} />
            ))}
          </div>
        </section>
      )}

      {/* Summary KPIs */}
      <section className="kpi-card">
        <h3 className="font-display font-semibold text-lg mb-4">{t(`${T_PREFIX}.page.summary.title`)}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">64 121€</p>
            <p className="text-sm text-muted-foreground">{t(`${T_PREFIX}.page.summary.revenue2025`)}</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">-27%</p>
            <p className="text-sm text-muted-foreground">{t(`${T_PREFIX}.page.summary.vsLastYear`)}</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">18h</p>
            <p className="text-sm text-muted-foreground">{t(`${T_PREFIX}.page.summary.peakHour`)}</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{t(`${T_PREFIX}.page.summary.sunday`)}</p>
            <p className="text-sm text-muted-foreground">{t(`${T_PREFIX}.page.summary.busiestDay`)}</p>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
