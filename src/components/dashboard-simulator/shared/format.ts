import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";

export function formatEuro(value: number | null | undefined): string {
  if (value === null || value === undefined) return COMMON_STRINGS.notAvailable;
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} €`;
}

export function formatSignedEuro(value: number | null | undefined): string {
  if (value === null || value === undefined) return COMMON_STRINGS.notAvailable;
  const sign = value >= 0 ? "+ " : "- ";
  return `${sign}${new Intl.NumberFormat("fr-FR").format(Math.abs(Math.round(value)))} €`;
}

export function formatMonths(value: number | null | undefined): string {
  if (value === null || value === undefined) return COMMON_STRINGS.notAvailable;
  return `${value} mois`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return COMMON_STRINGS.notAvailable;
  return `${value} %`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return COMMON_STRINGS.notAvailable;
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function timeAgoFr(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days}j`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

/** Replaces `{key}` placeholders in centralized copy. */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
