import { Link } from "react-router-dom";
import { Calendar, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TrialBannerProps {
  daysRemaining: number;
  status: 'active' | 'warning' | 'critical' | 'expired';
  variant?: 'full' | 'compact' | 'sidebar';
  className?: string;
}

export function TrialBanner({ 
  daysRemaining, 
  status, 
  variant = 'full',
  className 
}: TrialBannerProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          bgClass: 'bg-primary/10 border-primary/20',
          textClass: 'text-primary',
          icon: Calendar,
          message: `${daysRemaining} jours restants`,
          description: "Profitez de toutes les fonctionnalités",
        };
      case 'warning':
        return {
          bgClass: 'bg-amber-500/10 border-amber-500/20',
          textClass: 'text-amber-600 dark:text-amber-400',
          icon: AlertTriangle,
          message: `Plus que ${daysRemaining} jours`,
          description: "Passez au plan payant pour continuer",
        };
      case 'critical':
        return {
          bgClass: 'bg-destructive/10 border-destructive/20',
          textClass: 'text-destructive',
          icon: AlertTriangle,
          message: `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`,
          description: "Votre essai expire bientôt !",
        };
      case 'expired':
        return {
          bgClass: 'bg-destructive/10 border-destructive/20',
          textClass: 'text-destructive',
          icon: XCircle,
          message: "Essai terminé",
          description: "Abonnez-vous pour continuer",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (variant === 'sidebar') {
    return (
      <div className={cn(
        "mx-2 p-2 rounded-lg border",
        config.bgClass,
        className
      )}>
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4 shrink-0", config.textClass)} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-medium truncate", config.textClass)}>
              {config.message}
            </p>
          </div>
        </div>
        {status !== 'active' && (
          <Link to="/pricing" className="block mt-2">
            <Button size="sm" variant="lavcom" className="w-full h-7 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Passer au plan Pro
            </Button>
          </Link>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-2 border-b",
        config.bgClass,
        className
      )}>
        <Icon className={cn("h-4 w-4 shrink-0", config.textClass)} />
        <p className={cn("text-sm font-medium", config.textClass)}>
          {config.message}
        </p>
        <Link to="/pricing" className="ml-auto">
          <Button size="sm" variant={status === 'active' ? 'outline' : 'lavcom'} className="h-7 text-xs">
            {status === 'active' ? 'Voir les plans' : 'Passer au Pro'}
          </Button>
        </Link>
      </div>
    );
  }

  // Full variant
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 px-6 py-3 border-b",
      config.bgClass,
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-full",
          status === 'active' ? 'bg-primary/20' : 'bg-current/10'
        )}>
          <Icon className={cn("h-5 w-5", config.textClass)} />
        </div>
        <div>
          <p className={cn("font-medium", config.textClass)}>
            {config.message}
          </p>
          <p className="text-sm text-muted-foreground">
            {config.description}
          </p>
        </div>
      </div>
      <Link to="/pricing">
        <Button variant={status === 'active' ? 'outline' : 'lavcom'}>
          <Sparkles className="h-4 w-4 mr-2" />
          {status === 'active' ? 'Voir les plans' : 'Passer au Pro'}
        </Button>
      </Link>
    </div>
  );
}
