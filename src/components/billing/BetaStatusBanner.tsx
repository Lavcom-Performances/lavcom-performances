import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface BetaStatusBannerProps {
  betaEndsAt: string;
  betaPriceCents: number;
  standardPriceCents: number;
}

export function BetaStatusBanner({ 
  betaEndsAt, 
  betaPriceCents, 
  standardPriceCents 
}: BetaStatusBannerProps) {
  const endDate = new Date(betaEndsAt);
  const formattedDate = format(endDate, "d MMMM yyyy", { locale: fr });
  const betaPrice = (betaPriceCents / 100).toFixed(0);
  const standardPrice = (standardPriceCents / 100).toFixed(0);

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">Programme Bêta</h3>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Actif
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Vous bénéficiez du tarif bêta préférentiel : <strong className="text-foreground">{betaPrice}€</strong> / laverie / mois
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Jusqu'au <strong className="text-foreground">{formattedDate}</strong>. 
            Après cette date, le tarif standard de {standardPrice}€ / laverie / mois s'appliquera automatiquement.
          </p>
        </div>
      </div>
    </div>
  );
}
