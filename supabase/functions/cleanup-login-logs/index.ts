import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_RETENTION_DAYS = 90;

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

    // Get all profiles with their retention settings
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, log_retention_days');

    if (profilesError) {
      console.error('[cleanup-login-logs] Error fetching profiles:', profilesError);
      throw profilesError;
    }

    let totalDeleted = 0;
    const results: { user_id: string; deleted: number; retention_days: number }[] = [];

    // Process each user with their specific retention period
    for (const profile of profiles || []) {
      const retentionDays = profile.log_retention_days || DEFAULT_RETENTION_DAYS;
      
      // Calculate the cutoff date for this user
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffDateStr = cutoffDate.toISOString();

      console.log(`[cleanup-login-logs] User ${profile.id}: deleting logs older than ${cutoffDateStr} (${retentionDays} days retention)`);

      // Delete old login logs for this user
      const { data, error } = await supabase
        .from('login_logs')
        .delete()
        .eq('user_id', profile.id)
        .lt('created_at', cutoffDateStr)
        .select('id');

      if (error) {
        console.error(`[cleanup-login-logs] Error deleting logs for user ${profile.id}:`, error);
        continue;
      }

      const deletedCount = data?.length || 0;
      if (deletedCount > 0) {
        totalDeleted += deletedCount;
        results.push({
          user_id: profile.id,
          deleted: deletedCount,
          retention_days: retentionDays
        });
        console.log(`[cleanup-login-logs] Deleted ${deletedCount} logs for user ${profile.id}`);
      }
    }

    console.log(`[cleanup-login-logs] Job complete. Total deleted: ${totalDeleted} logs across ${results.length} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalDeleted,
        usersProcessed: profiles?.length || 0,
        usersWithDeletions: results.length,
        details: results
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
