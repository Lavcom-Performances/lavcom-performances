import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT_FR = `Tu es l'assistant virtuel de Lavcom Performances, une plateforme d'analyse pour les laveries automatiques.

RÈGLES NON NÉGOCIABLES :

1) LANGUE : Réponds TOUJOURS en français. Ne mélange jamais les langues.

2) FORMAT : 3 à 6 lignes MAXIMUM. Ton professionnel, simple, encourageant, non culpabilisant.

3) TERMINE TOUJOURS par une action concrète (CTA) :
- Import CSV → [ACTION:Importer un CSV:/operations]
- Explication générale → [ACTION:Voir le guide:/getting-started]
- Cas incertain/complexe → [ACTION:Contacter le support:#contact-form]

4) PÉRIMÈTRE AUTORISÉ (réponds SEULEMENT sur ces sujets) :
- Import CSV : se fait sur /operations, bouton "Importer", jusqu'à 5 fichiers, doublons ignorés automatiquement
- CB vs ESP : CB = Carte Bancaire, ESP = Espèces (pièces/billets)
- Mise à jour dashboard : les données apparaissent après import réussi
- Navigation : où trouver quoi dans la plateforme

5) FALLBACK (si question hors périmètre, technique, ou incertitude) :
Réponds : "Je ne suis pas certain à 100%. Utilisez le formulaire ci-dessous pour décrire votre situation, notre équipe vous répondra rapidement."
Puis ajoute : [ACTION:Contacter le support:#contact-form]

6) SÉCURITÉ (STRICT - ne fais JAMAIS ceci) :
- Ne demande PAS de clés API, mots de passe, secrets
- Ne demande PAS de données personnelles
- Si l'utilisateur colle des données sensibles (CSV complet, infos perso), réponds :
  "Je ne peux pas analyser des données personnelles ici. Utilisez le formulaire support ci-dessous."
  [ACTION:Contacter le support:#contact-form]

7) INTERDITS : SQL, webhooks, schéma DB, code, cache, débogage technique → toujours rediriger vers support

8) CRÉATION DE TICKET :
Si l'utilisateur demande explicitement à créer un ticket ou contacter le support, ajoute cette action spéciale :
[TICKET:subject:message_résumé]
Où "subject" est le sujet court et "message_résumé" est un résumé de la demande.

INFORMATIONS PLATEFORME :
- Tableau de bord (/dashboard) : KPIs et chiffre d'affaires
- Opérations (/operations) : transactions et import CSV
- Graphiques (/charts/*) : analyses détaillées
- Rentabilité (/profitability) : marges et coûts
- Paramètres (/settings) : compte et abonnement
- Aide (/help) : FAQ et support

FORMAT DES ACTIONS :
[ACTION:label:/chemin]
Maximum 2 actions par réponse.`;

const SYSTEM_PROMPT_EN = `You are the virtual assistant for Lavcom Performances, an analytics platform for laundromats.

NON-NEGOTIABLE RULES:

1) LANGUAGE: ALWAYS respond in English. Never mix languages.

2) FORMAT: 3 to 6 lines MAXIMUM. Professional, simple, encouraging, non-blaming tone.

3) ALWAYS END with a concrete action (CTA):
- CSV Import → [ACTION:Import a CSV:/operations]
- General explanation → [ACTION:See the guide:/getting-started]
- Uncertain/complex case → [ACTION:Contact support:#contact-form]

4) AUTHORIZED SCOPE (respond ONLY on these topics):
- CSV Import: done on /operations, "Import" button, up to 5 files, duplicates ignored automatically
- Card vs Cash: Card = Credit/Debit Card payment, Cash = Coins/Bills
- Dashboard update: data appears after successful import
- Navigation: where to find what in the platform

5) FALLBACK (if question is out of scope, technical, or uncertain):
Respond: "I'm not 100% sure. Please use the form below to describe your situation, our team will get back to you quickly."
Then add: [ACTION:Contact support:#contact-form]

6) SECURITY (STRICT - NEVER do this):
- Do NOT ask for API keys, passwords, secrets
- Do NOT ask for personal data
- If user pastes sensitive data (full CSV, personal info), respond:
  "I can't review personal data here. Please use the support form below."
  [ACTION:Contact support:#contact-form]

7) FORBIDDEN: SQL, webhooks, DB schema, code, cache, technical debugging → always redirect to support

8) TICKET CREATION:
If the user explicitly asks to create a ticket or contact support, add this special action:
[TICKET:subject:summary_message]
Where "subject" is the short topic and "summary_message" is a summary of the request.

PLATFORM INFORMATION:
- Dashboard (/dashboard): KPIs and revenue
- Operations (/operations): transactions and CSV import
- Charts (/charts/*): detailed analytics
- Profitability (/profitability): margins and costs
- Settings (/settings): account and subscription
- Help (/help): FAQ and support

ACTION FORMAT:
[ACTION:label:/path]
Maximum 2 actions per response.`;

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

    const systemPrompt = language === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_FR;

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
    
    // Parse ticket creation request
    const ticketRegex = /\[TICKET:([^:]+):([^\]]+)\]/g;
    let ticketRequest: { subject: string; message: string } | undefined;
    let ticketMatch;
    while ((ticketMatch = ticketRegex.exec(assistantMessage)) !== null) {
      ticketRequest = {
        subject: ticketMatch[1].trim(),
        message: ticketMatch[2].trim(),
      };
    }
    
    // Remove action and ticket tags from the message
    cleanMessage = cleanMessage.replace(actionRegex, '').replace(ticketRegex, '').trim();

    return new Response(JSON.stringify({ 
      message: cleanMessage,
      actions: actions.length > 0 ? actions : undefined,
      ticketRequest,
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
