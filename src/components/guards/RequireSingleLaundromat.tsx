import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Building2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveLaundromat } from "@/hooks/useActiveLaundromat";
import { LaundromatSelector } from "@/components/layout/LaundromatSelector";

interface RequireSingleLaundromatProps {
  children: ReactNode;
  /** Custom message to display when blocked */
  message?: string;
  /** Allow closed laundromats to pass through */
  allowClosed?: boolean;
}

/**
 * Guard component that blocks content when "All laundromats" is selected.
 * Use this on pages that require a single laundromat context.
 */
export function RequireSingleLaundromat({ 
  children, 
  message,
  allowClosed = true 
}: RequireSingleLaundromatProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language === "fr" ? "fr" : "en";
  const { isAllLaundromats, activeLaundromat, isClosed, isLoading } = useActiveLaundromat();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-5 w-5" />
          <span>{lang === "fr" ? "Chargement..." : "Loading..."}</span>
        </div>
      </div>
    );
  }

  // Block if "All laundromats" is selected
  if (isAllLaundromats) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[300px]">
        <Card className="max-w-md w-full border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-lg">
              {lang === "fr" 
                ? "Sélectionnez une laverie" 
                : "Select a laundromat"}
            </CardTitle>
            <CardDescription className="text-center">
              {message || (lang === "fr" 
                ? "Cette section nécessite de sélectionner une laverie spécifique pour continuer."
                : "This section requires selecting a specific laundromat to continue.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pt-2">
            <LaundromatSelector variant="default" className="w-full max-w-[250px]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Block if closed and not allowed
  if (isClosed && !allowClosed) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[300px]">
        <Card className="max-w-md w-full border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-2">
              <Building2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-lg">
              {lang === "fr" 
                ? "Laverie fermée" 
                : "Laundromat closed"}
            </CardTitle>
            <CardDescription className="text-center">
              {lang === "fr" 
                ? "Cette section n'est pas disponible pour une laverie fermée."
                : "This section is not available for a closed laundromat."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pt-2">
            <LaundromatSelector variant="default" className="w-full max-w-[250px]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook-based guard for programmatic checks
 */
export function useGuardSingleLaundromat() {
  const { isAllLaundromats, isClosed, activeLaundromatId, activeLaundromat } = useActiveLaundromat();
  
  return {
    canProceed: !isAllLaundromats && activeLaundromatId !== null,
    isBlocked: isAllLaundromats,
    isClosed,
    activeLaundromatId,
    activeLaundromat,
    reason: isAllLaundromats 
      ? "all_selected" 
      : isClosed 
        ? "closed" 
        : null,
  };
}
