import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Receipt, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SEOHead } from "@/components/seo/SEOHead";

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

export default function BillingHistory() {
  const { t } = useTranslation("app");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <>
      <SEOHead
        title="Historique des factures | Lavcom Performances"
        description="Consultez et téléchargez vos factures TTC"
      />

      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Receipt className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Historique des factures</h1>
            <p className="text-muted-foreground">
              Consultez et téléchargez toutes vos factures TTC
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vos factures</CardTitle>
            <CardDescription>
              Les factures sont générées automatiquement après chaque paiement
            </CardDescription>
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
    </>
  );
}
