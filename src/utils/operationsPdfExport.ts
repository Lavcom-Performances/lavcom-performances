import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Operation {
  id: string;
  date: Date;
  label: string;
  category: string;
  paymentMode: string;
  amount: number;
  insert: number;
  rendu: number;
  detail: string;
}

interface ExportOptions {
  laundromatName: string;
  dateFrom: Date;
  dateTo: Date;
  operations: Operation[];
}

// Lavcom brand colors
const COLORS = {
  green: [163, 198, 21] as [number, number, number],    // #A3C615
  yellow: [252, 210, 89] as [number, number, number],   // #FCD259
  darkGray: [56, 56, 56] as [number, number, number],   // #383838
  lightGray: [217, 217, 217] as [number, number, number], // #D9D9D9
  white: [255, 255, 255] as [number, number, number],
};

const categoryLabels: Record<string, string> = {
  LAVE_LINGE: "Lave-linge",
  SECHE_LINGE: "Sèche-linge",
  LESSIVE: "Lessive",
  RECHARGE_CB: "Recharge CB",
  RECHARGE_ESP: "Recharge ESP",
  AUTRE: "Autre",
};

export function generateOperationsPdf(options: ExportOptions): void {
  const { laundromatName, dateFrom, dateTo, operations } = options;
  
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
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(laundromatName, pageWidth / 2, 10, { align: "center" });
  
  doc.setFontSize(12);
  doc.text("Export des opérations", pageWidth / 2, 18, { align: "center" });

  // Period info
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const periodText = `Période : du ${format(dateFrom, "dd/MM/yyyy", { locale: fr })} au ${format(dateTo, "dd/MM/yyyy", { locale: fr })}`;
  doc.text(periodText, pageWidth / 2, 35, { align: "center" });

  // Summary stats
  const totalAmount = operations.reduce((sum, op) => sum + op.amount, 0);
  const cbAmount = operations.filter(op => op.paymentMode === "CB").reduce((sum, op) => sum + op.amount, 0);
  const espAmount = operations.filter(op => op.paymentMode === "ESP").reduce((sum, op) => sum + op.amount, 0);

  const summaryY = 42;
  const boxWidth = (pageWidth - margin * 2 - 20) / 3;

  // Total box
  doc.setFillColor(...COLORS.green);
  doc.roundedRect(margin, summaryY, boxWidth, 18, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.text("TOTAL", margin + boxWidth / 2, summaryY + 6, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${totalAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, margin + boxWidth / 2, summaryY + 13, { align: "center" });

  // CB box
  doc.setFillColor(...COLORS.yellow);
  doc.roundedRect(margin + boxWidth + 10, summaryY, boxWidth, 18, 2, 2, "F");
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CB", margin + boxWidth + 10 + boxWidth / 2, summaryY + 6, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${cbAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, margin + boxWidth + 10 + boxWidth / 2, summaryY + 13, { align: "center" });

  // ESP box
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin + (boxWidth + 10) * 2, summaryY, boxWidth, 18, 2, 2, "F");
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("ESPÈCES", margin + (boxWidth + 10) * 2 + boxWidth / 2, summaryY + 6, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${espAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, margin + (boxWidth + 10) * 2 + boxWidth / 2, summaryY + 13, { align: "center" });

  // Operations count
  doc.setTextColor(...COLORS.darkGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${operations.length} opérations`, pageWidth / 2, summaryY + 25, { align: "center" });

  // Operations table
  autoTable(doc, {
    startY: summaryY + 32,
    head: [["Date", "Heure", "Machine", "Type", "Montant", "Mode", "Détail"]],
    body: operations.map(op => [
      format(op.date, "dd/MM/yyyy", { locale: fr }),
      format(op.date, "HH:mm", { locale: fr }),
      op.label,
      categoryLabels[op.category] || op.category,
      `${op.amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
      op.paymentMode,
      op.detail || "-",
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
    didDrawPage: (data) => {
      // Header on each page
      if (data.pageNumber > 1) {
        doc.setFillColor(...COLORS.green);
        doc.rect(0, 0, pageWidth, 15, "F");
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${laundromatName} - Export des opérations (suite)`, pageWidth / 2, 10, { align: "center" });
      }
    },
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(
      `${laundromatName} - Export opérations du ${format(dateFrom, "dd/MM/yyyy")} au ${format(dateTo, "dd/MM/yyyy")} | Page ${i}/${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save
  const filename = `${laundromatName.replace(/\s+/g, "_")}_operations_${format(dateFrom, "yyyyMMdd")}_${format(dateTo, "yyyyMMdd")}.pdf`;
  doc.save(filename);
}
