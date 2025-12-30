import { FileSpreadsheet, Upload, CheckCircle2, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSites } from "@/hooks/useSites";

interface OnboardingStepImportProps {
  onNext: () => void;
  onNavigate: (path: string) => void;
}

export function OnboardingStepImport({ onNext, onNavigate }: OnboardingStepImportProps) {
  const { sites } = useSites();
  const hasLaundry = sites?.some(s => !s.is_demo);

  const steps = [
    {
      icon: FileText,
      title: "Exportez depuis votre centrale",
      description: "Téléchargez le fichier CSV depuis votre centrale de paiement (Nayax, LMPay, etc.)"
    },
    {
      icon: Upload,
      title: "Importez dans Lavcom",
      description: "Glissez-déposez votre fichier ou sélectionnez-le depuis votre ordinateur."
    },
    {
      icon: CheckCircle2,
      title: "Analysez automatiquement",
      description: "Lavcom détecte les colonnes et importe vos données en quelques secondes."
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5 mb-4">
          <FileSpreadsheet className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold font-display mb-2">
          Importez vos données
        </h2>
        <p className="text-muted-foreground">
          Importez l'historique de vos transactions pour analyser vos performances.
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-0.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {hasLaundry ? (
          <>
            <Button onClick={() => onNavigate('/operations')} className="flex-1">
              <Upload className="mr-2 h-4 w-4" />
              Importer maintenant
            </Button>
            <Button variant="outline" onClick={onNext} className="flex-1">
              Plus tard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex-1">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Info :</strong> Vous devez d'abord configurer une laverie avant d'importer des données.
              </p>
            </div>
            <Button variant="outline" onClick={onNext}>
              Continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
