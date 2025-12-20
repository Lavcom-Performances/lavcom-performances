import { useState } from "react";
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
import { generateRecommendationsReport, getRecommendationsData } from "@/utils/recommendationsPdfExport";
import { generateMarketingRecommendations, getMockAnalyticsData } from "@/utils/marketingRecommendations";
import { trackPdfDownload } from "@/lib/analytics";
import type { Recommendation } from "@/types/recommendations";

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
}

function InsightCard({ title, description, type, icon: Icon, metric, financialImpact, effort }: InsightCardProps) {
  // Couleurs Lavcom exactes du logo
  // Vert lime (#A5C800) = point fort (success)
  // Jaune/Or (#FCD259) = problème (warning)
  // Cyan/Teal (#6DBFB8) = opportunité (info/action)
  
  const borderColors = {
    success: "border-l-[#A5C800]",      // Vert Lavcom - point fort
    warning: "border-l-[#FCD259]",       // Jaune Lavcom - problème
    info: "border-l-[#6DBFB8]",          // Cyan Lavcom - opportunité
    action: "border-l-[#6DBFB8]",        // Cyan Lavcom - opportunité
  };

  const iconColors = {
    success: "text-[#A5C800]",
    warning: "text-[#FCD259]",
    info: "text-[#6DBFB8]",
    action: "text-[#6DBFB8]",
  };

  const metricColors = {
    success: "text-[#A5C800]",
    warning: "text-[#d4a843]",           // Jaune plus foncé pour lisibilité
    info: "text-[#6DBFB8]",
    action: "text-[#6DBFB8]",
  };

  const effortConfig = {
    low: { 
      label: "Faible", 
      className: "bg-[#A5C800] text-white hover:bg-[#A5C800] border-0" 
    },
    medium: { 
      label: "Moyen", 
      className: "bg-[#FCD259] text-gray-800 hover:bg-[#FCD259] border-0" 
    },
    high: { 
      label: "Fort", 
      className: "bg-red-500 text-white hover:bg-red-500 border-0" 
    },
  };


  return (
    <Card className={`border-l-4 ${borderColors[type]} bg-card hover:shadow-md transition-shadow h-full flex flex-col`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={`h-5 w-5 shrink-0 ${iconColors[type]}`} />
            <CardTitle className="text-base font-semibold text-foreground truncate">{title}</CardTitle>
          </div>
          {metric && (
            <span className={`text-lg font-bold shrink-0 ${metricColors[type]}`}>{metric}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        {/* Description avec flex-grow pour pousser le footer en bas */}
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">{description}</p>
        
        {/* Impact financier et Effort - Toujours aligné en bas */}
        {(financialImpact !== undefined || effort) && (
          <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t border-border">
            {financialImpact !== undefined && (
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Impact estimé
                </span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-md">
                  <Euro className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    +{financialImpact} €/mois
                  </span>
                </div>
              </div>
            )}
            {effort && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Effort
                </span>
                <Badge className={`${effortConfig[effort].className} text-xs px-3 py-1`}>
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

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = getRecommendationsData();
      generateRecommendationsReport(data);
      trackPdfDownload('recommendations');
      toast({
        title: "PDF généré avec succès",
        description: "Le rapport a été téléchargé.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Ces insights seraient générés dynamiquement à partir des données réelles
  const performanceInsights = [
    {
      title: "Baisse du CA annuel",
      description: "Le CA 2025 est en baisse de 27% par rapport à 2024. Analysez les causes : concurrence, saisonnalité, problèmes techniques ?",
      type: "warning" as const,
      icon: TrendingDown,
      metric: "-27%",
      financialImpact: 2500,
      effort: "high" as EffortLevel,
    },
    {
      title: "Sèche-linge 2 sous-performant",
      description: "Le sèche-linge 2 génère seulement 219€ (3.8% du CA machines) contre 1606€ pour le sèche-linge 1. Vérifiez son état de fonctionnement.",
      type: "warning" as const,
      icon: AlertTriangle,
      metric: "219€",
      financialImpact: 146,
      effort: "medium" as EffortLevel,
    },
    {
      title: "Dimanche meilleur jour",
      description: "Le dimanche représente 21% de l'activité hebdomadaire avec 2443 cycles. Assurez-vous d'avoir suffisamment de produits et machines disponibles.",
      type: "success" as const,
      icon: TrendingUp,
      metric: "21%",
      financialImpact: 85,
      effort: "low" as EffortLevel,
    },
  ];

  const optimizationInsights = [
    {
      title: "Pic d'affluence 16h-19h",
      description: "La tranche 16h-19h concentre 25% des cycles. Envisagez une tarification dynamique ou des promotions sur les heures creuses (7h-9h).",
      type: "action" as const,
      icon: Clock,
      metric: "25%",
      financialImpact: 320,
      effort: "medium" as EffortLevel,
    },
    {
      title: "Heures creuses à exploiter",
      description: "Les tranches 7h-8h ne représentent que 4% de l'activité. Proposez des réductions matinales pour lisser la fréquentation.",
      type: "info" as const,
      icon: Lightbulb,
      metric: "4%",
      financialImpact: 180,
      effort: "low" as EffortLevel,
    },
    {
      title: "CB majoritaire",
      description: "81% des paiements sont en CB. Maintenez vos terminaux en parfait état et envisagez le paiement mobile.",
      type: "success" as const,
      icon: Zap,
      metric: "81%",
      financialImpact: 50,
      effort: "low" as EffortLevel,
    },
  ];

  const actionItems = [
    {
      title: "Diagnostic sèche-linge 2",
      description: "Programmer une maintenance préventive et vérifier les temps de cycle. L'écart de performance avec le sèche-linge 1 est anormal.",
      type: "action" as const,
      icon: Target,
      financialImpact: 146,
      effort: "medium" as EffortLevel,
    },
    {
      title: "Campagne heures creuses",
      description: "Lancer une offre -20% sur les cycles avant 10h pour augmenter la fréquentation matinale et désengorger les pics.",
      type: "action" as const,
      icon: Calendar,
      financialImpact: 250,
      effort: "low" as EffortLevel,
    },
    {
      title: "Analyse concurrence",
      description: "La baisse de CA en 2025 nécessite une étude de marché. Vérifiez les ouvertures de laveries dans le quartier.",
      type: "action" as const,
      icon: Lightbulb,
      financialImpact: 500,
      effort: "high" as EffortLevel,
    },
  ];

  // Generate marketing recommendations from analytics data
  const analyticsData = getMockAnalyticsData();
  const marketingRecommendations = generateMarketingRecommendations(analyticsData);

  // Convert marketing recommendations to InsightCard format with specific icons
  const marketingInsights = marketingRecommendations.map((reco: Recommendation) => ({
    title: reco.title,
    description: reco.description,
    type: "info" as const,
    icon: getMarketingIcon(reco.id),
    financialImpact: reco.impactEstimate ? parseInt(reco.impactEstimate.replace(/[^\d]/g, "")) : undefined,
    effort: (reco.difficulty === "Faible" ? "low" : reco.difficulty === "Moyen" ? "medium" : "high") as EffortLevel,
  }));

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Recommandations
          </h1>
          <p className="text-muted-foreground">
            Insights et actions recommandées basées sur vos données
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
              Génération...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Télécharger PDF
            </>
          )}
        </Button>
      </div>

      {/* Légende des couleurs */}
      <div className="flex flex-wrap items-center gap-6 p-4 bg-muted/50 rounded-lg border border-border">
        <span className="text-sm font-medium text-muted-foreground">Légende :</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-[#A5C800]" />
          <span className="text-sm text-foreground">Point fort</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-[#FCD259]" />
          <span className="text-sm text-foreground">Problème à traiter</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-[#6DBFB8]" />
          <span className="text-sm text-foreground">Opportunité</span>
        </div>
      </div>

      {/* Performance Insights */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Analyse de Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {performanceInsights.map((insight, index) => (
            <InsightCard key={index} {...insight} />
          ))}
        </div>
      </section>

      {/* Optimization Insights */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Opportunités d'Optimisation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {optimizationInsights.map((insight, index) => (
            <InsightCard key={index} {...insight} />
          ))}
        </div>
      </section>

      {/* Action Items */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Actions Recommandées
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actionItems.map((item, index) => (
            <InsightCard key={index} {...item} />
          ))}
        </div>
      </section>

      {/* Marketing Recommendations Section */}
      {marketingInsights.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Idées Communication & Marketing
          </h2>
          <p className="text-sm text-muted-foreground">
            Ces idées sont générées automatiquement à partir des chiffres de votre laverie 
            (fréquentation, répartition du chiffre d'affaires, machines moins utilisées…). 
            Ce ne sont pas des obligations, mais des pistes simples à tester sur un mois. 
            Adaptez-les à votre quartier, votre clientèle et vos moyens.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketingInsights.map((insight, index) => (
              <InsightCard key={index} {...insight} />
            ))}
          </div>
        </section>
      )}

      {/* Summary KPIs */}
      <section className="kpi-card">
        <h3 className="font-display font-semibold text-lg mb-4">Résumé des Indicateurs Clés</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">64 121€</p>
            <p className="text-sm text-muted-foreground">CA 2025 (11 mois)</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">-27%</p>
            <p className="text-sm text-muted-foreground">vs 2024</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">18h</p>
            <p className="text-sm text-muted-foreground">Heure de pointe</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">Dimanche</p>
            <p className="text-sm text-muted-foreground">Jour le plus actif</p>
          </div>
        </div>
      </section>
    </div>
  );
}
