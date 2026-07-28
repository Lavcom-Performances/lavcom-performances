import type { DashboardActivityItem } from "@/types/dashboard-simulator";

export const MOCK_ACTIVITY: DashboardActivityItem[] = [
  { id: "activity-1", label: "Scénario Optimiste créé – Bastille", timeAgo: "il y a 1h", kind: "scenario" },
  { id: "activity-2", label: "PDF comparatif généré", timeAgo: "il y a 3h", kind: "report" },
  { id: "activity-3", label: "Nouveau projet créé – Lyon Part-Dieu", timeAgo: "hier", kind: "project" },
  { id: "activity-4", label: "Scénario Réaliste validé – Bastille", timeAgo: "il y a 2j", kind: "scenario" },
  { id: "activity-5", label: "Projet Laverie République mis à jour", timeAgo: "il y a 4j", kind: "project" },
];
