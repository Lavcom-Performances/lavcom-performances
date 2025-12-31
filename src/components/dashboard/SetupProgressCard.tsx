import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { 
  Building2, 
  Upload, 
  Calculator, 
  Target, 
  User,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSetupProgress, SetupStep } from "@/hooks/useSetupProgress";

const iconMap = {
  building: Building2,
  upload: Upload,
  calculator: Calculator,
  target: Target,
  user: User,
};

function StepItem({ step, index }: { step: SetupStep; index: number }) {
  const navigate = useNavigate();
  const { t } = useTranslation("app");
  const Icon = iconMap[step.icon];

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => !step.completed && navigate(step.route)}
      disabled={step.completed}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-lg text-left transition-all",
        step.completed
          ? "bg-primary/10 cursor-default"
          : "hover:bg-muted/50 cursor-pointer group"
      )}
    >
      {/* Step indicator */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          step.completed
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
        )}
      >
        {step.completed ? (
          <Check className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            step.completed ? "text-primary" : "text-foreground"
          )}
        >
          {step.label}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {step.completed ? t("setupProgress.completed") : step.description}
        </p>
      </div>

      {/* Arrow for incomplete steps */}
      {!step.completed && (
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      )}
    </motion.button>
  );
}

export function SetupProgressCard() {
  const { t } = useTranslation("app");
  const { steps, completedCount, totalSteps, progressPercent, isComplete, isLoading } = useSetupProgress();
  const navigate = useNavigate();

  // Don't show if loading or complete
  if (isLoading || isComplete) {
    return null;
  }

  // Find next incomplete step
  const nextStep = steps.find(s => !s.completed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-lavcom p-4 sm:p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-foreground">
              {t("setupProgress.title")}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("setupProgress.stepsCompleted", { count: completedCount, total: totalSteps })}
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={progressPercent} className="h-2 mb-4" />

      {/* Steps list */}
      <div className="space-y-1 mb-4">
        {steps.map((step, index) => (
          <StepItem key={step.id} step={step} index={index} />
        ))}
      </div>

      {/* CTA for next step */}
      {nextStep && (
        <Button
          onClick={() => navigate(nextStep.route)}
          className="w-full gap-2"
        >
          {iconMap[nextStep.icon] && <Upload className="h-4 w-4" />}
          {nextStep.label}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
}
