import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  topic: string;
  topicValue: string;
  email: string;
  message: string;
  subject?: string;
  phone?: string;
  pageUrl?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, topicValue, email, message, subject, phone, pageUrl }: ContactRequest = await req.json();

    // Validate required fields
    if (!topic || !email || !message) {
      console.error("Missing required fields:", { topic: !!topic, email: !!email, message: !!message });
      return new Response(
        JSON.stringify({ error: "Tous les champs obligatoires sont requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "Format d'email invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get client info for logging
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Create Supabase client with service role for inserting into contact_messages
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build the full subject for storage
    const fullSubject = subject ? `[${topic}] ${subject}` : `[${topic}]`;

    // Store message in database
    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert({
        name: `${topic}${phone ? ` - ${phone}` : ''}`,
        email: email.trim().toLowerCase(),
        message: message.trim(),
        subject: fullSubject,
        ip,
        user_agent: userAgent,
        status: "new"
      });

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Continue even if DB insert fails - still try to send email
    }

    // Get email configuration from secrets
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const toEmail = Deno.env.get("RESEND_TO_EMAIL") || "contact@lavcom.fr";

    // Build email subject
    const emailSubject = subject 
      ? `[Contact Lavcom - ${topic}] ${subject}` 
      : `[Contact Lavcom] ${topic}`;

    // Build optional fields HTML
    const optionalFieldsHtml = `
      ${phone ? `<p style="margin: 0 0 12px 0;"><strong>Téléphone:</strong> <a href="tel:${phone}" style="color: #16a34a;">${phone}</a></p>` : ''}
      ${pageUrl ? `<p style="margin: 0 0 12px 0;"><strong>Page concernée:</strong> ${pageUrl}</p>` : ''}
      ${subject ? `<p style="margin: 0 0 12px 0;"><strong>Sujet:</strong> ${subject}</p>` : ''}
    `;

    // Send email notification to admin
    const adminEmailResponse = await resend.emails.send({
      from: `Lavcom Contact <${fromEmail}>`,
      to: [toEmail],
      subject: emailSubject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">Nouveau message de contact</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Thématique: ${topic}</p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 12px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #16a34a;">${email}</a></p>
            ${optionalFieldsHtml}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p style="margin: 0 0 8px 0;"><strong>Message:</strong></p>
            <div style="background: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; white-space: pre-wrap;">${message}</div>
          </div>
          
          <div style="background: #f3f4f6; padding: 12px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280;">
            <p style="margin: 0;">IP: ${ip}</p>
          </div>
        </div>
      `,
    });

    console.log("Admin email sent:", adminEmailResponse);

    // Send confirmation email to user
    const confirmEmailResponse = await resend.emails.send({
      from: `Lavcom Performances <${fromEmail}>`,
      to: [email],
      subject: "Nous avons bien reçu votre message",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Lavcom Performances</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Logiciel de gestion pour laveries</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="margin: 0 0 16px 0; color: #16a34a;">Bonjour,</h2>
            <p style="margin: 0 0 16px 0; color: #374151; line-height: 1.6;">
              Merci de nous avoir contactés ! Nous avons bien reçu votre message concernant <strong>${topic}</strong> et notre équipe vous répondra dans les meilleurs délais.
            </p>
            <p style="margin: 0 0 16px 0; color: #374151; line-height: 1.6;">
              En attendant, n'hésitez pas à consulter notre <a href="https://lavcom.fr" style="color: #16a34a; text-decoration: none; font-weight: 500;">site web</a> pour découvrir toutes nos fonctionnalités.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Votre message:</strong></p>
            <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin-top: 8px; color: #374151; white-space: pre-wrap;">${message}</div>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 8px 0;">L'équipe Lavcom Performances</p>
            <p style="margin: 0;">
              <a href="https://lavcom.fr" style="color: #16a34a; text-decoration: none;">lavcom.fr</a>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Confirmation email sent:", confirmEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Message envoyé avec succès" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur lors de l'envoi" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
