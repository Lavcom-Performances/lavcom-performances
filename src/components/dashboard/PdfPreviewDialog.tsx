import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import html2canvas from "html2canvas";
import { FileDown, Loader2, Eye, FileText, RectangleVertical, RectangleHorizontal } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type PdfOrientation = "portrait" | "landscape";

interface ChartPreview {
  id: string;
  selector: string;
  title: string;
  imageData: string | null;
}

export interface PdfExportOptions {
  selectedCharts: string[];
  selectedTables: string[];
  orientation: PdfOrientation;
}

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: PdfExportOptions) => void;
}

const CHART_CONFIGS = [
  { id: "monthly-revenue", selector: '[data-pdf-chart="monthly-revenue"]', title: "Évolution mensuelle du CA" },
  { id: "payment-pie", selector: '[data-pdf-chart="payment-pie"]', title: "Répartition par mode de paiement" },
  { id: "weekday-performance", selector: '[data-pdf-chart="weekday-performance"]', title: "CA par jour de la semaine" },
  { id: "sales-heatmap", selector: '[data-pdf-chart="sales-heatmap"]', title: "Heatmap des cycles" },
];

const TABLE_CONFIGS = [
  { id: "monthly-data", title: "Données mensuelles détaillées" },
  { id: "payment-details", title: "Détail des paiements" },
  { id: "machine-performance", title: "Performance par machine" },
];

const STORAGE_KEY_CHARTS = "pdf-export-chart-preferences";
const STORAGE_KEY_TABLES = "pdf-export-table-preferences";
const STORAGE_KEY_ORIENTATION = "pdf-export-orientation";

export function PdfPreviewDialog({ open, onOpenChange, onConfirm }: PdfPreviewDialogProps) {
  const { t } = useTranslation(['app']);
  const [previews, setPreviews] = useState<ChartPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<PdfOrientation>("portrait");

  // Load saved preferences from localStorage
  const loadSavedChartPreferences = (): string[] | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHARTS);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const loadSavedTablePreferences = (): string[] | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TABLES);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const loadSavedOrientation = (): PdfOrientation | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ORIENTATION);
      return saved as PdfOrientation | null;
    } catch {
      return null;
    }
  };

  // Save preferences to localStorage
  const savePreferences = (chartIds: string[], tableIds: string[], orient: PdfOrientation) => {
    try {
      localStorage.setItem(STORAGE_KEY_CHARTS, JSON.stringify(chartIds));
      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(tableIds));
      localStorage.setItem(STORAGE_KEY_ORIENTATION, orient);
    } catch {
      // Silently fail if localStorage is not available
    }
  };

  useEffect(() => {
    if (open) {
      captureCharts();
      // Load table preferences
      const savedTablePrefs = loadSavedTablePreferences();
      setSelectedTables(savedTablePrefs || TABLE_CONFIGS.map(t => t.id));
      // Load orientation preference
      const savedOrientation = loadSavedOrientation();
      setOrientation(savedOrientation || "portrait");
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
    const savedPreferences = loadSavedChartPreferences();
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

  const handleToggleTable = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleSelectAll = () => {
    const availableIds = previews.filter(p => p.imageData !== null).map(p => p.id);
    setSelectedCharts(availableIds);
  };

  const handleDeselectAll = () => {
    setSelectedCharts([]);
  };

  const handleSelectAllTables = () => {
    setSelectedTables(TABLE_CONFIGS.map(t => t.id));
  };

  const handleDeselectAllTables = () => {
    setSelectedTables([]);
  };

  const handleConfirm = async () => {
    setIsExporting(true);
    try {
      // Save preferences before exporting
      savePreferences(selectedCharts, selectedTables, orientation);
      await onConfirm({ selectedCharts, selectedTables, orientation });
    } finally {
      setIsExporting(false);
      onOpenChange(false);
    }
  };

  const availableCharts = previews.filter(p => p.imageData !== null);
  const selectedChartCount = selectedCharts.length;
  const selectedTableCount = selectedTables.length;

  // Estimate PDF size based on selected elements
  // Base: ~50KB for header/KPIs, ~150KB per chart image, ~20KB per table
  const estimatePdfSize = () => {
    const baseSize = 50; // KB - header, KPIs, footer
    const chartSize = selectedChartCount * 150; // KB per chart
    const tableSize = selectedTableCount * 20; // KB per table
    return baseSize + chartSize + tableSize;
  };

  const estimatedSize = estimatePdfSize();
  const maxEstimatedSize = 50 + (4 * 150) + (3 * 20); // Max possible size
  const sizePercentage = (estimatedSize / maxEstimatedSize) * 100;

  const formatFileSize = (kb: number) => {
    if (kb >= 1024) {
      return `~${(kb / 1024).toFixed(1)} Mo`;
    }
    return `~${kb} Ko`;
  };
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
            {/* Orientation selection */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    {t('app:dashboard.export.orientation', 'Orientation')}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {orientation === "portrait" 
                      ? t('app:dashboard.export.portraitDesc', 'Format vertical, idéal pour les tableaux')
                      : t('app:dashboard.export.landscapeDesc', 'Format horizontal, idéal pour les graphiques')
                    }
                  </p>
                </div>
                <ToggleGroup 
                  type="single" 
                  value={orientation} 
                  onValueChange={(value) => value && setOrientation(value as PdfOrientation)}
                  className="border rounded-lg"
                >
                  <ToggleGroupItem value="portrait" aria-label="Portrait" className="gap-1.5 px-3">
                    <RectangleVertical className="h-4 w-4" />
                    <span className="text-xs hidden sm:inline">Portrait</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="landscape" aria-label="Paysage" className="gap-1.5 px-3">
                    <RectangleHorizontal className="h-4 w-4" />
                    <span className="text-xs hidden sm:inline">Paysage</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

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
                  {!isLoading && ` (${selectedChartCount}/${availableCharts.length} ${t('app:dashboard.export.selected', 'sélectionnés')})`}
                </h4>
                {!isLoading && availableCharts.length > 0 && (
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSelectAll}
                      className="text-xs h-7"
                    >
                      {t('app:dashboard.export.selectAll', 'Tout')}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleDeselectAll}
                      className="text-xs h-7"
                    >
                      {t('app:dashboard.export.deselectAll', 'Aucun')}
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

            {/* Tables selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">
                  {t('app:dashboard.export.tablesIncluded', 'Tableaux')} 
                  {` (${selectedTableCount}/${TABLE_CONFIGS.length} ${t('app:dashboard.export.selected', 'sélectionnés')})`}
                </h4>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSelectAllTables}
                    className="text-xs h-7"
                  >
                    {t('app:dashboard.export.selectAll', 'Tout')}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDeselectAllTables}
                    className="text-xs h-7"
                  >
                    {t('app:dashboard.export.deselectAll', 'Aucun')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {TABLE_CONFIGS.map((table) => (
                  <div 
                    key={table.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-opacity ${
                      selectedTables.includes(table.id) ? 'bg-muted/50 opacity-100' : 'opacity-50'
                    }`}
                    onClick={() => handleToggleTable(table.id)}
                  >
                    <Checkbox
                      id={`table-${table.id}`}
                      checked={selectedTables.includes(table.id)}
                      onCheckedChange={() => handleToggleTable(table.id)}
                    />
                    <label 
                      htmlFor={`table-${table.id}`}
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {table.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Size estimate */}
        {!isLoading && (
          <div className="flex items-center gap-3 flex-1 mr-4">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 max-w-[200px]">
              <Progress value={sizePercentage} className="h-2" />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatFileSize(estimatedSize)}
            </span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 shrink-0">
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
