/**
 * TAEX-247: Data Trust Score Admin Page
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  Calendar,
  FileDown,
  Filter
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

interface TrustImport {
  id: string;
  company_id: string;
  import_id: string;
  dts_score: number;
  invalid_rate: number;
  mapping_rate: number;
  duplicate_rate: number;
  top_flags: any[];
  created_at: string;
  import_batches?: {
    filename: string;
    total_rows: number;
    imported_rows: number;
  };
  sites?: {
    name: string;
  };
}

interface TrustDay {
  id: string;
  company_id: string;
  day: string;
  dts_score: number;
  invalid_rate: number;
  excluded_revenue: number;
  top_flags: any[];
  sites?: {
    name: string;
  };
}

interface FlagCount {
  flag: string;
  count: number;
}

export default function DataTrustScorePage() {
  const [viewMode, setViewMode] = useState<'imports' | 'days'>('imports');
  const [scoreFilter, setScoreFilter] = useState<string>("all");

  // Fetch import trust scores
  const { data: trustImports, isLoading: loadingImports } = useQuery({
    queryKey: ['trust_import', scoreFilter],
    queryFn: async () => {
      let query = supabase
        .from('trust_import')
        .select(`
          *,
          import_batches(filename, total_rows, imported_rows),
          sites(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (scoreFilter === 'low') {
        query = query.lt('dts_score', 60);
      } else if (scoreFilter === 'medium') {
        query = query.gte('dts_score', 60).lt('dts_score', 80);
      } else if (scoreFilter === 'high') {
        query = query.gte('dts_score', 80);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrustImport[];
    },
    enabled: viewMode === 'imports'
  });

  // Fetch daily trust scores
  const { data: trustDays, isLoading: loadingDays } = useQuery({
    queryKey: ['trust_day', scoreFilter],
    queryFn: async () => {
      let query = supabase
        .from('trust_day')
        .select(`
          *,
          sites(name)
        `)
        .gte('day', format(subDays(new Date(), 30), 'yyyy-MM-dd'))
        .order('day', { ascending: false })
        .limit(200);

      if (scoreFilter === 'low') {
        query = query.lt('dts_score', 60);
      } else if (scoreFilter === 'medium') {
        query = query.gte('dts_score', 60).lt('dts_score', 80);
      } else if (scoreFilter === 'high') {
        query = query.gte('dts_score', 80);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrustDay[];
    },
    enabled: viewMode === 'days'
  });

  // Aggregate flag counts
  const flagCounts = (): FlagCount[] => {
    const counts: Record<string, number> = {};
    
    const items = viewMode === 'imports' ? trustImports : trustDays;
    items?.forEach(item => {
      const flags = item.top_flags as any[];
      if (Array.isArray(flags)) {
        flags.forEach(f => {
          const flag = typeof f === 'string' ? f : f.flag;
          const count = typeof f === 'object' ? f.count : 1;
          counts[flag] = (counts[flag] || 0) + count;
        });
      }
    });

    return Object.entries(counts)
      .map(([flag, count]) => ({ flag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const isLoading = viewMode === 'imports' ? loadingImports : loadingDays;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Data Trust Score
          </h1>
          <p className="text-muted-foreground">
            Surveillez la qualité et fiabilité des données importées
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Score moyen</p>
                <p className="text-2xl font-bold">
                  {viewMode === 'imports'
                    ? (trustImports?.reduce((sum, i) => sum + i.dts_score, 0) / (trustImports?.length || 1)).toFixed(0)
                    : (trustDays?.reduce((sum, d) => sum + d.dts_score, 0) / (trustDays?.length || 1)).toFixed(0)
                  }%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Imports critiques</p>
                <p className="text-2xl font-bold">
                  {trustImports?.filter(i => i.dts_score < 60).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jours problématiques</p>
                <p className="text-2xl font-bold">
                  {trustDays?.filter(d => d.dts_score < 60).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <FileDown className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Imports analysés</p>
                <p className="text-2xl font-bold">
                  {trustImports?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'imports' ? 'default' : 'outline'}
                onClick={() => setViewMode('imports')}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Par import
              </Button>
              <Button
                variant={viewMode === 'days' ? 'default' : 'outline'}
                onClick={() => setViewMode('days')}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Par jour
              </Button>
            </div>
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les scores</SelectItem>
                <SelectItem value="high">Élevé (≥80)</SelectItem>
                <SelectItem value="medium">Moyen (60-79)</SelectItem>
                <SelectItem value="low">Critique (&lt;60)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {viewMode === 'imports' ? 'Scores par import' : 'Scores par jour'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {viewMode === 'imports' ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Site</TableHead>
                        <TableHead>Fichier</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Taux invalide</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Chargement...
                          </TableCell>
                        </TableRow>
                      ) : trustImports?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Aucun import analysé
                          </TableCell>
                        </TableRow>
                      ) : (
                        trustImports?.map((ti) => (
                          <TableRow key={ti.id}>
                            <TableCell className="font-medium">
                              {ti.sites?.name || 'N/A'}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate text-xs">
                              {ti.import_batches?.filename || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={ti.dts_score} 
                                  className="w-16 h-2"
                                />
                                <span className={`font-bold ${getScoreColor(ti.dts_score)}`}>
                                  {ti.dts_score}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={ti.invalid_rate > 0.1 ? "destructive" : "secondary"}>
                                {(ti.invalid_rate * 100).toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(ti.created_at), 'dd MMM yyyy', { locale: fr })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Site</TableHead>
                        <TableHead>Jour</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Taux invalide</TableHead>
                        <TableHead>CA exclu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Chargement...
                          </TableCell>
                        </TableRow>
                      ) : trustDays?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Aucune donnée journalière
                          </TableCell>
                        </TableRow>
                      ) : (
                        trustDays?.map((td) => (
                          <TableRow key={td.id}>
                            <TableCell className="font-medium">
                              {td.sites?.name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {format(new Date(td.day), 'dd MMM yyyy', { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={td.dts_score} 
                                  className="w-16 h-2"
                                />
                                <span className={`font-bold ${getScoreColor(td.dts_score)}`}>
                                  {td.dts_score}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={td.invalid_rate > 0.1 ? "destructive" : "secondary"}>
                                {(td.invalid_rate * 100).toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">
                              {td.excluded_revenue.toFixed(2)}€
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Top Flags */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Flags</CardTitle>
            </CardHeader>
            <CardContent>
              {flagCounts().length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Aucun flag détecté
                </p>
              ) : (
                <div className="space-y-3">
                  {flagCounts().map(({ flag, count }) => (
                    <div key={flag} className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-xs">
                        {flag}
                      </Badge>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* DTS Thresholds Info */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Seuils DTS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>≥80% : Données fiables</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>60-79% : À surveiller</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>&lt;60% : Recommandations bloquées</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
