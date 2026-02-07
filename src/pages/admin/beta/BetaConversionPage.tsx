/**
 * TAEX-307: Admin Beta Conversion View
 * /admin/beta/conversion
 * 
 * Displays conversion readiness for each beta company with admin actions.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  CreditCard,
  Building2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BetaCompanyConversion {
  company_id: string;
  company_name: string;
  beta_started_at: string | null;
  beta_ends_at: string | null;
  beta_price_cents: number | null;
  standard_price_cents: number;
  days_remaining: number;
  days_since_start: number;
  is_activated: boolean;
  successful_imports: number;
  has_dts_issues: boolean;
  recommendations_suppressed: boolean;
  ready_for_conversion: boolean;
}

interface ConversionMetrics {
  total_beta: number;
  ready_count: number;
  not_ready_count: number;
  ending_soon_count: number; // < 14 days
}

export default function BetaConversionPage() {
  const queryClient = useQueryClient();
  const [endBetaReason, setEndBetaReason] = useState("");

  // Fetch beta companies with conversion data
  const { data: companies, isLoading, refetch } = useQuery({
    queryKey: ["admin-beta-conversion"],
    queryFn: async (): Promise<BetaCompanyConversion[]> => {
      // Get beta companies
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("id, name, is_beta, beta_started_at, beta_ends_at, beta_price_cents, standard_price_cents")
        .eq("is_beta", true)
        .is("deleted_at", null);

      if (error) throw error;

      // Get import counts and DTS data for each company
      const result: BetaCompanyConversion[] = [];
      
      for (const org of orgs || []) {
        // Get import count
        const { count: importCount } = await supabase
          .from("import_batches")
          .select("*", { count: "exact", head: true })
          .eq("site_id", org.id)
          .is("deleted_at", null);

        // Get latest DTS score
        const { data: trustData } = await supabase
          .from("trust_day")
          .select("dts_score")
          .eq("company_id", org.id)
          .order("day", { ascending: false })
          .limit(1);

        // Get suppression status
        const { data: overrides } = await supabase
          .from("beta_company_overrides")
          .select("recommendations_suppressed")
          .eq("company_id", org.id)
          .single();

        const now = new Date();
        const betaStart = org.beta_started_at ? new Date(org.beta_started_at) : now;
        const betaEnd = org.beta_ends_at ? new Date(org.beta_ends_at) : addDays(now, 180);
        
        const daysSinceStart = differenceInDays(now, betaStart);
        const daysRemaining = differenceInDays(betaEnd, now);
        const successfulImports = importCount || 0;
        const hasDtsIssues = trustData?.[0]?.dts_score ? trustData[0].dts_score < 60 : false;
        const recommendationsSuppressed = overrides?.recommendations_suppressed || false;

        // Check activation (simplified: has imports and no major issues)
        const isActivated = successfulImports >= 1 && !hasDtsIssues;

        // Conversion readiness logic per TAEX-307
        const readyForConversion = 
          isActivated &&
          daysSinceStart >= 30 &&
          successfulImports >= 3 &&
          !hasDtsIssues &&
          !recommendationsSuppressed;

        result.push({
          company_id: org.id,
          company_name: org.name,
          beta_started_at: org.beta_started_at,
          beta_ends_at: org.beta_ends_at,
          beta_price_cents: org.beta_price_cents,
          standard_price_cents: org.standard_price_cents,
          days_remaining: Math.max(0, daysRemaining),
          days_since_start: daysSinceStart,
          is_activated: isActivated,
          successful_imports: successfulImports,
          has_dts_issues: hasDtsIssues,
          recommendations_suppressed: recommendationsSuppressed,
          ready_for_conversion: readyForConversion,
        });
      }

      return result.sort((a, b) => a.days_remaining - b.days_remaining);
    },
  });

  // Calculate metrics
  const metrics: ConversionMetrics = {
    total_beta: companies?.length || 0,
    ready_count: companies?.filter(c => c.ready_for_conversion).length || 0,
    not_ready_count: companies?.filter(c => !c.ready_for_conversion).length || 0,
    ending_soon_count: companies?.filter(c => c.days_remaining < 14).length || 0,
  };

  // End beta early mutation
  const endBetaMutation = useMutation({
    mutationFn: async ({ companyId, reason }: { companyId: string; reason: string }) => {
      const { error } = await supabase.functions.invoke("end-beta-early", {
        body: { company_id: companyId, reason },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-beta-conversion"] });
      toast({ title: "Beta terminée", description: "L'entreprise est passée au tarif standard." });
      setEndBetaReason("");
    },
    onError: (err) => {
      console.error("End beta error:", err);
      toast({ title: "Erreur", description: "Impossible de terminer la beta.", variant: "destructive" });
    },
  });

  const formatPrice = (cents: number | null) => {
    if (!cents) return "—";
    return `${(cents / 100).toFixed(0)}€`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Beta Conversion</h1>
              <p className="text-muted-foreground">
                Préparation et gestion de la sortie beta
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> Total Beta
            </CardDescription>
            <CardTitle className="text-3xl">{metrics.total_beta}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Prêts
            </CardDescription>
            <CardTitle className="text-3xl text-green-600">{metrics.ready_count}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-amber-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-600" /> Fin prochaine (&lt;14j)
            </CardDescription>
            <CardTitle className="text-3xl text-amber-600">{metrics.ending_soon_count}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-destructive/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-destructive" /> Non prêts
            </CardDescription>
            <CardTitle className="text-3xl text-destructive">{metrics.not_ready_count}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Conversion Status Help */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Critères de conversion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-5 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Activé = Oui</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>≥ 30 jours d'ancienneté</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>≥ 3 imports réussis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>DTS ≥ 60</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Recommandations actives</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies List */}
      <Card>
        <CardHeader>
          <CardTitle>Entreprises Beta</CardTitle>
          <CardDescription>
            Statut de conversion et actions disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !companies || companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune entreprise en beta
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Début beta</TableHead>
                  <TableHead>Jours restants</TableHead>
                  <TableHead>Imports</TableHead>
                  <TableHead>Prêt ?</TableHead>
                  <TableHead>Prix beta → standard</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map(company => (
                  <TableRow key={company.company_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{company.company_name}</span>
                        {company.is_activated && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Activé
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.beta_started_at
                        ? format(new Date(company.beta_started_at), "d MMM yyyy", { locale: fr })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={Math.min(100, ((180 - company.days_remaining) / 180) * 100)} 
                          className="w-16 h-2"
                        />
                        <span className={company.days_remaining < 14 ? "text-amber-600 font-medium" : ""}>
                          {company.days_remaining}j
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={company.successful_imports >= 3 ? "default" : "secondary"}
                        className={company.successful_imports >= 3 ? "bg-green-600" : ""}
                      >
                        {company.successful_imports}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {company.ready_for_conversion ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Prêt
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Non prêt
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatPrice(company.beta_price_cents)} → {formatPrice(company.standard_price_cents)}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Terminer beta
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Terminer la beta ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              L'entreprise <strong>{company.company_name}</strong> passera immédiatement au tarif standard ({formatPrice(company.standard_price_cents)}/mois).
                              <div className="mt-4">
                                <Textarea
                                  placeholder="Raison (optionnel)..."
                                  value={endBetaReason}
                                  onChange={(e) => setEndBetaReason(e.target.value)}
                                  className="mt-2"
                                />
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setEndBetaReason("")}>
                              Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => endBetaMutation.mutate({
                                companyId: company.company_id,
                                reason: endBetaReason,
                              })}
                              disabled={endBetaMutation.isPending}
                            >
                              Confirmer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
