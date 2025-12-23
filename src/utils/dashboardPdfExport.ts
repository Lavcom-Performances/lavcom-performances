import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DashboardExportData {
  siteName: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  kpis: {
    totalRevenue: number;
    revenueByCard: number;
    revenueByCash: number;
    totalTransactions: number;
    averageBasket: number;
    cardPercentage: number;
    cashPercentage: number;
  };
  monthlyData: Array<{
    month: string;
    revenue: number;
  }>;
  paymentData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  machinePerformance: Array<{
    machine: string;
    revenue: number;
    transactions: number;
  }>;
}

// Lavcom brand colors
const COLORS = {
  green: [163, 198, 21] as [number, number, number],
  yellow: [252, 210, 89] as [number, number, number],
  darkGray: [56, 56, 56] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

interface ChartCapture {
  selector: string;
  title: string;
}

async function captureChartAsImage(selector: string): Promise<string | null> {
  const element = document.querySelector(selector) as HTMLElement;
  if (!element) return null;

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error(`Failed to capture chart ${selector}:`, error);
    return null;
  }
}

export async function generateDashboardPdf(
  data: DashboardExportData, 
  selectedCharts?: string[], 
  selectedTables?: string[],
  orientation: "portrait" | "landscape" = "portrait"
): Promise<void> {
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = 0;

  // Format date range
  const dateFrom = format(data.dateRange.from, "dd MMM yyyy", { locale: fr });
  const dateTo = format(data.dateRange.to, "dd MMM yyyy", { locale: fr });

  // Header
  doc.setFillColor(...COLORS.green);
  doc.rect(0, 0, pageWidth, 30, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport Dashboard", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.siteName} • ${dateFrom} - ${dateTo}`, pageWidth / 2, 24, { align: "center" });

  currentY = 40;

  // Section: KPIs principaux
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Indicateurs clés de performance", margin, currentY);
  currentY += 8;

  // KPI Grid (2x3)
  const kpiBoxWidth = (pageWidth - margin * 2 - 10) / 3;
  const kpiBoxHeight = 25;

  const kpis = [
    { label: "CA Total", value: formatCurrency(data.kpis.totalRevenue), color: COLORS.green },
    { label: "CA Carte", value: `${formatCurrency(data.kpis.revenueByCard)} (${data.kpis.cardPercentage}%)`, color: COLORS.yellow },
    { label: "CA Espèces", value: `${formatCurrency(data.kpis.revenueByCash)} (${data.kpis.cashPercentage}%)`, color: COLORS.lightGray },
    { label: "Transactions", value: data.kpis.totalTransactions.toString(), color: COLORS.lightGray },
    { label: "Panier moyen", value: `${data.kpis.averageBasket.toFixed(2)} €`, color: COLORS.lightGray },
    { label: "CA/Jour moy.", value: formatCurrency(data.kpis.totalRevenue / 30), color: COLORS.lightGray },
  ];

  kpis.forEach((kpi, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + col * (kpiBoxWidth + 5);
    const y = currentY + row * (kpiBoxHeight + 5);

    doc.setFillColor(...kpi.color);
    doc.roundedRect(x, y, kpiBoxWidth, kpiBoxHeight, 2, 2, "F");

    const textColor = kpi.color === COLORS.green ? COLORS.white : COLORS.darkGray;
    doc.setTextColor(...textColor);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.label, x + 5, y + 9);

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(kpi.value, x + 5, y + 19);
  });

  currentY += (kpiBoxHeight + 5) * 2 + 15;

  // Capture charts - filter by selectedCharts if provided
  const allChartConfigs: (ChartCapture & { id: string })[] = [
    { id: "monthly-revenue", selector: '[data-pdf-chart="monthly-revenue"]', title: "Évolution mensuelle du CA" },
    { id: "payment-pie", selector: '[data-pdf-chart="payment-pie"]', title: "Répartition par mode de paiement" },
    { id: "weekday-performance", selector: '[data-pdf-chart="weekday-performance"]', title: "CA par jour de la semaine" },
    { id: "sales-heatmap", selector: '[data-pdf-chart="sales-heatmap"]', title: "Heatmap des cycles (jour × heure)" },
  ];

  const chartConfigs = selectedCharts 
    ? allChartConfigs.filter(c => selectedCharts.includes(c.id))
    : allChartConfigs;
  for (const chartConfig of chartConfigs) {
    const chartImage = await captureChartAsImage(chartConfig.selector);
    
    if (chartImage) {
      // Check if we need a new page
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = 20;
      }

      // Chart title
      doc.setTextColor(...COLORS.darkGray);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(chartConfig.title, margin, currentY);
      currentY += 5;

      // Calculate image dimensions to fit page width
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = 70; // Fixed height for charts

      doc.addImage(chartImage, "PNG", margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 15;
    }
  }

  // Section: Évolution mensuelle (table as fallback or complement)
  const includeMonthlyTable = !selectedTables || selectedTables.includes("monthly-data");
  if (data.monthlyData.length > 0 && includeMonthlyTable) {
    // Check if we need a new page
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = 20;
    }

    doc.setTextColor(...COLORS.darkGray);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Données mensuelles détaillées", margin, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      head: [["Mois", "Chiffre d'affaires"]],
      body: data.monthlyData.map((m) => [m.month, formatCurrency(m.revenue)]),
      theme: "striped",
      headStyles: {
        fillColor: COLORS.green,
        textColor: COLORS.white,
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.darkGray,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // Section: Répartition par mode de paiement
  const includePaymentTable = !selectedTables || selectedTables.includes("payment-details");
  if (data.paymentData.length > 0 && includePaymentTable) {
    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }

    doc.setTextColor(...COLORS.darkGray);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Détail des paiements", margin, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      head: [["Mode de paiement", "Montant", "Part"]],
      body: data.paymentData.map((p) => {
        const total = data.paymentData.reduce((sum, item) => sum + item.value, 0);
        const percentage = total > 0 ? Math.round((p.value / total) * 100) : 0;
        return [p.name, formatCurrency(p.value), `${percentage}%`];
      }),
      theme: "striped",
      headStyles: {
        fillColor: COLORS.yellow,
        textColor: COLORS.darkGray,
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.darkGray,
      },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // Check if we need a new page for machine performance
  const includeMachineTable = !selectedTables || selectedTables.includes("machine-performance");
  if (currentY > pageHeight - 80 && data.machinePerformance.length > 0 && includeMachineTable) {
    doc.addPage();
    currentY = 20;
  }

  // Section: Performance par machine
  if (data.machinePerformance.length > 0 && includeMachineTable) {
    doc.setTextColor(...COLORS.darkGray);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Performance par machine", margin, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      head: [["Machine", "CA", "Transactions", "Panier moy."]],
      body: data.machinePerformance.map((m) => [
        m.machine,
        formatCurrency(m.revenue),
        m.transactions.toString(),
        m.transactions > 0 ? `${(m.revenue / m.transactions).toFixed(2)} €` : "—",
      ]),
      theme: "striped",
      headStyles: {
        fillColor: COLORS.green,
        textColor: COLORS.white,
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.darkGray,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(
      `${data.siteName} • Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })} | Page ${i}/${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  // Generate filename
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const siteName = data.siteName.replace(/\s+/g, "_");
  doc.save(`Dashboard_${siteName}_${dateStr}.pdf`);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " €";
}
