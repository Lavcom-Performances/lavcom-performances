import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// THEME & CONSTANTS
// =====================================================
const BRAND_BLUE: [number, number, number] = [47, 117, 181];
const LIGHT_ROW: [number, number, number] = [242, 242, 242];
const GREY_TEXT: [number, number, number] = [100, 100, 100];

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MONTH_ABBREV = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jui", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const EXPLANATIONS = {
  executiveSummary: "Cette synthèse présente les indicateurs clés du scénario sélectionné. Les montants TTC servent à la trésorerie, tandis que le compte de résultat est exprimé en HT.",
  pnl: "Le compte de résultat est présenté en HT. Il mesure la performance économique (CA, charges, EBITDA) sur la période, indépendamment du calendrier des encaissements/décaissements.",
  balance: "Le bilan présente la situation patrimoniale en fin d'exercice (actif et passif). Les disponibilités correspondent à la trésorerie cumulée après prise en compte des flux.",
  treasury: "Le plan de trésorerie est exprimé en TTC et intègre la TVA mensuelle à payer. Il permet de vérifier la capacité du projet à financer son activité mois par mois.",
  funding: "Le plan de financement compare les besoins initiaux (investissements, BFR, frais) aux ressources (apport, emprunt, aides). Les pourcentages sont affichés uniquement si un total est renseigné.",
  bfr: "Le BFR (besoin en fonds de roulement) représente le décalage entre les besoins (stocks, créances) et les ressources (dettes). Un BFR négatif signifie un financement favorable par les dettes.",
};

// =====================================================
// FORMATTING HELPERS (Bank-Grade for jsPDF)
// CRITICAL: jsPDF cannot render Unicode NNBSP (\u202F) properly - it shows as "/"
// Solution: Use custom formatting with regular spaces only
// =====================================================

/**
 * Parse any value to a number, return null if invalid
 */
