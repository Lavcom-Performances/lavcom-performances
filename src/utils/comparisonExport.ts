import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

const formatCurrency = (value: number): string => {
  if (isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('fr-FR', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(Math.round(value)) + ' €';
};

const formatTrendText = (trend: number | null): string => {
  if (trend === null || isNaN(trend)) return 'N/A';
  const sign = trend > 0 ? '+' : '';
  return `${sign}${trend.toFixed(1)}%`;
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
    formatCurrency(site.revenue),
    site.hasCosts && site.profit !== null ? formatCurrency(site.profit) : 'N/A',
    site.occupation > 0 ? site.occupation.toFixed(1) : 'N/A',
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
  
  const rows = data.sites.map((site, index) => [
    index + 1,
    `"${site.name}"`,
    `"${site.city || ''}"`,
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
    ...rows.map(row => row.join(';')),
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
}
