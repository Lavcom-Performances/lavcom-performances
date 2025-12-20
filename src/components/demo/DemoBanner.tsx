import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/hooks/useDemoMode";

interface DemoBannerProps {
  className?: string;
}

export function DemoBanner({ className }: DemoBannerProps) {
  const { deleteDemoSite, isDeletingDemo } = useDemoMode();

  return (
    <div
      className={`w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">
          Données d'exemple
        </span>
        <span className="hidden sm:inline text-xs text-amber-600/80 dark:text-amber-400/80">
          — Ces données sont fictives et servent uniquement à découvrir la plateforme
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={deleteDemoSite}
        disabled={isDeletingDemo}
        className="text-amber-700 hover:text-amber-800 hover:bg-amber-500/20 dark:text-amber-400 dark:hover:text-amber-300 shrink-0"
      >
        {isDeletingDemo ? (
          <>
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            <span className="hidden sm:inline">Suppression...</span>
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Supprimer la démo</span>
          </>
        )}
      </Button>
    </div>
  );
}
