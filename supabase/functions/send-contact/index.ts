import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration
const RATE_LIMITS = {
  'contact/ip': { maxRequests: 5, windowSeconds: 600 },      // 5 per 10 min per IP
  'contact/email': { maxRequests: 3, windowSeconds: 600 },   // 3 per 10 min per email
} as const;

interface ContactRequest {
  topic: string;
  topicValue: string;
  email: string;
  message: string;
  subject?: string;
  phone?: string;
  pageUrl?: string;
  honeypot?: string; // Hidden field - should always be empty
}

// Hash IP for privacy
async function hashIP(ip: string): Promise<string> {
  const salt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 16) || "contact_salt";
  const data = new TextEncoder().encode(salt + ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Mask email for logs (privacy)
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const maskedLocal = local.slice(0, 2) + '***';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts[0]?.slice(0, 2) + '**' + (domainParts[1] ? '.' + domainParts[1] : '');
  return `${maskedLocal}@${maskedDomain}`;
}

// Hash message for deduplication
async function hashMessage(email: string, message: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase() + message.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 64);
}

// Strip HTML tags from content
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

// Count URLs in text
function countUrls(text: string): number {
  const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
  const matches = text.match(urlPattern);
  return matches ? matches.length : 0;
}

// Check rate limit
async function checkRateLimit(
  supabase: any,
  scope: keyof typeof RATE_LIMITS,
  identifier: string,
  ipHash?: string
): Promise<{ allowed: boolean; cooldownSeconds?: number }> {
  const config = RATE_LIMITS[scope];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

  try {
    // Get current count
    const { data: existing, error: selectError } = await supabase
      .from('rate_limits')
      .select('id, count, window_start')
      .eq('scope', scope)
      .eq('identifier', identifier)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1);

    if (selectError) {
      console.error('Rate limit check error:', selectError);
      return { allowed: true };
    }

    if (existing && existing.length > 0) {
      const record = existing[0];
      const currentCount = record.count;
      const windowStartTime = new Date(record.window_start).getTime();
      const resetIn = Math.ceil((windowStartTime + config.windowSeconds * 1000 - now.getTime()) / 1000);

      if (currentCount >= config.maxRequests) {
        console.log(`Rate limit exceeded: scope=${scope}, identifier=${maskEmail(identifier)}, count=${currentCount}`);
        return { allowed: false, cooldownSeconds: Math.max(0, resetIn) };
      }

      // Increment count
      await supabase
        .from('rate_limits')
        .update({ count: currentCount + 1, updated_at: now.toISOString() })
        .eq('id', record.id);

      return { allowed: true };
    }

    // Create new record
    await supabase
      .from('rate_limits')
      .insert({
        scope,
        identifier,
        ip_hash: ipHash || null,
        window_start: now.toISOString(),
        count: 1
      });

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: true }; // Fail open
  }
}

