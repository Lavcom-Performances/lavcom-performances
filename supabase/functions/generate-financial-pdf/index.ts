import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bank-grade PDF styling constants
const BLUE_HEADER = [47, 117, 181]; // #2F75B5
const LIGHT_GREY = [245, 245, 245];
const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { 
    style: "currency", 
    currency: "EUR", 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("fr-FR", { 
    style: "percent", 
    minimumFractionDigits: 1,
    maximumFractionDigits: 1 
  }).format(value);
}

function formatDate(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseUser.auth.getUser();
      userId = user?.id || null;
    }

    const { projectId, scenarioId } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Call the RPC to get all PDF data
    const { data: bundle, error: rpcError } = await supabaseAdmin.rpc("rpc_get_fin_pdf_bundle", {
      p_project_id: projectId,
      p_scenario_id: scenarioId || null,
    });

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get owner for storage path
    const { data: project } = await supabaseAdmin
      .from("fin_projects")
      .select("*, fin_workspaces!inner(owner_user_id)")
      .eq("id", projectId)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveUserId = project.fin_workspaces.owner_user_id;
    const vatRate = bundle.meta?.vat_rate || 0.20;

    // =====================================================
    // GENERATE BANK-GRADE PDF
    // =====================================================
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // Helper to add section header
    const addSectionHeader = (title: string, y: number): number => {
      doc.setFillColor(...BLUE_HEADER);
      doc.rect(14, y, pageWidth - 28, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(title, 16, y + 5.5);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      return y + 12;
    };

    // =====================================================
    // PAGE 1: COVER / EXECUTIVE SUMMARY
    // =====================================================
    doc.setFillColor(...BLUE_HEADER);
    doc.rect(0, 0, pageWidth, 50, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("PRÉVISIONNEL FINANCIER", pageWidth / 2, 25, { align: "center" });

    doc.setFontSize(16);
    doc.text(bundle.meta?.project_name || "Projet", pageWidth / 2, 38, { align: "center" });

    doc.setTextColor(0, 0, 0);
    currentY = 65;

    doc.setFontSize(11);
    doc.text(`Scénario : ${bundle.meta?.scenario_name || "Baseline"}`, 14, currentY);
    currentY += 6;
    doc.text(`Date : ${formatDate(new Date())}`, 14, currentY);
    currentY += 6;
    doc.text(`Horizon : ${bundle.meta?.horizon_years || 3} ans`, 14, currentY);
    currentY += 15;

    // KPI Summary Cards
    currentY = addSectionHeader("SYNTHÈSE EXÉCUTIVE", currentY);

    const summary = bundle.summary || {};
    const kpis = [
      ["CA TTC (Année 1)", formatCurrency(summary.ca_ttc_year1 || 0)],
      ["CA HT (Année 1)", formatCurrency(summary.ca_ht_year1 || 0)],
      ["EBITDA (Année 1)", formatCurrency(summary.ebitda_year1 || 0)],
      ["TVA collectée (Année 1)", formatCurrency(summary.total_vat_year1 || 0)],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Indicateur", "Valeur"]],
      body: kpis,
      theme: "grid",
      headStyles: { fillColor: BLUE_HEADER, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 10, halign: "left" },
      columnStyles: { 1: { halign: "right" } },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 15 || currentY + 50;

    // Line Items Summary
    if (bundle.line_items && bundle.line_items.length > 0) {
      currentY = addSectionHeader("PARC MACHINES & SERVICES", currentY);

      const lineRows = bundle.line_items.map((item: any) => {
        const monthlyRev = (item.price_ttc_cents / 100) * item.quantity * item.cycles_per_day * item.open_days * item.utilization_rate;
        return [
          item.category,
          item.label,
          item.quantity.toString(),
          formatCurrency(item.price_ttc_cents / 100),
          formatPercent(item.utilization_rate),
          formatCurrency(monthlyRev),
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [["Catégorie", "Libellé", "Qté", "Prix TTC", "Utilisation", "CA Mensuel"]],
        body: lineRows,
        theme: "striped",
        headStyles: { fillColor: BLUE_HEADER, textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 9 },
        columnStyles: { 
          2: { halign: "center" },
          3: { halign: "right" },
          4: { halign: "center" },
          5: { halign: "right" },
        },
      });
    }

    // =====================================================
    // PAGE 2: COMPTE DE RÉSULTAT (P&L)
    // =====================================================
    doc.addPage();
    currentY = 20;

    currentY = addSectionHeader("COMPTE DE RÉSULTAT PRÉVISIONNEL", currentY);

    const pnl = bundle.pnl || {};
    const year1 = pnl.year1 || {};
    const year2 = pnl.year2 || {};
    const year3 = pnl.year3 || {};

    // Get hypotheses for cost breakdown
    const hypotheses = bundle.hypotheses || [];
    const getHypValue = (key: string) => {
      const h = hypotheses.find((h: any) => h.key === key);
      return h ? Number(h.value) : 0;
    };

    const fixedCosts = getHypValue("fixed_costs");
    const varRate = getHypValue("variable_cost_rate");
    const loanAmount = getHypValue("loan_amount");
    const loanRate = getHypValue("loan_rate");
    const loanYears = getHypValue("loan_years") || 7;
    const depreciationYears = getHypValue("depreciation_years") || 7;
    const investment = getHypValue("initial_investment");

    // Calculate detailed P&L rows
    const annualDepreciation = investment / depreciationYears;
    const annualInterest = (loanAmount * loanRate);

    const y1Rev = year1.revenue_ht || 0;
    const y2Rev = year2.revenue_ht || 0;
    const y3Rev = year3.revenue_ht || 0;

    const y1VarCost = y1Rev * varRate;
    const y2VarCost = y2Rev * varRate;
    const y3VarCost = y3Rev * varRate;

    const y1FixedCost = fixedCosts * 12;
    const y2FixedCost = fixedCosts * 12;
    const y3FixedCost = fixedCosts * 12;

    const pnlRows = [
      ["Chiffre d'affaires HT", formatCurrency(y1Rev), formatCurrency(y2Rev), formatCurrency(y3Rev), "100%"],
      ["", "", "", "", ""],
      ["Charges variables", formatCurrency(-y1VarCost), formatCurrency(-y2VarCost), formatCurrency(-y3VarCost), formatPercent(varRate)],
      ["Charges fixes", formatCurrency(-y1FixedCost), formatCurrency(-y2FixedCost), formatCurrency(-y3FixedCost), "-"],
      ["", "", "", "", ""],
      ["EBITDA", formatCurrency(year1.ebitda || 0), formatCurrency(year2.ebitda || 0), formatCurrency(year3.ebitda || 0), formatPercent((year1.ebitda || 0) / (y1Rev || 1))],
      ["", "", "", "", ""],
      ["Amortissements", formatCurrency(-annualDepreciation), formatCurrency(-annualDepreciation), formatCurrency(-annualDepreciation), "-"],
      ["Résultat d'exploitation", formatCurrency((year1.ebitda || 0) - annualDepreciation), formatCurrency((year2.ebitda || 0) - annualDepreciation), formatCurrency((year3.ebitda || 0) - annualDepreciation), "-"],
      ["", "", "", "", ""],
      ["Charges financières", formatCurrency(-annualInterest), formatCurrency(-annualInterest * 0.9), formatCurrency(-annualInterest * 0.8), "-"],
      ["Résultat net", formatCurrency((year1.ebitda || 0) - annualDepreciation - annualInterest), formatCurrency((year2.ebitda || 0) - annualDepreciation - annualInterest * 0.9), formatCurrency((year3.ebitda || 0) - annualDepreciation - annualInterest * 0.8), "-"],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Poste", "Exercice 1", "Exercice 2", "Exercice 3", "%"]],
      body: pnlRows,
      theme: "plain",
      headStyles: { fillColor: BLUE_HEADER, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "center" },
      },
      didParseCell: (data: any) => {
        if (data.row.raw && (data.row.raw[0] === "EBITDA" || data.row.raw[0] === "Résultat net")) {
          data.cell.styles.fillColor = LIGHT_GREY;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // =====================================================
    // PAGE 3: BILAN PRÉVISIONNEL
    // =====================================================
    doc.addPage();
    currentY = 20;

    currentY = addSectionHeader("BILAN PRÉVISIONNEL", currentY);

    // Simplified balance sheet
    const balanceRows = [
      ["ACTIF", "", "", ""],
      ["Immobilisations (net)", formatCurrency(investment - annualDepreciation), formatCurrency(investment - annualDepreciation * 2), formatCurrency(investment - annualDepreciation * 3)],
      ["Créances clients", formatCurrency(0), formatCurrency(0), formatCurrency(0)],
      ["Disponibilités", formatCurrency((year1.ebitda || 0) - annualInterest), formatCurrency((year1.ebitda || 0) + (year2.ebitda || 0) - annualInterest * 1.9), formatCurrency((year1.ebitda || 0) + (year2.ebitda || 0) + (year3.ebitda || 0) - annualInterest * 2.7)],
      ["TOTAL ACTIF", formatCurrency(investment), formatCurrency(investment), formatCurrency(investment)],
      ["", "", "", ""],
      ["PASSIF", "", "", ""],
      ["Capitaux propres", formatCurrency(investment - loanAmount), formatCurrency(investment - loanAmount + (year1.ebitda || 0) - annualDepreciation - annualInterest), formatCurrency(investment - loanAmount + (year1.ebitda || 0) + (year2.ebitda || 0) - annualDepreciation * 2 - annualInterest * 1.9)],
      ["Dettes financières", formatCurrency(loanAmount), formatCurrency(loanAmount * 0.85), formatCurrency(loanAmount * 0.7)],
      ["Dettes fiscales (TVA)", formatCurrency(summary.total_vat_year1 / 12 || 0), formatCurrency(summary.total_vat_year1 / 12 || 0), formatCurrency(summary.total_vat_year1 / 12 || 0)],
      ["TOTAL PASSIF", formatCurrency(investment), formatCurrency(investment), formatCurrency(investment)],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Poste", "Année 1", "Année 2", "Année 3"]],
      body: balanceRows,
      theme: "plain",
      headStyles: { fillColor: BLUE_HEADER, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
      didParseCell: (data: any) => {
        if (data.row.raw && (data.row.raw[0] === "ACTIF" || data.row.raw[0] === "PASSIF" || data.row.raw[0].startsWith("TOTAL"))) {
          data.cell.styles.fillColor = LIGHT_GREY;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // =====================================================
    // PAGE 4: PLAN DE TRÉSORERIE MENSUEL (Année 1)
    // =====================================================
    doc.addPage();
    currentY = 20;

    currentY = addSectionHeader("PLAN DE TRÉSORERIE MENSUEL - ANNÉE 1", currentY);

    const monthlyData = bundle.cash_monthly || [];
    const monthlyPayroll = fixedCosts * 0.4; // Estimate 40% of fixed costs is payroll
    const monthlyOpex = fixedCosts * 0.6;
    const monthlyDebt = loanAmount / (loanYears * 12);

    const cashRows: string[][] = [];

    // Header row
    cashRows.push(["Poste", ...MONTH_NAMES.slice(0, 6).map(m => m.substring(0, 3))]);

    // Encaissements section
    cashRows.push(["ENCAISSEMENTS", "", "", "", "", "", ""]);
    cashRows.push(["CA TTC", ...monthlyData.slice(0, 6).map((m: any) => formatCurrency(m.revenue_ttc || 0))]);

    // Décaissements section  
    cashRows.push(["DÉCAISSEMENTS", "", "", "", "", "", ""]);
    cashRows.push(["Charges variables", ...monthlyData.slice(0, 6).map((m: any) => formatCurrency(-((m.revenue_ht || 0) * varRate)))]);
    cashRows.push(["Charges fixes", ...Array(6).fill(formatCurrency(-monthlyOpex))]);
    cashRows.push(["Salaires", ...Array(6).fill(formatCurrency(-monthlyPayroll))]);
    cashRows.push(["TVA à payer", ...monthlyData.slice(0, 6).map((m: any) => formatCurrency(-(m.vat_collected || 0)))]);
    cashRows.push(["Remboursement emprunt", ...Array(6).fill(formatCurrency(-monthlyDebt))]);

    // Net row
    let cumulative = 0;
    const netRow = ["TRÉSORERIE NETTE"];
    for (let i = 0; i < 6; i++) {
      const m = monthlyData[i] || {};
      const inflow = m.revenue_ttc || 0;
      const outflow = ((m.revenue_ht || 0) * varRate) + monthlyOpex + monthlyPayroll + (m.vat_collected || 0) + monthlyDebt;
      const net = inflow - outflow;
      cumulative += net;
      netRow.push(formatCurrency(net));
    }
    cashRows.push(netRow);

    autoTable(doc, {
      startY: currentY,
      body: cashRows,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 45 },
      },
      didParseCell: (data: any) => {
        if (data.row.index === 0) {
          data.cell.styles.fillColor = BLUE_HEADER;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.row.raw && (data.row.raw[0] === "ENCAISSEMENTS" || data.row.raw[0] === "DÉCAISSEMENTS" || data.row.raw[0] === "TRÉSORERIE NETTE")) {
          data.cell.styles.fillColor = LIGHT_GREY;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index > 0) {
          data.cell.styles.halign = "right";
        }
      },
    });

    // Second half of year
    currentY = (doc as any).lastAutoTable?.finalY + 10 || currentY + 80;

    const cashRows2: string[][] = [];
    cashRows2.push(["Poste", ...MONTH_NAMES.slice(6, 12).map(m => m.substring(0, 3))]);
    cashRows2.push(["ENCAISSEMENTS", "", "", "", "", "", ""]);
    cashRows2.push(["CA TTC", ...monthlyData.slice(6, 12).map((m: any) => formatCurrency(m.revenue_ttc || 0))]);
    cashRows2.push(["DÉCAISSEMENTS", "", "", "", "", "", ""]);
    cashRows2.push(["Charges variables", ...monthlyData.slice(6, 12).map((m: any) => formatCurrency(-((m.revenue_ht || 0) * varRate)))]);
    cashRows2.push(["Charges fixes", ...Array(6).fill(formatCurrency(-monthlyOpex))]);
    cashRows2.push(["Salaires", ...Array(6).fill(formatCurrency(-monthlyPayroll))]);
    cashRows2.push(["TVA à payer", ...monthlyData.slice(6, 12).map((m: any) => formatCurrency(-(m.vat_collected || 0)))]);
    cashRows2.push(["Remboursement emprunt", ...Array(6).fill(formatCurrency(-monthlyDebt))]);

    const netRow2 = ["TRÉSORERIE NETTE"];
    for (let i = 6; i < 12; i++) {
      const m = monthlyData[i] || {};
      const inflow = m.revenue_ttc || 0;
      const outflow = ((m.revenue_ht || 0) * varRate) + monthlyOpex + monthlyPayroll + (m.vat_collected || 0) + monthlyDebt;
      const net = inflow - outflow;
      cumulative += net;
      netRow2.push(formatCurrency(net));
    }
    cashRows2.push(netRow2);

    autoTable(doc, {
      startY: currentY,
      body: cashRows2,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 45 },
      },
      didParseCell: (data: any) => {
        if (data.row.index === 0) {
          data.cell.styles.fillColor = BLUE_HEADER;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.row.raw && (data.row.raw[0] === "ENCAISSEMENTS" || data.row.raw[0] === "DÉCAISSEMENTS" || data.row.raw[0] === "TRÉSORERIE NETTE")) {
          data.cell.styles.fillColor = LIGHT_GREY;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index > 0) {
          data.cell.styles.halign = "right";
        }
      },
    });

    // =====================================================
    // PAGE 5: PLAN DE FINANCEMENT & BFR
    // =====================================================
    doc.addPage();
    currentY = 20;

    currentY = addSectionHeader("PLAN DE FINANCEMENT - ANNÉE 1", currentY);

    const fundingRows = [
      ["BESOINS", "", ""],
      ["Investissements", formatCurrency(investment), formatPercent(investment / investment)],
      ["BFR initial", formatCurrency(fixedCosts * 2), formatPercent((fixedCosts * 2) / investment)],
      ["TOTAL BESOINS", formatCurrency(investment + fixedCosts * 2), "100%"],
      ["", "", ""],
      ["RESSOURCES", "", ""],
      ["Apport personnel", formatCurrency(investment - loanAmount), formatPercent((investment - loanAmount) / investment)],
      ["Emprunt bancaire", formatCurrency(loanAmount), formatPercent(loanAmount / investment)],
      ["TOTAL RESSOURCES", formatCurrency(investment), "100%"],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Poste", "Montant", "%"]],
      body: fundingRows,
      theme: "plain",
      headStyles: { fillColor: BLUE_HEADER, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 10 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "center" },
      },
      didParseCell: (data: any) => {
        if (data.row.raw && (data.row.raw[0] === "BESOINS" || data.row.raw[0] === "RESSOURCES" || data.row.raw[0].startsWith("TOTAL"))) {
          data.cell.styles.fillColor = LIGHT_GREY;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 15 || currentY + 80;

    currentY = addSectionHeader("BESOIN EN FONDS DE ROULEMENT (BFR)", currentY);

    const bfrRows = [
      ["BESOINS", ""],
      ["Stock de produits", formatCurrency(500)],
      ["Créances clients", formatCurrency(0)],
      ["TOTAL BESOINS", formatCurrency(500)],
      ["", ""],
      ["RESSOURCES", ""],
      ["Dettes fournisseurs", formatCurrency(fixedCosts / 2)],
      ["Dettes fiscales", formatCurrency(summary.total_vat_year1 / 12 || 0)],
      ["TOTAL RESSOURCES", formatCurrency(fixedCosts / 2 + (summary.total_vat_year1 / 12 || 0))],
      ["", ""],
      ["BFR NET", formatCurrency(500 - fixedCosts / 2 - (summary.total_vat_year1 / 12 || 0))],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Poste", "Montant"]],
      body: bfrRows,
      theme: "plain",
      headStyles: { fillColor: BLUE_HEADER, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 10 },
      columnStyles: {
        1: { halign: "right" },
      },
      didParseCell: (data: any) => {
        if (data.row.raw && (data.row.raw[0] === "BESOINS" || data.row.raw[0] === "RESSOURCES" || data.row.raw[0].startsWith("TOTAL") || data.row.raw[0] === "BFR NET")) {
          data.cell.styles.fillColor = LIGHT_GREY;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // =====================================================
    // FOOTER on all pages
    // =====================================================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(`Document généré le ${formatDate(new Date())} - Page ${i}/${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    // =====================================================
    // SAVE TO STORAGE
    // =====================================================
    const pdfOutput = doc.output("arraybuffer");
    const pdfBlob = new Uint8Array(pdfOutput);

    const fileName = `previsionnel-banque-${bundle.meta?.project_name?.toLowerCase().replace(/\s+/g, "-") || "projet"}-${new Date().toISOString().split("T")[0]}.pdf`;
    const filePath = `${effectiveUserId}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("fin-exports")
      .upload(filePath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create fin_exports record
    await supabaseAdmin.from("fin_exports").insert({
      project_id: projectId,
      format: "pdf",
      status: "completed",
      file_path: filePath,
      file_name: fileName,
      completed_at: new Date().toISOString(),
      metadata: { type: "bank_grade", scenario_id: scenarioId },
    });

    // Log to system_events
    await supabaseAdmin.from("system_events").insert({
      source: "fin_exports",
      severity: "info",
      code: "EXPORT_BANK_PDF",
      message: `Bank-grade PDF generated for project ${bundle.meta?.project_name}`,
      meta: {
        project_id: projectId,
        scenario_id: scenarioId,
        file_name: fileName,
        user_id: effectiveUserId,
      },
    });

    // Get signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("fin-exports")
      .createSignedUrl(filePath, 3600);

    if (signedUrlError) {
      return new Response(JSON.stringify({ error: "Failed to create download link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      fileName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
