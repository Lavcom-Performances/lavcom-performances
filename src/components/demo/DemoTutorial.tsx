import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Calendar, 
  Sparkles,
  Check,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TutorialStep {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    icon: <Sparkles className="h-6 w-6" />,
    titleKey: "app:demo.tutorial.steps.welcome.title",
    descriptionKey: "app:demo.tutorial.steps.welcome.description",
  },
  {
    id: "kpis",
    icon: <TrendingUp className="h-6 w-6" />,
    titleKey: "app:demo.tutorial.steps.kpis.title",
    descriptionKey: "app:demo.tutorial.steps.kpis.description",
  },
  {
    id: "charts",
    icon: <BarChart3 className="h-6 w-6" />,
    titleKey: "app:demo.tutorial.steps.charts.title",
    descriptionKey: "app:demo.tutorial.steps.charts.description",
  },
  {
    id: "dateRange",
    icon: <Calendar className="h-6 w-6" />,
    titleKey: "app:demo.tutorial.steps.dateRange.title",
    descriptionKey: "app:demo.tutorial.steps.dateRange.description",
  },
  {
    id: "explore",
    icon: <PieChart className="h-6 w-6" />,
    titleKey: "app:demo.tutorial.steps.explore.title",
    descriptionKey: "app:demo.tutorial.steps.explore.description",
  },
];

interface DemoTutorialProps {
  onComplete?: () => void;
}

export function DemoTutorial({ onComplete }: DemoTutorialProps) {
  const { t } = useTranslation(['app']);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  // Check if user has seen the tutorial
  useEffect(() => {
    const seen = localStorage.getItem("demo-tutorial-seen");
    if (seen) {
      setHasSeenTutorial(true);
    } else {
      // Auto-open tutorial for first-time demo users
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("demo-tutorial-seen", "true");
    setHasSeenTutorial(true);
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  if (!isOpen) {
    // Show restart button if tutorial was seen
    if (hasSeenTutorial) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRestart}
          className="fixed bottom-4 right-4 z-50 bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/40 shadow-lg"
        >
          <Play className="h-4 w-4 mr-2" />
          {t('app:demo.tutorial.restart')}
        </Button>
      );
    }
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-fade-in"
        onClick={handleClose}
      />

      {/* Tutorial Card */}
      <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md p-0 overflow-hidden shadow-2xl border-amber-500/30 animate-scale-in">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-amber-500/20 p-6 pb-4 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Step indicator dots */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {tutorialSteps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  i === currentStep 
                    ? "w-6 bg-amber-500" 
                    : i < currentStep 
                      ? "bg-amber-500/60" 
                      : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
            {step.icon}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-4 text-center">
          <h3 className="text-xl font-bold text-foreground mb-2">
            {t(step.titleKey)}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            {t(step.descriptionKey)}
          </p>

          {/* Progress bar */}
          <div className="mb-4">
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {t('app:demo.tutorial.stepOf', { current: currentStep + 1, total: tutorialSteps.length })}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('app:demo.tutorial.previous')}
            </Button>

            <Button
              onClick={handleNext}
              className={cn(
                "flex-1",
                isLastStep 
                  ? "bg-amber-500 hover:bg-amber-600 text-white" 
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {isLastStep ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  {t('app:demo.tutorial.finish')}
                </>
              ) : (
                <>
                  {t('app:demo.tutorial.next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          {/* Skip link */}
          <button
            onClick={handleClose}
            className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('app:demo.tutorial.skip')}
          </button>
        </div>
      </Card>
    </>
  );
}
