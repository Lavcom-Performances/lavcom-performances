// Types for report variant system

export type ReportVariant = "express" | "full" | "bank";

export interface ReportPeriod {
  month: string;
  year: number;
}

export interface ReportSectionConfig {
  summary: boolean;
  financialKpis: boolean;
  machineDetails: boolean;
  dailyTable: boolean;
  occupancyCharts: boolean;
  recommendationsOperational: boolean;
  recommendationsMarketing: boolean;
  annexesTechnical: boolean;
}

export interface ReportVariantOption {
  value: ReportVariant;
  label: string;
  description: string;
  recommended?: boolean;
}

export const REPORT_VARIANTS: ReportVariantOption[] = [
  {
    value: "express",
    label: "Rapport Express (2 pages)",
    description: "Les chiffres clés et 3 recommandations prioritaires.",
  },
  {
    value: "full",
    label: "Rapport Complet",
    description: "Tous les détails financiers, opérationnels et recommandations.",
    recommended: true,
  },
  {
    value: "bank",
    label: "Rapport Banque / Partenaire",
    description: "Synthèse sérieuse pour dossier bancaire ou bailleur.",
  },
];

/**
 * Returns the section configuration for a given report variant.
 * V2 preparation: this could later come from a customization screen.
 */
export function getReportConfigForVariant(variant: ReportVariant): ReportSectionConfig {
  switch (variant) {
    case "express":
      return {
        summary: true,
        financialKpis: true,
        machineDetails: true,
        dailyTable: false,
        occupancyCharts: false,
        recommendationsOperational: true,
        recommendationsMarketing: true,
        annexesTechnical: false,
      };
    case "bank":
      return {
        summary: true,
        financialKpis: true,
        machineDetails: true,
        dailyTable: false,
        occupancyCharts: true,
        recommendationsOperational: true,
        recommendationsMarketing: false,
        annexesTechnical: false,
      };
    case "full":
    default:
      return {
        summary: true,
        financialKpis: true,
        machineDetails: true,
        dailyTable: true,
        occupancyCharts: true,
        recommendationsOperational: true,
        recommendationsMarketing: true,
        annexesTechnical: true,
      };
  }
}
