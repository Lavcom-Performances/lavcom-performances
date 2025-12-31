import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Upload, 
  BarChart3,
  X,
  ChevronLeft,
  ChevronRight,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tip: string;
}

const STEPS: TutorialStep[] = [
  {
    id: "site",
    title: "1. Créez votre laverie",
    description: "Commencez par ajouter votre premier site. Vous pouvez le faire depuis le menu Paramètres > Laverie.",
    icon: Building2,
    tip: "💡 Vous pouvez gérer plusieurs laveries avec un seul compte.",
  },
  {
    id: "import",
    title: "2. Importez vos données",
    description: "Téléversez un fichier CSV depuis votre logiciel de caisse. Accédez à Opérations et cliquez sur Importer.",
    icon: Upload,
    tip: "💡 Formats supportés : CSV avec colonnes Date, Machine, Montant.",
  },
  {
    id: "results",
    title: "3. Consultez vos résultats",
    description: "Vos indicateurs et recommandations apparaissent automatiquement dans le Tableau de bord.",
    icon: BarChart3,
    tip: "💡 Les graphiques se mettent à jour en temps réel après chaque import.",
  },
];

interface InteractiveTutorialProps {
  isActive: boolean;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onNeverShow: () => void;
}

export function InteractiveTutorial({
  isActive,
  currentStep,
  onNext,
  onPrev,
  onSkip,
  onNeverShow,
}: InteractiveTutorialProps) {
  if (!isActive) return null;

  const step = STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onSkip}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md bg-card rounded-2xl border shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onSkip}
            className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-muted transition-colors z-10"
            aria-label="Fermer"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Step indicator */}
          <div className="flex gap-1.5 px-6 pt-6">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  index <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {step.description}
                </p>

                {/* Tip */}
                <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  {step.tip}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer with navigation */}
          <div className="border-t bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              {/* Left side: Never show again */}
              <button
                onClick={onNeverShow}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <EyeOff className="h-3 w-3" />
                Ne plus afficher
              </button>

              {/* Right side: Navigation */}
              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPrev}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                )}
                
                <Button
                  size="sm"
                  onClick={onNext}
                  className="gap-1"
                >
                  {isLastStep ? (
                    "Terminer"
                  ) : (
                    <>
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
