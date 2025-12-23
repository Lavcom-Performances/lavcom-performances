import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import html2canvas from "html2canvas";
import { FileDown, Loader2, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

interface ChartPreview {
  id: string;
  selector: string;
  title: string;
  imageData: string | null;
}

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedCharts: string[]) => void;
}

const CHART_CONFIGS = [
  { id: "monthly-revenue", selector: '[data-pdf-chart="monthly-revenue"]', title: "Évolution mensuelle du CA" },
  { id: "payment-pie", selector: '[data-pdf-chart="payment-pie"]', title: "Répartition par mode de paiement" },
  { id: "weekday-performance", selector: '[data-pdf-chart="weekday-performance"]', title: "CA par jour de la semaine" },
  { id: "sales-heatmap", selector: '[data-pdf-chart="sales-heatmap"]', title: "Heatmap des cycles" },
];

const STORAGE_KEY = "pdf-export-chart-preferences";

export function PdfPreviewDialog({ open, onOpenChange, onConfirm }: PdfPreviewDialogProps) {
  const { t } = useTranslation(['app']);
  const [previews, setPreviews] = useState<ChartPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);

  // Load saved preferences from localStorage
  const loadSavedPreferences = (): string[] | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  // Save preferences to localStorage
  const savePreferences = (chartIds: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chartIds));
    } catch {
      // Silently fail if localStorage is not available
    }
  };

  useEffect(() => {
    if (open) {
      captureCharts();
    } else {
      setPreviews([]);
      setIsLoading(true);
    }
  }, [open]);

  const captureCharts = async () => {
    setIsLoading(true);
    const newPreviews: ChartPreview[] = [];
    const availableIds: string[] = [];

    for (const config of CHART_CONFIGS) {
      const element = document.querySelector(config.selector) as HTMLElement;
      let imageData: string | null = null;

      if (element) {
        try {
          const canvas = await html2canvas(element, {
            backgroundColor: "#ffffff",
            scale: 1.5,
            logging: false,
            useCORS: true,
          });
          imageData = canvas.toDataURL("image/png");
          availableIds.push(config.id);
        } catch (error) {
          console.error(`Failed to capture ${config.selector}:`, error);
        }
      }

      newPreviews.push({
        id: config.id,
        selector: config.selector,
        title: config.title,
        imageData,
      });
    }

    setPreviews(newPreviews);
    
    // Use saved preferences if available, otherwise select all available charts
    const savedPreferences = loadSavedPreferences();
    if (savedPreferences) {
      // Only keep saved preferences that are actually available
      const validSavedPrefs = savedPreferences.filter(id => availableIds.includes(id));
      setSelectedCharts(validSavedPrefs.length > 0 ? validSavedPrefs : availableIds);
    } else {
      setSelectedCharts(availableIds);
    }
    
    setIsLoading(false);
  };

  const handleToggleChart = (chartId: string) => {
    setSelectedCharts(prev => 
      prev.includes(chartId)
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    );
  };

  const handleSelectAll = () => {
    const availableIds = previews.filter(p => p.imageData !== null).map(p => p.id);
    setSelectedCharts(availableIds);
  };

  const handleDeselectAll = () => {
    setSelectedCharts([]);
  };

  const handleConfirm = async () => {
    setIsExporting(true);
    try {
      // Save preferences before exporting
      savePreferences(selectedCharts);
      await onConfirm(selectedCharts);
    } finally {
      setIsExporting(false);
      onOpenChange(false);
    }
  };

  const availableCharts = previews.filter(p => p.imageData !== null);
  const selectedCount = selectedCharts.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('app:dashboard.export.previewTitle', 'Aperçu du rapport PDF')}
          </DialogTitle>
          <DialogDescription>
            {t('app:dashboard.export.previewDescription', 'Sélectionnez les graphiques à inclure dans le rapport.')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* KPIs info */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-semibold text-sm mb-2">
                {t('app:dashboard.export.kpisIncluded', 'Indicateurs clés inclus')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('app:dashboard.export.kpisDescription', 'CA Total, CA Carte, CA Espèces, Transactions, Panier moyen, CA/Jour')}
              </p>
            </div>

            {/* Charts selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">
                  {t('app:dashboard.export.chartsIncluded', 'Graphiques')} 
                  {!isLoading && ` (${selectedCount}/${availableCharts.length} ${t('app:dashboard.export.selected', 'sélectionnés')})`}
                </h4>
                {!isLoading && availableCharts.length > 0 && (
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSelectAll}
                      className="text-xs h-7"
                    >
                      {t('app:dashboard.export.selectAll', 'Tout sélectionner')}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleDeselectAll}
                      className="text-xs h-7"
                    >
                      {t('app:dashboard.export.deselectAll', 'Tout désélectionner')}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-32 w-full rounded-lg" />
                    </div>
                  ))
                ) : (
                  previews.map((preview) => (
                    <div key={preview.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        {preview.imageData && (
                          <Checkbox
                            id={`chart-${preview.id}`}
                            checked={selectedCharts.includes(preview.id)}
                            onCheckedChange={() => handleToggleChart(preview.id)}
                          />
                        )}
                        <label 
                          htmlFor={`chart-${preview.id}`}
                          className="text-xs font-medium text-muted-foreground truncate cursor-pointer"
                        >
                          {preview.title}
                        </label>
                      </div>
                      {preview.imageData ? (
                        <div 
                          className={`relative rounded-lg border overflow-hidden bg-white transition-opacity cursor-pointer ${
                            selectedCharts.includes(preview.id) ? 'opacity-100' : 'opacity-40'
                          }`}
                          onClick={() => handleToggleChart(preview.id)}
                        >
                          <img
                            src={preview.imageData}
                            alt={preview.title}
                            className="w-full h-32 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-32 rounded-lg border border-dashed flex items-center justify-center bg-muted/30">
                          <p className="text-xs text-muted-foreground text-center px-2">
                            {t('app:dashboard.export.chartNotAvailable', 'Non disponible')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tables info */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-semibold text-sm mb-2">
                {t('app:dashboard.export.tablesIncluded', 'Tableaux inclus')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('app:dashboard.export.tablesDescription', 'Données mensuelles, Détail des paiements, Performance par machine')}
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            {t('common:cancel', 'Annuler')}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || isExporting} className="gap-2">
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('app:dashboard.export.generating', 'Génération...')}
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                {t('app:dashboard.export.confirmExport', 'Générer le PDF')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
