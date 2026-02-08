import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

/**
 * Safe number parsing - return null if invalid
 */
function safeNumber(n: unknown): number | null {
  if (n === null || n === undefined) return null;
  const parsed = typeof n === "number" ? n : Number(n);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Normalize number: remove -0, round to precision
 */
function normalizeNumber(value: number, precision = 2): number {
  const rounded = Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
  if (Math.abs(rounded) < Math.pow(10, -precision)) return 0;
  return rounded;
}

/**
 * Format a number with French-style thousands separator (regular space)
 * CRITICAL: jsPDF cannot render Unicode NNBSP (\u202F) - it shows as "/"
 * Solution: Use custom formatting with regular spaces only
 */
function formatNumberFr(value: number, decimals = 0): string {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  const fixed = absValue.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  
  // Add thousand separators (regular space)
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  
  let result = withSeparators;
  if (decimals > 0 && decPart) {
    result += "," + decPart;
  }
  
  return isNegative ? "-" + result : result;
}

/**
 * Format currency with bank-grade formatting (no slashes!)
 */
function formatCurrency(value: number): string {
  const safe = safeNumber(value);
  if (safe === null) return "—";
  
  const normalized = normalizeNumber(safe, 0);
  return formatNumberFr(normalized, 0) + " €";
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
    
    // Try to get user from auth header, otherwise use admin mode for demo
    if (authHeader) {
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseUser.auth.getUser();
      userId = user?.id || null;
    }

    const { projectId, adminMode } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client for data access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch project data
    const { data: project, error: projectError } = await supabaseAdmin
      .from("fin_projects")
      .select("*, fin_workspaces!inner(owner_user_id)")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For admin mode, use the project owner's ID
    const effectiveUserId = adminMode ? project.fin_workspaces.owner_user_id : userId;

    // Verify ownership if not in admin mode
    if (!adminMode && project.fin_workspaces.owner_user_id !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch hypotheses
    const { data: hypotheses } = await supabaseAdmin
      .from("fin_hypotheses")
      .select("*")
      .eq("project_id", projectId)
      .order("category");

    // Fetch forecasts
    const { data: forecasts } = await supabaseAdmin
      .from("fin_forecasts")
      .select("*")
      .eq("project_id", projectId)
      .order("year")
      .order("month");

    if (!forecasts || forecasts.length === 0) {
      return new Response(JSON.stringify({ error: "No forecast data available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate annual summary
    const annualMap = new Map<number, {
      year: number;
      total_revenue: number;
      total_costs: number;
      total_ebitda: number;
      total_cashflow: number;
      final_cumulative: number;
    }>();

    for (const f of forecasts) {
      if (!annualMap.has(f.year)) {
        annualMap.set(f.year, {
          year: f.year,
          total_revenue: 0,
          total_costs: 0,
          total_ebitda: 0,
          total_cashflow: 0,
          final_cumulative: 0,
        });
      }
      const entry = annualMap.get(f.year)!;
      entry.total_revenue += Number(f.revenue);
      entry.total_costs += Number(f.costs);
      entry.total_ebitda += Number(f.ebitda);
      entry.total_cashflow += Number(f.cashflow);
      entry.final_cumulative = Number(f.cumulative_cashflow);
    }
    const annualSummary = Array.from(annualMap.values()).sort((a, b) => a.year - b.year);

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.text("Prévisionnel Financier", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.text(project.name, pageWidth / 2, 30, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${formatDate(new Date())}`, pageWidth / 2, 38, { align: "center" });

    // Hypotheses table
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Hypothèses", 14, 50);

    const categoryLabels: Record<string, string> = {
      INVESTMENT: "Investissement",
      REVENUE: "Revenus",
      COST: "Charges",
      FINANCING: "Financement",
    };

    const hypRows = (hypotheses || []).map((h: any) => {
      const isPercentage = h.meta?.isPercentage;
      const displayValue = isPercentage 
        ? (Number(h.value) * 100).toFixed(1) + "%" 
        : formatCurrency(Number(h.value));
      return [categoryLabels[h.category] || h.category, h.label || h.key, displayValue];
    });

    autoTable(doc, {
      startY: 55,
      head: [["Catégorie", "Paramètre", "Valeur"]],
      body: hypRows,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    // Annual summary table
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.text("Synthèse Annuelle", 14, finalY + 15);

    const annualRows = annualSummary.map((y) => [
      `Année ${y.year}`,
      formatCurrency(y.total_revenue),
      formatCurrency(y.total_costs),
      formatCurrency(y.total_ebitda),
      formatCurrency(y.final_cumulative),
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [["Année", "CA", "Charges", "EBITDA", "Trésorerie"]],
      body: annualRows,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    // Add monthly detail on new page
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Détail Mensuel", 14, 20);

    const monthlyRows = forecasts.map((f: any) => [
      `A${f.year} - ${MONTH_NAMES[f.month - 1]}`,
      formatCurrency(Number(f.revenue)),
      formatCurrency(Number(f.costs)),
      formatCurrency(Number(f.ebitda)),
      formatCurrency(Number(f.cashflow)),
      formatCurrency(Number(f.cumulative_cashflow)),
    ]);

    autoTable(doc, {
      startY: 25,
      head: [["Période", "CA", "Charges", "EBITDA", "Cashflow", "Trésorerie"]],
      body: monthlyRows,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });

    // Convert to blob
    const pdfOutput = doc.output("arraybuffer");
    const pdfBlob = new Uint8Array(pdfOutput);

    // Upload to storage
    const fileName = `previsionnel-${project.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
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

    // Get signed URL (valid for 1 hour)
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
