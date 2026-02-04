// Edge function for fetching company data from French SIRET number
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, hashIP, maskEmail, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SiretResponse {
  company_name: string;
  trade_name: string | null;
  address_line1: string;
  postal_code: string;
  city: string;
  naf_code: string;
  department?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Health check: GET without siret param returns status
    const url = new URL(req.url);
    let siret: string | null = null;

    // Support both GET with query param and POST with JSON body
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        siret = body.siret;
      } catch {
        // If no body or invalid JSON, treat as health check
      }
    } else if (req.method === 'GET') {
      siret = url.searchParams.get('siret');
    }

    // Health check endpoint (no siret provided)
    if (!siret) {
      console.log('[fetch-from-siret] Health check requested');
      return new Response(
        JSON.stringify({ ok: true, function: "fetch-from-siret" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';
    const ipHash = await hashIP(clientIP);

    // Get user ID from auth header if available
    const authHeader = req.headers.get('Authorization');
    let identifier = `ip:${ipHash}`;
    
    if (authHeader) {
      // Try to extract user from JWT
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.sub) {
          identifier = `user:${payload.sub}`;
        }
      } catch {
        // Use IP-based identifier
      }
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      supabaseUrl,
      supabaseServiceKey,
      'edge/fetch-from-siret',
      identifier,
      ipHash
    );

    if (!rateLimitResult.allowed) {
      console.log(`[fetch-from-siret] Rate limit hit: identifier=${maskEmail(identifier)}`);
      return rateLimitResponse(rateLimitResult.cooldownSeconds!, 'edge/fetch-from-siret', corsHeaders);
    }

    // Mask SIRET for logging (show only last 4 digits)
    const maskedSiret = siret.length > 4 ? '****' + siret.slice(-4) : siret;
    console.log(`[fetch-from-siret] Fetching data for SIRET: ${maskedSiret}`);

    // Validation du SIRET
    const cleanSiret = siret.replace(/\s/g, '');
    if (cleanSiret.length !== 14 || !/^[0-9]+$/.test(cleanSiret)) {
      console.log('[fetch-from-siret] Invalid SIRET format');
      return new Response(
        JSON.stringify({ error: "INVALID_SIRET", message: "SIRET invalide. Il doit contenir exactement 14 chiffres." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use recherche-entreprises API (free, no auth required, reliable)
    const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${cleanSiret}&page=1&per_page=1`;
    console.log(`[fetch-from-siret] Calling recherche-entreprises API...`);
    
    const response = await fetch(apiUrl);
    console.log(`[fetch-from-siret] API Response status: ${response.status}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('[fetch-from-siret] SIRET not found');
        return new Response(
          JSON.stringify({ error: "SIRET_NOT_FOUND", message: "SIRET introuvable dans la base SIRENE." }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    const results = data?.results || [];
    
    if (results.length === 0) {
      console.log('[fetch-from-siret] SIRET not found in results');
      return new Response(
        JSON.stringify({ error: "SIRET_NOT_FOUND", message: "SIRET introuvable dans la base SIRENE." }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const etablissement = results[0];
    const siege = etablissement?.siege || {};
    
    // Build address parts
    const addressParts = [];
    if (siege.numero_voie) addressParts.push(siege.numero_voie);
    if (siege.type_voie) addressParts.push(siege.type_voie);
    if (siege.libelle_voie) addressParts.push(siege.libelle_voie);
    
    // Derive department from postal code
    const postalCode = siege.code_postal || "";
    let department = "";
    if (postalCode.length >= 2) {
      if (postalCode.startsWith('20')) {
        // Corsica
        department = parseInt(postalCode.substring(0, 3)) <= 201 ? '2A' : '2B';
      } else if (['971', '972', '973', '974', '976'].includes(postalCode.substring(0, 3))) {
        // DOM-TOM
        department = postalCode.substring(0, 3);
      } else {
        department = postalCode.substring(0, 2);
      }
    }
    
    const result: SiretResponse = {
      company_name: etablissement.nom_complet || etablissement.nom_raison_sociale || "",
      trade_name: siege.enseigne_1 || siege.enseigne_2 || siege.enseigne_3 || null,
      address_line1: addressParts.join(' ').toUpperCase(),
      postal_code: postalCode,
      city: siege.libelle_commune || "",
      naf_code: etablissement.activite_principale || "",
      department: department,
    };
    
    console.log(`[fetch-from-siret] Success for SIRET ${maskedSiret}: ${result.company_name}`);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[fetch-from-siret] Error:', error);
    return new Response(
      JSON.stringify({ error: "SERVICE_UNAVAILABLE", message: "Service externe indisponible. Veuillez réessayer plus tard." }),
      { 
        status: 502, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
