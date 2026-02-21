import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, TrendingUp, Users, BarChart3, AlertTriangle, CheckCircle } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = {
  segment_a: "Porteur", segment_b: "Structuré", segment_c: "Exploitant", segment_d: "Multi-sites",
};

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k€`;
  return `${Math.round(n)}€`;
}

function iciColor(s: number) {
  return s >= 75 ? "text-green-500" : s >= 55 ? "text-amber-500" : "text-red-500";
}

function zTest(nA: number, convA: number, nB: number, convB: number): number | null {
  if (nA < 10 || nB < 10) return null;
  const pA = convA / nA, pB = convB / nB;
  const p = (convA + convB) / (nA + nB);
  const se = Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB));
  if (se === 0) return null;
  const z = Math.abs(pA - pB) / se;
  if (z > 2.576) return 99;
  if (z > 1.96) return 95;
  if (z > 1.645) return 90;
  return Math.round(z * 30);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformABTestPage() {
  const [range, setRange] = useState(30);
  const { t } = useTranslation(['app']);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["ab-test-leads", range],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - range);
      const { data, error } = await supabase
        .from("simulator_leads")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const variantA = leads.filter((l: any) => !l.ab_variant || l.ab_variant === "A");
  const variantB = leads.filter((l: any) => l.ab_variant === "B");
  const nA = variantA.length, nB = variantB.length;
  const avgIciA = nA ? Math.round(variantA.reduce((s: number, l: any) => s + (l.ici_score || 0), 0) / nA) : 0;
  const avgIciB = nB ? Math.round(variantB.reduce((s: number, l: any) => s + (l.ici_score || 0), 0) / nB) : 0;
  const avgRevA = nA ? Math.round(variantA.reduce((s: number, l: any) => s + (l.estimated_monthly_revenue || 0), 0) / nA) : 0;
  const avgRevB = nB ? Math.round(variantB.reduce((s: number, l: any) => s + (l.estimated_monthly_revenue || 0), 0) / nB) : 0;
  const confidence = zTest(nA, nA, nB, nB);
  const minSampleReached = nA >= 50 && nB >= 50;

  return (
    <div className="space-y-6">
      {/* Header — stacks on mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {t('app:abTest.title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t('app:abTest.subtitle', { count: leads.length, range })}
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(r)}
            >
              {r}j
            </Button>
          ))}
        </div>
      </div>

      {/* Test variants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-indigo-500/30 bg-indigo-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-400">{t('app:abTest.variantA')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-lg font-semibold italic">"{t('app:abTest.ctaA')}"</p>
          </CardContent>
        </Card>
        <Card className="border-cyan-500/30 bg-cyan-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-400">{t('app:abTest.variantB')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-lg font-semibold italic">"{t('app:abTest.ctaB')}"</p>
          </CardContent>
        </Card>
      </div>

      {/* Sample warning */}
      {!minSampleReached && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-medium text-amber-500">{t('app:abTest.insufficientData')}</p>
              <p className="text-sm text-muted-foreground">
                {t('app:abTest.insufficientDataDesc', { nA, nB })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: t('app:abTest.leads'), icon: Users, a: nA, b: nB, format: (v: number) => String(v) },
          { label: t('app:abTest.avgIci'), icon: BarChart3, a: avgIciA, b: avgIciB, format: (v: number) => `${v}/100`, colorA: iciColor(avgIciA), colorB: iciColor(avgIciB) },
          { label: t('app:abTest.avgRevenue'), icon: TrendingUp, a: avgRevA, b: avgRevB, format: fmt },
        ].map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <m.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="truncate">{m.label}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="flex justify-between items-end">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-indigo-400 mb-1">A</p>
                  <p className={`text-lg sm:text-2xl font-bold ${m.colorA || ""}`}>{m.format(m.a)}</p>
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground">vs</span>
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-cyan-400 mb-1">B</p>
                  <p className={`text-lg sm:text-2xl font-bold ${m.colorB || ""}`}>{m.format(m.b)}</p>
                </div>
              </div>
              {m.a !== m.b && m.a > 0 && m.b > 0 && (
                <p className={`text-[10px] sm:text-xs mt-2 text-right ${m.b > m.a ? "text-green-500" : "text-red-500"}`}>
                  {t('app:abTest.vsA', { sign: m.b > m.a ? "+" : "", pct: Math.round(((m.b - m.a) / m.a) * 100) })}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Confidence card */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('app:abTest.confidence')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {minSampleReached && confidence !== null ? (
              <>
                <p className={`text-2xl sm:text-3xl font-bold ${confidence >= 95 ? "text-green-500" : confidence >= 90 ? "text-amber-500" : "text-red-500"}`}>
                  {confidence}%
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {confidence >= 95 ? `✓ ${t('app:abTest.reliableResult')}` : confidence >= 90 ? `~ ${t('app:abTest.clearTrend')}` : `⚠ ${t('app:abTest.continueTest')}`}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold text-muted-foreground">—</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{t('app:abTest.waitingData')}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendation */}
      {minSampleReached && (
        <Card className={confidence !== null && confidence >= 95 ? "border-green-500/30" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {t('app:abTest.recommendation')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {confidence !== null && confidence >= 95 ? (
              <p className="text-sm">
                {avgRevB > avgRevA || avgIciB > avgIciA
                  ? t('app:abTest.recommendB')
                  : t('app:abTest.recommendA')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('app:abTest.collectMore')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent leads table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('app:abTest.recentLeads')}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {isLoading ? (
            <p className="text-muted-foreground text-sm text-center py-4">{t('app:abTest.loading')}</p>
          ) : leads.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">{t('app:abTest.noLeads')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border">
                    {[t('app:abTest.date'), t('app:abTest.email'), t('app:abTest.segment'), t('app:abTest.ici'), t('app:abTest.revMonth'), t('app:abTest.variant')].map((h) => (
                      <th key={h} className="text-left py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...leads].reverse().slice(0, 20).map((l: any) => (
                    <tr key={l.id} className="border-b border-border/50">
                      <td className="py-2 px-2 sm:px-3 text-muted-foreground text-xs sm:text-sm">{new Date(l.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</td>
                      <td className="py-2 px-2 sm:px-3 max-w-[120px] sm:max-w-[160px] truncate text-xs sm:text-sm">{l.email}</td>
                      <td className="py-2 px-2 sm:px-3">
                        <Badge variant="outline" className="text-[10px] sm:text-xs">{SEGMENT_LABELS[l.segmentation_type] || l.segmentation_type}</Badge>
                      </td>
                      <td className={`py-2 px-2 sm:px-3 font-semibold text-xs sm:text-sm ${iciColor(l.ici_score)}`}>{Math.round(l.ici_score)}</td>
                      <td className="py-2 px-2 sm:px-3 text-primary text-xs sm:text-sm">{fmt(l.estimated_monthly_revenue)}</td>
                      <td className="py-2 px-2 sm:px-3">
                        <Badge variant={l.ab_variant === "B" ? "secondary" : "default"} className="text-[10px] sm:text-xs font-bold">
                          {l.ab_variant || "A"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('app:abTest.decisionThreshold')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { pct: "< 90%", label: t('app:abTest.continue'), color: "text-red-500" },
              { pct: "90–94%", label: t('app:abTest.trend'), color: "text-amber-500" },
              { pct: "≥ 95%", label: t('app:abTest.reliable'), color: "text-green-500" },
              { pct: "≥ 99%", label: t('app:abTest.certainty'), color: "text-emerald-500" },
            ].map((item) => (
              <div key={item.pct} className="text-center p-3 rounded-lg bg-muted/50">
                <p className={`font-bold ${item.color}`}>{item.pct}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}