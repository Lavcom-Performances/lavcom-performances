/**
 * TAEX-301: DTS Score Visual Indicator
 * 
 * Displays Data Trust Score with color coding and optional details.
 */

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

interface DTSScoreIndicatorProps {
  score: number;
  /** Show as compact badge or full display */
  variant?: 'badge' | 'full';
  /** Show tooltip with explanation */
  showTooltip?: boolean;
  className?: string;
}

/**
 * Get color class based on DTS score
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get background color class based on DTS score
 */
function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

/**
 * Get icon based on DTS score
 */
function getScoreIcon(score: number) {
  if (score >= 80) return ShieldCheck;
  if (score >= 60) return ShieldQuestion;
  return ShieldAlert;
}

/**
 * Get label based on DTS score
 */
function getScoreLabel(score: number): string {
  if (score >= 80) return 'Données fiables';
  if (score >= 60) return 'Fiabilité modérée';
  return 'Fiabilité limitée';
}

/**
 * Get tooltip explanation based on DTS score
 */
function getTooltipContent(score: number): string {
  if (score >= 80) {
    return 'Les données sont cohérentes et les analyses sont fiables.';
  }
  if (score >= 60) {
    return 'Quelques incohérences détectées. Les indicateurs principaux restent utilisables.';
  }
  return 'Plusieurs incohérences détectées. Les recommandations automatiques sont désactivées.';
}

export function DTSScoreIndicator({ 
  score, 
  variant = 'badge', 
  showTooltip = true,
  className 
}: DTSScoreIndicatorProps) {
  const Icon = getScoreIcon(score);
  const colorClass = getScoreColor(score);
  const bgColorClass = getScoreBgColor(score);
  const label = getScoreLabel(score);
  
  const content = variant === 'badge' ? (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium',
      bgColorClass,
      colorClass,
      className
    )}>
      <Icon className="h-3.5 w-3.5" />
      <span>{score}</span>
    </div>
  ) : (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn(
        'flex items-center justify-center w-12 h-12 rounded-full',
        bgColorClass
      )}>
        <Icon className={cn('h-6 w-6', colorClass)} />
      </div>
      <div>
        <div className={cn('text-2xl font-bold', colorClass)}>
          {score}<span className="text-base font-normal text-muted-foreground">/100</span>
        </div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
  
  if (!showTooltip) {
    return content;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{getTooltipContent(score)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default DTSScoreIndicator;
