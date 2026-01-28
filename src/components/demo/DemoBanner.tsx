import { Sparkles, RefreshCw, LogOut, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoContext } from "@/hooks/useDemoContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface DemoBannerProps {
  className?: string;
}

function formatTimeRemaining(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

export function DemoBanner({ className }: DemoBannerProps) {
  const { 
    isResetting, 
    resetDemo, 
    exitDemo, 
    demoSessionRemainingSeconds 
  } = useDemoContext();
  const { t } = useTranslation(['app']);

  const timeRemaining = formatTimeRemaining(demoSessionRemainingSeconds);
  const isTimeWarning = demoSessionRemainingSeconds !== null && demoSessionRemainingSeconds < 300; // < 5 min

  return (
    <div
      className={cn(
        "w-full bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 border-b border-primary/30 px-4 py-2.5 flex items-center justify-between gap-4",
        className
      )}
    >
      <div className="flex items-center gap-3 text-primary">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
          <span className="text-sm font-semibold">
            {t('app:demo.banner.title', 'Mode démonstration')}
          </span>
          <span className="hidden sm:inline text-primary/60">•</span>
          <span className="text-xs text-primary/80">
            {t('app:demo.banner.autoReset', 'Les données se réinitialisent automatiquement')}
          </span>
          
          {/* Session timer */}
          {timeRemaining && (
            <>
              <span className="hidden sm:inline text-primary/60">•</span>
              <span className={cn(
                "text-xs flex items-center gap-1",
                isTimeWarning ? "text-destructive font-medium animate-pulse" : "text-primary/70"
              )}>
                <Clock className="h-3 w-3" />
                {timeRemaining}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Reset button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={resetDemo}
          disabled={isResetting}
          className="text-primary hover:text-primary hover:bg-primary/20 shrink-0"
        >
          {isResetting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              <span className="hidden sm:inline">{t('app:demo.banner.resetting', 'Réinitialisation...')}</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('app:demo.banner.reset', 'Réinitialiser')}</span>
            </>
          )}
        </Button>

        {/* Exit demo button */}
        <Button
          variant="outline"
          size="sm"
          onClick={exitDemo}
          disabled={isResetting}
          className="text-foreground border-primary/30 hover:bg-primary/10 shrink-0"
        >
          <LogOut className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">{t('app:demo.banner.exit', 'Quitter la démo')}</span>
        </Button>
      </div>
    </div>
  );
}
