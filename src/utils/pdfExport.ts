import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ReportVariant, ReportSectionConfig, getReportConfigForVariant } from "@/types/report";

interface MonthlyReportData {
  laundromat: string;
  month: string;
  year: number;
  summary: {
    caTotal: number;
    caEsp: number;
    caCb: number;
    ventesTotal: number;
    ventesEsp: number;
    ventesCb: number;
    panierMoyen: number;
    nbMoyClientsJour: number;
    moyenneJour: number;
  };
  machines: Array<{
    name: string;
    caEsp: number;
    caCb: number;
    caTotal: number;
    caPrevisionnel: number;
    progression: number;
    ventesEsp: number;
    ventesCb: number;
    ventesTotal: number;
  }>;
  dailyData: Array<{
    date: string;
    caEsp: number;
    caCb: number;
    caTotal: number;
    ventesEsp: number;
    ventesCb: number;
    ventesTotal: number;
  }>;
}

// Lavcom brand colors
const COLORS = {
  green: [163, 198, 21] as [number, number, number],    // #A3C615
  yellow: [252, 210, 89] as [number, number, number],   // #FCD259
  darkGray: [56, 56, 56] as [number, number, number],   // #383838
  lightGray: [217, 217, 217] as [number, number, number], // #D9D9D9
  white: [255, 255, 255] as [number, number, number],
};

// Get report variant suffix for filename
function getVariantSuffix(variant: ReportVariant): string {
  switch (variant) {
    case "express": return "_EXPRESS";
    case "bank": return "_BANQUE";
    case "full":
    default: return "_COMPLET";
  }
}

