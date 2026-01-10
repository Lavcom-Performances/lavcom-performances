import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// French postal code validation patterns
const FRENCH_POSTAL_PATTERNS = {
  // DOM-TOM
  DOM_TOM: /^97[1-6]\d{2}$|^98[4-9]\d{2}$/,
  // Corsica (2A and 2B)
  CORSICA: /^20[0-9]{3}$/,
  // Metropolitan France
  METRO: /^(?:0[1-9]|[1-8]\d|9[0-5])\d{3}$/,
};

// Postal code patterns by country
const POSTAL_PATTERNS: Record<string, RegExp> = {
  FR: /^(?:0[1-9]|[1-8]\d|9[0-5]|97[1-6]|98[4-9]|20)\d{3}$/,
  BE: /^\d{4}$/,
  CH: /^\d{4}$/,
  LU: /^\d{4}$/,
  DE: /^\d{5}$/,
  IT: /^\d{5}$/,
  NL: /^\d{4}\s?[A-Z]{2}$/i,
  ES: /^\d{5}$/,
  AT: /^\d{4}$/,
  PT: /^\d{4}(-\d{3})?$/,
};

// Department derivation for France
function deriveDepartmentCode(postalCode: string): string {
  if (!postalCode || postalCode.length < 2) return "";
  
  const prefix = postalCode.substring(0, 2);
  
  // Corsica special cases
  if (prefix === "20") {
    const fullPrefix = postalCode.substring(0, 3);
    if (fullPrefix === "200" || fullPrefix === "201") {
      return "2A"; // Corse-du-Sud
    }
    if (fullPrefix === "202" || fullPrefix === "206") {
      return "2B"; // Haute-Corse
    }
    return postalCode.charAt(2) === "0" || postalCode.charAt(2) === "1" ? "2A" : "2B";
  }
  
  // DOM-TOM
  if (prefix === "97" || prefix === "98") {
    return postalCode.substring(0, 3);
  }
  
  return prefix;
}

interface ValidationRequest {
  postalCode: string;
  countryCode: string;
  city?: string;
}

interface ValidationResponse {
  valid: boolean;
  error?: string;
  departmentCode?: string;
  normalizedPostalCode?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postalCode, countryCode, city }: ValidationRequest = await req.json();

    if (!postalCode || !countryCode) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "postalCode and countryCode are required" 
        } as ValidationResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const normalizedPostalCode = postalCode.trim().toUpperCase();
    const normalizedCountry = countryCode.trim().toUpperCase();

    // Get validation pattern for country
    const pattern = POSTAL_PATTERNS[normalizedCountry];
    
    if (!pattern) {
      // Country not in our validation list - accept any non-empty postal code
      return new Response(
        JSON.stringify({ 
          valid: normalizedPostalCode.length > 0,
          normalizedPostalCode,
        } as ValidationResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate format
    const isValidFormat = pattern.test(normalizedPostalCode);
    
    if (!isValidFormat) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Invalid postal code format for ${normalizedCountry}`,
          normalizedPostalCode,
        } as ValidationResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For France, derive and return department code
    let departmentCode: string | undefined;
    if (normalizedCountry === "FR") {
      departmentCode = deriveDepartmentCode(normalizedPostalCode);
      
      // Additional validation: check if department code is valid
      const validDepartments = [
        "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
        "11", "12", "13", "14", "15", "16", "17", "18", "19", "21",
        "22", "23", "24", "25", "26", "27", "28", "29", "30", "31",
        "32", "33", "34", "35", "36", "37", "38", "39", "40", "41",
        "42", "43", "44", "45", "46", "47", "48", "49", "50", "51",
        "52", "53", "54", "55", "56", "57", "58", "59", "60", "61",
        "62", "63", "64", "65", "66", "67", "68", "69", "70", "71",
        "72", "73", "74", "75", "76", "77", "78", "79", "80", "81",
        "82", "83", "84", "85", "86", "87", "88", "89", "90", "91",
        "92", "93", "94", "95", "2A", "2B",
        "971", "972", "973", "974", "975", "976", // DOM-TOM
        "984", "985", "986", "987", "988", "989" // Collectivités d'outre-mer
      ];
      
      if (!validDepartments.includes(departmentCode)) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: `Invalid French department code: ${departmentCode}`,
            departmentCode,
            normalizedPostalCode,
          } as ValidationResponse),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        valid: true,
        normalizedPostalCode,
        departmentCode,
      } as ValidationResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("[validate-postal-code] Error:", error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: "Server error during validation" 
      } as ValidationResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
