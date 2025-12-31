import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { AlertTriangle, Settings, X, TrendingDown } from "lucide-react";
import { useProfitability } from "@/hooks/useProfitability";
import { DateRange } from "react-day-picker";

const LOCAL_STORAGE_KEY = "margin_alert_threshold";
const DISMISSED_KEY = "margin_alert_dismissed";

interface MarginAlertBannerProps {
  dateRange?: DateRange;
}

export function MarginAlertBanner({ dateRange }: MarginAlertBannerProps) {
  const { t } = useTranslation("app");
  const profitability = useProfitability(dateRange);
  
  const [threshold, setThreshold] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? parseFloat(saved) : 15;
  });
  
  const [tempThreshold, setTempThreshold] = useState<string>(threshold.toString());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, threshold.toString());
  }, [threshold]);

  useEffect(() => {
    setDismissed(false);
    localStorage.removeItem(DISMISSED_KEY);
  }, [profitability.profitMargin]);

  const handleSaveThreshold = () => {
    const value = parseFloat(tempThreshold);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      setThreshold(value);
      setDialogOpen(false);
      setDismissed(false);
      localStorage.removeItem(DISMISSED_KEY);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "true");
  };

  if (!profitability.hasCosts || profitability.isLoading || !profitability.hasData) {
    return null;
  }

  const isBelowThreshold = profitability.profitMargin < threshold;

  if (!isBelowThreshold || dismissed) {
    return (
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Settings className="h-4 w-4 mr-1" />
              {t("profitability.marginAlert.configure")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("profitability.marginAlert.settingsTitle")}</DialogTitle>
              <DialogDescription>
                {t("profitability.marginAlert.settingsDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="threshold">{t("profitability.marginAlert.thresholdLabel")}</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={tempThreshold}
                  onChange={(e) => setTempThreshold(e.target.value)}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t("profitability.marginAlert.currentMargin")}: 
                <span className={`font-medium ml-1 ${profitability.profitMargin >= threshold ? "text-green-600" : "text-amber-600"}`}>
                  {profitability.profitMargin.toFixed(1)}%
                </span>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveThreshold}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Alert variant="destructive" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          {t("profitability.marginAlert.title")}
        </span>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-amber-600 hover:text-amber-800">
                <Settings className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("profitability.marginAlert.settingsTitle")}</DialogTitle>
                <DialogDescription>
                  {t("profitability.marginAlert.settingsDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="threshold">{t("profitability.marginAlert.thresholdLabel")}</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="threshold"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={tempThreshold}
                    onChange={(e) => setTempThreshold(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveThreshold}>{t("common.save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-amber-600 hover:text-amber-800" onClick={handleDismiss}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        {t("profitability.marginAlert.description", { 
          current: profitability.profitMargin.toFixed(1),
          threshold: threshold.toFixed(0)
        })}
      </AlertDescription>
    </Alert>
  );
}
