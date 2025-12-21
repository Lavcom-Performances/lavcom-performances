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

    // Appel à l'API SIRENE
    const response = await fetch(`https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/${siret}`);
    
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
    console.log('API Response data received');

    // Extraction des données de l'établissement
    const etablissement = data.etablissement;
    if (!etablissement) {
      return new Response(
        JSON.stringify({ error: "Données établissement non trouvées." }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Construction de l'adresse
    const adresse = etablissement.adresse || {};
    const uniteLegale = etablissement.unite_legale || {};

    // Nom de l'entreprise (raison sociale)
    let companyName = "";
    if (uniteLegale.denomination) {
      companyName = uniteLegale.denomination;
    } else if (uniteLegale.nom && uniteLegale.prenom_1) {
      companyName = `${uniteLegale.prenom_1} ${uniteLegale.nom}`;
    } else if (uniteLegale.nom) {
      companyName = uniteLegale.nom;
    }

    // Enseigne / Nom commercial
    const tradeName = etablissement.enseigne_1 || etablissement.enseigne_2 || etablissement.enseigne_3 || null;

    // Adresse ligne 1
    const addressParts = [];
    if (adresse.numero_voie) addressParts.push(adresse.numero_voie);
    if (adresse.indice_repetition) addressParts.push(adresse.indice_repetition);
    if (adresse.type_voie) addressParts.push(adresse.type_voie);
    if (adresse.libelle_voie) addressParts.push(adresse.libelle_voie);
    const addressLine1 = addressParts.join(' ').toUpperCase();

    const result: SiretResponse = {
      company_name: companyName,
      trade_name: tradeName,
      address_line1: addressLine1,
      postal_code: adresse.code_postal || "",
      city: adresse.libelle_commune || "",
      naf_code: etablissement.activite_principale || uniteLegale.activite_principale || "",
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
