import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, subDays, subHours } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  Building2,
  MessageSquare,
  TrendingDown,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BetaHealthStats {
  totalBetaCompanies: number;
  activeLast24h: number;
  activeLast7d: number;
  companiesWithCriticalErrors: number;
}

interface IssueRow {
  company_id: string;
  company_name: string;
  last_error: string;
  error_type: string;
  count_24h: number;
  last_seen: string;
}

interface SilentCompany {
  id: string;
  name: string;
  last_activity: string | null;
  days_silent: number;
}

interface FeedbackItem {
  id: number;
  message: string;
  type: string;
  urgency: string;
  user_email: string;
  created_at: string;
  route: string;
}

export default function PlatformBetaHealth() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch overview stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["beta-health-stats"],
    queryFn: async (): Promise<BetaHealthStats> => {
      // Get beta companies count
      const { count: totalBetaCompanies } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true })
        .eq("is_beta", true);

      // Get events for last 24h/7d from beta companies
      const now = new Date();
      const twentyFourHoursAgo = subHours(now, 24).toISOString();
      const sevenDaysAgo = subDays(now, 7).toISOString();

      const { data: recentEvents } = await supabase
        .from("system_events")
        .select("meta, created_at")
        .eq("source", "beta_observability")
        .gte("created_at", sevenDaysAgo);

      const companiesActive24h = new Set<string>();
      const companiesActive7d = new Set<string>();
      const companiesWithErrors = new Set<string>();

      (recentEvents || []).forEach((event) => {
        const meta = event.meta as Record<string, unknown> | null;
        if (meta?.beta_company && meta?.company_id) {
          const companyId = meta.company_id as string;
          companiesActive7d.add(companyId);
          
          if (new Date(event.created_at) >= new Date(twentyFourHoursAgo)) {
            companiesActive24h.add(companyId);
          }
        }
      });

      // Get critical errors count
      const { data: criticalEvents } = await supabase
        .from("system_events")
        .select("meta")
        .eq("source", "beta_observability")
        .eq("severity", "error")
        .gte("created_at", twentyFourHoursAgo);

      (criticalEvents || []).forEach((event) => {
        const meta = event.meta as Record<string, unknown> | null;
        if (meta?.beta_company && meta?.company_id) {
          companiesWithErrors.add(meta.company_id as string);
        }
      });

      return {
        totalBetaCompanies: totalBetaCompanies || 0,
        activeLast24h: companiesActive24h.size,
        activeLast7d: companiesActive7d.size,
        companiesWithCriticalErrors: companiesWithErrors.size,
      };
    },
    staleTime: 60000, // 1 minute
  });

  // Fetch issues
  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ["beta-health-issues"],
    queryFn: async (): Promise<IssueRow[]> => {
      const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();

      const { data: errorEvents } = await supabase
        .from("system_events")
        .select("meta, code, created_at, message")
        .eq("source", "beta_observability")
        .in("severity", ["error", "warn"])
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false });

      // Group by company
      const companyIssues = new Map<string, IssueRow>();

      for (const event of errorEvents || []) {
        const meta = event.meta as Record<string, unknown> | null;
        if (!meta?.company_id) continue;

        const companyId = meta.company_id as string;
        const existing = companyIssues.get(companyId);

        if (existing) {
          existing.count_24h++;
          if (new Date(event.created_at) > new Date(existing.last_seen)) {
            existing.last_seen = event.created_at;
            existing.last_error = event.message;
            existing.error_type = event.code || "unknown";
          }
        } else {
          companyIssues.set(companyId, {
            company_id: companyId,
            company_name: companyId.slice(0, 8), // Will be enriched
            last_error: event.message,
            error_type: event.code || "unknown",
            count_24h: 1,
            last_seen: event.created_at,
          });
        }
      }

      // Enrich with company names
      const companyIds = Array.from(companyIssues.keys());
      if (companyIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", companyIds);

        (orgs || []).forEach((org) => {
          const issue = companyIssues.get(org.id);
          if (issue) {
            issue.company_name = org.name;
          }
        });
      }

      return Array.from(companyIssues.values()).sort((a, b) => b.count_24h - a.count_24h);
    },
    staleTime: 60000,
  });

  // Fetch silent companies
  const { data: silentCompanies, isLoading: silentLoading } = useQuery({
    queryKey: ["beta-health-silent"],
    queryFn: async (): Promise<SilentCompany[]> => {
      const threeDaysAgo = subDays(new Date(), 3).toISOString();

      // Get all beta companies
      const { data: betaOrgs } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("is_beta", true);

      if (!betaOrgs || betaOrgs.length === 0) return [];

      // Get last activity for each
      const { data: recentEvents } = await supabase
        .from("system_events")
        .select("meta, created_at")
        .eq("source", "beta_observability")
        .order("created_at", { ascending: false });

      const lastActivity = new Map<string, string>();
      (recentEvents || []).forEach((event) => {
        const meta = event.meta as Record<string, unknown> | null;
        if (meta?.company_id && !lastActivity.has(meta.company_id as string)) {
          lastActivity.set(meta.company_id as string, event.created_at);
        }
      });

      const now = new Date();
      return betaOrgs
        .map((org) => {
          const lastAct = lastActivity.get(org.id);
          const daysSilent = lastAct
            ? Math.floor((now.getTime() - new Date(lastAct).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          return {
            id: org.id,
            name: org.name,
            last_activity: lastAct || null,
            days_silent: daysSilent,
          };
        })
        .filter((c) => c.days_silent >= 3)
        .sort((a, b) => b.days_silent - a.days_silent);
    },
    staleTime: 60000,
  });

  // Fetch recent feedback
  const { data: feedbackList, isLoading: feedbackLoading } = useQuery({
    queryKey: ["beta-health-feedback"],
    queryFn: async (): Promise<FeedbackItem[]> => {
      const { data } = await supabase
        .from("system_events")
        .select("id, meta, created_at, message")
        .eq("source", "beta_feedback")
        .order("created_at", { ascending: false })
        .limit(50);

      return (data || []).map((event) => {
        const meta = event.meta as Record<string, unknown> | null;
        return {
          id: event.id,
          message: (meta?.message as string) || event.message,
          type: (meta?.feedback_type as string) || "unknown",
          urgency: (meta?.urgency as string) || "medium",
          user_email: (meta?.user_email as string) || "—",
          created_at: event.created_at,
          route: (meta?.route as string) || "—",
        };
      });
    },
    staleTime: 60000,
  });

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "high":
        return <Badge variant="destructive">Élevée</Badge>;
      case "medium":
        return <Badge variant="secondary">Moyenne</Badge>;
      default:
        return <Badge variant="outline">Faible</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "bug":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Bug</Badge>;
      case "confusion":
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Confusion</Badge>;
      default:
        return <Badge className="bg-primary/20 text-primary border-primary/30">Suggestion</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Beta Health</h1>
          <p className="text-muted-foreground">
            Observabilité et suivi des entreprises en beta
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchStats()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="issues">Problèmes</TabsTrigger>
          <TabsTrigger value="silent">Inactifs</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Entreprises Beta</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalBetaCompanies || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Actives (24h)</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.activeLast24h || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Actives (7j)</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.activeLast7d || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Erreurs critiques</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-destructive">
                    {stats?.companiesWithCriticalErrors || 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/admin/sales/beta")}>
              <CardHeader className="flex flex-row items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Gestion Beta</CardTitle>
                  <CardDescription>Enrôler et gérer les entreprises beta</CardDescription>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab("feedback")}>
              <CardHeader className="flex flex-row items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Feedback récent</CardTitle>
                  <CardDescription>
                    {feedbackList?.length || 0} retours en attente
                  </CardDescription>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>Problèmes détectés (24h)</CardTitle>
              <CardDescription>
                Entreprises avec des erreurs récentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {issuesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : issues && issues.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Dernière erreur</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Occurrences</TableHead>
                      <TableHead>Dernière vue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.map((issue) => (
                      <TableRow key={issue.company_id}>
                        <TableCell className="font-medium">
                          {issue.company_name}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {issue.last_error}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{issue.error_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={issue.count_24h > 5 ? "destructive" : "secondary"}>
                            {issue.count_24h}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(issue.last_seen), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun problème détecté dans les dernières 24h
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Silent Companies Tab */}
        <TabsContent value="silent">
          <Card>
            <CardHeader>
              <CardTitle>Entreprises inactives</CardTitle>
              <CardDescription>
                Aucune activité depuis 3 jours ou plus
              </CardDescription>
            </CardHeader>
            <CardContent>
              {silentLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : silentCompanies && silentCompanies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Dernière activité</TableHead>
                      <TableHead>Jours inactifs</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {silentCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {company.last_activity
                            ? formatDistanceToNow(new Date(company.last_activity), {
                                addSuffix: true,
                                locale: fr,
                              })
                            : "Jamais"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={company.days_silent >= 7 ? "destructive" : "secondary"}>
                            {company.days_silent} jours
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">
                            Contacter
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Toutes les entreprises beta sont actives
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle>Feedback reçu</CardTitle>
              <CardDescription>
                Retours des utilisateurs beta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : feedbackList && feedbackList.length > 0 ? (
                <div className="space-y-4">
                  {feedbackList.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(feedback.type)}
                        {getUrgencyBadge(feedback.urgency)}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(feedback.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>
                      <p className="text-sm">{feedback.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{feedback.user_email}</span>
                        <span>•</span>
                        <span>{feedback.route}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun feedback reçu
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
