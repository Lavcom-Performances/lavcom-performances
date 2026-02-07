/**
 * TAEX-307: Enhanced Beta Status Banner
 * 
 * Shows beta status with days remaining and pricing info.
 * Informational only, no blocking behavior.
 */
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface BetaStatusBannerEnhancedProps {
  betaEndsAt: string;
  betaPriceCents: number;
  standardPriceCents: number;
  variant?: "default" | "compact";
}

export function BetaStatusBannerEnhanced({ 
  betaEndsAt, 
  betaPriceCents, 
  standardPriceCents,
  variant = "default",
}: BetaStatusBannerEnhancedProps) {
  const endDate = new Date(betaEndsAt);
  const now = new Date();
  const daysRemaining = differenceInDays(endDate, now);
  const formattedDate = format(endDate, "d MMMM yyyy", { locale: fr });
  const betaPrice = (betaPriceCents / 100).toFixed(0);
  const standardPrice = (standardPriceCents / 100).toFixed(0);

  const isEndingSoon = daysRemaining <= 14;

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge 
          variant="secondary" 
          className={`${isEndingSoon ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-primary/10 text-primary border-primary/20"}`}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Beta • {daysRemaining}j restants
        </Badge>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r ${isEndingSoon ? "from-amber-500/10 via-amber-500/5" : "from-primary/10 via-primary/5"} to-transparent border ${isEndingSoon ? "border-amber-500/20" : "border-primary/20"} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 ${isEndingSoon ? "bg-amber-500/10" : "bg-primary/10"} rounded-full`}>
          <Sparkles className={`h-5 w-5 ${isEndingSoon ? "text-amber-600" : "text-primary"}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">Programme Beta</h3>
            <Badge 
              variant="secondary" 
              className={`${isEndingSoon ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-primary/10 text-primary border-primary/20"}`}
            >
              {isEndingSoon ? `${daysRemaining}j restants` : "Actif"}
            </Badge>
          </div>
          
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Tarif beta : <strong className="text-foreground">{betaPrice}€</strong> / laverie / mois
            </p>
            
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Jusqu'au <strong className="text-foreground">{formattedDate}</strong>
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Après cette date : {standardPrice}€ / laverie / mois (tarif standard)
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to="/beta" className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Comment fonctionne la beta
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
