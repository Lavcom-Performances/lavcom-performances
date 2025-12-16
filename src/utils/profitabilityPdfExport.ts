import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LaundryCosts, ProfitabilityMetrics } from "@/types/costs";

interface ProfitabilityReportData {
  laundromat: string;
  address: string;
  generatedDate: string;
  costs: LaundryCosts;
  metrics: ProfitabilityMetrics;
  siteTurnoverMonth: number;
  siteTotalCyclesMonth: number;
  monthlyRevenueObjective?: number;
}

// Lavcom brand colors
const COLORS = {
  green: [165, 200, 0] as [number, number, number],       // #A5C800
  yellow: [252, 210, 89] as [number, number, number],     // #FCD259
  teal: [109, 191, 184] as [number, number, number],      // #6DBFB8
  darkGray: [56, 56, 56] as [number, number, number],     // #383838
  lightGray: [245, 245, 245] as [number, number, number], // #F5F5F5
  white: [255, 255, 255] as [number, number, number],
  red: [220, 53, 69] as [number, number, number],         // Destructive
  amber: [245, 158, 11] as [number, number, number],      // Amber
};

function formatEuro(value: number | null, decimals = 0): string {
  if (value === null) return "N/A";
  return value.toLocaleString("fr-FR", { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  }) + " €";
}

function formatPercent(value: number): string {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
}

