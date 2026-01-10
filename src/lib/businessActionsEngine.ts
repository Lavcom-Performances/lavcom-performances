// Business Actions Engine - Rule-based recommendations
import type { BusinessAction, BusinessActionsData, EffortLevel } from "@/types/businessActions";

interface RuleContext {
  data: BusinessActionsData;
  t: (key: string) => string;
}

interface ActionRule {
  id: string;
  condition: (data: BusinessActionsData) => boolean;
  priority: (data: BusinessActionsData) => number; // lower = higher priority
  generate: (ctx: RuleContext) => BusinessAction;
}

// Calculate impact based on revenue gap
const estimateImpact = (gap: number, factor: number = 0.3): number => {
  return Math.round(Math.abs(gap) * factor);
};

// Rule 1: Low morning traffic → promote off-peak hours
const offPeakRule: ActionRule = {
  id: "offpeak_promo",
  condition: (data) => {
    if (!data.hasEnoughData) return false;
    const morningShare = data.morningRevenue / data.totalRevenue;
    return morningShare < 0.15 && data.totalRevenue > 0;
  },
  priority: (data) => {
    const morningShare = data.morningRevenue / data.totalRevenue;
    return morningShare < 0.08 ? 1 : 2;
  },
  generate: (ctx) => ({
    id: "offpeak_promo",
    title: ctx.t("businessActions.rules.offpeak.title"),
    description: ctx.t("businessActions.rules.offpeak.description"),
    category: "marketing",
    impactEstimate: estimateImpact(ctx.data.totalRevenue * 0.1, 0.5),
    effort: "low" as EffortLevel,
    kpiToTrack: ctx.t("businessActions.rules.offpeak.kpi"),
    steps: [
      { step: 1, description: ctx.t("businessActions.rules.offpeak.step1") },
      { step: 2, description: ctx.t("businessActions.rules.offpeak.step2") },
      { step: 3, description: ctx.t("businessActions.rules.offpeak.step3") },
    ],
    priority: ctx.data.morningRevenue / ctx.data.totalRevenue < 0.08 ? 1 : 2,
  }),
};

// Rule 2: Low card payment share → promote card payments
const cardPaymentRule: ActionRule = {
  id: "card_promotion",
  condition: (data) => {
    if (!data.hasEnoughData) return false;
    return data.cardPercentage < 70 && data.totalRevenue > 0;
  },
  priority: (data) => data.cardPercentage < 50 ? 1 : 3,
  generate: (ctx) => ({
    id: "card_promotion",
    title: ctx.t("businessActions.rules.card.title"),
    description: ctx.t("businessActions.rules.card.description"),
    category: "operations",
    impactEstimate: estimateImpact(ctx.data.revenueByCash * 0.02, 1), // 2% cash handling savings
    effort: "low" as EffortLevel,
    kpiToTrack: ctx.t("businessActions.rules.card.kpi"),
    steps: [
      { step: 1, description: ctx.t("businessActions.rules.card.step1") },
      { step: 2, description: ctx.t("businessActions.rules.card.step2") },
      { step: 3, description: ctx.t("businessActions.rules.card.step3") },
    ],
    priority: ctx.data.cardPercentage < 50 ? 1 : 3,
  }),
};

// Rule 3: Underperforming machines → investigate/maintain
const machinePerformanceRule: ActionRule = {
  id: "machine_performance",
  condition: (data) => {
    if (!data.hasEnoughData) return false;
    return data.underperformingMachines.length > 0;
  },
  priority: (data) => {
    const maxGap = Math.max(...data.underperformingMachines.map(m => m.revenueGap), 0);
    return maxGap > 200 ? 1 : 2;
  },
  generate: (ctx) => {
    const worstMachine = ctx.data.underperformingMachines[0];
    return {
      id: "machine_performance",
      title: ctx.t("businessActions.rules.machine.title"),
      description: ctx.t("businessActions.rules.machine.description").replace("{{machine}}", worstMachine?.name || ""),
      category: "maintenance",
      impactEstimate: estimateImpact(worstMachine?.revenueGap || 100, 0.7),
      effort: "medium" as EffortLevel,
      kpiToTrack: ctx.t("businessActions.rules.machine.kpi"),
      steps: [
        { step: 1, description: ctx.t("businessActions.rules.machine.step1") },
        { step: 2, description: ctx.t("businessActions.rules.machine.step2") },
        { step: 3, description: ctx.t("businessActions.rules.machine.step3") },
      ],
      priority: (worstMachine?.revenueGap || 0) > 200 ? 1 : 2,
    };
  },
};

