/**
 * TAEX-308: Beta End Notice Banner
 * Shows 7-day advance notice before beta period ends
 * Non-blocking, informational only
 */
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarClock, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BETA_TRANSITION } from "@/config/commercialPlans";

interface BetaEndNoticeBannerProps {
  betaEndsAt: string;
  standardPriceCents: number;
  activeLaundromatCount: number;
}

export function BetaEndNoticeBanner({
  betaEndsAt,
  standardPriceCents,
  activeLaundromatCount,
}: BetaEndNoticeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const endDate = new Date(betaEndsAt);
  const daysRemaining = differenceInDays(endDate, new Date());
  const formattedDate = format(endDate, "d MMMM yyyy", { locale: fr });
  const standardPrice = (standardPriceCents / 100).toFixed(0);
  const totalAfterBeta = activeLaundromatCount * (standardPriceCents / 100);

  // Only show if within 7 days of beta end
  if (daysRemaining > BETA_TRANSITION.advanceNoticeDays || daysRemaining <= 0 || isDismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full mt-0.5">
            <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-amber-900 dark:text-amber-100">
              Votre période bêta se termine dans {daysRemaining} jour{daysRemaining > 1 ? "s" : ""}
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              À partir du <strong>{formattedDate}</strong>, le tarif standard de{" "}
              <strong>{standardPrice}€ / laverie / mois</strong> s'appliquera automatiquement.
              {activeLaundromatCount > 0 && (
                <span className="block mt-1">
                  Avec vos {activeLaundromatCount} laverie{activeLaundromatCount > 1 ? "s" : ""} active{activeLaundromatCount > 1 ? "s" : ""} :{" "}
                  <strong>{totalAfterBeta.toFixed(0)}€ / mois</strong>
                </span>
              )}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Aucune action requise • Pas de perte de données • Continuité garantie
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
            asChild
          >
            <Link to="/app/settings/billing">
              Voir facturation
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-500 hover:text-amber-700 hover:bg-amber-100"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