export function generateProfitabilityReport(data: ProfitabilityReportData): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // ===== HEADER =====
  doc.setFillColor(...COLORS.green);
  doc.rect(0, 0, pageWidth, 30, "F");
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("BILAN PRÉVISIONNEL", pageWidth / 2, 15, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(data.laundromat, pageWidth / 2, 24, { align: "center" });

  // ===== SUBHEADER =====
  let yPos = 40;
  
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Adresse : ${data.address}`, margin, yPos);
  doc.text(`Généré le : ${data.generatedDate}`, pageWidth - margin, yPos, { align: "right" });

  yPos += 15;

  // ===== SECTION 1: CHARGES FIXES =====
  doc.setFillColor(...COLORS.green);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CHARGES FIXES MENSUELLES", margin + 4, yPos + 5.5);

  yPos += 12;

  const fixedCostsData = [
    ["Loyer + charges locatives", formatEuro(data.costs.fixed_rent, 2)],
    ["Prêt / leasing machines", formatEuro(data.costs.fixed_lease, 2)],
    ["Abonnements (centrale, internet, alarmes)", formatEuro(data.costs.fixed_subscriptions, 2)],
    ["Assurances", formatEuro(data.costs.fixed_insurance, 2)],
    ["Ménage / entretien", formatEuro(data.costs.fixed_cleaning, 2)],
    ["Autres charges fixes", formatEuro(data.costs.fixed_other, 2)],
  ];

  autoTable(doc, {
    startY: yPos,
    body: fixedCostsData,
    theme: "plain",
    styles: {
      fontSize: 10,
      textColor: COLORS.darkGray,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.7 },
      1: { cellWidth: contentWidth * 0.3, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  // Total charges fixes
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin, yPos, contentWidth, 10, "F");
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL CHARGES FIXES", margin + 4, yPos + 7);
  doc.setTextColor(...COLORS.green);
  doc.text(formatEuro(data.metrics.fixed_costs_total, 2), pageWidth - margin - 4, yPos + 7, { align: "right" });

  yPos += 18;

  // ===== SECTION 2: CHARGES VARIABLES =====
  doc.setFillColor(...COLORS.teal);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CHARGES VARIABLES (en % du CA)", margin + 4, yPos + 5.5);

  yPos += 12;

  const variableCostsData = [
    ["Électricité + eau", formatPercent(data.costs.var_energy_water_percent)],
    ["Lessive / produits (si inclus)", formatPercent(data.costs.var_detergent_percent)],
  ];

  autoTable(doc, {
    startY: yPos,
    body: variableCostsData,
    theme: "plain",
    styles: {
      fontSize: 10,
      textColor: COLORS.darkGray,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.7 },
      1: { cellWidth: contentWidth * 0.3, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  // Total charges variables
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin, yPos, contentWidth, 10, "F");
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL CHARGES VARIABLES", margin + 4, yPos + 7);
  doc.setTextColor(...COLORS.teal);
  doc.text(formatPercent(data.metrics.var_total_percent), pageWidth - margin - 4, yPos + 7, { align: "right" });

  yPos += 18;

  // ===== SECTION 3: SEUIL DE RENTABILITÉ =====
  doc.setFillColor(...COLORS.yellow);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("SEUIL DE RENTABILITÉ", margin + 4, yPos + 5.5);

  yPos += 14;

  // Formule
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Formule : Seuil = Charges fixes / (1 - Charges variables %)", margin, yPos);
  
  yPos += 10;

  // Seuil CA mensuel - grand encadré
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, "F");
  
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("CA MENSUEL MINIMUM POUR ÊTRE RENTABLE", margin + 8, yPos + 9);
  
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.green);
  doc.text(
    formatEuro(data.metrics.break_even_revenue_monthly),
    margin + 8,
    yPos + 20
  );

  // Cycles nécessaires
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.darkGray);
  doc.setFont("helvetica", "normal");
  const cyclesText = data.metrics.break_even_cycles_day !== null 
    ? `≈ ${Math.ceil(data.metrics.break_even_cycles_day)} cycles / jour`
    : "N/A";
  doc.text(cyclesText, pageWidth - margin - 8, yPos + 17, { align: "right" });

  yPos += 35;

  // ===== SECTION 4: SITUATION ACTUELLE =====
  const profitColor = data.metrics.estimated_profit_month >= 0 ? COLORS.green : COLORS.red;
  doc.setFillColor(profitColor[0], profitColor[1], profitColor[2]);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("SITUATION ACTUELLE (mois en cours)", margin + 4, yPos + 5.5);

  yPos += 14;

  const currentSituationData = [
    ["Chiffre d'affaires réalisé", formatEuro(data.siteTurnoverMonth, 2)],
    ["Nombre total de cycles", data.siteTotalCyclesMonth.toString()],
    ["Revenu moyen par cycle", formatEuro(data.metrics.avg_revenue_per_cycle, 2)],
    ["Charges variables estimées", formatEuro(data.metrics.estimated_variable_costs, 2)],
    ["Charges fixes", formatEuro(data.metrics.fixed_costs_total, 2)],
  ];

  autoTable(doc, {
    startY: yPos,
    body: currentSituationData,
    theme: "plain",
    styles: {
      fontSize: 10,
      textColor: COLORS.darkGray,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.65 },
      1: { cellWidth: contentWidth * 0.35, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;

  // Résultat estimé - grand encadré
  const isProfitable = data.metrics.estimated_profit_month >= 0;
  const resultColor = isProfitable ? COLORS.green : COLORS.red;
  doc.setFillColor(resultColor[0], resultColor[1], resultColor[2]);
  doc.roundedRect(margin, yPos, contentWidth, 22, 3, 3, "F");
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("RÉSULTAT ESTIMÉ (Bénéfice / Perte)", margin + 8, yPos + 8);
  
  doc.setFontSize(18);
  const profitText = (isProfitable ? "+" : "") + formatEuro(data.metrics.estimated_profit_month);
  doc.text(profitText, margin + 8, yPos + 17);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    isProfitable ? "Au-dessus du seuil de rentabilité" : "En dessous du seuil de rentabilité",
    pageWidth - margin - 8,
    yPos + 14,
    { align: "right" }
  );

  yPos += 32;

  // ===== SECTION 5: OBJECTIFS VS RÉALITÉ =====
  if (data.monthlyRevenueObjective) {
    const objectiveProgress = (data.siteTurnoverMonth / data.monthlyRevenueObjective) * 100;
    
    doc.setFillColor(COLORS.amber[0], COLORS.amber[1], COLORS.amber[2]);
    doc.rect(margin, yPos, contentWidth, 8, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("OBJECTIFS", margin + 4, yPos + 5.5);

    yPos += 12;

    const objectiveData = [
      ["Objectif CA mensuel", formatEuro(data.monthlyRevenueObjective)],
      ["CA réalisé", formatEuro(data.siteTurnoverMonth)],
      ["Progression", formatPercent(objectiveProgress)],
      ["Écart", formatEuro(data.siteTurnoverMonth - data.monthlyRevenueObjective)],
    ];

    autoTable(doc, {
      startY: yPos,
      body: objectiveData,
      theme: "plain",
      styles: {
        fontSize: 10,
        textColor: COLORS.darkGray,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.65 },
        1: { cellWidth: contentWidth * 0.35, halign: "right", fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
      alternateRowStyles: {
        fillColor: COLORS.lightGray,
      },
    });
  }

  // ===== FOOTER =====
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Ce bilan est une estimation basée sur les charges renseignées. Les valeurs réelles peuvent varier.",
    pageWidth / 2,
    pageHeight - 15,
    { align: "center" }
  );
  doc.text(
    `${data.laundromat} | Lavcom Performances | ${data.generatedDate}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Save the PDF
  const fileName = `Bilan_Previsionnel_${data.laundromat.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
