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
  Euro
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { generateRecommendationsReport, getRecommendationsData } from "@/utils/recommendationsPdfExport";

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
  const colors = {
    success: "border-l-green-500 bg-green-500/10 dark:bg-green-500/20",
    warning: "border-l-amber-500 bg-amber-500/10 dark:bg-amber-500/20",
    info: "border-l-blue-500 bg-blue-500/10 dark:bg-blue-500/20",
    action: "border-l-primary bg-primary/10 dark:bg-primary/20",
  };

  const iconColors = {
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400",
    action: "text-primary",
  };

  const effortConfig = {
    low: { label: "Faible", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    medium: { label: "Moyen", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    high: { label: "Fort", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };

  return (
    <Card className={`border-l-4 ${colors[type]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${iconColors[type]}`} />
            <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
          </div>
          {metric && (
            <span className={`text-lg font-bold ${iconColors[type]}`}>{metric}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground/70">{description}</p>
        
        {/* Impact financier et Effort */}
        {(financialImpact !== undefined || effort) && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {financialImpact !== undefined && (
              <div className="flex items-center gap-1.5">
                <Euro className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  +{financialImpact} €/mois
                </span>
              </div>
            )}
            {effort && (
              <Badge className={effortConfig[effort].className}>
                Effort {effortConfig[effort].label}
              </Badge>
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
