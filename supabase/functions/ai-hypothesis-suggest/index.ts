import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HypothesisInput {
  key: string;
  label: string | null;
  currentValue: number;
  unit: string | null;
}

interface Suggestion {
  key: string;
  label: string;
  currentValue: number;
  suggestedValue: number;
  unit: string;
  justification: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, category, hypotheses, questionnaireData, ambitionLevel } = await req.json();

    if (!projectId || !hypotheses || hypotheses.length === 0) {
      return new Response(
        JSON.stringify({ error: "projectId and hypotheses are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context from questionnaire
    const contextParts: string[] = [];
    if (questionnaireData) {
      if (questionnaireData.city) contextParts.push(`Ville: ${questionnaireData.city}`);
      if (questionnaireData.surface_size) contextParts.push(`Surface: ${questionnaireData.surface_size}`);
      if (questionnaireData.machine_count_range) contextParts.push(`Machines: ${questionnaireData.machine_count_range}`);
      if (questionnaireData.pricing_tier) contextParts.push(`Positionnement: ${questionnaireData.pricing_tier}`);
      if (questionnaireData.project_mode) contextParts.push(`Mode: ${questionnaireData.project_mode === "side_income" ? "Complément de revenu" : "Projet principal"}`);
    }

    const ambitionText = ambitionLevel < 0.33 
      ? "très prudentes (scénario pessimiste, marges de sécurité élevées)"
      : ambitionLevel < 0.66 
        ? "équilibrées (scénario réaliste)"
        : "ambitieuses (scénario optimiste, volumes élevés)";

    const systemPrompt = `Tu es un expert financier spécialisé dans les prévisionnels de laveries automatiques en France.
Tu dois proposer des valeurs réalistes pour les hypothèses financières d'un projet de laverie.

Contexte du projet:
${contextParts.length > 0 ? contextParts.join("\n") : "Pas de contexte supplémentaire"}

L'utilisateur souhaite des hypothèses ${ambitionText}.

Règles importantes:
- Les valeurs doivent être cohérentes avec le marché français des laveries
- Une laverie est généralement un complément de revenu, pas une activité principale
- Les charges variables typiques sont de 10-15% du CA
- Le taux de charge d'une machine est généralement de 50-70%
- Les charges fixes mensuelles dépendent de la taille (800-2000€ pour une laverie moyenne)
- Justifie chaque suggestion en 1-2 phrases courtes

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
  "suggestions": [
    {
      "key": "clé_de_l_hypothese",
      "label": "Libellé affiché",
      "currentValue": 1000,
      "suggestedValue": 1200,
      "unit": "€",
      "justification": "Explication courte de pourquoi cette valeur est recommandée."
    }
  ]
}`;

    const hypothesesText = hypotheses.map((h: HypothesisInput) => 
      `- ${h.label || h.key}: ${h.currentValue} ${h.unit || ""}`
    ).join("\n");

    const userPrompt = `Voici les hypothèses actuelles pour la catégorie "${category}":

${hypothesesText}

Propose des valeurs optimisées pour chacune de ces hypothèses.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés, veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let suggestions: Suggestion[] = [];
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // Try to find JSON object directly
        const objMatch = content.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
        if (objMatch) {
          jsonStr = objMatch[0];
        }
      }
      
      const parsed = JSON.parse(jsonStr);
      suggestions = parsed.suggestions || [];
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Impossible de parser la réponse IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI suggestion error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
