import type { DashboardInvoice } from "@/types/dashboard-simulator";

export const MOCK_INVOICES: DashboardInvoice[] = [
  { id: "invoice-1", date: "2026-05-05", description: "Facture Pack projet", amount: 149, fileUrl: null },
  { id: "invoice-2", date: "2026-05-13", description: "1 projet supplémentaire", amount: 39, fileUrl: null },
  { id: "invoice-3", date: "2026-05-13", description: "Extension 30 jours", amount: 59, fileUrl: null },
  { id: "invoice-4", date: "2026-06-05", description: "1 projet supplémentaire", amount: 39, fileUrl: null },
  { id: "invoice-5", date: "2026-06-22", description: "Extension 30 jours", amount: 59, fileUrl: null },
];
