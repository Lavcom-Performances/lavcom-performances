import { useMemo } from "react";
import { Check, X, AlertTriangle, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
  isBreached?: boolean | null;
  breachCount?: number;
  isCheckingBreach?: boolean;
}

interface PasswordCriteria {
  label: string;
  met: boolean;
}

export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const criteria = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const metCount = Object.values(criteria).filter(Boolean).length;
    
    let strength: "weak" | "fair" | "good" | "strong" = "weak";
    if (metCount >= 5) strength = "strong";
    else if (metCount >= 4) strength = "good";
    else if (metCount >= 3) strength = "fair";

    return { criteria, strength, metCount };
  }, [password]);
}

export function PasswordStrengthIndicator({ 
  password, 
  className, 
  isBreached, 
  breachCount = 0,
  isCheckingBreach = false 
}: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation(['app']);
  const { criteria, strength, metCount } = usePasswordStrength(password);

  const strengthLabels = {
    weak: t('app:passwordStrength.weak'),
    fair: t('app:passwordStrength.fair'),
    good: t('app:passwordStrength.good'),
    strong: t('app:passwordStrength.strong'),
  };

  const strengthColors = {
    weak: "bg-destructive",
    fair: "bg-orange-500",
    good: "bg-yellow-500",
    strong: "bg-green-500",
  };

  const criteriaList: PasswordCriteria[] = [
    { label: t('app:passwordStrength.criteria.minLength'), met: criteria.minLength },
    { label: t('app:passwordStrength.criteria.hasUppercase'), met: criteria.hasUppercase },
    { label: t('app:passwordStrength.criteria.hasLowercase'), met: criteria.hasLowercase },
    { label: t('app:passwordStrength.criteria.hasNumber'), met: criteria.hasNumber },
    { label: t('app:passwordStrength.criteria.hasSpecial'), met: criteria.hasSpecial },
  ];

  if (!password) return null;

  const formatBreachCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Breach warning */}
      {isCheckingBreach && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Vérification de la sécurité du mot de passe...</span>
        </div>
      )}
      
      {isBreached === true && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Mot de passe compromis !</p>
            <p className="text-destructive/80 mt-0.5">
              Ce mot de passe a été exposé {formatBreachCount(breachCount)} fois dans des fuites de données. 
              Choisissez un mot de passe différent.
            </p>
          </div>
        </div>
      )}
      
      {isBreached === false && password.length >= 8 && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-md">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Ce mot de passe n'apparaît pas dans les fuites connues</span>
        </div>
      )}

      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {t('app:passwordStrength.label')}
          </span>
          <span className={cn(
            "text-xs font-medium",
            strength === "weak" && "text-destructive",
            strength === "fair" && "text-orange-500",
            strength === "good" && "text-yellow-600",
            strength === "strong" && "text-green-600"
          )}>
            {strengthLabels[strength]}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((segment) => (
            <div
              key={segment}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                segment <= metCount ? strengthColors[strength] : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Criteria checklist */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {criteriaList.map((item, index) => (
          <li
            key={index}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              item.met ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {item.met ? (
              <Check className="h-3 w-3 shrink-0" />
            ) : (
              <X className="h-3 w-3 shrink-0" />
            )}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
