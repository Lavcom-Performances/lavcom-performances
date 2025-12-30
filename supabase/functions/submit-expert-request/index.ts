import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpertRequestBody {
  expertType: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

const expertTypeLabels: Record<string, string> = {
  installation: "Installation & Équipement",
  management: "Gestion & Rentabilité",
  communication: "Communication & Marketing",
  insurance: "Assurance & Protection",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ExpertRequestBody = await req.json();
    const { expertType, name, email, phone, message } = body;

    // Validate required fields
    if (!expertType || !name || !email) {
      console.error("[submit-expert-request] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: expertType, name, email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert into database
    const { data: insertedRequest, error: insertError } = await supabase
      .from("expert_requests")
      .insert({
        expert_type: expertType,
        name,
        email,
        phone: phone || null,
        message: message || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[submit-expert-request] Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save request" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[submit-expert-request] Request saved:", insertedRequest.id);

    // Send notification email
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const toEmail = Deno.env.get("RESEND_TO_EMAIL") || "contact@lavcom.fr";
    const expertLabel = expertTypeLabels[expertType] || expertType;

    try {
      const emailResponse = await resend.emails.send({
        from: `Lavcom <${fromEmail}>`,
        to: [toEmail],
        subject: `🎯 Nouvelle demande expert: ${expertLabel}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              Nouvelle demande d'expert
            </h1>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1e40af; margin-top: 0;">📋 Type d'expertise</h2>
              <p style="font-size: 18px; font-weight: bold; color: #334155;">${expertLabel}</p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1e40af; margin-top: 0;">👤 Coordonnées</h2>
              <p><strong>Nom:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              ${phone ? `<p><strong>Téléphone:</strong> <a href="tel:${phone}">${phone}</a></p>` : ""}
            </div>

            ${message ? `
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1e40af; margin-top: 0;">💬 Message</h2>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            ` : ""}

            <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
              Demande reçue le ${new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        `,
      });

      console.log("[submit-expert-request] Email sent successfully:", emailResponse);
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error("[submit-expert-request] Email sending failed:", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, id: insertedRequest.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[submit-expert-request] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
