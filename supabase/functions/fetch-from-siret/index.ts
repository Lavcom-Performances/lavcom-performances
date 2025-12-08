import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

  try {
    const url = new URL(req.url);
    const siret = url.searchParams.get('siret');

    console.log(`Fetching data for SIRET: ${siret}`);

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

    // Appel à l'API SIRENE (API publique de l'INSEE via api.gouv.fr)
    // Cette API est gratuite et ne nécessite pas de clé API pour les requêtes basiques
    const sireneUrl = `https://api.insee.fr/api-sirene/3.11/siret/${siret}`;
    
    // Try the official INSEE API first, then fallback to entreprise.data.gouv.fr
    let response = await fetch(`https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/${siret}`);
    
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

    console.log('Returning data:', JSON.stringify(result));

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
