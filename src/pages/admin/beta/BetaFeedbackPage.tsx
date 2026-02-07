/**
 * TAEX-306: Admin Beta Feedback View
 * /admin/beta/feedback
 * 
 * Displays structured feedback with filters and grouped counters.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  MessageSquare,
  RefreshCw,
  ThumbsUp,
  Minus,
  ThumbsDown,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface FeedbackRow {
  id: string;
  company_id: string;
  company_name: string;
  user_id: string;
  topic: string;
  sentiment: string;
  message: string | null;
  page_context: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface TopicStats {
  topic: string;
  count: number;
  negative_count: number;
  negative_rate: number;
}

const topicLabels: Record<string, string> = {
  data_import: "Import de données",
  kpis_dashboards: "KPIs / Tableaux de bord",
  financial_projections: "Projections financières",
  ux_navigation: "UX / Navigation",
  onboarding: "Compréhension / Onboarding",
  other: "Autre",
};

const sentimentConfig: Record<string, { label: string; icon: typeof ThumbsUp; color: string; badgeClass: string }> = {
  positive: { label: "Positif", icon: ThumbsUp, color: "text-green-600", badgeClass: "bg-green-500/10 text-green-600 border-green-500/20" },
  neutral: { label: "Neutre", icon: Minus, color: "text-muted-foreground", badgeClass: "bg-muted text-muted-foreground" },
  negative: { label: "Négatif", icon: ThumbsDown, color: "text-destructive", badgeClass: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function BetaFeedbackPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");

  // Fetch all feedback
  const { data: feedbackList, isLoading, refetch } = useQuery({
    queryKey: ["admin-beta-feedback"],
    queryFn: async (): Promise<FeedbackRow[]> => {
      const { data, error } = await supabase
        .from("beta_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with company names
      const companyIds = [...new Set((data || []).map(f => f.company_id))];
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", companyIds);

      const orgMap = new Map((orgs || []).map(o => [o.id, o.name]));

      return (data || []).map(f => ({
        ...f,
        company_name: orgMap.get(f.company_id) || f.company_id.slice(0, 8),
      }));
    },
  });

  // Calculate topic stats
  const topicStats: TopicStats[] = (() => {
    if (!feedbackList) return [];
    
    const statsMap = new Map<string, { count: number; negative_count: number }>();
    
    feedbackList.forEach(f => {
      const existing = statsMap.get(f.topic) || { count: 0, negative_count: 0 };
      existing.count++;
      if (f.sentiment === "negative") existing.negative_count++;
      statsMap.set(f.topic, existing);
    });

    return Array.from(statsMap.entries())
      .map(([topic, stats]) => ({
        topic,
        count: stats.count,
        negative_count: stats.negative_count,
        negative_rate: stats.count > 0 ? Math.round((stats.negative_count / stats.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  })();

  // Mark as reviewed mutation
  const markReviewedMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const { error } = await supabase
        .from("beta_feedback")
        .update({ reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq("id", feedbackId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-beta-feedback"] });
      toast({ title: "Marqué comme lu" });
    },
    onError: () => {
      toast({ title: "Erreur", variant: "destructive" });
    },
  });

  // Filter feedback
  const filteredFeedback = (feedbackList || []).filter(f => {
    if (topicFilter !== "all" && f.topic !== topicFilter) return false;
    if (sentimentFilter !== "all" && f.sentiment !== sentimentFilter) return false;
    return true;
  });

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
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Beta Feedback</h1>
              <p className="text-muted-foreground">
                Retours structurés des entreprises beta
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total feedbacks</CardDescription>
            <CardTitle className="text-3xl">{feedbackList?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ThumbsUp className="h-3.5 w-3.5 text-green-600" /> Positifs
            </CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {feedbackList?.filter(f => f.sentiment === "positive").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Minus className="h-3.5 w-3.5" /> Neutres
            </CardDescription>
            <CardTitle className="text-3xl">
              {feedbackList?.filter(f => f.sentiment === "neutral").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-destructive/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ThumbsDown className="h-3.5 w-3.5 text-destructive" /> Négatifs
            </CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {feedbackList?.filter(f => f.sentiment === "negative").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Topic Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top sujets</CardTitle>
          <CardDescription>Répartition par thème et taux de feedback négatif</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {topicStats.slice(0, 6).map(stat => (
              <div
                key={stat.topic}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{topicLabels[stat.topic] || stat.topic}</div>
                  <div className="text-sm text-muted-foreground">{stat.count} feedback(s)</div>
                </div>
                {stat.negative_rate > 0 && (
                  <Badge
                    variant="outline"
                    className={stat.negative_rate > 30 ? "border-destructive/50 text-destructive" : ""}
                  >
                    {stat.negative_rate}% négatif
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liste des feedbacks</CardTitle>
              <CardDescription>
                {filteredFeedback.length} résultat(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={topicFilter} onValueChange={setTopicFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les sujets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sujets</SelectItem>
                  {Object.entries(topicLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="positive">Positif</SelectItem>
                  <SelectItem value="neutral">Neutre</SelectItem>
                  <SelectItem value="negative">Négatif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun feedback trouvé
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedback.map(feedback => {
                  const sentimentCfg = sentimentConfig[feedback.sentiment] || sentimentConfig.neutral;
                  const SentimentIcon = sentimentCfg.icon;
                  
                  return (
                    <TableRow key={feedback.id} className={feedback.reviewed_at ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{feedback.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {topicLabels[feedback.topic] || feedback.topic}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={sentimentCfg.badgeClass}>
                          <SentimentIcon className="h-3 w-3 mr-1" />
                          {sentimentCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">
                        {feedback.message || <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {feedback.page_context || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(feedback.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>
                        {feedback.reviewed_at ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Lu
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markReviewedMutation.mutate(feedback.id)}
                            disabled={markReviewedMutation.isPending}
                          >
                            Marquer lu
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
