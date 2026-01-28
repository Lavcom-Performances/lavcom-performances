import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, hashIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= Demo Data Generator (reused from create-demo) =============

const MACHINES = [
  "LL-01", "LL-02", "LL-03", "LL-04", "LL-05",
  "SL-01", "SL-02", "SL-03"
];

const PROGRAMS_WASHERS = [
  { name: "Lavage 30°", price: 4.50 },
  { name: "Lavage 40°", price: 5.00 },
  { name: "Lavage 60°", price: 6.00 },
  { name: "Lavage 90°", price: 7.00 },
  { name: "Express 20min", price: 3.50 },
];

const PROGRAMS_DRYERS = [
  { name: "Séchage 15min", price: 2.00 },
  { name: "Séchage 30min", price: 3.50 },
  { name: "Séchage 45min", price: 5.00 },
];

const PAYMENT_MODES = [
  { mode: "CB", weight: 45 },
  { mode: "Espèces", weight: 30 },
  { mode: "Carte Fidélité", weight: 15 },
  { mode: "Mobile", weight: 10 },
];

const HOURLY_WEIGHTS = [
  1, 1, 0, 0, 0, 1, 2, 4, 8, 12, 14, 12,
  10, 8, 7, 6, 8, 12, 14, 12, 8, 5, 3, 2
];

const DAY_WEIGHTS = [15, 10, 12, 12, 12, 14, 18];
const MONTH_WEIGHTS = [1.1, 1.0, 1.0, 0.95, 0.9, 0.75, 0.7, 0.75, 0.95, 1.0, 1.1, 1.15];

