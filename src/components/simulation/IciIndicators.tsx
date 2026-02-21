import { QualifData } from "@/components/SimulatorQualification";
import { SimulationResults, SimulationProject } from "@/types/simulation";
import { Info, TrendingUp, ShieldAlert, Activity } from "lucide-react";

interface Props {
  qualifData: QualifData | null | undefined;
  results: SimulationResults;
  project: SimulationProject;
}

// ─── Score helpers ─────────────────────────────────────────────────────────────

function getCapitalScore(capital: QualifData["capital_range"]): number {
  return { lt20k: 20, "20_50k": 45, "50_100k": 70, gt100k: 90 }[capital] ?? 45;
}

function getAmbitionScore(machines: QualifData["machine_range"]): number {
  return { "1_4": 25, "5_8": 50, "9_14": 75, "15plus": 95 }[machines] ?? 50;
}

function getDensityScore(zone: string): number {
  if (zone?.toLowerCase().includes("fort") || zone?.toLowerCase().includes("high")) return 80;
  if (zone?.toLowerCase().includes("faib") || zone?.toLowerCase().includes("low")) return 40;
  return 65;
}

function getStageModifier(stage: QualifData["stage"]): number {
  return { exploring: 0.9, location: 1.0, financing: 1.05, operator: 1.1 }[stage] ?? 1.0;
}

function computeIci(qualifData: QualifData, zone: string) {
  const C = getCapitalScore(qualifData.capital_range);
  const A = getAmbitionScore(qualifData.machine_range);
  const D = getDensityScore(zone);
  const S = getStageModifier(qualifData.stage);

  const gap = A - C;
  const penalty = gap <= 0 ? 0 : Math.min(40, gap * 0.6);
  const bonus = (D - 50) * 0.1;
  const ici = Math.max(0, Math.min(100, (100 - penalty) * S + bonus));

  return { ici: Math.round(ici), gap };
}

function getRiskLevel(ici: number, gap: number): "low" | "moderate" | "high" {
  if (ici >= 75 && gap <= 15) return "low";
  if (ici < 55 || gap > 30) return "high";
  return "moderate";
}

function getTrajectory(ici: number, results: SimulationResults): "stable" | "tendue" | "fragile" {
  const r = results.estimated_profit_month;
  const revenueScore = r > 2000 ? 80 : r > 1000 ? 60 : r > 0 ? 45 : 30;
  if (ici >= 70 && revenueScore >= 60) return "stable";
  if (ici < 55 || revenueScore < 45) return "fragile";
  return "tendue";
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

const RISK_CONFIG = {
  low:      { label: "Faible",   bg: "bg-green-50",  border: "border-green-200",  badge: "bg-green-100 text-green-700",  dot: "bg-green-500" },
  moderate: { label: "Modéré",   bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500" },
  high:     { label: "Élevé",    bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-100 text-red-700",      dot: "bg-red-500"   },
};

const TRAJ_CONFIG = {
  stable:   { label: "Stable",   bg: "bg-green-50",  border: "border-green-200",  badge: "bg-green-100 text-green-700",  dot: "bg-green-500"  },
  tendue:   { label: "Tendue",   bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500"  },
  fragile:  { label: "Fragile",  bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-100 text-red-700",      dot: "bg-red-500"    },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function IciIndicators({ qualifData, results, project }: Props) {
  if (!qualifData) return null;

  const zone = (project as any).zone || (project as any).density_zone || "normal";
  const { ici, gap } = computeIci(qualifData, zone);
  const risk = getRiskLevel(ici, gap);
  const trajectory = getTrajectory(ici, results);

  const riskCfg = RISK_CONFIG[risk];
  const trajCfg = TRAJ_CONFIG[trajectory];

  const iciColor =
    ici >= 75 ? "text-green-600" : ici >= 55 ? "text-amber-600" : "text-red-600";
  const iciBarColor =
    ici >= 75 ? "bg-green-500" : ici >= 55 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-4">
      {/* Titre section */}
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          Analyse de cohérence projet
        </h3>
      </div>

      {/* 3 blocs en grille */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Bloc 1 — Risque */}
        <div className={`rounded-xl border p-5 ${riskCfg.bg} ${riskCfg.border}`}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Niveau de risque
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full ${riskCfg.dot}`} />
            <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${riskCfg.badge}`}>
              {riskCfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {risk === "low" && "Bonne cohérence entre ambition et capacité."}
            {risk === "moderate" && "Quelques écarts à surveiller."}
            {risk === "high" && "Ambition élevée par rapport au capital prévu."}
          </p>
        </div>

        {/* Bloc 2 — ICI */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Indice ICI
            </span>
          </div>
          <div className={`text-3xl font-bold mb-3 ${iciColor}`}>
            {ici}/100
          </div>
          {/* Barre de progression */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${iciBarColor}`}
              style={{ width: `${ici}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Cohérence investissement / ambition / zone
          </p>
        </div>

        {/* Bloc 3 — Trajectoire */}
        <div className={`rounded-xl border p-5 ${trajCfg.bg} ${trajCfg.border}`}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Trajectoire
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full ${trajCfg.dot}`} />
            <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${trajCfg.badge}`}>
              {trajCfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {trajectory === "stable" && "Rentabilité solide sur la durée."}
            {trajectory === "tendue" && "Marges à surveiller, ajustements possibles."}
            {trajectory === "fragile" && "Projet à retravailler avant de vous lancer."}
          </p>
        </div>

      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Estimation indicative basée sur des moyennes sectorielles et vos paramètres de qualification.
          Le simulateur complet intègre vos coûts réels et votre structure de financement.
        </p>
      </div>
    </div>
  );
}
