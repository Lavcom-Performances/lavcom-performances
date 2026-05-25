/**
 * FreeEmailCaptureModal — Email capture adapted for the FREE simulator (/simulateur).
 * Uses the free simulator's result shape (monthlyRevenue) instead of SaaS SimulationResults.
 * Reuses segmentation logic from EmailCaptureModal.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, X, Mail, CheckCircle2, Loader2, CheckCircle } from "lucide-react";
import { QualifData } from "@/components/SimulatorQualification";
import { supabase } from "@/integrations/supabase/client";
import { useABVariant, type ABVariant } from "@/hooks/useABVariant";
import { trackEmailSubmitted } from "@/lib/analytics";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SegmentType = "segment_a" | "segment_b" | "segment_c" | "segment_d";

export interface FreeLeadData {
  email: string;
  segmentation_type: SegmentType;
  ici_score: number;
  gap_score: number;
  stage: string;
  capital_range: string;
  machine_range: string;
  estimated_monthly_revenue: number;
  estimated_annual_revenue: number;
  ab_variant: ABVariant;
}

/** Minimal result shape from the free simulator */
export interface FreeSimulatorResults {
  monthlyRevenue: number;
}

interface Props {
  qualifData: QualifData;
  freeResults: FreeSimulatorResults;
  onComplete: (lead: FreeLeadData) => void;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeIciAndGap(qualifData: QualifData) {
  const capitalMap: Record<string, number> = { lt20k: 20, "20_50k": 45, "50_100k": 70, gt100k: 90 };
  const ambitionMap: Record<string, number> = { "1_4": 25, "5_8": 50, "9_14": 75, "15plus": 95 };
  const stageMap: Record<string, number> = { exploring: 0.9, location: 1.0, financing: 1.05, operator: 1.1 };

  const C = capitalMap[qualifData.capital_range] ?? 45;
  const A = ambitionMap[qualifData.machine_range] ?? 50;
  const S = stageMap[qualifData.stage] ?? 1.0;
  const gap = A - C;
  const penalty = gap <= 0 ? 0 : Math.min(40, gap * 0.6);
  const ici = Math.max(0, Math.min(100, (100 - penalty) * S));

  return { ici: Math.round(ici), gap };
}

function computeSegment(qualifData: QualifData, ici: number): SegmentType {
  if (qualifData.machine_range === "15plus") return "segment_d";
  if (qualifData.stage === "operator") return "segment_c";
  if (
    (qualifData.stage === "financing" || qualifData.stage === "location") &&
    (qualifData.capital_range === "50_100k" || qualifData.capital_range === "gt100k") &&
    ici >= 60
  ) return "segment_b";
  return "segment_a";
}

async function persistLead(
  lead: FreeLeadData,
  antiAbuse: { website: string; elapsed_ms: number }
): Promise<void> {
  const payload = {
    email: lead.email.toLowerCase().trim(),
    stage: lead.stage,
    capital_range: lead.capital_range,
    machine_range: lead.machine_range,
    zone_selected: null,
    estimated_monthly_revenue: lead.estimated_monthly_revenue,
    estimated_annual_revenue: lead.estimated_annual_revenue,
    ici_score: lead.ici_score,
    gap_score: lead.gap_score,
    segmentation_type: lead.segmentation_type,
    ab_variant: lead.ab_variant,
    website: antiAbuse.website,
    elapsed_ms: antiAbuse.elapsed_ms,
  };

  try {
    const response = await supabase.functions.invoke("create-simulator-lead", { body: payload });
    if (response.error) throw new Error("Edge function failed");
  } catch (edgeFnError) {
    console.warn("Edge function unavailable, falling back to direct insert:", edgeFnError);
    try {
      const { website, elapsed_ms, ...dbPayload } = payload;
      await supabase.from("simulator_leads").insert(dbPayload as any);
    } catch (directInsertError) {
      console.error("Direct insert also failed:", directInsertError);
    }
  }
}


function capitalLabel(range: string): string {
  const map: Record<string, string> = {
    lt20k: "< 20k €", "20_50k": "20–50k €", "50_100k": "50–100k €", gt100k: "> 100k €",
  };
  return map[range] || range;
}

function machineLabel(range: string): string {
  const map: Record<string, string> = {
    "1_4": "1–4 machines", "5_8": "5–8 machines", "9_14": "9–14 machines", "15plus": "15+ machines",
  };
  return map[range] || range;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FreeEmailCaptureModal({ qualifData, freeResults, onComplete, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [mountedAt] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { t } = useTranslation(['app']);
  const { variant, ctaLabel } = useABVariant("cta_button");

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async () => {
    if (!isValidEmail(email)) {
      setError(t('app:emailCapture.invalidEmail'));
      return;
    }
    setError("");
    setLoading(true);

    const { ici, gap } = computeIciAndGap(qualifData);
    const segmentation_type = computeSegment(qualifData, ici);

    const lead: FreeLeadData = {
      email,
      segmentation_type,
      ici_score: ici,
      gap_score: gap,
      stage: qualifData.stage,
      capital_range: qualifData.capital_range,
      machine_range: qualifData.machine_range,
      estimated_monthly_revenue: freeResults.monthlyRevenue,
      estimated_annual_revenue: freeResults.monthlyRevenue * 12,
      ab_variant: variant,
    };

    await Promise.all([
      new Promise((r) => setTimeout(r, 1200)),
      persistLead(lead, { website, elapsed_ms: Date.now() - mountedAt }),
    ]);

    trackEmailSubmitted({
      segmentation_type: lead.segmentation_type,
      ab_variant: lead.ab_variant,
      ici_score: lead.ici_score,
    });

    setLoading(false);
    setIsSuccess(true);
    setTimeout(() => onComplete(lead), 600);
  };

  const stageKey = qualifData.stage as "exploring" | "location" | "financing" | "operator";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {isSuccess ? (
          <div className="flex flex-col items-center text-center gap-4 py-12 px-8">
            <CheckCircle size={48} className="text-accent" />
            <p className="font-semibold text-lg text-foreground">{t('app:emailCapture.ready')}</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center text-center gap-4 py-12 px-8">
            <Loader2 size={40} className="animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">{t('app:emailCapture.preparing')}</p>
          </div>
        ) : (
          <>
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10">
              <X size={20} />
            </button>

            <div className="bg-gradient-to-br from-accent to-accent/80 px-6 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 text-accent-foreground">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <Mail size={24} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold leading-snug">{t('app:emailCapture.title')}</h2>
              <p className="text-accent-foreground/80 text-sm mt-1">{t('app:emailCapture.subtitle')}</p>
            </div>

            <div className="px-6 sm:px-8 py-5 sm:py-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                {[
                  t(`app:emailCapture.stages.${stageKey}`),
                  capitalLabel(qualifData.capital_range),
                  machineLabel(qualifData.machine_range),
                ].map((tag) => (
                  <span key={tag} className="text-xs bg-muted border border-border text-muted-foreground rounded-full px-3 py-1">{tag}</span>
                ))}
              </div>

              {/* Honeypot — hidden from real users, must stay empty */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                aria-hidden="true"
              />

              <div className="space-y-2">

                <label className="text-sm font-semibold text-foreground">{t('app:emailCapture.emailLabel')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder={t('app:emailCapture.emailPlaceholder')}
                  className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all bg-muted
                    ${error ? "border-destructive bg-destructive/5" : "border-border focus:border-accent"}`}
                  autoFocus
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl
                  bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-sm
                  transition-all shadow-lg shadow-accent/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {ctaLabel}
                <ArrowRight size={16} />
              </button>

              <div className="flex items-center gap-3 pt-1">
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                <p className="text-xs text-muted-foreground">{t('app:emailCapture.reassurance')}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
