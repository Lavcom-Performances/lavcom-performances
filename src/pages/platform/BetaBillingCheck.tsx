/**
 * TAEX-302: Beta Billing Verification Guard
 * /admin/beta/billing-check
 * 
 * Shows billing verification table for beta companies with warning badges.
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  CreditCard, 
  AlertTriangle, 
  RefreshCw, 
  Store, 
  Calendar,
  TrendingDown,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BillingCheckRow {
  company_id: string;
  company_name: string;
  beta_started_at: string | null;
  beta_ends_at: string | null;
  effective_price_cents: number;
  active_laundromats_count: number;
  estimated_monthly_amount: number;
  warnings: {
    beta_ends_at_null: boolean;
    no_active_laundromats: boolean;
    low_dts: boolean;
  };
}

export default function BetaBillingCheck() {
  const navigate = useNavigate();

  // Log view on mount
  useEffect(() => {
    void supabase.rpc('rpc_log_billing_check_view');
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["beta-billing-check"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_beta_billing_check');
      if (error) throw error;
      return data as unknown as BillingCheckRow[];
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return format(new Date(dateStr), "d MMM yyyy", { locale: fr });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const hasWarnings = (row: BillingCheckRow) => {
    return row.warnings.beta_ends_at_null || 
           row.warnings.no_active_laundromats || 
           row.warnings.low_dts;
  };

  const getWarningCount = (row: BillingCheckRow) => {
    return [
      row.warnings.beta_ends_at_null,
      row.warnings.no_active_laundromats,
      row.warnings.low_dts,
    ].filter(Boolean).length;
  };

  // Summary stats
  const totalCompanies = data?.length || 0;
  const companiesWithWarnings = data?.filter(hasWarnings).length || 0;
  const totalLaundromats = data?.reduce((sum, r) => sum + r.active_laundromats_count, 0) || 0;
  const totalMonthlyRevenue = data?.reduce((sum, r) => sum + r.estimated_monthly_amount, 0) || 0;

  return (
    <>
      <SEOHead 
        title="Vérification Facturation Beta | Back-office"
        description="Vérification des configurations de facturation beta"
        noindex
      />

      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              Vérification Facturation Beta
            </h1>
            <p className="text-muted-foreground">
              Audit des configurations de facturation pour les entreprises en bêta
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/beta/ops")}>
              Beta Ops
            </Button>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Store className="h-8 w-8 text-primary" />
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <div className="text-2xl font-bold">{totalCompanies}</div>
                  )}
                  <p className="text-xs text-muted-foreground">Entreprises beta</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <div className="text-2xl font-bold text-amber-600">{companiesWithWarnings}</div>
                  )}
                  <p className="text-xs text-muted-foreground">Avec alertes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Store className="h-8 w-8 text-green-500" />
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <div className="text-2xl font-bold">{totalLaundromats}</div>
                  )}
                  <p className="text-xs text-muted-foreground">Laveries actives</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-blue-500" />
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <div className="text-2xl font-bold">{formatCurrency(totalMonthlyRevenue)}</div>
                  )}
                  <p className="text-xs text-muted-foreground">MRR estimé</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card>
          <CardHeader>
            <CardTitle>Entreprises Beta</CardTitle>
            <CardDescription>
              Configuration de facturation et alertes potentielles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <p>Erreur lors du chargement des données</p>
              </div>
            ) : !data?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucune entreprise en bêta
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Début Beta</TableHead>
                    <TableHead>Fin Beta</TableHead>
                    <TableHead className="text-right">Prix/laverie</TableHead>
                    <TableHead className="text-right">Laveries</TableHead>
                    <TableHead className="text-right">MRR estimé</TableHead>
                    <TableHead>Alertes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow 
                      key={row.company_id}
                      className={hasWarnings(row) ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}
                    >
                      <TableCell className="font-medium">
                        {row.company_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(row.beta_started_at)}
                      </TableCell>
                      <TableCell>
                        {row.warnings.beta_ends_at_null ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Manquante
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {formatDate(row.beta_ends_at)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.effective_price_cents)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.warnings.no_active_laundromats ? (
                          <Badge variant="destructive">0</Badge>
                        ) : (
                          row.active_laundromats_count
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.estimated_monthly_amount)}
                      </TableCell>
                      <TableCell>
                        {hasWarnings(row) ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                                  <AlertTriangle className="h-3 w-3" />
                                  {getWarningCount(row)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <ul className="text-sm space-y-1">
                                  {row.warnings.beta_ends_at_null && (
                                    <li className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Date de fin manquante
                                    </li>
                                  )}
                                  {row.warnings.no_active_laundromats && (
                                    <li className="flex items-center gap-1">
                                      <Store className="h-3 w-3" />
                                      Aucune laverie active
                                    </li>
                                  )}
                                  {row.warnings.low_dts && (
                                    <li className="flex items-center gap-1">
                                      <TrendingDown className="h-3 w-3" />
                                      DTS très bas (&lt;40)
                                    </li>
                                  )}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
