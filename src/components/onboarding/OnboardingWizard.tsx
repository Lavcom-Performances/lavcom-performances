import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Building2, 
  FileSpreadsheet, 
  BarChart3, 
  ArrowRight, 
  ArrowLeft,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OnboardingStepWelcome } from "./steps/OnboardingStepWelcome";
import { OnboardingStepLaundry } from "./steps/OnboardingStepLaundry";
import { OnboardingStepImport } from "./steps/OnboardingStepImport";
import { OnboardingStepDashboard } from "./steps/OnboardingStepDashboard";

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  { id: "welcome", icon: Sparkles, label: "Bienvenue" },
  { id: "laundry", icon: Building2, label: "Laverie" },
  { id: "import", icon: FileSpreadsheet, label: "Import" },
  { id: "dashboard", icon: BarChart3, label: "Dashboard" },
];

export function OnboardingWizard({ open, onComplete, onSkip }: OnboardingWizardProps) {
  const { t } = useTranslation(['app']);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNavigateAndClose = (path: string) => {
    onComplete();
    navigate(path);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <OnboardingStepWelcome onNext={handleNext} />;
      case 1:
        return <OnboardingStepLaundry onNext={handleNext} onNavigate={handleNavigateAndClose} />;
      case 2:
        return <OnboardingStepImport onNext={handleNext} onNavigate={handleNavigateAndClose} />;
      case 3:
        return <OnboardingStepDashboard onComplete={onComplete} onNavigate={handleNavigateAndClose} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onSkip()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header with progress */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-4">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-display">
              {t('app:onboarding.title', 'Premiers pas')}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onSkip} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center justify-between mt-6 mb-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = completedSteps.has(index);

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-2 transition-all ${
                    isActive ? "scale-110" : ""
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isActive
                        ? "bg-primary/20 text-primary ring-2 ring-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <Progress value={progress} className="h-1 mt-4" />
        </div>

        {/* Step content */}
        <div className="p-6 min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation footer */}
        <div className="border-t bg-muted/30 p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Précédent
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onSkip}>
              Passer le tutoriel
            </Button>
            {currentStep < STEPS.length - 1 && (
              <Button onClick={handleNext}>
                Suivant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
