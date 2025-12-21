import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RETENTION_DAYS = 90;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[cleanup-login-logs] Starting cleanup job...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[cleanup-login-logs] Missing environment variables');
      throw new Error('Missing environment variables');
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffDateStr = cutoffDate.toISOString();

    console.log(`[cleanup-login-logs] Deleting logs older than ${cutoffDateStr} (${RETENTION_DAYS} days)`);

    // Delete old login logs
    const { data, error, count } = await supabase
      .from('login_logs')
      .delete()
      .lt('created_at', cutoffDateStr)
      .select('id');

    if (error) {
      console.error('[cleanup-login-logs] Error deleting logs:', error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    console.log(`[cleanup-login-logs] Successfully deleted ${deletedCount} old login logs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: deletedCount,
        cutoffDate: cutoffDateStr,
        retentionDays: RETENTION_DAYS
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cleanup-login-logs] Error:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