export function generateMonthlyReport(
  data: MonthlyReportData,
  variant: ReportVariant = "full"
): void {
  const config = getReportConfigForVariant(variant);
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
  doc.text(`${data.laundromat} - CA ${data.month.toUpperCase()} ${data.year}`, pageWidth / 2, 15, { align: "center" });

  // Title
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`CHIFFRE D'AFFAIRES ${data.month.toUpperCase()} ${data.year}`, pageWidth / 2, 38, { align: "center" });

  // Summary KPIs
  const kpiStartY = 45;
  const kpiWidth = (pageWidth - margin * 2 - 10) / 2;
  
  // Left KPI box - CA
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin, kpiStartY, kpiWidth, 35, 3, 3, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("CA TOTAL TTC", margin + 5, kpiStartY + 8);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.summary.caTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, margin + 5, kpiStartY + 16);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`CA ESP: ${data.summary.caEsp.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, margin + 5, kpiStartY + 24);
  doc.text(`CA CB: ${data.summary.caCb.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, margin + 5, kpiStartY + 30);

  // Right KPI box - Ventes
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin + kpiWidth + 10, kpiStartY, kpiWidth, 35, 3, 3, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("VENTES", margin + kpiWidth + 15, kpiStartY + 8);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.summary.ventesTotal}`, margin + kpiWidth + 15, kpiStartY + 16);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Ventes ESP: ${data.summary.ventesEsp}`, margin + kpiWidth + 15, kpiStartY + 24);
  doc.text(`Ventes CB: ${data.summary.ventesCb}`, margin + kpiWidth + 15, kpiStartY + 30);

  // Machines table - CA
  const machineTableY = kpiStartY + 45;
  
  autoTable(doc, {
    startY: machineTableY,
    head: [["Machine", "ESP", "CB", "Total", "CA Prévi", "%"]],
    body: data.machines.map(m => [
      m.name,
      `${m.caEsp.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
      `${m.caCb.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
      `${m.caTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
      `${m.caPrevisionnel.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
      `${m.progression}%`,
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
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: margin, right: margin },
    tableWidth: "auto",
  });

  // Get Y position after table
  const finalY = (doc as any).lastAutoTable.finalY;

  // Machines table - Ventes
  autoTable(doc, {
    startY: finalY + 10,
    head: [["Machine", "Ventes ESP", "Ventes CB", "Total"]],
    body: data.machines.map(m => [
      m.name,
      m.ventesEsp.toString(),
      m.ventesCb.toString(),
      m.ventesTotal.toString(),
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
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: margin, right: margin },
    tableWidth: "auto",
  });

  // Bottom summary
  const bottomY = (doc as any).lastAutoTable.finalY + 15;
  
  // Summary boxes
  const boxWidth = (pageWidth - margin * 2 - 20) / 3;
  
  doc.setFillColor(...COLORS.green);
  doc.roundedRect(margin, bottomY, boxWidth, 20, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.text("PANIER MOYEN", margin + 5, bottomY + 7);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.summary.panierMoyen.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, margin + 5, bottomY + 15);

  doc.setFillColor(...COLORS.yellow);
  doc.roundedRect(margin + boxWidth + 10, bottomY, boxWidth, 20, 2, 2, "F");
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("MOY CLIENTS/JOUR", margin + boxWidth + 15, bottomY + 7);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.summary.nbMoyClientsJour}`, margin + boxWidth + 15, bottomY + 15);

  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin + (boxWidth + 10) * 2, bottomY, boxWidth, 20, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("MOYENNE/JOUR", margin + (boxWidth + 10) * 2 + 5, bottomY + 7);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.summary.moyenneJour.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, margin + (boxWidth + 10) * 2 + 5, bottomY + 15);

  // Page 2 - Daily details (only for full report)
  if (config.dailyTable) {
    doc.addPage();
    
    // Header page 2
    doc.setFillColor(...COLORS.green);
    doc.rect(0, 0, pageWidth, 20, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Détail journalier - ${data.month} ${data.year}`, pageWidth / 2, 13, { align: "center" });

    // Daily table
    autoTable(doc, {
      startY: 30,
      head: [["Date", "CA ESP", "CA CB", "Total", "Ventes ESP", "Ventes CB", "Total"]],
      body: data.dailyData.map(d => [
        d.date,
        `${d.caEsp.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
        `${d.caCb.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
        `${d.caTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
        d.ventesEsp.toString(),
        d.ventesCb.toString(),
        d.ventesTotal.toString(),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: COLORS.green,
        textColor: COLORS.white,
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 7,
        textColor: COLORS.darkGray,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
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
      `${data.laundromat} - ${data.month} ${data.year} | Page ${i}/${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save the PDF with variant suffix
  doc.save(`${data.laundromat.replace(/\s+/g, "_")}_CA_${data.month.toUpperCase()}_${data.year}${getVariantSuffix(variant)}.pdf`);
}

// Mock data generator for demo
// IMPORTANT : ne jamais utiliser "My Co'Laverie" en dur.
// Toujours utiliser laundromat.name ou un libellé générique ("Votre laverie", "Laverie Démo").
export function getMockMonthlyData(month: string, year: number): MonthlyReportData {
  return {
    laundromat: "Laverie Démo",
    month,
    year,
    summary: {
      caTotal: 5820.30,
      caEsp: 1516.80,
      caCb: 4303.50,
      ventesTotal: 1381,
      ventesEsp: 419,
      ventesCb: 962,
      panierMoyen: 7.75,
      nbMoyClientsJour: 24,
      moyenneJour: 188.58,
    },
    machines: [
      { name: "SECHE-LINGE 1 14KG", caEsp: 483, caCb: 1123.50, caTotal: 1606.50, caPrevisionnel: 1700, progression: 95, ventesEsp: 168, ventesCb: 349, ventesTotal: 517 },
      { name: "SECHE-LINGE 2 14KG", caEsp: 66, caCb: 153, caTotal: 219, caPrevisionnel: 500, progression: 44, ventesEsp: 24, ventesCb: 52, ventesTotal: 76 },
      { name: "LAVE-LINGE 3 14KG", caEsp: 289, caCb: 697, caTotal: 986, caPrevisionnel: 1450, progression: 68, ventesEsp: 34, ventesCb: 82, ventesTotal: 116 },
      { name: "LAVE-LINGE 4 14KG", caEsp: 263.50, caCb: 952, caTotal: 1215.50, caPrevisionnel: 1200, progression: 101, ventesEsp: 31, ventesCb: 112, ventesTotal: 143 },
      { name: "LAVE-LINGE 5 7KG", caEsp: 220.50, caCb: 670.50, caTotal: 891, caPrevisionnel: 950, progression: 94, ventesEsp: 49, ventesCb: 149, ventesTotal: 198 },
      { name: "LAVE-LINGE 6 7KG", caEsp: 135, caCb: 463.50, caTotal: 598.50, caPrevisionnel: 800, progression: 75, ventesEsp: 30, ventesCb: 103, ventesTotal: 133 },
      { name: "LESSIVE 7 20G", caEsp: 49.80, caCb: 69, caTotal: 118.80, caPrevisionnel: 200, progression: 59, ventesEsp: 83, ventesCb: 115, ventesTotal: 198 },
    ],
    dailyData: Array.from({ length: 31 }, (_, i) => ({
      date: `${String(i + 1).padStart(2, "0")}/${month === "Janvier" ? "01" : "02"}/${year}`,
      caEsp: Math.round(40 + Math.random() * 60 * 100) / 100,
      caCb: Math.round(100 + Math.random() * 150 * 100) / 100,
      caTotal: 0,
      ventesEsp: Math.floor(10 + Math.random() * 20),
      ventesCb: Math.floor(20 + Math.random() * 40),
      ventesTotal: 0,
    })).map(d => ({
      ...d,
      caTotal: d.caEsp + d.caCb,
      ventesTotal: d.ventesEsp + d.ventesCb,
    })),
  };
}
