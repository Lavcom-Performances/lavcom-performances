import { useState } from "react";
import { Download, Upload, FileText, Calendar, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateMonthlyReport, getMockMonthlyData } from "@/utils/pdfExport";
import { trackPdfDownload } from "@/lib/analytics";
import { toast } from "@/hooks/use-toast";
import { CSVImportDialog } from "@/components/operations/CSVImportDialog";
import { useCurrentUserPermissions } from "@/hooks/useCurrentUserPermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDemoContext } from "@/hooks/useDemoContext";
import { useTranslation } from "react-i18next";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const YEARS = [2024, 2025];

export default function ImportExport() {
  const { t } = useTranslation(['app']);
  const { canImport, canExport, permissions } = useCurrentUserPermissions();
  const { isInDemoMode, isFeatureDisabled } = useDemoContext();
  const [selectedMonth, setSelectedMonth] = useState<string>("Janvier");
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [isGenerating, setIsGenerating] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [lastImportCount, setLastImportCount] = useState<number | null>(null);

  const isImportDisabledByDemo = isFeatureDisabled('imports');
  const isExportDisabledByDemo = isFeatureDisabled('exports');

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      // Simulate loading for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const data = getMockMonthlyData(selectedMonth, selectedYear);
      generateMonthlyReport(data);
      trackPdfDownload('monthly_report');
      
      toast({
        title: "PDF généré avec succès",
        description: `Rapport CA ${selectedMonth} ${selectedYear} téléchargé.`,
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

  const handleImportComplete = (count: number) => {
    setLastImportCount(count);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
          Import / Export
        </h1>
        <p className="text-muted-foreground">
          Importez vos données CSV et exportez vos rapports mensuels
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Section */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Export PDF</CardTitle>
                <CardDescription>Générez un rapport mensuel au format PDF</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Mois</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Année</label>
                <Select 
                  value={selectedYear.toString()} 
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une année" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium">Aperçu du rapport</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Le PDF contiendra : résumé du CA, détail par machine, ventes journalières et KPIs.
              </p>
            </div>

            {isExportDisabledByDemo && (
              <Alert className="mb-4 border-primary/30 bg-primary/5">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary">
                  {t('app:demo.featureDisabled.description', 'Cette fonctionnalité n\'est pas disponible en mode démo.')}
                </AlertDescription>
              </Alert>
            )}
            {!canExport && !isExportDisabledByDemo && (
              <Alert className="mb-4">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Vous n'avez pas la permission d'exporter des données.
                </AlertDescription>
              </Alert>
            )}
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleExportPDF}
              disabled={isGenerating || !canExport || isExportDisabledByDemo}
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Génération en cours...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Télécharger le rapport {selectedMonth} {selectedYear}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card className="border-2 border-lavcom-green/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-lavcom-green/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-lavcom-green" />
              </div>
              <div>
                <CardTitle className="text-xl">Import CSV</CardTitle>
                <CardDescription>Importez vos données depuis un fichier CSV</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isImportDisabledByDemo && (
              <Alert className="border-primary/30 bg-primary/5">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary">
                  {t('app:demo.featureDisabled.description', 'Cette fonctionnalité n\'est pas disponible en mode démo.')}
                </AlertDescription>
              </Alert>
            )}
            {!canImport && !isImportDisabledByDemo ? (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Vous n'avez pas la permission d'importer des données.
                </AlertDescription>
              </Alert>
            ) : isImportDisabledByDemo ? null : (
              <>
                <div 
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-lavcom-green/50 transition-colors cursor-pointer"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Glissez-déposez votre fichier ici
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ou cliquez pour sélectionner (CSV)
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-lavcom-green" />
                    <span className="font-medium">Format attendu</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Formats supportés : Events, LM Control, ou CSV standard avec colonnes Date, Machine, Mode paiement, Montant.
                  </p>
                </div>

                <Button 
                  className="w-full bg-lavcom-green hover:bg-lavcom-green-dark text-white" 
                  size="lg"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Importer des données CSV
                </Button>

                {lastImportCount !== null && (
                  <p className="text-sm text-center text-muted-foreground">
                    Dernier import : {lastImportCount} opérations importées
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent exports */}
      <Card>
        <CardHeader>
          <CardTitle>Exports récents</CardTitle>
          <CardDescription>Historique de vos derniers exports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun export récent</p>
            <p className="text-sm">Vos exports apparaîtront ici</p>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}