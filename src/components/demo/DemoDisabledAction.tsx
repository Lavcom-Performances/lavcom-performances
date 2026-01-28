import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDemoContext, DemoDisabledFeature } from "@/hooks/useDemoContext";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoDisabledActionProps {
  feature: DemoDisabledFeature;
  children: ReactNode;
  className?: string;
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

/**
 * Wrapper component that disables actions in demo mode
 * Shows a tooltip explaining the action is unavailable
 */
export function DemoDisabledAction({
  feature,
  children,
  className,
  tooltipSide = "top",
}: DemoDisabledActionProps) {
  const { t } = useTranslation(['app']);
  const { isInDemoMode, isFeatureDisabled } = useDemoContext();

  const isDisabled = isFeatureDisabled(feature);

  if (!isInDemoMode || !isDisabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "relative cursor-not-allowed",
              className
            )}
          >
            {/* Overlay to capture clicks */}
            <div className="absolute inset-0 z-10" />
            
            {/* Dimmed children */}
            <div className="opacity-50 pointer-events-none select-none">
              {children}
            </div>
            
            {/* Lock icon badge */}
            <div className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
              <Lock className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="max-w-[200px]">
          <p className="text-sm font-medium">
            {t('app:demo.featureDisabled.title', 'Disponible après inscription')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('app:demo.featureDisabled.description', 'Cette fonctionnalité n\'est pas disponible en mode démo.')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface DemoDisabledButtonProps {
  feature: DemoDisabledFeature;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Button wrapper that shows demo-disabled state
 * Can be used inline with existing button logic
 */
export function useDemoDisabledButton(feature: DemoDisabledFeature) {
  const { isFeatureDisabled } = useDemoContext();
  const isDisabled = isFeatureDisabled(feature);

  return {
    isDisabledByDemo: isDisabled,
    demoProps: isDisabled ? {
      disabled: true,
      title: "Disponible après inscription",
    } : {},
  };
}
