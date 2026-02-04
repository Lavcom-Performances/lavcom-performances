// Edge function for fetching company data from French SIRET number
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, hashIP, maskEmail, rateLimitResponse } from "../_shared/rate-limiter.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SiretResponse {
  company_name: string;
  trade_name: string | null;
  address_line1: string;
  postal_code: string;
  city: string;
  naf_code: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const url = new URL(req.url);
    const siret = url.searchParams.get('siret');

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
      console.log(`Rate limit hit: fetch-from-siret, identifier=${maskEmail(identifier)}`);
      return rateLimitResponse(rateLimitResult.cooldownSeconds!, 'edge/fetch-from-siret', corsHeaders);
    }

    console.log(`Fetching data for SIRET: ${siret?.slice(0, 4)}****`);

    // Validation du SIRET
    if (!siret || siret.length !== 14 || !/^[0-9]+$/.test(siret)) {
      console.log('Invalid SIRET format');
      return new Response(
        JSON.stringify({ error: "SIRET invalide. Il doit contenir exactement 14 chiffres." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use recherche-entreprises API (free, no auth required, reliable)
    const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`;
    console.log(`Calling recherche-entreprises API...`);
    
    const response = await fetch(apiUrl);
    console.log(`API Response status: ${response.status}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('SIRET not found');
        return new Response(
          JSON.stringify({ error: "SIRET introuvable dans la base SIRENE." }),
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
      console.log('SIRET not found in results');
      return new Response(
        JSON.stringify({ error: "SIRET introuvable dans la base SIRENE." }),
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
    
    const result = {
      company_name: etablissement.nom_complet || etablissement.nom_raison_sociale || "",
      trade_name: siege.enseigne_1 || siege.enseigne_2 || siege.enseigne_3 || null,
      address_line1: addressParts.join(' ').toUpperCase(),
      postal_code: siege.code_postal || "",
      city: siege.libelle_commune || "",
      naf_code: etablissement.activite_principale || "",
    };
    
    console.log('Returning data successfully');
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching SIRET data:', error);
    return new Response(
      JSON.stringify({ error: "Service externe indisponible. Veuillez réessayer plus tard." }),
      { 
        status: 502, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
