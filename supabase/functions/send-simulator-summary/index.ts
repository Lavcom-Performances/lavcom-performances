// supabase/functions/send-simulator-summary/index.ts
// Sends a personalized HTML email summary based on lead segment via Resend
// Called fire-and-forget by create-simulator-lead

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface MachineSnapshot {
  type: string;
  quantity: number;
  price: number;
}

interface PricingSnapshot {
  machines?: MachineSnapshot[];
  [key: string]: unknown;
}

interface SummaryPayload {
  email: string;
  segmentation_type: "segment_a" | "segment_b" | "segment_c" | "segment_d";
  ici_score: number;
  gap_score: number;
  stage: string;
  capital_range: string;
  machine_range: string;
  estimated_monthly_revenue: number;
  estimated_annual_revenue: number;
  pricing_snapshot?: PricingSnapshot | null;
}

// ─── Label helpers ─────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  exploring: "En exploration",
  idea: "Idée / réflexion",
  financing: "Recherche de financement",
  location: "Recherche d'emplacement",
  operator: "Exploitant existant",
};

const CAPITAL_LABELS: Record<string, string> = {
  lt20k: "Moins de 20 000 €",
  "20_50k": "20 000 – 50 000 €",
  "50_100k": "50 000 – 100 000 €",
  gt100k: "100 000 € et plus",
  "0-20k": "Moins de 20 000 €",
  "20k-50k": "20 000 – 50 000 €",
  "50k-100k": "50 000 – 100 000 €",
  "100k-200k": "100 000 – 200 000 €",
  "200k+": "200 000 € et plus",
};

const MACHINE_LABELS: Record<string, string> = {
  "1_4": "1 à 4 machines",
  "5_8": "5 à 8 machines",
  "9_14": "9 à 14 machines",
  "15plus": "Plus de 15 machines",
  "1-2": "1 à 2 machines",
  "3-5": "3 à 5 machines",
  "6-10": "6 à 10 machines",
  "11-15": "11 à 15 machines",
  "15+": "Plus de 15 machines",
};

// ─── ICI helpers ───────────────────────────────────────────────────────────

function iciColor(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 55) return "#d97706";
  return "#dc2626";
}

function iciLabel(score: number): string {
  if (score >= 75) return "Bonne cohérence";
  if (score >= 55) return "Cohérence modérée";
  return "Écart à combler";
}

