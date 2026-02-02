import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Store, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BetaStatus } from "@/hooks/useBetaStatus";
import { BetaStatusBanner } from "./BetaStatusBanner";

interface PricingSummaryProps {
  betaStatus: BetaStatus | null;
  activeLaundromatCount: number;
}

export function PricingSummary({ betaStatus, activeLaundromatCount }: PricingSummaryProps) {
  if (!betaStatus) return null;

  const effectivePrice = (betaStatus.effective_price_cents / 100).toFixed(0);
  const monthlyTotal = ((betaStatus.effective_price_cents * activeLaundromatCount) / 100).toFixed(0);

  return (
    <div className="space-y-4">
      {betaStatus.is_beta && betaStatus.beta_ends_at && betaStatus.beta_price_cents && betaStatus.standard_price_cents && (
        <BetaStatusBanner
          betaEndsAt={betaStatus.beta_ends_at}
          betaPriceCents={betaStatus.beta_price_cents}
          standardPriceCents={betaStatus.standard_price_cents}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-lg">Récapitulatif tarifaire</CardTitle>
              <CardDescription>
                Votre facturation mensuelle actuelle
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="p-2 bg-background rounded-full">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Laveries actives</p>
                <p className="text-2xl font-bold">{activeLaundromatCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="p-2 bg-background rounded-full">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prix / laverie</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{effectivePrice}€</p>
                  {betaStatus.is_beta && (
                    <Badge variant="secondary" className="text-xs">Bêta</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="p-2 bg-primary/10 rounded-full">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total mensuel</p>
                <p className="text-2xl font-bold text-primary">{monthlyTotal}€</p>
              </div>
            </div>
          </div>

          {betaStatus.is_beta && betaStatus.days_remaining !== undefined && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>{betaStatus.days_remaining}</strong> jours restants sur votre période bêta
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
