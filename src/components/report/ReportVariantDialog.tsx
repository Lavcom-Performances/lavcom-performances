import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import { ReportVariant, REPORT_VARIANTS } from "@/types/report";

interface ReportVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (variant: ReportVariant) => void;
  isLoading?: boolean;
}

export function ReportVariantDialog({
  open,
  onOpenChange,
  onDownload,
  isLoading = false,
}: ReportVariantDialogProps) {
  const [selectedVariant, setSelectedVariant] = useState<ReportVariant>("full");

  const handleDownload = () => {
    onDownload(selectedVariant);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quel type de rapport souhaitez-vous télécharger ?
          </DialogTitle>
          <DialogDescription>
            Choisissez le format adapté à votre besoin
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedVariant}
            onValueChange={(value) => setSelectedVariant(value as ReportVariant)}
            className="space-y-3"
          >
            {REPORT_VARIANTS.map((variant) => (
              <div key={variant.value} className="flex items-start space-x-3">
                <RadioGroupItem
                  value={variant.value}
                  id={variant.value}
                  className="mt-1"
                />
                <Label
                  htmlFor={variant.value}
                  className="flex-1 cursor-pointer space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{variant.label}</span>
                    {variant.recommended && (
                      <Badge variant="secondary" className="text-xs">
                        recommandé
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    {variant.description}
                  </p>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* V2 Preparation - Customization link (disabled for now) */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground italic">
              Personnaliser les sections (bientôt disponible)
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button onClick={handleDownload} disabled={isLoading} className="gap-2">
            <Download className="h-4 w-4" />
            {isLoading ? "Génération..." : "Télécharger"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