function formatRevenue(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

// ─── Segment config ────────────────────────────────────────────────────────

interface SegmentConfig {
  title: string;
  badge: string;
  badgeColor: string;
  intro: string;
}

function getSegmentConfig(segment: SummaryPayload["segmentation_type"]): SegmentConfig {
  const configs: Record<SummaryPayload["segmentation_type"], SegmentConfig> = {
    segment_a: {
      title: "Votre projet démarre — construisons des bases solides",
      badge: "Porteur de projet",
      badgeColor: "#6366f1",
      intro: "Votre simulation montre un projet en phase de réflexion. C'est le bon moment pour vous armer des bons outils avant de vous engager.",
    },
    segment_b: {
      title: "Votre projet est structuré — passez à la vitesse supérieure",
      badge: "Projet structuré",
      badgeColor: "#0891b2",
      intro: "Votre simulation révèle un projet avancé avec une cohérence financière solide. Vous avez les ingrédients pour aller plus loin.",
    },
    segment_c: {
      title: "Pilotez vos performances en temps réel",
      badge: "Exploitant",
      badgeColor: "#059669",
      intro: "En tant qu'exploitant existant, votre priorité est d'optimiser ce que vous avez déjà — et d'identifier les leviers de croissance sur votre parc.",
    },
    segment_d: {
      title: "Pilotage avancé pour votre parc multi-sites",
      badge: "Multi-sites",
      badgeColor: "#7c3aed",
      intro: "Avec un parc de cette envergure, la donnée devient votre principal levier de rentabilité. Chaque point d'optimisation se multiplie par le nombre de machines.",
    },
  };
  return configs[segment];
}

// ─── CTA helpers ───────────────────────────────────────────────────────────

interface CtaConfig {
  label: string;
  url: string;
}

function getCtaConfig(p: SummaryPayload, siteUrl: string): CtaConfig {
  // Segment C/D → plateforme exploitant
  if (p.segmentation_type === "segment_c" || p.segmentation_type === "segment_d") {
    return { label: "Accéder à la plateforme", url: `${siteUrl}/connexion-exploitant` };
  }
  const ici = Math.round(p.ici_score);
  if (ici >= 75) {
    return { label: "Voir le Pack Projet", url: `${siteUrl}/subscribe-simulator` };
  }
  if (ici >= 55) {
    return { label: "Voir le Pack Essentiel", url: `${siteUrl}/subscribe-simulator` };
  }
  return { label: "Télécharger le guide gratuit", url: "https://lavcom.fr/nos-ebooks-2/" };
}

// ─── Bridge message helper ─────────────────────────────────────────────────

function getBridgeMessage(p: SummaryPayload): string {
  if (p.segmentation_type === "segment_c" || p.segmentation_type === "segment_d") {
    return "En tant qu'exploitant, votre prochaine étape est le pilotage de vos performances réelles — pas une simulation.";
  }
  const ici = Math.round(p.ici_score);
  if (ici >= 75) {
    return "Votre projet est cohérent. L'étape suivante : intégrer vos charges réelles et générer le document de présentation que votre banquier attend.";
  }
  if (ici >= 55) {
    return "Ces chiffres sont votre plafond théorique. Le simulateur pro intègre vos charges réelles pour calculer ce que vous gardez vraiment.";
  }
  return "Avant d'aller plus loin, renforcez les bases de votre projet. Notre guide vous aide à préparer votre financement et votre dossier.";
}

// ─── Projection 3 ans HTML ─────────────────────────────────────────────────

function buildProjectionHtml(monthlyRevenue: number): string {
  const y1 = monthlyRevenue * 12;
  const y2 = monthlyRevenue * 12 * 1.10;
  const y3 = monthlyRevenue * 12 * 1.20;

  return `
        <tr><td style="background:#FFFFFF;padding:0 40px 24px;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#2C2C2C;text-transform:uppercase;letter-spacing:1px;">Projection revenus bruts — 3 ans</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E4DC;border-radius:8px;border-collapse:separate;">
            <tr style="background:#FAF8F5;">
              <td style="padding:10px 16px;font-size:12px;color:#888;font-weight:600;border-bottom:1px solid #E8E4DC;">Année</td>
              <td style="padding:10px 16px;font-size:12px;color:#888;font-weight:600;text-align:right;border-bottom:1px solid #E8E4DC;">CA annuel</td>
              <td style="padding:10px 16px;font-size:12px;color:#888;font-weight:600;text-align:right;border-bottom:1px solid #E8E4DC;">Hypothèse</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#2C2C2C;font-weight:600;border-bottom:1px solid #E8E4DC;">Année 1</td>
              <td style="padding:10px 16px;font-size:13px;color:#2C2C2C;font-weight:700;text-align:right;border-bottom:1px solid #E8E4DC;">${formatRevenue(y1)}</td>
              <td style="padding:10px 16px;font-size:12px;color:#888;text-align:right;border-bottom:1px solid #E8E4DC;">Base</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#2C2C2C;font-weight:600;border-bottom:1px solid #E8E4DC;">Année 2</td>
              <td style="padding:10px 16px;font-size:13px;color:#2C2C2C;font-weight:700;text-align:right;border-bottom:1px solid #E8E4DC;">${formatRevenue(y2)}</td>
              <td style="padding:10px 16px;font-size:12px;color:#888;text-align:right;border-bottom:1px solid #E8E4DC;">+10%</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#2C2C2C;font-weight:600;">Année 3</td>
              <td style="padding:10px 16px;font-size:13px;color:#2C2C2C;font-weight:700;text-align:right;">${formatRevenue(y3)}</td>
              <td style="padding:10px 16px;font-size:12px;color:#888;text-align:right;">+20%</td>
            </tr>
          </table>
          <p style="margin:8px 0 0;font-size:11px;color:#999;line-height:1.5;">Hypothèses de progression indicatives. Revenus bruts hors charges.</p>
        </td></tr>`;
}

// ─── Machine detail HTML ───────────────────────────────────────────────────

function buildMachineDetailHtml(machines: MachineSnapshot[]): string {
  if (!machines || machines.length === 0) return "";

  const rows = machines.map(m => `
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#2C2C2C;border-bottom:1px solid #E8E4DC;">${m.type}</td>
              <td style="padding:10px 16px;font-size:13px;color:#2C2C2C;font-weight:600;text-align:center;border-bottom:1px solid #E8E4DC;">${m.quantity}</td>
              <td style="padding:10px 16px;font-size:13px;color:#2C2C2C;font-weight:600;text-align:right;border-bottom:1px solid #E8E4DC;">${formatRevenue(m.price)}</td>
            </tr>`).join("");

  return `
        <tr><td style="background:#FFFFFF;padding:0 40px 24px;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#2C2C2C;text-transform:uppercase;letter-spacing:1px;">Détail de votre configuration</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E4DC;border-radius:8px;border-collapse:separate;">
            <tr style="background:#FAF8F5;">
              <td style="padding:10px 16px;font-size:12px;color:#888;font-weight:600;border-bottom:1px solid #E8E4DC;">Type</td>
              <td style="padding:10px 16px;font-size:12px;color:#888;font-weight:600;text-align:center;border-bottom:1px solid #E8E4DC;">Quantité</td>
              <td style="padding:10px 16px;font-size:12px;color:#888;font-weight:600;text-align:right;border-bottom:1px solid #E8E4DC;">Tarif/cycle</td>
            </tr>
            ${rows}
          </table>
        </td></tr>`;
}

// ─── HTML template ─────────────────────────────────────────────────────────

function buildEmailHtml(p: SummaryPayload, siteUrl: string): string {
  const seg = getSegmentConfig(p.segmentation_type);
  const cta = getCtaConfig(p, siteUrl);
  const bridge = getBridgeMessage(p);
  const ici = Math.round(p.ici_score);
  const color = iciColor(ici);
  const coherence = iciLabel(ici);

  const projectionBlock = buildProjectionHtml(p.estimated_monthly_revenue);

  const machines = p.pricing_snapshot?.machines;
  const machineBlock = machines && machines.length > 0 ? buildMachineDetailHtml(machines) : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Votre synthèse Lavcom</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#F5F3EE;border-radius:12px 12px 0 0;padding:28px 40px 24px;text-align:center;border-bottom:2px solid #E8A020;">
          <img src="https://betvwipgtcrhmludzgxw.supabase.co/storage/v1/object/public/email-assets/lavcom-performances-header.png" alt="Lavcom Performances" style="height:36px;width:auto;margin-bottom:20px;" />
          <h1 style="margin:0;font-size:22px;color:#2C2C2C;font-weight:700;line-height:1.3;">${seg.title}</h1>
        </td></tr>

        <!-- Badge segment -->
        <tr><td style="background:#FFFFFF;padding:24px 40px 0;text-align:center;">
          <span style="display:inline-block;background:${seg.badgeColor}18;color:${seg.badgeColor};border:1px solid ${seg.badgeColor}40;border-radius:999px;padding:4px 16px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">${seg.badge}</span>
        </td></tr>

        <!-- Chiffres clés -->
        <tr><td style="background:#FFFFFF;padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="text-align:center;padding:16px 8px;background:#FAF8F5;border-radius:8px;">
                <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">CA mensuel estimé</p>
                <p style="margin:0;font-size:20px;font-weight:700;color:#2C2C2C;">${formatRevenue(p.estimated_monthly_revenue)}</p>
              </td>
              <td width="4%"></td>
              <td width="33%" style="text-align:center;padding:16px 8px;background:#FAF8F5;border-radius:8px;">
                <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">CA annuel estimé</p>
                <p style="margin:0;font-size:20px;font-weight:700;color:#2C2C2C;">${formatRevenue(p.estimated_annual_revenue)}</p>
              </td>
              <td width="4%"></td>
              <td width="26%" style="text-align:center;padding:16px 8px;background:#FAF8F5;border-radius:8px;">
                <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Cohérence du projet</p>
                <p style="margin:0;font-size:20px;font-weight:700;color:${color};">${coherence}</p>
                <p style="margin:2px 0 0;font-size:11px;color:${color};">${ici}/100</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Projection 3 ans -->
        ${projectionBlock}

        <!-- Détail machines (conditionnel) -->
        ${machineBlock}

        <!-- Profil -->
        <tr><td style="background:#FFFFFF;padding:0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E4DC;border-radius:8px;">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #E8E4DC;">
              <span style="font-size:12px;color:#888;">Stade :</span>
              <span style="font-size:13px;color:#2C2C2C;font-weight:600;margin-left:8px;">${STAGE_LABELS[p.stage] ?? p.stage}</span>
            </td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #E8E4DC;">
              <span style="font-size:12px;color:#888;">Capital :</span>
              <span style="font-size:13px;color:#2C2C2C;font-weight:600;margin-left:8px;">${CAPITAL_LABELS[p.capital_range] ?? p.capital_range}</span>
            </td></tr>
            <tr><td style="padding:12px 16px;">
              <span style="font-size:12px;color:#888;">Parc machines :</span>
              <span style="font-size:13px;color:#2C2C2C;font-weight:600;margin-left:8px;">${MACHINE_LABELS[p.machine_range] ?? p.machine_range}</span>
            </td></tr>
          </table>
        </td></tr>

        <!-- Recommandation -->
        <tr><td style="background:#FFFFFF;padding:0 40px 24px;">
          <div style="background:#FAF8F5;border-left:3px solid #E8A020;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#E8A020;text-transform:uppercase;letter-spacing:1px;">Recommandation</p>
            <p style="margin:0;font-size:14px;color:#2C2C2C;line-height:1.6;">${seg.intro}</p>
          </div>
        </td></tr>

        <!-- Message pont contextuel -->
        <tr><td style="background:#FFFFFF;padding:0 40px 24px;">
          <div style="background:#FAF8F5;border-left:3px solid #E8A020;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#E8A020;text-transform:uppercase;letter-spacing:1px;">Prochaine étape</p>
            <p style="margin:0;font-size:14px;color:#2C2C2C;line-height:1.6;">${bridge}</p>
          </div>
        </td></tr>

        <!-- CTA -->
        <tr><td style="background:#FFFFFF;padding:0 40px 40px;text-align:center;">
          <a href="${cta.url}" style="display:inline-block;background:#E8A020;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;padding:14px 32px;border-radius:8px;text-transform:uppercase;">${cta.label}</a>
        </td></tr>

        <!-- Disclaimer -->
        <tr><td style="background:#F0EDE8;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
            Ces résultats sont fournis à titre indicatif et ne constituent pas un engagement contractuel.<br/>
            Les projections dépendent de nombreux facteurs propres à chaque projet.<br/><br/>
            Vous recevez cet email car vous avez utilisé le simulateur Lavcom.<br/>
            <a href="#" style="color:#999;">Se désabonner</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Main handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: SummaryPayload = await req.json();

    if (!payload.email) {
      return new Response(JSON.stringify({ error: "Email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "simulator@lavcom.fr";
    const SITE_URL = Deno.env.get("SITE_URL") ?? "https://lavcom.fr";

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "Config manquante" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildEmailHtml(payload, SITE_URL);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Lavcom Performances <${FROM_EMAIL}>`,
        to: [payload.email],
        subject: "Votre synthèse de simulation Lavcom",
        html,
      }),
    });

    if (!resendResponse.ok) {
      const err = await resendResponse.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ success: false, error: "Envoi échoué" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendData = await resendResponse.json();
    console.log("Email sent successfully:", resendData);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-simulator-summary error:", err);
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
