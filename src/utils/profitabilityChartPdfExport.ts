import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MonthlyData {
  month: string;
  fullMonth: string;
  revenue: number;
  costs: number;
  profit: number;
}

interface ProfitabilityChartData {
  siteName: string;
  address: string;
  generatedDate: string;
  monthlyData: MonthlyData[];
  avgMonthlyRevenue: number;
  avgMonthlyCosts: number;
  avgMonthlyProfit: number;
  currentProfitMargin: number;
}

// Lavcom brand colors
const COLORS = {
  green: [165, 200, 0] as [number, number, number],
  yellow: [252, 210, 89] as [number, number, number],
  teal: [109, 191, 184] as [number, number, number],
  darkGray: [56, 56, 56] as [number, number, number],
  lightGray: [245, 245, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  red: [220, 53, 69] as [number, number, number],
};

function formatEuro(value: number): string {
  return value.toLocaleString("fr-FR", { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }) + " €";
}

export function generateProfitabilityChartPdf(data: ProfitabilityChartData, t: (key: string) => string): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // ===== HEADER =====
  doc.setFillColor(...COLORS.green);
  doc.rect(0, 0, pageWidth, 25, "F");
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(t("profitability.pdfTitle"), pageWidth / 2, 12, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(data.siteName, pageWidth / 2, 20, { align: "center" });

  // ===== SUBHEADER =====
  let yPos = 32;
  
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${t("profitability.address")}: ${data.address || "-"}`, margin, yPos);
  doc.text(`${t("profitability.generatedOn")}: ${data.generatedDate}`, pageWidth - margin, yPos, { align: "right" });

  yPos += 10;

  // ===== KPIs SUMMARY =====
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, "F");

  const kpiWidth = contentWidth / 4;
  const kpiY = yPos + 10;
  
  // KPI 1: Average Monthly Revenue
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(t("profitability.avgMonthlyRevenue"), margin + kpiWidth * 0.5, kpiY - 2, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.darkGray);
  doc.setFont("helvetica", "bold");
  doc.text(formatEuro(data.avgMonthlyRevenue), margin + kpiWidth * 0.5, kpiY + 6, { align: "center" });

  // KPI 2: Average Monthly Costs
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(t("profitability.avgMonthlyCosts"), margin + kpiWidth * 1.5, kpiY - 2, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.teal);
  doc.setFont("helvetica", "bold");
  doc.text(formatEuro(data.avgMonthlyCosts), margin + kpiWidth * 1.5, kpiY + 6, { align: "center" });

  // KPI 3: Average Monthly Profit
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(t("profitability.avgMonthlyProfit"), margin + kpiWidth * 2.5, kpiY - 2, { align: "center" });
  doc.setFontSize(14);
  const profitColor = data.avgMonthlyProfit >= 0 ? COLORS.green : COLORS.red;
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(formatEuro(data.avgMonthlyProfit), margin + kpiWidth * 2.5, kpiY + 6, { align: "center" });

  // KPI 4: Profit Margin
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(t("profitability.profitMargin"), margin + kpiWidth * 3.5, kpiY - 2, { align: "center" });
  doc.setFontSize(14);
  const marginColor = data.currentProfitMargin >= 15 ? COLORS.green : data.currentProfitMargin >= 0 ? COLORS.yellow : COLORS.red;
  doc.setTextColor(marginColor[0], marginColor[1], marginColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.currentProfitMargin.toFixed(1)}%`, margin + kpiWidth * 3.5, kpiY + 6, { align: "center" });

  yPos += 35;

  // ===== MONTHLY DATA TABLE =====
  doc.setFillColor(...COLORS.green);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(t("profitability.monthlyEvolution"), margin + 4, yPos + 5.5);

  yPos += 12;

  const tableData = data.monthlyData.map((row) => [
    row.fullMonth,
    formatEuro(row.revenue),
    formatEuro(row.costs),
    formatEuro(row.profit),
    row.revenue > 0 ? `${((row.profit / row.revenue) * 100).toFixed(1)}%` : "0%"
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      t("profitability.tableMonth"),
      t("profitability.revenue"),
      t("profitability.totalCosts"),
      t("profitability.netProfit"),
      t("profitability.margin")
    ]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: COLORS.darkGray,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.darkGray,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
    didParseCell: (data) => {
      // Color profit column
      if (data.column.index === 3 && data.section === "body") {
        const value = parseFloat(data.cell.raw?.toString().replace(/[^\d,-]/g, "").replace(",", ".") || "0");
        if (value < 0) {
          data.cell.styles.textColor = COLORS.red;
        } else if (value > 0) {
          data.cell.styles.textColor = COLORS.green;
        }
      }
    }
  });

  // ===== FOOTER =====
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text(
    t("profitability.pdfDisclaimer"),
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );
  doc.text(
    `${data.siteName} | Lavcom Performances | ${data.generatedDate}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  // Save the PDF
  const fileName = `Rentabilite_Mensuelle_${data.siteName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
