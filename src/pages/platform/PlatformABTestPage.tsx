import { useState } from "react";
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            A/B Test — CTA Simulateur
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test du bouton CTA dans EmailCaptureModal · {leads.length} leads sur {range}j
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-indigo-500/30 bg-indigo-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-400">Variante A (contrôle)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold italic">"RECEVOIR MA SYNTHÈSE"</p>
          </CardContent>
        </Card>
        <Card className="border-cyan-500/30 bg-cyan-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-400">Variante B (challenger)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold italic">"VOIR MES RECOMMANDATIONS"</p>
          </CardContent>
        </Card>
      </div>

      {/* Sample warning */}
      {!minSampleReached && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-medium text-amber-500">Données insuffisantes</p>
              <p className="text-sm text-muted-foreground">
                Minimum 50 leads par variante pour significativité. A: {nA}/50 · B: {nB}/50
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Leads", icon: Users, a: nA, b: nB, format: (v: number) => String(v) },
          { label: "ICI moyen", icon: BarChart3, a: avgIciA, b: avgIciB, format: (v: number) => `${v}/100`, colorA: iciColor(avgIciA), colorB: iciColor(avgIciB) },
          { label: "CA mensuel moy.", icon: TrendingUp, a: avgRevA, b: avgRevB, format: fmt },
        ].map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-center">
                  <p className="text-xs text-indigo-400 mb-1">A</p>
                  <p className={`text-2xl font-bold ${m.colorA || ""}`}>{m.format(m.a)}</p>
                </div>
                <span className="text-xs text-muted-foreground">vs</span>
                <div className="text-center">
                  <p className="text-xs text-cyan-400 mb-1">B</p>
                  <p className={`text-2xl font-bold ${m.colorB || ""}`}>{m.format(m.b)}</p>
                </div>
              </div>
              {m.a !== m.b && m.a > 0 && m.b > 0 && (
                <p className={`text-xs mt-2 text-right ${m.b > m.a ? "text-green-500" : "text-red-500"}`}>
                  B {m.b > m.a ? "+" : ""}{Math.round(((m.b - m.a) / m.a) * 100)}% vs A
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Confidence card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Confiance statistique
            </CardTitle>
          </CardHeader>
          <CardContent>
            {minSampleReached && confidence !== null ? (
              <>
                <p className={`text-3xl font-bold ${confidence >= 95 ? "text-green-500" : confidence >= 90 ? "text-amber-500" : "text-red-500"}`}>
                  {confidence}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {confidence >= 95 ? "✓ Résultat fiable" : confidence >= 90 ? "~ Tendance claire" : "⚠ Continuer le test"}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground mt-1">En attente de données</p>
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
              Recommandation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {confidence !== null && confidence >= 95 ? (
              <p className="text-sm">
                {avgRevB > avgRevA || avgIciB > avgIciA
                  ? "La variante B performe mieux. Mettre à jour le CTA avec 'VOIR MES RECOMMANDATIONS' et désactiver l'A/B test."
                  : "La variante A performe mieux. Conserver le CTA actuel 'RECEVOIR MA SYNTHÈSE' et désactiver l'A/B test."}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Continuer à collecter des données. Revenir lorsque la confiance atteint 95%+.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent leads table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Derniers leads avec variante</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm text-center py-4">Chargement...</p>
          ) : leads.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Aucun lead</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Date", "Email", "Segment", "ICI", "CA/mois", "Variante"].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...leads].reverse().slice(0, 20).map((l: any) => (
                    <tr key={l.id} className="border-b border-border/50">
                      <td className="py-2 px-3 text-muted-foreground">{new Date(l.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</td>
                      <td className="py-2 px-3 max-w-[160px] truncate">{l.email}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs">{SEGMENT_LABELS[l.segmentation_type] || l.segmentation_type}</Badge>
                      </td>
                      <td className={`py-2 px-3 font-semibold ${iciColor(l.ici_score)}`}>{Math.round(l.ici_score)}</td>
                      <td className="py-2 px-3 text-primary">{fmt(l.estimated_monthly_revenue)}</td>
                      <td className="py-2 px-3">
                        <Badge variant={l.ab_variant === "B" ? "secondary" : "default"} className="text-xs font-bold">
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
          <CardTitle className="text-sm">Seuil de décision</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { pct: "< 90%", label: "Continuer", color: "text-red-500" },
              { pct: "90–94%", label: "Tendance", color: "text-amber-500" },
              { pct: "≥ 95%", label: "Fiable", color: "text-green-500" },
              { pct: "≥ 99%", label: "Certitude", color: "text-emerald-500" },
            ].map((t) => (
              <div key={t.pct} className="text-center p-3 rounded-lg bg-muted/50">
                <p className={`font-bold ${t.color}`}>{t.pct}</p>
                <p className="text-xs text-muted-foreground">{t.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
