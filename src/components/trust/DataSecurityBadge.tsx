import { Shield, Lock, Database, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface DataSecurityBadgeProps {
  variant?: "inline" | "card" | "footer";
  className?: string;
}

/**
 * TAEX-304: Trust statement component
 * Displays a reassuring message about data security & reliability
 */
export function DataSecurityBadge({ variant = "inline", className }: DataSecurityBadgeProps) {
  const { t } = useTranslation('common');

  if (variant === "footer") {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Shield className="h-3.5 w-3.5 text-primary/70" />
        <span>
          {t('trust.footerMessage', 'Vos données sont stockées de manière sécurisée, sauvegardées automatiquement et protégées contre toute perte accidentelle.')}
        </span>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn(
        "rounded-lg border border-primary/20 bg-primary/5 p-4",
        className
      )}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">
              {t('trust.title', 'Sécurité & Fiabilité des Données')}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('trust.fullMessage', 'Vos données sont stockées de manière sécurisée dans notre base de données, sauvegardées automatiquement chaque jour et protégées contre les suppressions accidentelles.')}
            </p>
            <p className="text-sm text-muted-foreground/80 mt-2 leading-relaxed">
              {t('trust.infrastructureMessage', 'Lavcom Performances utilise une infrastructure professionnelle et une journalisation d\'audit pour garantir l\'intégrité, la disponibilité et la traçabilité de vos informations.')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-primary/10">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>{t('trust.encrypted', 'Chiffré')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            <span>{t('trust.dailyBackup', 'Sauvegarde quotidienne')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCcw className="h-3.5 w-3.5" />
            <span>{t('trust.softDelete', 'Protection anti-suppression')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium",
      className
    )}>
      <Shield className="h-3.5 w-3.5" />
      <span>{t('trust.inline', 'Données sécurisées & sauvegardées')}</span>
    </div>
  );
}
