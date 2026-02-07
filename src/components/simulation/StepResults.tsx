import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Building2, 
  MapPin, 
  WashingMachine, 
  Wind, 
  TrendingUp, 
  TrendingDown,
  Target,
  Calculator,
  FileDown,
  MessageCircle,
  AlertTriangle,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { 
  SimulationProject, 
  SimulationResults,
  calculateMaxMachinesEstimate,
  getTotalUserMachines,
  hasLargeWashers
} from "@/types/simulation";
import { generateSimulationReport } from "@/utils/simulationPdfExport";
import { toast } from "@/hooks/use-toast";
import ebookCover from "@/assets/ebook-avant-ouvrir.jpg";
import { trackEbookClick, trackPdfDownload } from "@/lib/analytics";

interface StepResultsProps {
  project: SimulationProject;
  results: SimulationResults;
  onEditStep: (step: number) => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export function StepResults({ project, results, onEditStep }: StepResultsProps) {
  const isProfitable = results.estimated_profit_month >= 0;
  
  const washersCount = project.machines.filter(m => m.type === 'washer').reduce((sum, m) => sum + m.count, 0);
  const dryersCount = project.machines.filter(m => m.type === 'dryer').reduce((sum, m) => sum + m.count, 0);
  const totalMachines = washersCount + dryersCount;

  // Calculs pour les avertissements
  const maxMachinesEstimate = calculateMaxMachinesEstimate(project);
  const userTotalMachines = getTotalUserMachines(project);
  const hasLargeWashersMachines = hasLargeWashers(project);
  
  // Conditions d'avertissement
  const showCapacityWarning = maxMachinesEstimate > 0 && userTotalMachines > maxMachinesEstimate;
  const showDoorWarning = project.door_width_cm && project.door_width_cm > 0 && 
    project.door_width_cm < 90 && 
    project.can_modify_facade === 'no' && 
    hasLargeWashersMachines;
  const showTechnicalWarning = project.technical_constraints_level === 'heavy_works';

  const handleDownloadPdf = () => {
    try {
      generateSimulationReport(project, results);
      trackPdfDownload('simulation');
      toast({
        title: "PDF généré",
        description: "Le rapport de simulation a été téléchargé.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Résultats de votre simulation</h2>
        <p className="text-muted-foreground mt-2">
          Synthèse complète de votre projet de laverie
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bloc 1 : Résumé projet */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Résumé du projet
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Nom</p>
                  <p className="font-medium">{project.name || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Localisation</p>
                  <p className="font-medium">{project.location || 'Non renseignée'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <WashingMachine className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Configuration</p>
                  <p className="font-medium">
                    {washersCount} lave-linge, {dryersCount} sèche-linge
                  </p>
                  <p className="text-xs text-muted-foreground">{totalMachines} machines au total</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calculator className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Surface</p>
                  <p className="font-medium">{project.surface_m2 || 0} m²</p>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={() => onEditStep(1)}
            >
              Modifier les infos
            </Button>
          </CardContent>
        </Card>

        {/* Bloc 2 : Recettes */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recettes estimées
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <WashingMachine className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">CA lavage</span>
                </div>
                <span className="font-semibold">{formatCurrency(results.total_wash_turnover_month)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">CA séchage</span>
                </div>
                <span className="font-semibold">{formatCurrency(results.total_dry_turnover_month)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                <span className="font-medium">CA total estimé</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(results.project_turnover_month)}</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">/ mois</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={() => onEditStep(2)}
            >
              Modifier les machines
            </Button>
          </CardContent>
        </Card>

        {/* Bloc 3 : Rentabilité */}
        <Card className={`flex flex-col ${isProfitable ? 'border-green-500/50' : 'border-destructive/50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Rentabilité
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Seuil de rentabilité</span>
                <span className="font-semibold">
                  {results.break_even_revenue_monthly 
                    ? formatCurrency(results.break_even_revenue_monthly)
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Cycles/jour nécessaires</span>
                <span className="font-semibold">
                  {results.break_even_cycles_day !== null 
                    ? `≈ ${results.break_even_cycles_day.toFixed(1)}`
                    : 'N/A'}
                </span>
              </div>
              
              <div className={`p-4 rounded-lg text-center ${
                isProfitable 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-destructive/10 border border-destructive/30'
              }`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isProfitable 
                    ? <TrendingUp className="h-5 w-5 text-green-600" />
                    : <TrendingDown className="h-5 w-5 text-destructive" />
                  }
                  <span className="font-medium">Résultat estimé</span>
                </div>
                <p className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(results.estimated_profit_month)}
                </p>
                <p className="text-xs text-muted-foreground">/ mois</p>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={() => onEditStep(3)}
            >
              Modifier les charges
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Message de conclusion */}
      <Card className={isProfitable 
        ? 'bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/30' 
        : 'bg-gradient-to-r from-destructive/10 to-destructive/5 border-destructive/30'
      }>
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            {isProfitable 
              ? <TrendingUp className="h-8 w-8 text-green-600 shrink-0" />
              : <TrendingDown className="h-8 w-8 text-destructive shrink-0" />
            }
            <div>
              <h3 className={`text-lg font-semibold ${isProfitable ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
                {isProfitable 
                  ? 'Projet au-dessus du seuil de rentabilité'
                  : 'Projet en dessous du seuil de rentabilité'
                }
              </h3>
              <p className="text-muted-foreground mt-1">
                {isProfitable 
                  ? `Avec ces hypothèses, votre projet génère un bénéfice estimé de ${formatCurrency(results.estimated_profit_month)} par mois, soit ${formatCurrency(results.estimated_profit_month * 12)} par an.`
                  : `Ajustez vos paramètres (loyer, prix des cycles, nombre de machines, fréquentation estimée...) pour améliorer la rentabilité de votre projet.`
                }
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Il vous faut environ <strong>{results.break_even_cycles_day?.toFixed(1) || 'N/A'} cycles/jour</strong> en moyenne pour couvrir vos charges.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avertissements */}
      {(showCapacityWarning || showDoorWarning || showTechnicalWarning) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Points d'attention
          </h3>
          
          {showCapacityWarning && (
            <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">Capacité du local à vérifier</AlertTitle>
              <AlertDescription className="text-amber-700/80 dark:text-amber-400/80">
                Selon la surface et la configuration indiquées, nous estimons qu'il sera difficile d'installer 
                plus de <strong>{maxMachinesEstimate} machines</strong>. Vous avez saisi <strong>{userTotalMachines} machines</strong>.
                <br />
                Utilisez cette simulation comme un ordre de grandeur et faites valider le dimensionnement par un installateur.
              </AlertDescription>
            </Alert>
          )}

          {showDoorWarning && (
            <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">Attention aux gros lave-linge</AlertTitle>
              <AlertDescription className="text-amber-700/80 dark:text-amber-400/80">
                Avec une porte inférieure à 90 cm et une façade non modifiable, l'installation de gros lave-linge 
                (18–20 kg) peut être complexe ou impossible.
                <br />
                Parlez-en avec votre installateur et prévoyez que le coût réel d'installation peut être plus élevé.
              </AlertDescription>
            </Alert>
          )}

          {showTechnicalWarning && (
            <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">Travaux techniques importants à prévoir</AlertTitle>
              <AlertDescription className="text-amber-700/80 dark:text-amber-400/80">
                Vous indiquez que des travaux significatifs sont nécessaires (électricité, évacuation, ventilation…).
                <br />
                Les montants réels d'investissement peuvent être nettement supérieurs à ceux de cette simulation.
                Faites valider ces points par un installateur et un artisan avant toute décision.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Action principale - Un seul bouton PDF */}
      <div className="flex justify-center pt-4">
        <Button 
          size="lg"
          onClick={handleDownloadPdf}
          className="gap-2 px-8"
        >
          <FileDown className="h-5 w-5" />
          Télécharger le rapport PDF complet
        </Button>
      </div>

      {/* CTA Premium */}
      <Card 
        className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/50 transition-colors"
      >
        <CardContent className="py-8 px-6">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="p-4 rounded-full bg-amber-500/20 shrink-0">
              <MessageCircle className="h-8 w-8 text-amber-600" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Envie d'un regard d'expert ?
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Découvrez le Pack Premium : bénéficiez d'1h de visio avec un expert en gestion de laverie 
                pour affiner votre projet et valider vos hypothèses.
              </p>
            </div>
            <Button 
              size="lg"
              className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
              onClick={() => window.location.href = '/subscribe-simulator'}
            >
              Voir les tarifs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Encart e-book avec image */}
      <Card className="overflow-hidden border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
        <div className="flex flex-col md:flex-row">
          {/* Image du guide */}
          <div className="md:w-56 lg:w-64 shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex items-center justify-center">
            <img 
              src={ebookCover} 
              alt="Guide Avant d'ouvrir - Le guide du futur exploitant de laverie"
              className="w-36 md:w-full max-w-[160px] md:max-w-none h-auto rounded-lg shadow-md group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          
          {/* Contenu */}
          <CardContent className="flex-1 py-8 px-6">
            <div className="flex flex-col h-full justify-between gap-5">
              <div className="space-y-3">
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 border-0">
                  +2 000 téléchargements
                </Badge>
                <h3 className="text-xl font-semibold text-foreground">
                  Avant d'ouvrir : le guide du futur exploitant
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Ne lancez pas votre projet sans ce guide. Étude de zone en 6 points, 
                  grilles d'audit local, budget CAPEX/OPEX détaillé, check-list "Prêt à ouvrir"… 
                  Tout ce que les banques et installateurs attendent de vous.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Button 
                  size="lg"
                  className="gap-2 group/btn"
                  onClick={() => {
                    trackEbookClick('simulation_results');
                    window.open('https://lavcom.fr/nos-ebooks-2/', '_blank');
                  }}
                >
                  Découvrir le guide
                  <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Collection Laverie Pro by Lavcom
                </span>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
