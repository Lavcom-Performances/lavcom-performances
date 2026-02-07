/**
 * TAEX-308: Admin Commercial Readiness Dashboard
 * /admin/commercial
 * 
 * Shows: converted companies, still in beta, beta ended but not converted,
 * average time to conversion, revenue per laundromat (aggregated)
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  Clock,
  TrendingUp,
  Building2,
  CreditCard,
  AlertTriangle,
  DollarSign,
  Calendar,
  Sparkles,
  ArrowUpRight,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface CompanyCommercialStatus {
  id: string;
  name: string;
  status: "beta" | "converted" | "churned" | "ending_soon";
  beta_started_at: string | null;
  beta_ends_at: string | null;
  converted_at: string | null;
  laundromat_count: number;
  monthly_revenue_cents: number;
  days_to_conversion?: number;
}

interface CommercialMetrics {
  total_companies: number;
  beta_active: number;
  converted: number;
  churned: number;
  ending_soon: number;
  conversion_rate: number;
  avg_days_to_conversion: number;
  total_mrr_cents: number;
  arpu_cents: number; // Average Revenue Per Unit (laundromat)
}

export default function CommercialReadinessPage() {
  const [activeTab, setActiveTab] = useState("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-commercial-readiness"],
    queryFn: async () => {
      // Get all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select(`
          id, 
          name, 
          is_beta, 
          beta_started_at, 
          beta_ends_at,
          beta_price_cents,
          standard_price_cents
        `)
        .is("deleted_at", null);

      if (orgsError) throw orgsError;

      // Get site counts per company
      const { data: sites, error: sitesError } = await supabase
        .from("sites")
        .select("id, organization_id, status")
        .is("deleted_at", null)
        .eq("status", "active");

      if (sitesError) throw sitesError;

      // Get conversion events
      const { data: conversionEvents, error: eventsError } = await supabase
        .from("system_events")
        .select("meta, created_at")
        .eq("source", "beta_conversion");

      if (eventsError) throw eventsError;

      const now = new Date();
      const companies: CompanyCommercialStatus[] = [];
      let totalConvertedDays = 0;
      let convertedCount = 0;
      let totalMrrCents = 0;
      let totalLaundromats = 0;

      for (const org of orgs || []) {
        const orgSites = (sites || []).filter(s => s.organization_id === org.id);
        const laundromatCount = orgSites.length;
        
        // Check if converted
        const conversionEvent = (conversionEvents || []).find(
          e => (e.meta as any)?.company_id === org.id && (e.meta as any)?.action === "beta_ended"
        );
        const convertedAt = conversionEvent?.created_at || null;
        
        // Determine status
        let status: CompanyCommercialStatus["status"] = "beta";
        let daysToConversion: number | undefined;
        let monthlyRevenueCents = 0;

        if (convertedAt && !org.is_beta) {
          status = "converted";
          if (org.beta_started_at) {
            daysToConversion = differenceInDays(new Date(convertedAt), new Date(org.beta_started_at));
            totalConvertedDays += daysToConversion;
            convertedCount++;
          }
          // Calculate revenue at standard price
          monthlyRevenueCents = (org.standard_price_cents || 2900) * laundromatCount;
          totalMrrCents += monthlyRevenueCents;
        } else if (org.is_beta) {
          const betaEnd = org.beta_ends_at ? new Date(org.beta_ends_at) : null;
          if (betaEnd && differenceInDays(betaEnd, now) <= 14) {
            status = "ending_soon";
          }
          // Beta revenue
          monthlyRevenueCents = (org.beta_price_cents || 900) * laundromatCount;
          totalMrrCents += monthlyRevenueCents;
        } else if (!org.is_beta && !convertedAt) {
          status = "churned";
        }

        totalLaundromats += laundromatCount;

        companies.push({
          id: org.id,
          name: org.name,
          status,
          beta_started_at: org.beta_started_at,
          beta_ends_at: org.beta_ends_at,
          converted_at: convertedAt,
          laundromat_count: laundromatCount,
          monthly_revenue_cents: monthlyRevenueCents,
          days_to_conversion: daysToConversion,
        });
      }

      const metrics: CommercialMetrics = {
        total_companies: companies.length,
        beta_active: companies.filter(c => c.status === "beta" || c.status === "ending_soon").length,
        converted: companies.filter(c => c.status === "converted").length,
        churned: companies.filter(c => c.status === "churned").length,
        ending_soon: companies.filter(c => c.status === "ending_soon").length,
        conversion_rate: companies.length > 0 
          ? Math.round((companies.filter(c => c.status === "converted").length / companies.length) * 100)
          : 0,
        avg_days_to_conversion: convertedCount > 0 ? Math.round(totalConvertedDays / convertedCount) : 0,
        total_mrr_cents: totalMrrCents,
        arpu_cents: totalLaundromats > 0 ? Math.round(totalMrrCents / totalLaundromats) : 0,
      };

      return { companies, metrics };
    },
  });

  const companies = data?.companies || [];
  const metrics = data?.metrics;

  const filteredCompanies = (status?: CompanyCommercialStatus["status"]) => {
    if (!status || status === "all" as any) return companies;
    return companies.filter(c => c.status === status);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const getStatusBadge = (status: CompanyCommercialStatus["status"]) => {
    switch (status) {
      case "converted":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200">Converti</Badge>;
      case "beta":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200">Bêta</Badge>;
      case "ending_soon":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200">Fin proche</Badge>;
      case "churned":
        return <Badge variant="outline" className="text-muted-foreground">Churné</Badge>;
    }
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
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Commercial Readiness</h1>
              <p className="text-muted-foreground">
                Santé commerciale et conversions
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* MRR */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> MRR Total
              </CardDescription>
              <CardTitle className="text-3xl text-primary">
                {formatCurrency(metrics.total_mrr_cents)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Revenu mensuel récurrent
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> Taux de conversion
              </CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {metrics.conversion_rate}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={metrics.conversion_rate} className="h-2" />
            </CardContent>
          </Card>

          {/* Avg Days to Conversion */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Temps moyen conversion
              </CardDescription>
              <CardTitle className="text-3xl">
                {metrics.avg_days_to_conversion}
                <span className="text-lg font-normal text-muted-foreground"> jours</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                De l'inscription à la conversion
              </div>
            </CardContent>
          </Card>

          {/* ARPU */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" /> ARPU
              </CardDescription>
              <CardTitle className="text-3xl">
                {formatCurrency(metrics.arpu_cents)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Revenu moyen / laverie
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Summary */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card 
            className={`cursor-pointer transition-colors ${activeTab === "converted" ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
            onClick={() => setActiveTab("converted")}
          >
            <CardHeader className="pb-2">
              <CardDescription>Convertis</CardDescription>
              <CardTitle className="text-2xl text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                {metrics.converted}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${activeTab === "beta" ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
            onClick={() => setActiveTab("beta")}
          >
            <CardHeader className="pb-2">
              <CardDescription>En bêta</CardDescription>
              <CardTitle className="text-2xl text-blue-600 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {metrics.beta_active}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${activeTab === "ending_soon" ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
            onClick={() => setActiveTab("ending_soon")}
          >
            <CardHeader className="pb-2">
              <CardDescription>Fin proche (&lt;14j)</CardDescription>
              <CardTitle className="text-2xl text-amber-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {metrics.ending_soon}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${activeTab === "churned" ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
            onClick={() => setActiveTab("churned")}
          >
            <CardHeader className="pb-2">
              <CardDescription>Churnés</CardDescription>
              <CardTitle className="text-2xl text-muted-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {metrics.churned}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Entreprises</CardTitle>
              <CardDescription>
                Statut commercial de chaque entreprise
              </CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="converted">Convertis</TabsTrigger>
                <TabsTrigger value="beta">Bêta</TabsTrigger>
                <TabsTrigger value="ending_soon">Fin proche</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredCompanies(activeTab === "all" ? undefined : activeTab as any).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune entreprise dans cette catégorie
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Laveries</TableHead>
                  <TableHead>Revenu mensuel</TableHead>
                  <TableHead>Début bêta</TableHead>
                  <TableHead>Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies(activeTab === "all" ? undefined : activeTab as any).map(company => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{getStatusBadge(company.status)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{company.laundromat_count}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(company.monthly_revenue_cents)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.beta_started_at
                        ? format(new Date(company.beta_started_at), "d MMM yyyy", { locale: fr })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {company.status === "converted" && company.days_to_conversion !== undefined ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          {company.days_to_conversion}j
                        </span>
                      ) : company.status === "ending_soon" && company.beta_ends_at ? (
                        <span className="text-amber-600">
                          Fin: {format(new Date(company.beta_ends_at), "d MMM", { locale: fr })}
                        </span>
                      ) : (
                        "—"
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
  );
}
