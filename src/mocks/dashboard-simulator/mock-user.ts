import type { DashboardUser, PackInfo } from "@/types/dashboard-simulator";

export const MOCK_USER: DashboardUser = {
  id: "user-mock-1",
  firstName: "Marc",
  lastName: "Dupont",
  email: "marc.dupont@laverie-pro.fr",
  phone: "+33 1 23 45 67 89",
  companyName: "Laverie Pro SARL",
  siret: "123 456 789 00012",
  memberSince: "mars 2025",
  emailVerified: true,
  initials: "MD",
  language: "fr",
  emailNotifications: true,
};

export const MOCK_PACK: PackInfo = {
  id: "pack-projet",
  name: "Pack projet",
  status: "active",
  totalDays: 90,
  usedDays: 30,
  totalProjects: 3,
  usedProjects: 3,
  expiresOn: "30/09/2026",
  features: [
    "90 jours d'accès",
    "3 projets",
    "Scénarios illimités",
    "Exports PDF illimités",
  ],
};
