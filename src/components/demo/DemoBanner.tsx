import { AlertTriangle, Trash2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useTranslation } from "react-i18next";

interface DemoBannerProps {
  className?: string;
}

export function DemoBanner({ className }: DemoBannerProps) {
  const { deleteDemoSite, isDeletingDemo } = useDemoMode();
  const { t } = useTranslation(['app']);

  return (
    <div
      className={`w-full bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
          <span className="text-sm font-semibold">
            {t('app:demo.banner.title')}
          </span>
          <span className="hidden sm:inline text-amber-600/60 dark:text-amber-400/60">•</span>
          <span className="text-xs text-amber-600/80 dark:text-amber-400/80">
            {t('app:demo.banner.description')}
          </span>
        </div>
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
            <span className="hidden sm:inline">{t('app:demo.banner.deleting')}</span>
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">{t('app:demo.banner.delete')}</span>
          </>
        )}
      </Button>
    </div>
  );
}