// Rule 4: Weak day → specific day promotion
const weakDayRule: ActionRule = {
  id: "weak_day_promo",
  condition: (data) => {
    if (!data.hasEnoughData || !data.worstDay) return false;
    const dayPerf = data.weekdayPerformance;
    if (dayPerf.length < 2) return false;
    const revenues = dayPerf.map(d => d.revenue);
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const worstDayData = dayPerf.find(d => d.day === data.worstDay);
    return worstDayData ? worstDayData.revenue < avgRevenue * 0.7 : false;
  },
  priority: () => 3,
  generate: (ctx) => ({
    id: "weak_day_promo",
    title: ctx.t("businessActions.rules.weakDay.title").replace("{{day}}", ctx.data.worstDay || ""),
    description: ctx.t("businessActions.rules.weakDay.description").replace("{{day}}", ctx.data.worstDay || ""),
    category: "marketing",
    impactEstimate: estimateImpact(ctx.data.totalRevenue * 0.05, 0.6),
    effort: "low" as EffortLevel,
    kpiToTrack: ctx.t("businessActions.rules.weakDay.kpi").replace("{{day}}", ctx.data.worstDay || ""),
    steps: [
      { step: 1, description: ctx.t("businessActions.rules.weakDay.step1").replace("{{day}}", ctx.data.worstDay || "") },
      { step: 2, description: ctx.t("businessActions.rules.weakDay.step2") },
      { step: 3, description: ctx.t("businessActions.rules.weakDay.step3") },
    ],
    priority: 3,
  }),
};

// Rule 5: High peak concentration → spread load
const peakConcentrationRule: ActionRule = {
  id: "peak_concentration",
  condition: (data) => {
    if (!data.hasEnoughData) return false;
    const peakShare = data.eveningRevenue / data.totalRevenue;
    return peakShare > 0.4 && data.totalRevenue > 0;
  },
  priority: (data) => {
    const peakShare = data.eveningRevenue / data.totalRevenue;
    return peakShare > 0.5 ? 1 : 2;
  },
  generate: (ctx) => ({
    id: "peak_concentration",
    title: ctx.t("businessActions.rules.peak.title"),
    description: ctx.t("businessActions.rules.peak.description"),
    category: "operations",
    impactEstimate: estimateImpact(ctx.data.totalRevenue * 0.08, 0.4),
    effort: "medium" as EffortLevel,
    kpiToTrack: ctx.t("businessActions.rules.peak.kpi"),
    steps: [
      { step: 1, description: ctx.t("businessActions.rules.peak.step1") },
      { step: 2, description: ctx.t("businessActions.rules.peak.step2") },
      { step: 3, description: ctx.t("businessActions.rules.peak.step3") },
    ],
    priority: (ctx.data.eveningRevenue / ctx.data.totalRevenue) > 0.5 ? 1 : 2,
  }),
};

// All rules in priority order
const allRules: ActionRule[] = [
  machinePerformanceRule,
  offPeakRule,
  cardPaymentRule,
  peakConcentrationRule,
  weakDayRule,
];

/**
 * Generate top 3 business actions based on analytics data
 */
export function generateBusinessActions(
  data: BusinessActionsData,
  t: (key: string) => string
): BusinessAction[] {
  if (!data.hasEnoughData) {
    return [];
  }

  const ctx: RuleContext = { data, t };
  
  // Evaluate all rules and collect matching actions
  const actions: BusinessAction[] = [];
  
  for (const rule of allRules) {
    if (rule.condition(data)) {
      actions.push(rule.generate(ctx));
    }
  }
  
  // Sort by priority (lower = higher priority) and take top 3
  return actions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

/**
 * Check minimum data requirements
 */
export function hasEnoughDataForActions(dataPoints: number): boolean {
  return dataPoints >= 7;
}
