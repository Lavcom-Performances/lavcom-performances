import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Sparkles,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface BetaCompanyStats {
  company_id: string;
  company_name: string;
  is_beta: boolean;
  beta_started_at: string | null;
  beta_ends_at: string | null;
  last_activity_at: string | null;
  days_inactive: number;
  checklist_progress: number;
  total_events: number;
  activation_status: "activated" | "at_risk" | "inactive" | "new";
}

interface ActivationMetrics {
  total_beta_companies: number;
  activated_count: number;
  at_risk_count: number;
  inactive_count: number;
  new_count: number;
  activation_rate: number;
}

export default function BetaActivationPage() {
  const [companies, setCompanies] = useState<BetaCompanyStats[]>([]);
  const [metrics, setMetrics] = useState<ActivationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchBetaStats = async () => {
    setIsLoading(true);
    try {
      // Fetch beta companies
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("id, name, is_beta, beta_started_at, beta_ends_at, owner_id")
        .eq("is_beta", true)
        .is("deleted_at", null);

      if (orgsError) throw orgsError;

      // Fetch recent events for each company
      const fiveDaysAgo = subDays(new Date(), 5).toISOString();
      
      const { data: events, error: eventsError } = await supabase
        .from("system_events")
        .select("meta, created_at")
        .eq("source", "beta_observability")
        .gte("created_at", subDays(new Date(), 30).toISOString());

      if (eventsError) throw eventsError;

      // Process company stats
      const companyStats: BetaCompanyStats[] = (orgs || []).map((org) => {
        const companyEvents = (events || []).filter(
          (e) => (e.meta as any)?.company_id === org.id
        );
        
        const lastEvent = companyEvents.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        const lastActivityAt = lastEvent?.created_at || null;
        const daysInactive = lastActivityAt
          ? Math.floor(
              (new Date().getTime() - new Date(lastActivityAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 999;

        // Determine checklist progress from events
        const checklistEvents = companyEvents.filter(
          (e) => (e.meta as any)?.code === "beta_checklist_item_completed"
        );
        const uniqueItems = new Set(
          checklistEvents.map((e) => (e.meta as any)?.item_id)
        );
        const checklistProgress = Math.min(100, (uniqueItems.size / 5) * 100);

        // Determine activation status
        let activationStatus: BetaCompanyStats["activation_status"] = "new";
        const betaAge = org.beta_started_at
          ? Math.floor(
              (new Date().getTime() - new Date(org.beta_started_at).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

        if (checklistProgress >= 100) {
          activationStatus = "activated";
        } else if (daysInactive >= 5) {
          activationStatus = "inactive";
        } else if (daysInactive >= 3 || (betaAge > 7 && checklistProgress < 50)) {
          activationStatus = "at_risk";
        } else if (betaAge <= 3) {
          activationStatus = "new";
        }

        return {
          company_id: org.id,
          company_name: org.name,
          is_beta: org.is_beta,
          beta_started_at: org.beta_started_at,
          beta_ends_at: org.beta_ends_at,
          last_activity_at: lastActivityAt,
          days_inactive: daysInactive,
          checklist_progress: checklistProgress,
          total_events: companyEvents.length,
          activation_status: activationStatus,
        };
      });

      setCompanies(companyStats);

      // Calculate metrics
      const total = companyStats.length;
      const activated = companyStats.filter((c) => c.activation_status === "activated").length;
      const atRisk = companyStats.filter((c) => c.activation_status === "at_risk").length;
      const inactive = companyStats.filter((c) => c.activation_status === "inactive").length;
      const newCount = companyStats.filter((c) => c.activation_status === "new").length;

      setMetrics({
        total_beta_companies: total,
        activated_count: activated,
        at_risk_count: atRisk,
        inactive_count: inactive,
        new_count: newCount,
        activation_rate: total > 0 ? Math.round((activated / total) * 100) : 0,
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching beta stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBetaStats();
  }, []);

  const getStatusBadge = (status: BetaCompanyStats["activation_status"]) => {
    switch (status) {
      case "activated":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Activé</Badge>;
      case "at_risk":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">À risque</Badge>;
      case "inactive":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Inactif</Badge>;
      case "new":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Nouveau</Badge>;
    }
  };

  const filteredCompanies = (status?: BetaCompanyStats["activation_status"]) => {
    if (!status) return companies;
    return companies.filter((c) => c.activation_status === status);
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
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Beta Activation Dashboard</h1>
              <p className="text-muted-foreground">
                Suivi des activations et signaux de risque
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Dernière MAJ: {format(lastRefresh, "HH:mm", { locale: fr })}
          </span>
          <Button variant="outline" size="sm" onClick={fetchBetaStats} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Beta</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                {metrics.total_beta_companies}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-500/20">
            <CardHeader className="pb-2">
              <CardDescription>Activés</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                {metrics.activated_count}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardDescription>À risque</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                {metrics.at_risk_count}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-500/20">
            <CardHeader className="pb-2">
              <CardDescription>Inactifs (5j+)</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2 text-red-600">
                <Clock className="h-5 w-5" />
                {metrics.inactive_count}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription>Taux d'activation</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2 text-primary">
                <TrendingUp className="h-5 w-5" />
                {metrics.activation_rate}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Company List */}
      <Card>
        <CardHeader>
          <CardTitle>Entreprises Beta</CardTitle>
          <CardDescription>
            Liste des entreprises participantes et leur statut d'activation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Tous ({companies.length})</TabsTrigger>
              <TabsTrigger value="at_risk" className="text-amber-600">
                À risque ({metrics?.at_risk_count || 0})
              </TabsTrigger>
              <TabsTrigger value="inactive" className="text-red-600">
                Inactifs ({metrics?.inactive_count || 0})
              </TabsTrigger>
              <TabsTrigger value="activated" className="text-green-600">
                Activés ({metrics?.activated_count || 0})
              </TabsTrigger>
            </TabsList>

            {["all", "at_risk", "inactive", "activated"].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </div>
                ) : filteredCompanies(tab === "all" ? undefined : tab as any).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune entreprise dans cette catégorie
                  </div>
                ) : (
                  filteredCompanies(tab === "all" ? undefined : tab as any).map((company) => (
                    <div
                      key={company.company_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{company.company_name}</span>
                            {getStatusBadge(company.activation_status)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Beta depuis:{" "}
                            {company.beta_started_at
                              ? format(new Date(company.beta_started_at), "d MMM yyyy", {
                                  locale: fr,
                                })
                              : "N/A"}
                            {company.last_activity_at && (
                              <>
                                {" "}
                                • Dernière activité:{" "}
                                {format(new Date(company.last_activity_at), "d MMM HH:mm", {
                                  locale: fr,
                                })}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm font-medium">Checklist</div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={company.checklist_progress}
                              className="w-20 h-2"
                            />
                            <span className="text-xs text-muted-foreground">
                              {Math.round(company.checklist_progress)}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">Événements</div>
                          <div className="text-lg">{company.total_events}</div>
                        </div>
                        {company.days_inactive > 0 && company.days_inactive < 999 && (
                          <div className="text-right">
                            <div className="text-sm font-medium">Inactif</div>
                            <div
                              className={`text-lg ${
                                company.days_inactive >= 5
                                  ? "text-red-600"
                                  : company.days_inactive >= 3
                                  ? "text-amber-600"
                                  : ""
                              }`}
                            >
                              {company.days_inactive}j
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
