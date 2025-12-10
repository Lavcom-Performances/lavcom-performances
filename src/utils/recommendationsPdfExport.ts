import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateMarketingRecommendations, getMockAnalyticsData } from "@/utils/marketingRecommendations";
import type { Recommendation } from "@/types/recommendations";

interface InsightData {
  title: string;
  description: string;
  type: "success" | "warning" | "info" | "action";
  metric?: string;
}

interface RecommendationsReportData {
  laundromat: string;
  date: string;
  performanceInsights: InsightData[];
  optimizationInsights: InsightData[];
  actionItems: InsightData[];
  marketingRecommendations: Recommendation[];
  kpis: {
    caAnnuel: string;
    variation: string;
    heurePointe: string;
    jourActif: string;
  };
  includeMarketing?: boolean;
}

// Lavcom brand colors
const COLORS = {
  green: [163, 198, 21] as [number, number, number],
  yellow: [252, 210, 89] as [number, number, number],
  darkGray: [56, 56, 56] as [number, number, number],
  lightGray: [217, 217, 217] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
};

const getTypeColor = (type: InsightData["type"]): [number, number, number] => {
  switch (type) {
    case "success": return COLORS.green;
    case "warning": return COLORS.amber;
    case "info": return COLORS.blue;
    case "action": return COLORS.green;
    default: return COLORS.lightGray;
  }
};

