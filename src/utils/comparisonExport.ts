import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { sanitizeForCsv, buildCsvLine, logExport } from "@/lib/exports";
import { formatNumberFr } from "@/lib/finance";

interface ComparisonSiteData {
  name: string;
  city: string;
  revenue: number;
  transactions: number;
  profit: number | null;
  occupation: number;
  trend: number | null;
  hasCosts: boolean;
}

interface ComparisonExportData {
  sites: ComparisonSiteData[];
  dateStart: Date;
  dateEnd: Date;
  periodDays: number;
}

// Lavcom brand colors
const COLORS = {
  green: [163, 198, 21] as [number, number, number],
  darkGray: [56, 56, 56] as [number, number, number],
  lightGray: [217, 217, 217] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// Bank-grade formatting for jsPDF (no Unicode issues)
const formatCurrencyPdf = (value: number): string => {
  if (isNaN(value)) return 'N/A';
  return formatNumberFr(Math.round(value), 0) + ' €';
};

const formatTrendText = (trend: number | null): string => {
  if (trend === null || isNaN(trend)) return 'N/A';
  const sign = trend > 0 ? '+' : '';
  // Use comma for decimals (French style)
  return `${sign}${trend.toFixed(1).replace('.', ',')} %`;
};

export function exportComparisonPDF(data: ComparisonExportData): void {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(...COLORS.green);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("LAVCOM PERFORMANCES", 15, 16);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Comparatif Multi-Sites", pageWidth - 15, 12, { align: "right" });
  doc.text(`Généré le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, pageWidth - 15, 18, { align: "right" });
  
  // Period info
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Période analysée", 15, 38);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const periodText = `Du ${format(data.dateStart, "dd/MM/yyyy")} au ${format(data.dateEnd, "dd/MM/yyyy")} (${data.periodDays} jours)`;
  doc.text(periodText, 15, 45);
  
  // Table
  const tableData = data.sites.map((site, index) => [
    `#${index + 1}`,
    site.name,
    site.city || '-',
    formatCurrencyPdf(site.revenue),
    site.hasCosts && site.profit !== null ? formatCurrencyPdf(site.profit) : 'N/A',
    site.occupation > 0 ? site.occupation.toFixed(1).replace('.', ',') : 'N/A',
    formatTrendText(site.trend),
  ]);
  
  autoTable(doc, {
    startY: 55,
    head: [['Rang', 'Laverie', 'Ville', 'CA Période', 'Résultat', 'Cycles/jour', 'Évolution']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.green,
      textColor: COLORS.white,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      textColor: COLORS.darkGray,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} / ${pageCount} - Lavcom Performances © ${new Date().getFullYear()}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
  
  // Download
  const filename = `Comparatif_${format(data.dateStart, "yyyyMMdd")}_${format(data.dateEnd, "yyyyMMdd")}.pdf`;
  doc.save(filename);
}

export function exportComparisonExcel(data: ComparisonExportData): void {
  // Build CSV content (Excel-compatible)
  const headers = ['Rang', 'Laverie', 'Ville', 'CA Période (€)', 'Résultat (€)', 'Cycles/jour', 'Évolution (%)'];
  
  // Sanitize site names and cities
  const rows = data.sites.map((site, index) => [
    index + 1,
    sanitizeForCsv(site.name),
    sanitizeForCsv(site.city || ''),
    site.revenue.toFixed(2),
    site.hasCosts && site.profit !== null ? site.profit.toFixed(2) : '',
    site.occupation > 0 ? site.occupation.toFixed(1) : '',
    site.trend !== null && !isNaN(site.trend) ? site.trend.toFixed(1) : '',
  ]);
  
  // Add metadata rows at the top
  const metaRows = [
    ['Comparatif Multi-Sites - Lavcom Performances'],
    [`Période: Du ${format(data.dateStart, "dd/MM/yyyy")} au ${format(data.dateEnd, "dd/MM/yyyy")} (${data.periodDays} jours)`],
    [`Généré le: ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`],
    [],
  ];
  
  const csvContent = [
    ...metaRows.map(row => row.join(';')),
    headers.join(';'),
    ...rows.map(row => buildCsvLine(row, ';')),
  ].join('\n');
  
  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Comparatif_${format(data.dateStart, "yyyyMMdd")}_${format(data.dateEnd, "yyyyMMdd")}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Audit log the export
  logExport({
    exportType: 'comparison_csv',
    recordCount: data.sites.length,
    dateFrom: data.dateStart,
    dateTo: data.dateEnd,
  });
}

// === PROFITABILITY COMPARISON EXPORT ===

export interface ProfitabilitySiteData {
  siteName: string;
  city: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

export interface ProfitabilityComparisonData {
  sites: ProfitabilitySiteData[];
  dateStart: Date;
  dateEnd: Date;
  periodDays: number;
}

const PROFITABILITY_COLORS = {
  green: [165, 200, 0] as [number, number, number],
  yellow: [252, 210, 89] as [number, number, number],
  teal: [109, 191, 184] as [number, number, number],
  darkGray: [56, 56, 56] as [number, number, number],
  lightGray: [245, 245, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  red: [220, 53, 69] as [number, number, number],
};

export function exportProfitabilityComparisonPDF(data: ProfitabilityComparisonData, t: (key: string) => string): void {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  
  // Header
  doc.setFillColor(...PROFITABILITY_COLORS.green);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(...PROFITABILITY_COLORS.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(t("profitability.comparisonPdfTitle"), pageWidth / 2, 12, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${format(data.dateStart, "dd/MM/yyyy")} - ${format(data.dateEnd, "dd/MM/yyyy")}`, pageWidth / 2, 20, { align: "center" });
  
  // Subheader
  let yPos = 32;
  doc.setTextColor(...PROFITABILITY_COLORS.darkGray);
  doc.setFontSize(9);
  doc.text(`${t("profitability.period")}: ${data.periodDays} ${t("profitability.days")}`, margin, yPos);
  doc.text(`${t("profitability.generatedOn")}: ${format(new Date(), "dd/MM/yyyy", { locale: fr })}`, pageWidth - margin, yPos, { align: "right" });
  
  yPos += 10;
  
  // Summary KPIs
  const totalRevenue = data.sites.reduce((sum, s) => sum + s.revenue, 0);
  const totalCosts = data.sites.reduce((sum, s) => sum + s.costs, 0);
  const totalProfit = data.sites.reduce((sum, s) => sum + s.profit, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const bestSite = data.sites[0];
  
  doc.setFillColor(...PROFITABILITY_COLORS.lightGray);
  doc.roundedRect(margin, yPos, contentWidth, 28, 3, 3, "F");
  
  const kpiWidth = contentWidth / 4;
  const kpiY = yPos + 12;
  
  // KPI 1: Total Revenue
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(t("profitability.totalRevenueLabel"), margin + kpiWidth * 0.5, kpiY - 2, { align: "center" });
  doc.setFontSize(13);
  doc.setTextColor(...PROFITABILITY_COLORS.darkGray);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrencyPdf(totalRevenue), margin + kpiWidth * 0.5, kpiY + 6, { align: "center" });
  
  // KPI 2: Total Costs
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(t("profitability.totalCostsLabel"), margin + kpiWidth * 1.5, kpiY - 2, { align: "center" });
  doc.setFontSize(13);
  doc.setTextColor(...PROFITABILITY_COLORS.teal);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrencyPdf(totalCosts), margin + kpiWidth * 1.5, kpiY + 6, { align: "center" });
  
  // KPI 3: Total Profit
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(t("profitability.totalProfitLabel"), margin + kpiWidth * 2.5, kpiY - 2, { align: "center" });
  doc.setFontSize(13);
  const profitColor = totalProfit >= 0 ? PROFITABILITY_COLORS.green : PROFITABILITY_COLORS.red;
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrencyPdf(totalProfit), margin + kpiWidth * 2.5, kpiY + 6, { align: "center" });
  
  // KPI 4: Avg Margin
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(t("profitability.avgMargin"), margin + kpiWidth * 3.5, kpiY - 2, { align: "center" });
  doc.setFontSize(13);
  const marginColor = avgMargin >= 15 ? PROFITABILITY_COLORS.green : avgMargin >= 0 ? PROFITABILITY_COLORS.yellow : PROFITABILITY_COLORS.red;
  doc.setTextColor(marginColor[0], marginColor[1], marginColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(`${avgMargin.toFixed(1).replace('.', ',')} %`, margin + kpiWidth * 3.5, kpiY + 6, { align: "center" });
  
  yPos += 38;
  
  // Sites table header
  doc.setFillColor(...PROFITABILITY_COLORS.green);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(...PROFITABILITY_COLORS.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(t("profitability.siteDetails"), margin + 4, yPos + 5.5);
  
  yPos += 12;
  
  const tableData = data.sites.map((site, idx) => [
    idx === 0 ? `🏆 ${site.siteName}` : site.siteName,
    site.city || "-",
    formatCurrencyPdf(site.revenue),
    formatCurrencyPdf(site.costs),
    formatCurrencyPdf(site.profit),
    `${site.margin.toFixed(1).replace('.', ',')} %`
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [[
      t("profitability.site"),
      t("profitability.city"),
      t("profitability.revenue"),
      t("profitability.totalCosts"),
      t("profitability.netProfit"),
      t("profitability.margin")
    ]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: PROFITABILITY_COLORS.darkGray,
      textColor: PROFITABILITY_COLORS.white,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: PROFITABILITY_COLORS.darkGray,
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 40 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
      4: { halign: "right", cellWidth: 35 },
      5: { halign: "right", cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: {
      fillColor: PROFITABILITY_COLORS.lightGray,
    },
    didParseCell: (cellData) => {
      if (cellData.column.index === 4 && cellData.section === "body") {
        const value = parseFloat(cellData.cell.raw?.toString().replace(/[^\d,-]/g, "").replace(",", ".") || "0");
        if (value < 0) {
          cellData.cell.styles.textColor = PROFITABILITY_COLORS.red;
        } else if (value > 0) {
          cellData.cell.styles.textColor = PROFITABILITY_COLORS.green;
        }
      }
      if (cellData.column.index === 5 && cellData.section === "body") {
        const value = parseFloat(cellData.cell.raw?.toString().replace("%", "").replace(",", ".") || "0");
        if (value >= 30) {
          cellData.cell.styles.textColor = PROFITABILITY_COLORS.green;
        } else if (value < 15) {
          cellData.cell.styles.textColor = PROFITABILITY_COLORS.red;
        }
      }
    }
  });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text(
    t("profitability.comparisonPdfDisclaimer"),
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );
  doc.text(
    `Lavcom Performances | ${format(new Date(), "dd/MM/yyyy", { locale: fr })}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );
  
  const filename = `Comparatif_Rentabilite_${format(data.dateStart, "yyyyMMdd")}_${format(data.dateEnd, "yyyyMMdd")}.pdf`;
  doc.save(filename);
}

export function exportProfitabilityComparisonCSV(data: ProfitabilityComparisonData, t: (key: string) => string): void {
  const headers = [
    t("profitability.site"),
    t("profitability.city"),
    t("profitability.revenue"),
    t("profitability.totalCosts"),
    t("profitability.netProfit"),
    t("profitability.margin")
  ];
  
  // Sanitize site names and cities
  const rows = data.sites.map(site => [
    sanitizeForCsv(site.siteName),
    sanitizeForCsv(site.city || '-'),
    site.revenue.toFixed(2),
    site.costs.toFixed(2),
    site.profit.toFixed(2),
    site.margin.toFixed(1) + "%"
  ]);
  
  const metaRows = [
    [t("profitability.comparisonPdfTitle")],
    [`${t("profitability.period")}: ${format(data.dateStart, "dd/MM/yyyy")} - ${format(data.dateEnd, "dd/MM/yyyy")} (${data.periodDays} ${t("profitability.days")})`],
    [`${t("profitability.generatedOn")}: ${format(new Date(), "dd/MM/yyyy", { locale: fr })}`],
    [],
  ];
  
  const csvContent = [
    ...metaRows.map(row => row.join(';')),
    headers.join(';'),
    ...rows.map(row => buildCsvLine(row, ';')),
  ].join('\n');
  
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Comparatif_Rentabilite_${format(data.dateStart, "yyyyMMdd")}_${format(data.dateEnd, "yyyyMMdd")}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Audit log the export
  logExport({
    exportType: 'profitability_csv',
    recordCount: data.sites.length,
    dateFrom: data.dateStart,
    dateTo: data.dateEnd,
  });
}
