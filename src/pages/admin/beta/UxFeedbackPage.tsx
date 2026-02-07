/**
 * Admin dashboard for page-by-page UX feedback.
 * 
 * Displays collected UX feedback with filters for:
 * - clarity_score
 * - issue_type
 * - page_path
 * - date range
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { 
  ThumbsUp, 
  Meh, 
  ThumbsDown, 
  FileText,
  Filter,
  BarChart3,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ClarityScore = "clear" | "partial" | "unclear";
type IssueType = "understanding" | "complexity" | "missing_explanation" | "technical" | "other" | null;

interface UxFeedbackEntry {
  id: string;
  page_path: string;
  user_id: string | null;
  company_id: string | null;
  user_role: string | null;
  clarity_score: ClarityScore;
  issue_type: IssueType;
  message: string | null;
  created_at: string;
}

const clarityLabels: Record<ClarityScore, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  clear: { label: "Clair", icon: ThumbsUp, color: "text-green-600 bg-green-50" },
  partial: { label: "Partiel", icon: Meh, color: "text-amber-600 bg-amber-50" },
  unclear: { label: "Non clair", icon: ThumbsDown, color: "text-red-600 bg-red-50" },
};

const issueLabels: Record<string, string> = {
  understanding: "Compréhension",
  complexity: "Complexité",
  missing_explanation: "Explications manquantes",
  technical: "Technique",
  other: "Autre",
};

export default function UxFeedbackPage() {
  const [clarityFilter, setClarityFilter] = useState<string>("all");
  const [issueFilter, setIssueFilter] = useState<string>("all");
  const [pageFilter, setPageFilter] = useState<string>("all");

  // Fetch all UX feedback
  const { data: feedback, isLoading } = useQuery({
    queryKey: ["ux-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ux_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as UxFeedbackEntry[];
    },
  });

  // Get unique page paths for filter
  const uniquePages = useMemo(() => {
    if (!feedback) return [];
    return [...new Set(feedback.map((f) => f.page_path))].sort();
  }, [feedback]);

  // Apply filters
  const filteredFeedback = useMemo(() => {
    if (!feedback) return [];
    return feedback.filter((f) => {
      if (clarityFilter !== "all" && f.clarity_score !== clarityFilter) return false;
      if (issueFilter !== "all" && f.issue_type !== issueFilter) return false;
      if (pageFilter !== "all" && f.page_path !== pageFilter) return false;
      return true;
    });
  }, [feedback, clarityFilter, issueFilter, pageFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!feedback || feedback.length === 0) return null;
    
    const total = feedback.length;
    const clearCount = feedback.filter((f) => f.clarity_score === "clear").length;
    const partialCount = feedback.filter((f) => f.clarity_score === "partial").length;
    const unclearCount = feedback.filter((f) => f.clarity_score === "unclear").length;
    
    const issueBreakdown = feedback
      .filter((f) => f.issue_type)
      .reduce((acc, f) => {
        const issue = f.issue_type!;
        acc[issue] = (acc[issue] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topIssue = Object.entries(issueBreakdown).sort(([, a], [, b]) => b - a)[0];

    return {
      total,
      clearPercent: Math.round((clearCount / total) * 100),
      partialPercent: Math.round((partialCount / total) * 100),
      unclearPercent: Math.round((unclearCount / total) * 100),
      topIssue: topIssue ? { type: topIssue[0], count: topIssue[1] } : null,
    };
  }, [feedback]);

  // Top problematic pages
  const problemPages = useMemo(() => {
    if (!feedback) return [];
    
    const pageStats = feedback.reduce((acc, f) => {
      if (!acc[f.page_path]) {
        acc[f.page_path] = { total: 0, unclear: 0 };
      }
      acc[f.page_path].total++;
      if (f.clarity_score !== "clear") {
        acc[f.page_path].unclear++;
      }
      return acc;
    }, {} as Record<string, { total: number; unclear: number }>);

    return Object.entries(pageStats)
      .map(([path, s]) => ({
        path,
        total: s.total,
        unclear: s.unclear,
        unclearPercent: Math.round((s.unclear / s.total) * 100),
      }))
      .filter((p) => p.unclearPercent > 20 && p.total >= 3)
      .sort((a, b) => b.unclearPercent - a.unclearPercent)
      .slice(0, 5);
  }, [feedback]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">UX Feedback</h1>
          <p className="text-muted-foreground">
            Retours de clarté page par page
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total réponses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <ThumbsUp className="h-4 w-4 text-green-600" />
                Clair
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.clearPercent}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <ThumbsDown className="h-4 w-4 text-red-600" />
                Problèmes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.partialPercent + stats.unclearPercent}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                Principal problème
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {stats.topIssue ? issueLabels[stats.topIssue.type] : "—"}
              </div>
              {stats.topIssue && (
                <p className="text-xs text-muted-foreground">
                  {stats.topIssue.count} mentions
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Problem Pages */}
      {problemPages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Pages à améliorer
            </CardTitle>
            <CardDescription>
              Pages avec plus de 20% de retours négatifs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {problemPages.map((page) => (
                <div
                  key={page.path}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <code className="text-sm">{page.path}</code>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {page.total} réponses
                    </span>
                    <Badge variant="destructive" className="text-xs">
                      {page.unclearPercent}% problèmes
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={clarityFilter} onValueChange={setClarityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Clarté" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="clear">Clair</SelectItem>
                <SelectItem value="partial">Partiel</SelectItem>
                <SelectItem value="unclear">Non clair</SelectItem>
              </SelectContent>
            </Select>

            <Select value={issueFilter} onValueChange={setIssueFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type de problème" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(issueLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={pageFilter} onValueChange={setPageFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les pages</SelectItem>
                {uniquePages.map((path) => (
                  <SelectItem key={path} value={path}>
                    {path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Retours ({filteredFeedback.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Clarté</TableHead>
                  <TableHead>Problème</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedback.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucun feedback trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFeedback.map((entry) => {
                    const clarity = clarityLabels[entry.clarity_score];
                    const ClarityIcon = clarity.icon;
                    
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(entry.created_at), "dd MMM HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {entry.page_path}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("gap-1", clarity.color)}
                          >
                            <ClarityIcon className="h-3 w-3" />
                            {clarity.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.issue_type ? (
                            <span className="text-sm">
                              {issueLabels[entry.issue_type]}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {entry.message ? (
                            <p className="text-sm truncate" title={entry.message}>
                              {entry.message}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {entry.user_role || "guest"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
