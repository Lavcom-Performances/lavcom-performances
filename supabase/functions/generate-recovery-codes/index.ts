import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const NUM_CODES = 10;
const CODE_LENGTH = 8; // Format: XXXX-XXXX

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete existing recovery codes (rotation)
    const { data: existingCodes } = await serviceClient
      .from('recovery_codes')
      .select('id')
      .eq('user_id', user.id);

    if (existingCodes && existingCodes.length > 0) {
      await serviceClient
        .from('recovery_codes')
        .delete()
        .eq('user_id', user.id);
      
      console.log(`[generate-recovery-codes] Rotated ${existingCodes.length} existing codes for user ${user.id}`);
    }

    // Generate new codes
    const codes: string[] = [];
    const codesToInsert: { user_id: string; code_hash: string }[] = [];

    for (let i = 0; i < NUM_CODES; i++) {
      const code = generateRecoveryCode();
      const codeHash = await hashString(code);
      codes.push(code);
      codesToInsert.push({
        user_id: user.id,
        code_hash: codeHash,
      });
    }

    // Insert all codes
    const { error: insertError } = await serviceClient
      .from('recovery_codes')
      .insert(codesToInsert);

    if (insertError) {
      console.error('[generate-recovery-codes] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate recovery codes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await serviceClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'RECOVERY_CODES_GENERATED',
      target_table: 'recovery_codes',
      metadata: {
        count: NUM_CODES,
        rotated_existing: existingCodes?.length || 0,
      },
    });

    await serviceClient.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'recovery_codes',
      p_severity: 'info',
      p_code: 'RECOVERY_CODES_GENERATED',
      p_message: `Generated ${NUM_CODES} recovery codes`,
      p_meta: {
        user_id: user.id,
        user_email: user.email,
        count: NUM_CODES,
      },
    });

    console.log(`[generate-recovery-codes] Generated ${NUM_CODES} codes for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        codes,
        message: 'Recovery codes generated. Store these in a safe place - they will only be shown once.',
        count: NUM_CODES,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-recovery-codes] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate a recovery code in format XXXX-XXXX
function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (I, O, 0, 1)
  let code = '';
  
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
    if (i === 3) code += '-';
  }
  
  return code;
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
