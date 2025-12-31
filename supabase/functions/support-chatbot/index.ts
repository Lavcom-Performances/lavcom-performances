import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Tu es l'assistant virtuel de Lavcom Performances, une plateforme d'analyse pour les laveries automatiques.

Tu réponds de manière concise, amicale et professionnelle aux questions des utilisateurs. Tu parles français par défaut mais peux répondre en anglais si l'utilisateur parle anglais.

Voici les informations clés sur la plateforme :

IMPORT CSV :
- L'import se fait sur la page Opérations via le bouton "Importer"
- On peut importer jusqu'à 5 fichiers CSV à la fois
- Les doublons sont automatiquement ignorés (pas de données dupliquées)
- Les montants sont convertis en euros automatiquement

MODES DE PAIEMENT :
- CB = Carte Bancaire (paiement par carte)
- ESP = Espèces (pièces et billets)
- Ces modes sont détectés automatiquement à l'import

PAGES PRINCIPALES :
- Tableau de bord (/dashboard) : vue globale des KPIs et chiffre d'affaires
- Opérations (/operations) : liste des transactions et import CSV
- Graphiques (/charts/*) : analyses détaillées par période, machine, mode de paiement
- Rentabilité (/profitability) : marges et coûts par site
- Recommandations (/recommendations) : conseils d'optimisation basés sur les données
- Paramètres (/settings) : gestion du compte, abonnement, équipe
- Aide (/help) : FAQ et support

FONCTIONNALITÉS :
- Export PDF disponible sur le Tableau de bord et les pages Graphiques
- Filtres par date, site, et période sur toutes les pages
- Comparaison année N vs N-1 sur les graphiques
- Objectifs personnalisables (CA mensuel, annuel, transactions)

ABONNEMENT :
- Période d'essai gratuite de 14 jours
- Plans mensuels ou annuels disponibles
- Gestion de l'abonnement depuis les Paramètres

RÈGLES IMPORTANTES :
- Sois bref (2-4 phrases max par réponse)
- Si tu ne connais pas la réponse, suggère de contacter le support via le formulaire de la page Aide
- Ne donne pas d'informations techniques (code, API, base de données)
- Ne parle pas de Supabase, edge functions, ou détails d'implémentation
- Reste focalisé sur l'utilisation de la plateforme

FORMAT DES ACTIONS :
Quand ta réponse inclut une suggestion d'aller sur une page, ajoute une action à la fin de ton message sous ce format exact :
[ACTION:nom_de_page:/chemin]

Exemples :
- Pour l'import CSV : [ACTION:Importer un CSV:/operations]
- Pour le tableau de bord : [ACTION:Voir le tableau de bord:/dashboard]
- Pour les paramètres : [ACTION:Aller aux paramètres:/settings]
- Pour la rentabilité : [ACTION:Voir la rentabilité:/profitability]
- Pour les graphiques : [ACTION:Voir les graphiques:/charts/daily-revenue]
- Pour les recommandations : [ACTION:Voir les recommandations:/recommendations]
- Pour l'aide : [ACTION:Aller à l'aide:/help]

Tu peux inclure jusqu'à 2 actions maximum par réponse si pertinent.
N'ajoute une action que si elle est vraiment utile pour l'utilisateur (pas systématiquement).`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = 'fr' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    let systemPrompt = SYSTEM_PROMPT;
    if (language === 'en') {
      systemPrompt = systemPrompt
        .replace('Tu parles français par défaut', 'You speak English by default')
        .replace('Sois bref', 'Be brief')
        .replace('Si tu ne connais pas la réponse', 'If you don\'t know the answer')
        .replace('Reste focalisé sur', 'Stay focused on');
    }

    console.log("Calling Lovable AI Gateway with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: language === 'fr' 
            ? "Trop de demandes. Veuillez patienter quelques instants." 
            : "Too many requests. Please wait a moment."
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: language === 'fr'
            ? "Service temporairement indisponible."
            : "Service temporarily unavailable."
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI service error");
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error("No response from AI");
    }

    console.log("AI response received successfully");

    // Parse actions from the message
    const actionRegex = /\[ACTION:([^:]+):([^\]]+)\]/g;
    const actions: Array<{ label: string; path: string }> = [];
    let cleanMessage = assistantMessage;
    
    let match;
    while ((match = actionRegex.exec(assistantMessage)) !== null) {
      actions.push({
        label: match[1].trim(),
        path: match[2].trim(),
      });
    }
    
    // Remove action tags from the message
    cleanMessage = cleanMessage.replace(actionRegex, '').trim();

    return new Response(JSON.stringify({ 
      message: cleanMessage,
      actions: actions.length > 0 ? actions : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Support chatbot error:", error);
    return new Response(JSON.stringify({ 
      error: "Une erreur est survenue. Veuillez réessayer." 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