export function generateRecommendationsReport(data: RecommendationsReportData): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  doc.setFillColor(...COLORS.green);
  doc.rect(0, 0, pageWidth, 25, "F");
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.laundromat} - Analyse des Performances`, pageWidth / 2, 15, { align: "center" });

  // Date
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Généré le ${data.date}`, pageWidth / 2, 35, { align: "center" });

  // KPIs Summary
  const kpiY = 42;
  const kpiWidth = (pageWidth - margin * 2 - 15) / 4;

  const kpis = [
    { label: "CA 2025", value: data.kpis.caAnnuel, color: COLORS.green },
    { label: "vs 2024", value: data.kpis.variation, color: COLORS.amber },
    { label: "Heure de pointe", value: data.kpis.heurePointe, color: COLORS.green },
    { label: "Jour le plus actif", value: data.kpis.jourActif, color: COLORS.blue },
  ];

  kpis.forEach((kpi, index) => {
    const x = margin + (kpiWidth + 5) * index;
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(x, kpiY, kpiWidth, 22, 2, 2, "F");
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.darkGray);
    doc.text(kpi.label, x + kpiWidth / 2, kpiY + 7, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, x + kpiWidth / 2, kpiY + 16, { align: "center" });
  });

  // Performance Insights Section
  let currentY = kpiY + 32;
  
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Analyse de Performance", margin, currentY);
  currentY += 8;

  autoTable(doc, {
    startY: currentY,
    head: [["Indicateur", "Métrique", "Description"]],
    body: data.performanceInsights.map(insight => [
      insight.title,
      insight.metric || "-",
      insight.description,
    ]),
    theme: "grid",
    headStyles: {
      fillColor: COLORS.green,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.darkGray,
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const insight = (data as any).row.raw;
        if (insight) {
          const insightData = [...(doc as any).performanceInsights || []];
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Optimization Insights Section
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Opportunités d'Optimisation", margin, currentY);
  currentY += 8;

  autoTable(doc, {
    startY: currentY,
    head: [["Opportunité", "Métrique", "Recommandation"]],
    body: data.optimizationInsights.map(insight => [
      insight.title,
      insight.metric || "-",
      insight.description,
    ]),
    theme: "grid",
    headStyles: {
      fillColor: COLORS.yellow,
      textColor: COLORS.darkGray,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.darkGray,
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Check if we need a new page
  if (currentY > 220) {
    doc.addPage();
    currentY = 25;
  }

  // Action Items Section
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Actions Recommandées", margin, currentY);
  currentY += 8;

  autoTable(doc, {
    startY: currentY,
    head: [["Action", "Détails"]],
    body: data.actionItems.map(item => [
      item.title,
      item.description,
    ]),
    theme: "grid",
    headStyles: {
      fillColor: COLORS.green,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.darkGray,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Marketing Recommendations Section (if included)
  if (data.includeMarketing !== false && data.marketingRecommendations.length > 0) {
    // Check if we need a new page
    if (currentY > 200) {
      doc.addPage();
      currentY = 25;
    }

    doc.setTextColor(...COLORS.darkGray);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Idées Communication & Marketing", margin, currentY);
    currentY += 6;

    // Introduction text
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const introText = "Ces suggestions marketing sont générées automatiquement à partir des chiffres de votre laverie (fréquentation, répartition du chiffre d'affaires, machines moins utilisées…). Elles ont pour objectif de vous donner des pistes concrètes et faciles à tester sur un mois. Adaptez-les à votre quartier, à votre clientèle et à vos moyens.";
    const introLines = doc.splitTextToSize(introText, pageWidth - margin * 2);
    doc.text(introLines, margin, currentY + 4);
    currentY += introLines.length * 4 + 8;

    autoTable(doc, {
      startY: currentY,
      head: [["Recommandation", "Effort", "Détails"]],
      body: data.marketingRecommendations.map(reco => [
        reco.title,
        reco.difficulty || "-",
        reco.description,
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [109, 191, 184] as [number, number, number], // Cyan Lavcom
        textColor: COLORS.white,
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: COLORS.darkGray,
      },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: "bold" },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: "auto" },
      },
      margin: { left: margin, right: margin },
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(
      `${data.laundromat} - Analyse des Performances | Page ${i}/${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save the PDF
  const dateFormatted = data.date.replace(/\//g, "-");
  doc.save(`${data.laundromat.replace(/\s+/g, "_")}_Recommandations_${dateFormatted}.pdf`);
}

export function getRecommendationsData(includeMarketing: boolean = true): RecommendationsReportData {
  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-FR");

  // Generate marketing recommendations from analytics data
  const analyticsData = getMockAnalyticsData();
  const marketingRecos = generateMarketingRecommendations(analyticsData);

  return {
    laundromat: "My Co'Laverie",
    date: dateStr,
    performanceInsights: [
      {
        title: "Baisse du CA annuel",
        description: "Le CA 2025 est en baisse de 27% par rapport à 2024. Analysez les causes : concurrence, saisonnalité, problèmes techniques ?",
        type: "warning",
        metric: "-27%",
      },
      {
        title: "Sèche-linge 2 sous-performant",
        description: "Le sèche-linge 2 génère seulement 219€ (3.8% du CA machines) contre 1606€ pour le sèche-linge 1. Vérifiez son état de fonctionnement.",
        type: "warning",
        metric: "219€",
      },
      {
        title: "Dimanche meilleur jour",
        description: "Le dimanche représente 21% de l'activité hebdomadaire avec 2443 cycles. Assurez-vous d'avoir suffisamment de produits et machines disponibles.",
        type: "success",
        metric: "21%",
      },
    ],
    optimizationInsights: [
      {
        title: "Pic d'affluence 16h-19h",
        description: "La tranche 16h-19h concentre 25% des cycles. Envisagez une tarification dynamique ou des promotions sur les heures creuses (7h-9h).",
        type: "action",
        metric: "25%",
      },
      {
        title: "Heures creuses à exploiter",
        description: "Les tranches 7h-8h ne représentent que 4% de l'activité. Proposez des réductions matinales pour lisser la fréquentation.",
        type: "info",
        metric: "4%",
      },
      {
        title: "CB majoritaire",
        description: "81% des paiements sont en CB. Maintenez vos terminaux en parfait état et envisagez le paiement mobile.",
        type: "success",
        metric: "81%",
      },
    ],
    actionItems: [
      {
        title: "Diagnostic sèche-linge 2",
        description: "Programmer une maintenance préventive et vérifier les temps de cycle. L'écart de performance avec le sèche-linge 1 est anormal.",
        type: "action",
      },
      {
        title: "Campagne heures creuses",
        description: "Lancer une offre -20% sur les cycles avant 10h pour augmenter la fréquentation matinale et désengorger les pics.",
        type: "action",
      },
      {
        title: "Analyse concurrence",
        description: "La baisse de CA en 2025 nécessite une étude de marché. Vérifiez les ouvertures de laveries dans le quartier.",
        type: "action",
      },
    ],
    marketingRecommendations: marketingRecos,
    includeMarketing,
    kpis: {
      caAnnuel: "64 121€",
      variation: "-27%",
      heurePointe: "18h",
      jourActif: "Dimanche",
    },
  };
}