function weightedRandom(items: { weight: number; value: string }[]): string {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function getRandomPaymentMode(): string {
  return weightedRandom(PAYMENT_MODES.map(p => ({ weight: p.weight, value: p.mode })));
}

function getRandomHour(): number {
  const totalWeight = HOURLY_WEIGHTS.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (let hour = 0; hour < 24; hour++) {
    random -= HOURLY_WEIGHTS[hour];
    if (random <= 0) return hour;
  }
  return 12;
}

function formatTime(hour: number): string {
  const minutes = Math.floor(Math.random() * 60);
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

interface DemoOperation {
  user_id: string;
  site_id: string;
  import_batch_id: string;
  operation_date: string;
  operation_time: string;
  amount: number;
  machine: string;
  program: string;
  payment_mode: string;
}

function generateDemoOperations(
  userId: string,
  siteId: string,
  batchId: string,
  monthsBack: number = 6
): DemoOperation[] {
  const operations: DemoOperation[] = [];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const month = currentDate.getMonth();

    const baseOps = 15 + Math.floor(Math.random() * 6);
    const dayMultiplier = DAY_WEIGHTS[dayOfWeek] / 12;
    const monthMultiplier = MONTH_WEIGHTS[month];
    const dailyVariation = 0.8 + Math.random() * 0.4;
    const targetOps = Math.round(baseOps * dayMultiplier * monthMultiplier * dailyVariation);

    for (let i = 0; i < targetOps; i++) {
      const machine = MACHINES[Math.floor(Math.random() * MACHINES.length)];
      const isWasher = machine.startsWith("LL");
      const programs = isWasher ? PROGRAMS_WASHERS : PROGRAMS_DRYERS;
      const program = programs[Math.floor(Math.random() * programs.length)];
      const priceVariation = 0.9 + Math.random() * 0.2;
      const amount = Math.round(program.price * priceVariation * 100) / 100;

      operations.push({
        user_id: userId,
        site_id: siteId,
        import_batch_id: batchId,
        operation_date: formatDate(currentDate),
        operation_time: formatTime(getRandomHour()),
        amount,
        machine,
        program: program.name,
        payment_mode: getRandomPaymentMode(),
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return operations;
}

// ============= Edge Function Handler =============

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';
    const ipHash = await hashIP(clientIP);

    // Check rate limit (3 per hour per IP)
    const rateLimitResult = await checkRateLimit(
      supabaseUrl,
      supabaseKey,
      'edge/reset-demo',
      `ip:${ipHash}`,
      ipHash
    );

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit hit: reset-demo, user=${user.id}`);
      return rateLimitResponse(rateLimitResult.cooldownSeconds!, 'edge/reset-demo', corsHeaders);
    }

    console.log(`Resetting demo for user: ${user.id}`);

    // Find existing demo site
    const { data: demoSite, error: siteError } = await supabase
      .from("sites")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_demo", true)
      .maybeSingle();

    if (siteError) {
      console.error("Error finding demo site:", siteError);
      throw siteError;
    }

    if (!demoSite) {
      return new Response(
        JSON.stringify({ error: "No demo site found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found demo site: ${demoSite.id}`);

    // Delete existing operations
    const { error: deleteOpsError } = await supabase
      .from("operations")
      .delete()
      .eq("site_id", demoSite.id);

    if (deleteOpsError) {
      console.error("Error deleting operations:", deleteOpsError);
      throw deleteOpsError;
    }

    // Delete existing import batches
    const { error: deleteBatchError } = await supabase
      .from("import_batches")
      .delete()
      .eq("site_id", demoSite.id);

    if (deleteBatchError) {
      console.error("Error deleting batches:", deleteBatchError);
      throw deleteBatchError;
    }

    // Delete analytics_daily for demo site
    await supabase
      .from("analytics_daily")
      .delete()
      .eq("site_id", demoSite.id);

    // Delete analytics_kpis for demo site
    await supabase
      .from("analytics_kpis")
      .delete()
      .eq("site_id", demoSite.id);

    // Delete site_costs if any
    await supabase
      .from("site_costs")
      .delete()
      .eq("site_id", demoSite.id);

    // Delete user_goals if any
    await supabase
      .from("user_goals")
      .delete()
      .eq("site_id", demoSite.id);

    console.log("Cleared all existing demo data");

    // Create new import batch
    const { data: batch, error: batchError } = await supabase
      .from("import_batches")
      .insert({
        user_id: user.id,
        site_id: demoSite.id,
        filename: "demo-data-reset.csv",
        total_rows: 0,
        imported_rows: 0,
        ignored_rows: 0,
      })
      .select()
      .single();

    if (batchError) {
      console.error("Batch creation error:", batchError);
      throw batchError;
    }

    // Generate new demo operations (6 months)
    const operations = generateDemoOperations(user.id, demoSite.id, batch.id, 6);
    console.log(`Generated ${operations.length} new operations`);

    // Insert all operations in batches
    const BATCH_SIZE = 1000;
    let totalInserted = 0;

    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const chunk = operations.slice(i, i + BATCH_SIZE);
      const { error: opsError } = await supabase
        .from("operations")
        .insert(chunk);

      if (opsError) {
        console.error("Operations insert error:", opsError);
        throw opsError;
      }
      totalInserted += chunk.length;
      console.log(`Inserted ${totalInserted}/${operations.length} operations`);
    }

    // Update batch counts
    await supabase
      .from("import_batches")
      .update({
        total_rows: totalInserted,
        imported_rows: totalInserted,
      })
      .eq("id", batch.id);

    // Log to system_events
    await supabase.rpc("rpc_log_system_event", {
      p_source: "demo_mode",
      p_severity: "info",
      p_code: "DEMO_RESET",
      p_message: "Demo data reset successfully",
      p_env: "production",
      p_meta: {
        site_id: demoSite.id,
        user_id: user.id,
        user_email: user.email,
        operations_count: totalInserted,
        action: "reset_demo",
      },
    });

    console.log(`Demo reset complete: ${totalInserted} operations`);

    return new Response(
      JSON.stringify({ 
        success: true,
        siteId: demoSite.id, 
        operationsCount: totalInserted,
        message: "Demo data reset successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error resetting demo:", error);
    return new Response(
      JSON.stringify({ error: "Erreur lors de la réinitialisation de la démo" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
