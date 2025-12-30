import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-SUBSCRIPTION-EMAIL] ${step}${detailsStr}`);
};

interface EmailRequest {
  to: string;
  type: "activation" | "renewal" | "payment_failed" | "cancellation";
  data?: {
    planType?: string;
    endDate?: string;
    invoiceUrl?: string;
    firstName?: string;
  };
}

const emailTemplates = {
  activation: (data: EmailRequest["data"]) => ({
    subject: "🎉 Bienvenue sur Lavcom Performances !",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af;">Bienvenue sur Lavcom Performances !</h1>
        <p>Bonjour${data?.firstName ? ` ${data.firstName}` : ''},</p>
        <p>Votre abonnement <strong>${data?.planType || 'Premium'}</strong> est maintenant actif.</p>
        <p>Vous avez désormais accès à toutes les fonctionnalités de la plateforme :</p>
        <ul>
          <li>✅ Tableau de bord analytique complet</li>
          <li>✅ Import de données CSV</li>
          <li>✅ Rapports de performance</li>
          <li>✅ Recommandations personnalisées</li>
        </ul>
        ${data?.invoiceUrl ? `<p><a href="${data.invoiceUrl}" style="color: #1e40af;">Télécharger votre facture TTC</a></p>` : ''}
        <p>Accédez à votre espace : <a href="https://lavcom.fr/dashboard" style="background: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ouvrir Lavcom</a></p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          L'équipe Lavcom Performances<br>
          contact@lavcom.fr
        </p>
      </div>
    `,
  }),
  renewal: (data: EmailRequest["data"]) => ({
    subject: "✅ Votre abonnement Lavcom a été renouvelé",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af;">Abonnement renouvelé</h1>
        <p>Bonjour${data?.firstName ? ` ${data.firstName}` : ''},</p>
        <p>Votre abonnement Lavcom Performances a été renouvelé avec succès.</p>
        <p><strong>Prochaine échéance :</strong> ${data?.endDate || 'Voir dans votre espace'}</p>
        ${data?.invoiceUrl ? `<p><a href="${data.invoiceUrl}" style="color: #1e40af;">Télécharger votre facture TTC</a></p>` : ''}
        <p>Continuez à suivre vos performances sur <a href="https://lavcom.fr/dashboard" style="color: #1e40af;">Lavcom</a>.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          L'équipe Lavcom Performances
        </p>
      </div>
    `,
  }),
  payment_failed: (data: EmailRequest["data"]) => ({
    subject: "⚠️ Échec de paiement - Action requise",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Échec de paiement</h1>
        <p>Bonjour${data?.firstName ? ` ${data.firstName}` : ''},</p>
        <p>Le paiement de votre abonnement Lavcom Performances a échoué.</p>
        <p>Pour éviter une interruption de service, veuillez mettre à jour vos informations de paiement :</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="https://lavcom.fr/subscription" style="background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Mettre à jour mon paiement</a>
        </p>
        <p>Si vous avez des questions, contactez-nous à contact@lavcom.fr</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          L'équipe Lavcom Performances
        </p>
      </div>
    `,
  }),
  cancellation: (data: EmailRequest["data"]) => ({
    subject: "Confirmation d'annulation de votre abonnement",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af;">Abonnement annulé</h1>
        <p>Bonjour${data?.firstName ? ` ${data.firstName}` : ''},</p>
        <p>Votre abonnement Lavcom Performances a été annulé.</p>
        ${data?.endDate ? `<p>Vous conservez l'accès à la plateforme jusqu'au <strong>${data.endDate}</strong>.</p>` : ''}
        <p>Vous pouvez vous réabonner à tout moment depuis votre espace.</p>
        <p>Nous espérons vous revoir bientôt !</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          L'équipe Lavcom Performances
        </p>
      </div>
    `,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { to, type, data }: EmailRequest = await req.json();

    if (!to || !type) {
      throw new Error("Missing required fields: to, type");
    }

    logStep("Sending email", { to, type });

    const template = emailTemplates[type];
    if (!template) {
      throw new Error(`Unknown email type: ${type}`);
    }

    const { subject, html } = template(data);
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Lavcom <noreply@lavcom.fr>";

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    });

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
