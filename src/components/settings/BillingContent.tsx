/**
 * TAEX-308: Enhanced Billing Page with Complete Pricing Clarity
 * Shows: current plan, beta/paid status, current price, future price, next billing date
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, FileText, Receipt, AlertCircle, CreditCard, Store, Calendar, TrendingUp, Info, Download } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useOrganization } from "@/hooks/useOrganization";
import { useBetaStatus } from "@/hooks/useBetaStatus";
import { useSites } from "@/hooks/useSites";
import { PricingSummary } from "@/components/billing/PricingSummary";
import { BetaEndNoticeBanner } from "@/components/billing/BetaEndNoticeBanner";
import { getApplicablePlan, COMMERCIAL_PLANS, getPlanTierLabel } from "@/config/commercialPlans";
import { getMonthlyPricePerLaundromat } from "@/config/pricingConfig";

interface Invoice {
  id: string;
  number: string | null;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  description: string;
}

export default function BillingContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { organization } = useOrganization();
  const { betaStatus } = useBetaStatus(organization?.id || null);
  const { sites } = useSites();
  
  const activeLaundromatCount = sites.filter(s => s.status === "active").length;
  const applicablePlan = getApplicablePlan(activeLaundromatCount);
  const planDetails = COMMERCIAL_PLANS[applicablePlan];
  const tierLabel = getPlanTierLabel(activeLaundromatCount);
  const standardPricePerLav = getMonthlyPricePerLaundromat(activeLaundromatCount);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("Utilisateur non connecté");
        }

        const { data, error: fnError } = await supabase.functions.invoke("list-invoices");

        if (fnError) {
          throw new Error(fnError.message);
        }

        setInvoices(data?.invoices || []);
      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError(err instanceof Error ? err.message : "Erreur lors du chargement des factures");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "d MMMM yyyy", { locale: fr });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Beta End Notice (7-day advance) */}
      {betaStatus?.is_beta && betaStatus.beta_ends_at && betaStatus.standard_price_cents && (
        <BetaEndNoticeBanner
          betaEndsAt={betaStatus.beta_ends_at}
          standardPriceCents={betaStatus.standard_price_cents}
          activeLaundromatCount={activeLaundromatCount}
        />
      )}

      {/* Current Plan Card - CLARITY FIRST */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-lg">Votre abonnement</CardTitle>
                <CardDescription>Plan actuel et détails de facturation</CardDescription>
              </div>
            </div>
            {betaStatus?.is_beta ? (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                Programme Bêta
              </Badge>
            ) : (
              <Badge variant="secondary">Abonnement actif</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Plan</div>
              <div className="text-xl font-semibold">{planDetails.name}</div>
              <div className="text-sm text-muted-foreground">{tierLabel}</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Laveries actives</div>
              <div className="text-xl font-semibold flex items-center gap-2">
                <Store className="h-5 w-5 text-muted-foreground" />
                {activeLaundromatCount}
              </div>
            </div>
          </div>

          <Separator />

          {/* Price Clarity Section */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              Tarification transparente
            </h4>
            
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Current Price */}
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Prix actuel / laverie</div>
                <div className="text-2xl font-bold text-primary">
                  {betaStatus?.is_beta 
                    ? `${(betaStatus.effective_price_cents / 100).toFixed(0)}€`
                    : `${standardPricePerLav}€`
                  }
                  <span className="text-sm font-normal text-muted-foreground"> / mois</span>
                </div>
                {betaStatus?.is_beta && (
                  <Badge variant="secondary" className="mt-2 text-xs">Tarif bêta</Badge>
                )}
              </div>

              {/* Future Price (if beta) */}
              {betaStatus?.is_beta && betaStatus.standard_price_cents && (
                <div className="p-4 border rounded-lg border-dashed">
                  <div className="text-sm text-muted-foreground mb-1">Après la bêta</div>
                  <div className="text-2xl font-bold">
                    {(betaStatus.standard_price_cents / 100).toFixed(0)}€
                    <span className="text-sm font-normal text-muted-foreground"> / mois</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Tarif standard / laverie
                  </div>
                </div>
              )}

              {/* Monthly Total */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Total mensuel</div>
                <div className="text-2xl font-bold text-primary">
                  {betaStatus?.is_beta 
                    ? `${((betaStatus.effective_price_cents * activeLaundromatCount) / 100).toFixed(0)}€`
                    : `${standardPricePerLav * activeLaundromatCount}€`
                  }
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {activeLaundromatCount} laverie{activeLaundromatCount > 1 ? "s" : ""} × prix unitaire
                </div>
              </div>
            </div>
          </div>

          {/* Beta Status */}
          {betaStatus?.is_beta && betaStatus.beta_ends_at && (
            <>
              <Separator />
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Fin de la période bêta</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(betaStatus.beta_ends_at), "d MMMM yyyy", { locale: fr })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {betaStatus.days_remaining ?? differenceInDays(new Date(betaStatus.beta_ends_at), new Date())}
                  </div>
                  <div className="text-xs text-muted-foreground">jours restants</div>
                </div>
              </div>
            </>
          )}

          {/* Data Export Option (Exit Rules) */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Download className="h-4 w-4" />
              Vous pouvez exporter vos données à tout moment
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href="/app/settings/export">Exporter</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Receipt className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-lg">Historique des factures</CardTitle>
              <CardDescription>
                Les factures sont générées automatiquement après chaque paiement
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">Aucune facture</h3>
              <p className="text-muted-foreground">
                Vos factures apparaîtront ici après votre premier paiement
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {invoice.number || `Facture ${invoice.id.slice(-8)}`}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {invoice.status === "paid" ? "Payée" : invoice.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(invoice.created)} • {invoice.description}
                    </p>
                    <p className="text-lg font-semibold text-primary">
                      {formatAmount(invoice.amount_paid, invoice.currency)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {invoice.hosted_invoice_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.hosted_invoice_url!, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Voir
                      </Button>
                    )}
                    {invoice.invoice_pdf && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.open(invoice.invoice_pdf!, "_blank")}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
