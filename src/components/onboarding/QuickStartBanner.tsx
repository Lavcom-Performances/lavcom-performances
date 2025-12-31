import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  CheckCircle2, 
  Circle, 
  Upload, 
  Building2, 
  BarChart3,
  Download,
  Sparkles,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
}

interface QuickStartBannerProps {
  hasSite: boolean;
  hasImport: boolean;
  hasData: boolean;
  onDismiss?: () => void;
}

export function QuickStartBanner({ 
  hasSite, 
  hasImport, 
  hasData,
  onDismiss,
}: QuickStartBannerProps) {
  const { t } = useTranslation(['app']);
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissed = localStorage.getItem("quickstart-dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  // Define steps with completion status
  const steps: OnboardingStep[] = [
    {
      id: "site",
      label: "Créer votre laverie",
      description: "Ajoutez votre premier site",
      icon: Building2,
      completed: hasSite,
    },
    {
      id: "import",
      label: "Importer vos données",
      description: "Chargez un fichier CSV",
      icon: Upload,
      completed: hasImport,
    },
    {
      id: "analytics",
      label: "Voir vos résultats",
      description: "Consultez vos indicateurs",
      icon: BarChart3,
      completed: hasData,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;
  const allCompleted = completedCount === steps.length;

  // Don't show if dismissed or all completed
  if (isDismissed || allCompleted) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("quickstart-dismissed", "true");
    onDismiss?.();
  };

  const handleImportClick = () => {
    navigate("/operations");
  };

  const handleDownloadSample = () => {
    // Create sample CSV content
    const sampleCsv = `Date,Heure,Machine,Montant,Mode de paiement
2024-01-15,09:30,Lave-linge 1,5.00,CB
2024-01-15,10:15,Sèche-linge 1,2.50,ESP
2024-01-15,11:00,Lave-linge 2,6.00,CB
2024-01-15,14:30,Lave-linge 1,5.00,ESP
2024-01-15,15:45,Sèche-linge 2,2.50,CB
2024-01-16,08:00,Lave-linge 3,7.00,CB
2024-01-16,09:30,Lave-linge 1,5.00,CB
2024-01-16,11:00,Sèche-linge 1,2.50,ESP`;

    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exemple-import-laverie.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 sm:p-6"
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="Fermer"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            Démarrage rapide
          </h3>
          <p className="text-sm text-muted-foreground">
            3 étapes pour obtenir vos premiers indicateurs
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Progression
          </span>
          <span className="text-sm font-semibold text-primary">
            {completedCount}/{steps.length}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Steps checklist */}
      <div className="space-y-3 mb-5">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors",
              step.completed ? "bg-primary/5" : "bg-muted/30"
            )}
          >
            {step.completed ? (
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <step.icon
              className={cn(
                "h-4 w-4 shrink-0",
                step.completed ? "text-primary" : "text-muted-foreground"
              )}
            />
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium truncate",
                  step.completed ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {step.description}
              </p>
            </div>
            {!step.completed && index === completedCount && (
              <ChevronRight className="h-4 w-4 text-primary shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleImportClick}
          className="gap-2 flex-1"
          size="lg"
        >
          <Upload className="h-4 w-4" />
          Importer mon CSV
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadSample}
          className="gap-2"
          size="lg"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Télécharger un</span> CSV exemple
        </Button>
      </div>
    </motion.div>
  );
}
