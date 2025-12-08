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
  BookOpen,
  ExternalLink
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Résumé du projet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-medium">{project.name || 'Non renseigné'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Localisation</p>
                <p className="font-medium">{project.location || 'Non renseignée'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <WashingMachine className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Configuration</p>
                <p className="font-medium">
                  {washersCount} lave-linge, {dryersCount} sèche-linge
                </p>
                <p className="text-xs text-muted-foreground">{totalMachines} machines au total</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calculator className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Surface</p>
                <p className="font-medium">{project.surface_m2 || 0} m²</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={() => onEditStep(1)}
            >
              Modifier les infos
            </Button>
          </CardContent>
        </Card>

        {/* Bloc 2 : Recettes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recettes estimées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={() => onEditStep(2)}
            >
              Modifier les machines
            </Button>
          </CardContent>
        </Card>

        {/* Bloc 3 : Rentabilité */}
        <Card className={isProfitable ? 'border-green-500/50' : 'border-destructive/50'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Rentabilité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => onEditStep(2)}
        >
          Modifier mes paramètres
        </Button>
        <Button 
          size="lg"
          onClick={handleDownloadPdf}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          Télécharger le rapport PDF
        </Button>
      </div>

      {/* CTA Premium */}
      <Card 
        className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 cursor-pointer hover:border-amber-500/50 transition-colors"
        onClick={() => window.location.href = '/subscribe-simulator'}
      >
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="p-3 rounded-full bg-amber-500/20">
              <MessageCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Envie d'un regard d'expert ?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Découvrez le Pack Premium : 1h de visio avec un expert en gestion de laverie pour affiner votre projet.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30 border-amber-500/30"
            >
              Voir les tarifs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Encart e-book */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="p-3 rounded-full bg-primary/20">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Aller plus loin : valider sérieusement votre projet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Cette simulation vous donne un ordre de grandeur financier. Pour analyser votre zone, 
                votre local et votre rentabilité de façon plus complète (étude de zone en 6 points, 
                grilles d'audit, budget CAPEX/OPEX, check-list "Prêt à ouvrir"…), consultez le guide :
              </p>
              <p className="text-sm font-medium text-primary mt-2">
                "Avant d'ouvrir : le guide du futur exploitant de laverie"
                <span className="text-muted-foreground font-normal"> – Collection Laverie Pro by Lavcom</span>
              </p>
            </div>
            <Button variant="outline" className="gap-2 shrink-0">
              <ExternalLink className="h-4 w-4" />
              Découvrir le guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