// Check for duplicate message
async function checkDuplicate(
  supabase: any,
  email: string,
  messageHash: string
): Promise<boolean> {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .eq('message_hash', messageHash)
      .gte('created_at', twoMinutesAgo)
      .eq('duplicate_ignored', false)
      .limit(1);

    if (error) {
      console.error('Duplicate check error:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Duplicate check error:', error);
    return false;
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, topicValue, email, message, subject, phone, pageUrl, honeypot }: ContactRequest = await req.json();

    // === HONEYPOT CHECK ===
    // If honeypot field is filled, it's a bot - silently succeed without doing anything
    if (honeypot && honeypot.trim().length > 0) {
      console.log('Honeypot triggered - blocking spam attempt');
      // Record for statistics but don't send email
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const ipHash = await hashIP(ip);
      
      await supabase.from("contact_messages").insert({
        name: `SPAM: ${topic}`,
        email: email.trim().toLowerCase(),
        message: '[HONEYPOT TRIGGERED]',
        subject: `[SPAM] ${topic}`,
        ip: ipHash,
        user_agent: req.headers.get("user-agent") || "unknown",
        status: "spam",
        honeypot_triggered: true
      });

      // Return success to not reveal honeypot detection
      return new Response(
        JSON.stringify({ success: true, message: "Message envoyé avec succès" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // === VALIDATION ===
    if (!topic || !email || !message) {
      console.error("Missing required fields:", { topic: !!topic, email: !!email, message: !!message });
      return new Response(
        JSON.stringify({ error: "missing_fields", message_key: "contact.validation.missingFields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      console.error("Invalid email format:", maskEmail(email));
      return new Response(
        JSON.stringify({ error: "invalid_email", message_key: "contact.validation.invalidEmail" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Strip HTML from message
    const cleanMessage = stripHtml(message);

    // Message length validation (20-3000 chars)
    if (cleanMessage.length < 20) {
      return new Response(
        JSON.stringify({ error: "message_too_short", message_key: "contact.validation.messageTooShort", min_length: 20 }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (cleanMessage.length > 3000) {
      return new Response(
        JSON.stringify({ error: "message_too_long", message_key: "contact.validation.messageTooLong", max_length: 3000 }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // URL count check (max 2)
    const urlCount = countUrls(cleanMessage);
    if (urlCount > 2) {
      return new Response(
        JSON.stringify({ error: "too_many_urls", message_key: "contact.validation.tooManyUrls", max_urls: 2 }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // === SETUP SUPABASE ===
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client info (hashed for privacy)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashIP(ip);
    const userAgent = req.headers.get("user-agent") || "unknown";

    // === RATE LIMITING ===
    // Check IP rate limit
    const ipRateLimit = await checkRateLimit(supabase, 'contact/ip', ipHash, ipHash);
    if (!ipRateLimit.allowed) {
      console.log(`IP rate limit exceeded: ${ipHash.slice(0, 8)}...`);
      return new Response(
        JSON.stringify({
          error: "rate_limit_exceeded",
          scope: "contact/ip",
          cooldown_seconds: ipRateLimit.cooldownSeconds,
          message_key: "contact.rateLimit.ip"
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(ipRateLimit.cooldownSeconds) 
          } 
        }
      );
    }

    // Check email rate limit
    const emailRateLimit = await checkRateLimit(supabase, 'contact/email', cleanEmail, ipHash);
    if (!emailRateLimit.allowed) {
      console.log(`Email rate limit exceeded: ${maskEmail(cleanEmail)}`);
      return new Response(
        JSON.stringify({
          error: "rate_limit_exceeded",
          scope: "contact/email",
          cooldown_seconds: emailRateLimit.cooldownSeconds,
          message_key: "contact.rateLimit.email"
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(emailRateLimit.cooldownSeconds) 
          } 
        }
      );
    }

    // === DEDUPLICATION ===
    const messageHash = await hashMessage(cleanEmail, cleanMessage);
    const isDuplicate = await checkDuplicate(supabase, cleanEmail, messageHash);

    if (isDuplicate) {
      console.log(`Duplicate message detected: ${maskEmail(cleanEmail)}`);
      // Store as duplicate but don't send email
      await supabase.from("contact_messages").insert({
        name: `${topic}${phone ? ` - ${phone}` : ''}`,
        email: cleanEmail,
        message: cleanMessage,
        subject: subject ? `[${topic}] ${subject}` : `[${topic}]`,
        ip: ipHash,
        user_agent: userAgent,
        status: "duplicate",
        message_hash: messageHash,
        duplicate_ignored: true
      });

      // Return success to not reveal duplicate detection
      return new Response(
        JSON.stringify({ success: true, message: "Message envoyé avec succès" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // === STORE MESSAGE ===
    const fullSubject = subject ? `[${topic}] ${subject}` : `[${topic}]`;
    const { error: dbError } = await supabase.from("contact_messages").insert({
      name: `${topic}${phone ? ` - ${phone}` : ''}`,
      email: cleanEmail,
      message: cleanMessage,
      subject: fullSubject,
      ip: ipHash,
      user_agent: userAgent,
      status: "new",
      message_hash: messageHash,
      duplicate_ignored: false,
      honeypot_triggered: false
    });

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Continue - still try to send email
    }

    // === SEND EMAILS ===
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const toEmail = Deno.env.get("RESEND_TO_EMAIL") || "contact@lavcom.fr";
    const emailSubject = subject 
      ? `[Contact Lavcom - ${topic}] ${subject}` 
      : `[Contact Lavcom] ${topic}`;

    const optionalFieldsHtml = `
      ${phone ? `<p style="margin: 0 0 12px 0;"><strong>Téléphone:</strong> <a href="tel:${phone}" style="color: #16a34a;">${phone}</a></p>` : ''}
      ${pageUrl ? `<p style="margin: 0 0 12px 0;"><strong>Page concernée:</strong> ${stripHtml(pageUrl)}</p>` : ''}
      ${subject ? `<p style="margin: 0 0 12px 0;"><strong>Sujet:</strong> ${stripHtml(subject)}</p>` : ''}
    `;

    // Send admin notification
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
            <p style="margin: 0 0 12px 0;"><strong>Email:</strong> <a href="mailto:${cleanEmail}" style="color: #16a34a;">${cleanEmail}</a></p>
            ${optionalFieldsHtml}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p style="margin: 0 0 8px 0;"><strong>Message:</strong></p>
            <div style="background: white; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; white-space: pre-wrap;">${cleanMessage}</div>
          </div>
          <div style="background: #f3f4f6; padding: 12px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280;">
            <p style="margin: 0;">IP hash: ${ipHash.slice(0, 8)}...</p>
          </div>
        </div>
      `,
    });

    console.log("Admin email sent:", adminEmailResponse);

    // Send user confirmation
    const confirmEmailResponse = await resend.emails.send({
      from: `Lavcom Performances <${fromEmail}>`,
      to: [cleanEmail],
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
            <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin-top: 8px; color: #374151; white-space: pre-wrap;">${cleanMessage}</div>
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
      JSON.stringify({ success: true, message: "Message envoyé avec succès" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-contact function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur lors de l'envoi" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});