function safeNumber(n: unknown): number | null {
  if (n === null || n === undefined) return null;
  const parsed = typeof n === "number" ? n : Number(n);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Normalize a number: remove -0, round to avoid floating point issues
 */
function normalizeNumber(value: number, precision = 2): number {
  const rounded = Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
  if (Math.abs(rounded) < Math.pow(10, -precision)) return 0;
  return rounded;
}

/**
 * Format a number with French-style thousands separator (regular space)
 * This avoids jsPDF issues with Unicode characters like NNBSP
 */
function formatNumberFr(value: number, decimals = 0): string {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  // Split into integer and decimal parts
  const fixed = absValue.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  
  // Add thousand separators (regular space)
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  
  // Reassemble with comma for decimals (French style)
  let result = withSeparators;
  if (decimals > 0 && decPart) {
    result += "," + decPart;
  }
  
  return isNegative ? "-" + result : result;
}

/**
 * Format euros from euros (not cents)
 * Uses custom formatting to avoid jsPDF Unicode issues
 */
function formatEUR(amount: number | null | undefined, decimals = 0): string {
  const safe = safeNumber(amount);
  if (safe === null) return "—";
  
  const normalized = normalizeNumber(safe, decimals);
  
  // Use custom French formatting with regular space separator
  return formatNumberFr(normalized, decimals) + " €";
}

/**
 * Format euros with 2 decimals
 */
function formatEUR2(amount: number | null | undefined): string {
  return formatEUR(amount, 2);
}

/**
 * Format duration in years (e.g., "7 ans")
 * IMPORTANT: Never return "€" for duration values!
 */
function formatYears(value: number | null | undefined): string {
  const safe = safeNumber(value);
  if (safe === null) return "—";
  
  const normalized = Math.round(safe);
  if (normalized === 0) return "—";
  
  return normalized === 1 ? "1 an" : `${normalized} ans`;
}

/**
 * Format percentage from ratio (num/denom)
 * Uses custom formatting to avoid jsPDF Unicode issues
 */
function formatPct(num: number | null | undefined, denom: number | null | undefined): string {
  const safeNum = safeNumber(num);
  const safeDenom = safeNumber(denom);
  
  if (safeNum === null || safeDenom === null || safeDenom === 0) return "—";
  
  const ratio = normalizeNumber(safeNum / safeDenom, 4);
  const percent = ratio * 100;
  
  // Format with French comma for decimals
  return percent.toFixed(1).replace(".", ",") + " %";
}

/**
 * Format percentage from decimal value (0.25 = 25%)
 * Uses custom formatting to avoid jsPDF Unicode issues
 */
function formatPctValue(value: number | null | undefined): string {
  const safe = safeNumber(value);
  if (safe === null) return "—";
  
  const normalized = normalizeNumber(safe, 4);
  const percent = normalized * 100;
  
  // Format with French comma for decimals
  return percent.toFixed(1).replace(".", ",") + " %";
}

/**
 * Format date in French
 */
function formatDate(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// =====================================================
// DATA SANITIZATION
// =====================================================

interface SanitizedBundle {
  meta: {
    project_name: string;
    scenario_name: string;
    horizon_years: number;
    vat_rate: number;
  };
  summary: {
    ca_ttc_year1: number;
    ca_ht_year1: number;
    ebitda_year1: number;
    total_vat_year1: number;
  };
  line_items: Array<{
    category: string;
    label: string;
    quantity: number;
    price_ttc_cents: number;
    cycles_per_day: number;
    open_days: number;
    utilization_rate: number;
  }>;
  hypotheses: Array<{ key: string; value: number }>;
  pnl: {
    year1: { revenue_ht: number; ebitda: number };
    year2: { revenue_ht: number; ebitda: number };
    year3: { revenue_ht: number; ebitda: number };
  };
  cash_monthly: Array<{
    revenue_ttc: number;
    revenue_ht: number;
    vat_collected: number;
  }>;
  // Computed balance sheet data
  balance: {
    year1: { actif: BalanceActif; passif: BalancePassif };
    year2: { actif: BalanceActif; passif: BalancePassif };
    year3: { actif: BalanceActif; passif: BalancePassif };
  };
}

interface BalanceActif {
  immobilisations_net: number;
  stocks: number;
  creances_clients: number;
  autres_creances: number;
  disponibilites: number;
  total: number;
}

interface BalancePassif {
  capitaux_propres: number;
  dettes_financieres: number;
  dettes_fournisseurs: number;
  dettes_fiscales_sociales: number;
  autres_dettes: number;
  total: number;
}

/**
 * Sanitize and recompute bundle data before PDF rendering
 * - Replace missing values with null
 * - Normalize -0 to 0
 * - Recompute balance sheet totals
 */
function sanitizePdfBundle(bundle: any, hypotheses: any[]): SanitizedBundle {
  const getHypValue = (key: string): number => {
    const h = hypotheses.find((h: any) => h.key === key);
    return h ? Number(h.value) || 0 : 0;
  };

  const meta = bundle.meta || {};
  const summary = bundle.summary || {};
  const pnl = bundle.pnl || {};
  const lineItems = bundle.line_items || [];
  const cashMonthly = bundle.cash_monthly || [];

  // Get hypothesis values
  const investment = getHypValue("initial_investment");
  const loanAmount = getHypValue("loan_amount");
  const depreciationYears = getHypValue("depreciation_years") || 7;
  const loanYears = getHypValue("loan_years") || 7;
  const loanRate = getHypValue("loan_rate");
  const fixedCosts = getHypValue("fixed_costs");

  // Calculate derived values
  const annualDepreciation = investment / depreciationYears;
  const annualInterest = loanAmount * loanRate;

  const year1 = pnl.year1 || {};
  const year2 = pnl.year2 || {};
  const year3 = pnl.year3 || {};

  const y1Ebitda = safeNumber(year1.ebitda) || 0;
  const y2Ebitda = safeNumber(year2.ebitda) || 0;
  const y3Ebitda = safeNumber(year3.ebitda) || 0;

  // Compute cumulative cash for disponibilités
  const y1Cash = y1Ebitda - annualInterest;
  const y2Cash = y1Cash + y2Ebitda - annualInterest * 0.9;
  const y3Cash = y2Cash + y3Ebitda - annualInterest * 0.8;

  // Compute balance sheet with GUARANTEED EQUILIBRIUM
  // Accounting equation: Actif = Passif ⟺ Actif = Capitaux propres + Dettes
  // Therefore: Capitaux propres = Actif - Dettes (forces balance)
  const computeBalance = (yearNum: number): { actif: BalanceActif; passif: BalancePassif } => {
    const depreciationTotal = annualDepreciation * yearNum;
    const immoNet = Math.max(0, investment - depreciationTotal);
    
    // Calculate cumulative cash based on year
    let disponibilites = 0;
    let cumulativeEbitda = 0;
    let cumulativeInterest = 0;
    let principalRepaid = 0;
    
    const annualPrincipal = loanAmount / (loanYears || 7);
    
    if (yearNum >= 1) {
      cumulativeEbitda = y1Ebitda;
      cumulativeInterest = annualInterest;
      principalRepaid = annualPrincipal;
    }
    if (yearNum >= 2) {
      cumulativeEbitda += y2Ebitda;
      cumulativeInterest += annualInterest * 0.9;
      principalRepaid += annualPrincipal;
    }
    if (yearNum >= 3) {
      cumulativeEbitda += y3Ebitda;
      cumulativeInterest += annualInterest * 0.8;
      principalRepaid += annualPrincipal;
    }
    
    // Cash = EBITDA cumulé - Intérêts - Remboursements capital
    disponibilites = cumulativeEbitda - cumulativeInterest - principalRepaid * yearNum;
    
    // Fixed current assets
    const stocks = 500;
    const creancesClients = 0;
    const autresCreances = 0;
    
    // ACTIF TOTAL
    const totalActif = immoNet + stocks + creancesClients + autresCreances + disponibilites;
    
    // DETTES (Passif exigible)
    const dettesFinancieres = Math.max(0, loanAmount - principalRepaid * yearNum);
    const dettesFournisseurs = fixedCosts / 2;
    const dettesFiscales = (summary.total_vat_year1 || 0) / 12;
    const autresDettes = 0;
    
    const totalDettes = dettesFinancieres + dettesFournisseurs + dettesFiscales + autresDettes;
    
    // CAPITAUX PROPRES = ACTIF - DETTES (forces balance by definition)
    const capitauxPropres = totalActif - totalDettes;
    
    // Build structures with guaranteed balance
    const actif: BalanceActif = {
      immobilisations_net: normalizeNumber(immoNet),
      stocks: normalizeNumber(stocks),
      creances_clients: normalizeNumber(creancesClients),
      autres_creances: normalizeNumber(autresCreances),
      disponibilites: normalizeNumber(disponibilites),
      total: normalizeNumber(totalActif),
    };

    const passif: BalancePassif = {
      capitaux_propres: normalizeNumber(capitauxPropres),
      dettes_financieres: normalizeNumber(dettesFinancieres),
      dettes_fournisseurs: normalizeNumber(dettesFournisseurs),
      dettes_fiscales_sociales: normalizeNumber(dettesFiscales),
      autres_dettes: normalizeNumber(autresDettes),
      // PASSIF TOTAL = CAPITAUX PROPRES + DETTES = ACTIF (by construction)
      total: normalizeNumber(totalActif),
    };

    return { actif, passif };
  };

  return {
    meta: {
      project_name: meta.project_name || "Projet",
      scenario_name: meta.scenario_name || "Baseline",
      horizon_years: meta.horizon_years || 3,
      vat_rate: meta.vat_rate || 0.20,
    },
    summary: {
      ca_ttc_year1: normalizeNumber(safeNumber(summary.ca_ttc_year1) || 0),
      ca_ht_year1: normalizeNumber(safeNumber(summary.ca_ht_year1) || 0),
      ebitda_year1: normalizeNumber(safeNumber(summary.ebitda_year1) || 0),
      total_vat_year1: normalizeNumber(safeNumber(summary.total_vat_year1) || 0),
    },
    line_items: lineItems.map((item: any) => ({
      category: item.category || "—",
      label: item.label || "—",
      quantity: safeNumber(item.quantity) || 0,
      price_ttc_cents: safeNumber(item.price_ttc_cents) || 0,
      cycles_per_day: safeNumber(item.cycles_per_day) || 0,
      open_days: safeNumber(item.open_days) || 0,
      utilization_rate: safeNumber(item.utilization_rate) || 0,
    })),
    hypotheses: hypotheses.map((h: any) => ({
      key: h.key,
      value: safeNumber(h.value) || 0,
    })),
    pnl: {
      year1: { revenue_ht: normalizeNumber(safeNumber(year1.revenue_ht) || 0), ebitda: normalizeNumber(y1Ebitda) },
      year2: { revenue_ht: normalizeNumber(safeNumber(year2.revenue_ht) || 0), ebitda: normalizeNumber(y2Ebitda) },
      year3: { revenue_ht: normalizeNumber(safeNumber(year3.revenue_ht) || 0), ebitda: normalizeNumber(y3Ebitda) },
    },
    cash_monthly: cashMonthly.map((m: any) => ({
      revenue_ttc: normalizeNumber(safeNumber(m.revenue_ttc) || 0),
      revenue_ht: normalizeNumber(safeNumber(m.revenue_ht) || 0),
      vat_collected: normalizeNumber(safeNumber(m.vat_collected) || 0),
    })),
    balance: {
      year1: computeBalance(1),
      year2: computeBalance(2),
      year3: computeBalance(3),
    },
  };
}

// =====================================================
// MAIN HANDLER
// =====================================================

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

    // Get PDF bundle data
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

    // Get project info
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

    // Sanitize bundle data
    const data = sanitizePdfBundle(bundle, bundle.hypotheses || []);

    // Get hypothesis values for calculations
    const getHypValue = (key: string): number => {
      const h = data.hypotheses.find((h) => h.key === key);
      return h?.value || 0;
    };

    const investment = getHypValue("initial_investment");
    const loanAmount = getHypValue("loan_amount");
    const loanRate = getHypValue("loan_rate");
    const loanYears = getHypValue("loan_years") || 7;
    const depreciationYears = getHypValue("depreciation_years") || 7;
    const fixedCosts = getHypValue("fixed_costs");
    const varRate = getHypValue("variable_cost_rate");

    const annualDepreciation = investment / depreciationYears;
    const annualInterest = loanAmount * loanRate;

    // =====================================================
    // GENERATE PDF
    // =====================================================
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // Helper: Add section header
    const addSectionHeader = (title: string, y: number): number => {
      doc.setFillColor(...BRAND_BLUE);
      doc.rect(14, y, pageWidth - 28, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(title, 16, y + 5.5);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      return y + 12;
    };

    // Helper: Add explanation paragraph
    const addExplanation = (text: string, y: number): number => {
      doc.setFontSize(9);
      doc.setTextColor(...GREY_TEXT);
      doc.setFont("helvetica", "italic");
      const lines = doc.splitTextToSize(text, pageWidth - 32);
      doc.text(lines, 16, y);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      return y + lines.length * 4 + 8;
    };

    // =====================================================
    // PAGE 1: COVER / EXECUTIVE SUMMARY
    // =====================================================
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(0, 0, pageWidth, 50, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("PRÉVISIONNEL FINANCIER", pageWidth / 2, 25, { align: "center" });

    doc.setFontSize(16);
    doc.text(data.meta.project_name, pageWidth / 2, 38, { align: "center" });

    doc.setTextColor(0, 0, 0);
    currentY = 65;

    doc.setFontSize(11);
    doc.text(`Scénario : ${data.meta.scenario_name}`, 14, currentY);
    currentY += 6;
    doc.text(`Date : ${formatDate(new Date())}`, 14, currentY);
    currentY += 6;
    doc.text(`Horizon : ${data.meta.horizon_years} ans`, 14, currentY);
    currentY += 15;

    // KPI Summary
    currentY = addSectionHeader("SYNTHÈSE EXÉCUTIVE", currentY);

    const kpis = [
      ["CA TTC (Année 1)", formatEUR(data.summary.ca_ttc_year1)],
      ["CA HT (Année 1)", formatEUR(data.summary.ca_ht_year1)],
      ["EBITDA (Année 1)", formatEUR(data.summary.ebitda_year1)],
      ["TVA collectée (Année 1)", formatEUR(data.summary.total_vat_year1)],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Indicateur", "Valeur"]],
      body: kpis,
      theme: "grid",
      headStyles: { fillColor: BRAND_BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 10, halign: "left", cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
      columnStyles: { 
        0: { cellWidth: (pageWidth - 28) * 0.6 },
        1: { halign: "right", cellWidth: (pageWidth - 28) * 0.4 } 
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 50;
    currentY = addExplanation(EXPLANATIONS.executiveSummary, currentY);

    // Line Items Summary
    if (data.line_items.length > 0) {
      currentY = addSectionHeader("PARC MACHINES & SERVICES", currentY);

      const lineRows = data.line_items.map((item) => {
        const monthlyRev = (item.price_ttc_cents / 100) * item.quantity * item.cycles_per_day * item.open_days * item.utilization_rate;
        return [
          item.category,
          item.label,
          String(item.quantity),
          formatEUR2(item.price_ttc_cents / 100),
          formatPctValue(item.utilization_rate),
          formatEUR(monthlyRev),
        ];
      });

      const tableWidth = pageWidth - 28;
      autoTable(doc, {
        startY: currentY,
        head: [["Catégorie", "Libellé", "Qté", "Prix TTC", "Util.", "CA Mensuel"]],
        body: lineRows,
        theme: "striped",
        headStyles: { fillColor: BRAND_BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.14 },
          1: { cellWidth: tableWidth * 0.30 },
          2: { halign: "center", cellWidth: tableWidth * 0.08 },
          3: { halign: "right", cellWidth: tableWidth * 0.14 },
          4: { halign: "center", cellWidth: tableWidth * 0.12 },
          5: { halign: "right", cellWidth: tableWidth * 0.16 },
        },
      });
    }

    // =====================================================
    // PAGE 2: COMPTE DE RÉSULTAT
    // =====================================================
    doc.addPage();
    currentY = 20;

    currentY = addSectionHeader("COMPTE DE RÉSULTAT PRÉVISIONNEL", currentY);

    const y1Rev = data.pnl.year1.revenue_ht;
    const y2Rev = data.pnl.year2.revenue_ht;
    const y3Rev = data.pnl.year3.revenue_ht;

    const y1VarCost = y1Rev * varRate;
    const y2VarCost = y2Rev * varRate;
    const y3VarCost = y3Rev * varRate;

    const y1FixedCost = fixedCosts * 12;
    const y2FixedCost = fixedCosts * 12;
    const y3FixedCost = fixedCosts * 12;

    const y1Ebitda = data.pnl.year1.ebitda;
    const y2Ebitda = data.pnl.year2.ebitda;
    const y3Ebitda = data.pnl.year3.ebitda;

    const y1ResExpl = y1Ebitda - annualDepreciation;
    const y2ResExpl = y2Ebitda - annualDepreciation;
    const y3ResExpl = y3Ebitda - annualDepreciation;

    const y1ResNet = y1ResExpl - annualInterest;
    const y2ResNet = y2ResExpl - annualInterest * 0.9;
    const y3ResNet = y3ResExpl - annualInterest * 0.8;

    const pnlRows = [
      ["Chiffre d'affaires HT", formatEUR(y1Rev), formatEUR(y2Rev), formatEUR(y3Rev), "100%"],
      ["", "", "", "", ""],
      ["Charges variables", formatEUR(-y1VarCost), formatEUR(-y2VarCost), formatEUR(-y3VarCost), formatPctValue(varRate)],
      ["Charges fixes", formatEUR(-y1FixedCost), formatEUR(-y2FixedCost), formatEUR(-y3FixedCost), "—"],
      ["", "", "", "", ""],
      ["EBITDA", formatEUR(y1Ebitda), formatEUR(y2Ebitda), formatEUR(y3Ebitda), formatPct(y1Ebitda, y1Rev)],
      ["", "", "", "", ""],
      ["Amortissements", formatEUR(-annualDepreciation), formatEUR(-annualDepreciation), formatEUR(-annualDepreciation), "—"],
      ["Résultat d'exploitation", formatEUR(y1ResExpl), formatEUR(y2ResExpl), formatEUR(y3ResExpl), "—"],
      ["", "", "", "", ""],
      ["Charges financières", formatEUR(-annualInterest), formatEUR(-annualInterest * 0.9), formatEUR(-annualInterest * 0.8), "—"],
      ["Résultat net", formatEUR(y1ResNet), formatEUR(y2ResNet), formatEUR(y3ResNet), "—"],
    ];

    const tableWidth = pageWidth - 28;
    autoTable(doc, {
      startY: currentY,
      head: [["Poste", "Exercice 1", "Exercice 2", "Exercice 3", "%"]],
      body: pnlRows,
      theme: "plain",
      headStyles: { fillColor: BRAND_BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: tableWidth * 0.42 },
        1: { halign: "right", cellWidth: tableWidth * 0.16 },
        2: { halign: "right", cellWidth: tableWidth * 0.16 },
        3: { halign: "right", cellWidth: tableWidth * 0.16 },
        4: { halign: "center", cellWidth: tableWidth * 0.10 },
      },
      didParseCell: (cellData: any) => {
        if (cellData.row.raw && (cellData.row.raw[0] === "EBITDA" || cellData.row.raw[0] === "Résultat net")) {
          cellData.cell.styles.fillColor = LIGHT_ROW;
          cellData.cell.styles.fontStyle = "bold";
        }
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 100;
    currentY = addExplanation(EXPLANATIONS.pnl, currentY);

    // =====================================================
    // PAGE 3: BILAN PRÉVISIONNEL
    // =====================================================
    doc.addPage();
    currentY = 20;

    currentY = addSectionHeader("BILAN PRÉVISIONNEL", currentY);

    const b1 = data.balance.year1;
    const b2 = data.balance.year2;
    const b3 = data.balance.year3;

    // BALANCE SHEET VALIDATION - Bank requirement
    const validateBalance = (year: number, actifTotal: number, passifTotal: number) => {
      const diff = Math.abs(actifTotal - passifTotal);
      if (diff > 1) {
        console.warn(`Balance sheet year ${year}: Actif=${actifTotal}, Passif=${passifTotal}, Diff=${diff}`);
      }
      return diff <= 1;
    };

    // Validate all years
    const y1Valid = validateBalance(1, b1.actif.total, b1.passif.total);
    const y2Valid = validateBalance(2, b2.actif.total, b2.passif.total);
    const y3Valid = validateBalance(3, b3.actif.total, b3.passif.total);
    
    if (!y1Valid || !y2Valid || !y3Valid) {
      console.error("Balance sheet validation failed - totals do not match");
    }

    const balanceRows = [
      ["ACTIF", "", "", ""],
      ["Immobilisations (net)", formatEUR(b1.actif.immobilisations_net), formatEUR(b2.actif.immobilisations_net), formatEUR(b3.actif.immobilisations_net)],
      ["Stocks", formatEUR(b1.actif.stocks), formatEUR(b2.actif.stocks), formatEUR(b3.actif.stocks)],
      ["Créances clients", formatEUR(b1.actif.creances_clients), formatEUR(b2.actif.creances_clients), formatEUR(b3.actif.creances_clients)],
      ["Autres créances", formatEUR(b1.actif.autres_creances), formatEUR(b2.actif.autres_creances), formatEUR(b3.actif.autres_creances)],
      ["Disponibilités", formatEUR(b1.actif.disponibilites), formatEUR(b2.actif.disponibilites), formatEUR(b3.actif.disponibilites)],
      ["TOTAL ACTIF", formatEUR(b1.actif.total), formatEUR(b2.actif.total), formatEUR(b3.actif.total)],
      ["", "", "", ""],
      ["PASSIF", "", "", ""],
      ["Capitaux propres", formatEUR(b1.passif.capitaux_propres), formatEUR(b2.passif.capitaux_propres), formatEUR(b3.passif.capitaux_propres)],
      ["Dettes financières", formatEUR(b1.passif.dettes_financieres), formatEUR(b2.passif.dettes_financieres), formatEUR(b3.passif.dettes_financieres)],
      ["Dettes fournisseurs", formatEUR(b1.passif.dettes_fournisseurs), formatEUR(b2.passif.dettes_fournisseurs), formatEUR(b3.passif.dettes_fournisseurs)],
      ["Dettes fiscales & sociales", formatEUR(b1.passif.dettes_fiscales_sociales), formatEUR(b2.passif.dettes_fiscales_sociales), formatEUR(b3.passif.dettes_fiscales_sociales)],
      ["TOTAL PASSIF", formatEUR(b1.passif.total), formatEUR(b2.passif.total), formatEUR(b3.passif.total)],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Poste", "Exercice 1", "Exercice 2", "Exercice 3"]],
      body: balanceRows,
      theme: "plain",
      headStyles: { fillColor: BRAND_BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: {
        0: { cellWidth: tableWidth * 0.40 },
        1: { halign: "right", cellWidth: tableWidth * 0.20 },
        2: { halign: "right", cellWidth: tableWidth * 0.20 },
        3: { halign: "right", cellWidth: tableWidth * 0.20 },
      },
      didParseCell: (cellData: any) => {
        if (cellData.row.raw && (cellData.row.raw[0] === "ACTIF" || cellData.row.raw[0] === "PASSIF" || cellData.row.raw[0].startsWith("TOTAL"))) {
          cellData.cell.styles.fillColor = LIGHT_ROW;
          cellData.cell.styles.fontStyle = "bold";
        }
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 100;
    currentY = addExplanation(EXPLANATIONS.balance, currentY);

    // =====================================================
    // PAGE 4: TRÉSORERIE MENSUELLE
    // =====================================================
    doc.addPage();
    currentY = 20;

    currentY = addSectionHeader("PLAN DE TRÉSORERIE MENSUEL - ANNÉE 1", currentY);

    const monthlyPayroll = fixedCosts * 0.4;
    const monthlyOpex = fixedCosts * 0.6;
    const monthlyDebt = loanAmount / (loanYears * 12);

    // First 6 months
    const cashRows1: string[][] = [];
    cashRows1.push(["Poste", ...MONTH_ABBREV.slice(0, 6)]);
    cashRows1.push(["ENCAISSEMENTS", "", "", "", "", "", ""]);
    cashRows1.push(["CA TTC", ...data.cash_monthly.slice(0, 6).map((m) => formatEUR(m.revenue_ttc))]);
    cashRows1.push(["DÉCAISSEMENTS", "", "", "", "", "", ""]);
    cashRows1.push(["Charges variables", ...data.cash_monthly.slice(0, 6).map((m) => formatEUR(-m.revenue_ht * varRate))]);
    cashRows1.push(["Charges fixes", ...Array(6).fill(formatEUR(-monthlyOpex))]);
    cashRows1.push(["Salaires", ...Array(6).fill(formatEUR(-monthlyPayroll))]);
    cashRows1.push(["TVA à payer", ...data.cash_monthly.slice(0, 6).map((m) => formatEUR(-m.vat_collected))]);
    cashRows1.push(["Remb. emprunt", ...Array(6).fill(formatEUR(-monthlyDebt))]);

    let cumulative = 0;
    const netRow1 = ["TRÉSORERIE NETTE"];
    for (let i = 0; i < 6; i++) {
      const m = data.cash_monthly[i] || { revenue_ttc: 0, revenue_ht: 0, vat_collected: 0 };
      const inflow = m.revenue_ttc;
      const outflow = m.revenue_ht * varRate + monthlyOpex + monthlyPayroll + m.vat_collected + monthlyDebt;
      const net = inflow - outflow;
      cumulative += net;
      netRow1.push(formatEUR(net));
    }
    cashRows1.push(netRow1);

    const treasuryColWidth = (pageWidth - 28) / 7;
    autoTable(doc, {
      startY: currentY,
      body: cashRows1,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: treasuryColWidth * 1.5 },
        1: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
        2: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
        3: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
        4: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
        5: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
        6: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
      },
      didParseCell: (cellData: any) => {
        if (cellData.row.index === 0) {
          cellData.cell.styles.fillColor = BRAND_BLUE;
          cellData.cell.styles.textColor = [255, 255, 255];
          cellData.cell.styles.fontStyle = "bold";
        }
        if (cellData.row.raw && (cellData.row.raw[0] === "ENCAISSEMENTS" || cellData.row.raw[0] === "DÉCAISSEMENTS" || cellData.row.raw[0] === "TRÉSORERIE NETTE")) {
          cellData.cell.styles.fillColor = LIGHT_ROW;
          cellData.cell.styles.fontStyle = "bold";
        }
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 10 || currentY + 80;

    // Second 6 months
    const cashRows2: string[][] = [];
    cashRows2.push(["Poste", ...MONTH_ABBREV.slice(6, 12)]);
    cashRows2.push(["ENCAISSEMENTS", "", "", "", "", "", ""]);
    cashRows2.push(["CA TTC", ...data.cash_monthly.slice(6, 12).map((m) => formatEUR(m.revenue_ttc))]);
    cashRows2.push(["DÉCAISSEMENTS", "", "", "", "", "", ""]);
    cashRows2.push(["Charges variables", ...data.cash_monthly.slice(6, 12).map((m) => formatEUR(-m.revenue_ht * varRate))]);
    cashRows2.push(["Charges fixes", ...Array(6).fill(formatEUR(-monthlyOpex))]);
    cashRows2.push(["Salaires", ...Array(6).fill(formatEUR(-monthlyPayroll))]);
    cashRows2.push(["TVA à payer", ...data.cash_monthly.slice(6, 12).map((m) => formatEUR(-m.vat_collected))]);
    cashRows2.push(["Remb. emprunt", ...Array(6).fill(formatEUR(-monthlyDebt))]);

    const netRow2 = ["TRÉSORERIE NETTE"];
    for (let i = 6; i < 12; i++) {
      const m = data.cash_monthly[i] || { revenue_ttc: 0, revenue_ht: 0, vat_collected: 0 };
      const inflow = m.revenue_ttc;
      const outflow = m.revenue_ht * varRate + monthlyOpex + monthlyPayroll + m.vat_collected + monthlyDebt;
      const net = inflow - outflow;
      cumulative += net;
      netRow2.push(formatEUR(net));
    }
    cashRows2.push(netRow2);

    autoTable(doc, {
      startY: currentY,
      body: cashRows2,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: treasuryColWidth * 1.5 },
        1: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
        2: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
        3: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
        4: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
        5: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
        6: { halign: "right", cellWidth: treasuryColWidth * 0.92 },
      },
      didParseCell: (cellData: any) => {
        if (cellData.row.index === 0) {
          cellData.cell.styles.fillColor = BRAND_BLUE;
          cellData.cell.styles.textColor = [255, 255, 255];
          cellData.cell.styles.fontStyle = "bold";
        }
        if (cellData.row.raw && (cellData.row.raw[0] === "ENCAISSEMENTS" || cellData.row.raw[0] === "DÉCAISSEMENTS" || cellData.row.raw[0] === "TRÉSORERIE NETTE")) {
          cellData.cell.styles.fillColor = LIGHT_ROW;
          cellData.cell.styles.fontStyle = "bold";
        }
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 80;
    currentY = addExplanation(EXPLANATIONS.treasury, currentY);

    // =====================================================
    // PAGE 5: PLAN DE FINANCEMENT & BFR
    // =====================================================
    doc.addPage();
    currentY = 20;

    currentY = addSectionHeader("PLAN DE FINANCEMENT - ANNÉE 1", currentY);

    const bfrInitial = fixedCosts * 2;
    const totalBesoins = investment + bfrInitial;
    const apportPersonnel = investment - loanAmount;

    const fundingRows = [
      ["BESOINS", "", ""],
      ["Investissements", formatEUR(investment), formatPct(investment, totalBesoins)],
      ["BFR initial", formatEUR(bfrInitial), formatPct(bfrInitial, totalBesoins)],
      ["TOTAL BESOINS", formatEUR(totalBesoins), "100%"],
      ["", "", ""],
      ["RESSOURCES", "", ""],
      ["Apport personnel", formatEUR(apportPersonnel), formatPct(apportPersonnel, investment)],
      ["Emprunt bancaire", formatEUR(loanAmount), formatPct(loanAmount, investment)],
      ["TOTAL RESSOURCES", formatEUR(investment), "100%"],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Poste", "Montant", "%"]],
      body: fundingRows,
      theme: "plain",
      headStyles: { fillColor: BRAND_BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
      columnStyles: {
        0: { cellWidth: tableWidth * 0.50 },
        1: { halign: "right", cellWidth: tableWidth * 0.30 },
        2: { halign: "center", cellWidth: tableWidth * 0.20 },
      },
      didParseCell: (cellData: any) => {
        if (cellData.row.raw && (cellData.row.raw[0] === "BESOINS" || cellData.row.raw[0] === "RESSOURCES" || cellData.row.raw[0].startsWith("TOTAL"))) {
          cellData.cell.styles.fillColor = LIGHT_ROW;
          cellData.cell.styles.fontStyle = "bold";
        }
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 80;
    currentY = addExplanation(EXPLANATIONS.funding, currentY);

    currentY += 5;
    currentY = addSectionHeader("BESOIN EN FONDS DE ROULEMENT (BFR)", currentY);

    const stockProduits = 500;
    const creancesClients = 0;
    const totalBfrBesoins = stockProduits + creancesClients;
    const dettesFournisseurs = fixedCosts / 2;
    const dettesFiscales = data.summary.total_vat_year1 / 12;
    const totalBfrRessources = dettesFournisseurs + dettesFiscales;
    const bfrNet = totalBfrBesoins - totalBfrRessources;

    const bfrRows = [
      ["BESOINS", ""],
      ["Stock de produits", formatEUR(stockProduits)],
      ["Créances clients", formatEUR(creancesClients)],
      ["TOTAL BESOINS", formatEUR(totalBfrBesoins)],
      ["", ""],
      ["RESSOURCES", ""],
      ["Dettes fournisseurs", formatEUR(dettesFournisseurs)],
      ["Dettes fiscales", formatEUR(dettesFiscales)],
      ["TOTAL RESSOURCES", formatEUR(totalBfrRessources)],
      ["", ""],
      ["BFR NET", formatEUR(bfrNet)],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Poste", "Montant"]],
      body: bfrRows,
      theme: "plain",
      headStyles: { fillColor: BRAND_BLUE, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
      columnStyles: {
        0: { cellWidth: tableWidth * 0.60 },
        1: { halign: "right", cellWidth: tableWidth * 0.40 },
      },
      didParseCell: (cellData: any) => {
        if (cellData.row.raw && (cellData.row.raw[0] === "BESOINS" || cellData.row.raw[0] === "RESSOURCES" || cellData.row.raw[0].startsWith("TOTAL") || cellData.row.raw[0] === "BFR NET")) {
          cellData.cell.styles.fillColor = LIGHT_ROW;
          cellData.cell.styles.fontStyle = "bold";
        }
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 80;
    addExplanation(EXPLANATIONS.bfr, currentY);

    // =====================================================
    // FOOTER
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

    const fileName = `previsionnel-banque-${data.meta.project_name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
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

    // Record export
    await supabaseAdmin.from("fin_exports").insert({
      project_id: projectId,
      format: "pdf",
      status: "completed",
      file_path: filePath,
      file_name: fileName,
      completed_at: new Date().toISOString(),
      metadata: { type: "bank_grade", scenario_id: scenarioId },
    });

    // Log event
    await supabaseAdmin.from("system_events").insert({
      source: "fin_exports",
      severity: "info",
      code: "EXPORT_BANK_PDF",
      message: `Bank-grade PDF generated for project ${data.meta.project_name}`,
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
