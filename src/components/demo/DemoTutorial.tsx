import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
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
  Play,
  Menu
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
  targetSelector?: string;
  position?: "center" | "top" | "bottom" | "left" | "right";
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    icon: <Sparkles className="h-6 w-6" />,
    titleKey: "app:demo.tutorial.steps.welcome.title",
    descriptionKey: "app:demo.tutorial.steps.welcome.description",
    position: "center",
  },
  {
    id: "kpis",
    icon: <TrendingUp className="h-6 w-6" />,
    titleKey: "app:demo.tutorial.steps.kpis.title",
    descriptionKey: "app:demo.tutorial.steps.kpis.description",
    targetSelector: "[data-tutorial='kpis']",
    position: "bottom",
  },
  {
    id: "charts",
    icon: <BarChart3 className="h-6 w-6" />,
    titleKey: "app:demo.tutorial.steps.charts.title",
    descriptionKey: "app:demo.tutorial.steps.charts.description",
    targetSelector: "[data-tutorial='charts']",
    position: "top",
  },
  {
    id: "dateRange",
    icon: <Calendar className="h-6 w-6" />,
    titleKey: "app:demo.tutorial.steps.dateRange.title",
    descriptionKey: "app:demo.tutorial.steps.dateRange.description",
    targetSelector: "[data-tutorial='date-range']",
    position: "bottom",
  },
  {
    id: "explore",
    icon: <Menu className="h-6 w-6" />,
    titleKey: "app:demo.tutorial.steps.explore.title",
    descriptionKey: "app:demo.tutorial.steps.explore.description",
    targetSelector: "[data-tutorial='sidebar']",
    position: "right",
  },
];

interface SpotlightProps {
  targetRect: DOMRect | null;
  isVisible: boolean;
}

function Spotlight({ targetRect, isVisible }: SpotlightProps) {
  if (!isVisible || !targetRect) return null;

  const padding = 8;
  const borderRadius = 12;

  return (
    <>
      {/* Spotlight cutout overlay */}
      <div className="fixed inset-0 z-[49] pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx={borderRadius}
                ry={borderRadius}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
            className="transition-all duration-500"
          />
        </svg>
      </div>

      {/* Animated ring around target */}
      <div
        className="fixed z-[49] pointer-events-none rounded-xl border-2 border-amber-500 animate-pulse"
        style={{
          left: targetRect.left - padding,
          top: targetRect.top - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          boxShadow: "0 0 0 4px rgba(245, 158, 11, 0.3), 0 0 20px rgba(245, 158, 11, 0.4)",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />

      {/* Pulsing glow effect */}
      <div
        className="fixed z-[48] pointer-events-none rounded-xl"
        style={{
          left: targetRect.left - padding - 4,
          top: targetRect.top - padding - 4,
          width: targetRect.width + padding * 2 + 8,
          height: targetRect.height + padding * 2 + 8,
          background: "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.15) 0%, transparent 70%)",
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </>
  );
}

interface DemoTutorialProps {
  onComplete?: () => void;
}

export function DemoTutorial({ onComplete }: DemoTutorialProps) {
  const { t } = useTranslation(['app']);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const isDashboard = location.pathname === "/dashboard";

  // Update target element position
  const updateTargetRect = useCallback(() => {
    const step = tutorialSteps[currentStep];
    if (step.targetSelector && isOpen) {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isOpen]);

  // Check if user has seen the tutorial
  useEffect(() => {
    const seen = localStorage.getItem("demo-tutorial-seen");
    if (seen) {
      setHasSeenTutorial(true);
    } else if (isDashboard) {
      // Auto-open tutorial for first-time demo users on dashboard
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isDashboard]);

  // Update target rect when step changes or on scroll/resize
  useEffect(() => {
    updateTargetRect();
    
    const handleUpdate = () => updateTargetRect();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    
    // Re-check periodically for dynamic content
    const interval = setInterval(handleUpdate, 500);
    
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      clearInterval(interval);
    };
  }, [updateTargetRect]);

  const handleClose = () => {
    setIsOpen(false);
    setTargetRect(null);
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
  const hasTarget = !!targetRect;

  // Calculate card position based on target
  const getCardPosition = () => {
    if (!targetRect || step.position === "center") {
      return "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
    }

    const cardWidth = 400;
    const cardHeight = 350;
    const margin = 24;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case "bottom":
        top = Math.min(targetRect.bottom + margin, viewportHeight - cardHeight - margin);
        left = Math.max(margin, Math.min(targetRect.left + targetRect.width / 2 - cardWidth / 2, viewportWidth - cardWidth - margin));
        break;
      case "top":
        top = Math.max(margin, targetRect.top - cardHeight - margin);
        left = Math.max(margin, Math.min(targetRect.left + targetRect.width / 2 - cardWidth / 2, viewportWidth - cardWidth - margin));
        break;
      case "right":
        top = Math.max(margin, Math.min(targetRect.top + targetRect.height / 2 - cardHeight / 2, viewportHeight - cardHeight - margin));
        left = Math.min(targetRect.right + margin, viewportWidth - cardWidth - margin);
        break;
      case "left":
        top = Math.max(margin, Math.min(targetRect.top + targetRect.height / 2 - cardHeight / 2, viewportHeight - cardHeight - margin));
        left = Math.max(margin, targetRect.left - cardWidth - margin);
        break;
    }

    return { top, left };
  };

  const cardPosition = getCardPosition();
  const isPositioned = typeof cardPosition === "object";

  if (!isOpen) {
    // Show restart button if tutorial was seen and on dashboard
    if (hasSeenTutorial && isDashboard) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRestart}
          className="fixed bottom-4 right-4 z-50 bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/40 shadow-lg backdrop-blur-sm"
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
      {/* Spotlight overlay for targeted elements */}
      <Spotlight targetRect={targetRect} isVisible={hasTarget} />

      {/* Simple backdrop for non-targeted steps */}
      {!hasTarget && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[49] animate-fade-in"
          onClick={handleClose}
        />
      )}

      {/* Click handler for spotlight area */}
      {hasTarget && (
        <div 
          className="fixed inset-0 z-[48]"
          onClick={handleClose}
        />
      )}

      {/* Tutorial Card */}
      <Card 
        className={cn(
          "fixed z-[51] w-[90vw] max-w-md p-0 overflow-hidden shadow-2xl border-amber-500/30",
          isPositioned ? "" : cardPosition
        )}
        style={isPositioned ? { 
          top: cardPosition.top, 
          left: cardPosition.left,
          transition: "top 0.5s cubic-bezier(0.4, 0, 0.2, 1), left 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
        } : undefined}
      >
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
                  "h-2 rounded-full transition-all duration-300",
                  i === currentStep 
                    ? "w-6 bg-amber-500" 
                    : i < currentStep 
                      ? "w-2 bg-amber-500/60" 
                      : "w-2 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {/* Icon with animation */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg animate-scale-in">
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
