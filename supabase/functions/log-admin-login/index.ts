import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginLogRequest {
  userAgent: string;
}

// Simple browser detection
function parseBrowser(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
}

// Simple OS detection
function parseOS(ua: string): string {
  if (ua.includes('Windows NT 10')) return 'Windows 10';
  if (ua.includes('Windows NT 11') || ua.includes('Windows 11')) return 'Windows 11';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown';
}

// Device type detection
function parseDeviceType(ua: string): string {
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) return 'Mobile';
  if (ua.includes('Tablet') || ua.includes('iPad')) return 'Tablet';
  return 'Desktop';
}

// Check for suspicious patterns
function detectSuspicious(
  ua: string, 
  previousLogins: Array<{ browser: string; os: string; country: string | null }>
): { isSuspicious: boolean; reason: string | null } {
  // Check for bot/automated user agents
  const suspiciousPatterns = ['curl', 'wget', 'python', 'bot', 'spider', 'scraper', 'headless'];
  const lowerUa = ua.toLowerCase();
  
  for (const pattern of suspiciousPatterns) {
    if (lowerUa.includes(pattern)) {
      return { isSuspicious: true, reason: `Suspicious user agent: ${pattern}` };
    }
  }

  // Check for new browser/OS combination
  const currentBrowser = parseBrowser(ua);
  const currentOS = parseOS(ua);
  
  if (previousLogins.length > 0) {
    const knownCombinations = previousLogins.map(l => `${l.browser}-${l.os}`);
    const currentCombination = `${currentBrowser}-${currentOS}`;
    
    if (!knownCombinations.includes(currentCombination)) {
      return { isSuspicious: true, reason: `New device: ${currentBrowser} on ${currentOS}` };
    }
  }

  return { isSuspicious: false, reason: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has platform role
    const { data: isPlatformAdmin } = await supabaseAdmin.rpc('is_platform_admin', { uid: user.id });
    const { data: isPlatformBilling } = await supabaseAdmin.rpc('is_platform_billing', { uid: user.id });
    
    if (!isPlatformAdmin && !isPlatformBilling) {
      // Not a platform admin, no need to log
      return new Response(
        JSON.stringify({ success: true, logged: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userAgent }: LoginLogRequest = await req.json();
    
    // Get IP and geolocation from request
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';

    // Try to get geolocation from Cloudflare headers
    const country = req.headers.get('cf-ipcountry') || null;
    const city = req.headers.get('cf-ipcity') || null;
    const region = req.headers.get('cf-region') || null;

    // Parse user agent
    const browser = parseBrowser(userAgent || '');
    const os = parseOS(userAgent || '');
    const deviceType = parseDeviceType(userAgent || '');

    // Get previous logins to detect suspicious activity
    const { data: previousLogins } = await supabaseAdmin
      .from('admin_login_history')
      .select('browser, os, country')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { isSuspicious, reason } = detectSuspicious(userAgent || '', previousLogins || []);

    // Insert login log
    const { error: insertError } = await supabaseAdmin
      .from('admin_login_history')
      .insert({
        user_id: user.id,
        ip_address: clientIp,
        country,
        city,
        region,
        browser,
        os,
        device_type: deviceType,
        user_agent: userAgent,
        is_suspicious: isSuspicious,
        suspicious_reason: reason,
      });

    if (insertError) {
      console.error('Error inserting admin login log:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'enregistrement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin login logged: ${user.email} from ${country || 'unknown'} (${browser}/${os})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        logged: true,
        isSuspicious,
        suspiciousReason: reason
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-admin-login:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
