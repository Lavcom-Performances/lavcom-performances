import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[send-audit-report] ${step}${detailsStr}`);
};

interface CriticalAction {
  action: string;
  target_table: string;
  target_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface UserReportData {
  userId: string;
  email: string;
  frequency: 'weekly' | 'monthly';
  criticalActions: CriticalAction[];
  totalActions: number;
  deletions: number;
  permissionChanges: number;
}

// Critical tables for highlighting
const CRITICAL_TABLES = ['user_permissions', 'user_roles', 'sites', 'organizations', 'subscriptions'];
const CRITICAL_ACTIONS = ['DELETE', 'role_changed', 'permissions_reset', 'member_removed'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("Starting scheduled audit report job");

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday
    const dayOfMonth = now.getUTCDate();

    // Determine which reports to send
    const shouldSendWeekly = dayOfWeek === 1; // Monday
    const shouldSendMonthly = dayOfMonth === 1; // 1st of month

    if (!shouldSendWeekly && !shouldSendMonthly) {
      logStep("No reports scheduled for today", { dayOfWeek, dayOfMonth });
      return new Response(
        JSON.stringify({ success: true, message: "No reports scheduled for today" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch users who want reports
    const frequencies: ('weekly' | 'monthly')[] = [];
    if (shouldSendWeekly) frequencies.push('weekly');
    if (shouldSendMonthly) frequencies.push('monthly');

    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('user_id, audit_report_frequency, audit_report_email')
      .in('audit_report_frequency', frequencies);

    if (prefsError) {
      throw prefsError;
    }

    logStep("Users to notify", { count: prefs?.length || 0, frequencies });

    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users subscribed to reports" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user emails from profiles
    const userIds = prefs.map(p => p.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

    const reportsSent: string[] = [];
    const errors: string[] = [];

    for (const pref of prefs) {
      const frequency = pref.audit_report_frequency as 'weekly' | 'monthly';
      
      // Skip if frequency doesn't match today
      if (frequency === 'weekly' && !shouldSendWeekly) continue;
      if (frequency === 'monthly' && !shouldSendMonthly) continue;

      const email = pref.audit_report_email || emailMap.get(pref.user_id);
      if (!email) {
        logStep(`No email for user ${pref.user_id}`);
        continue;
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (frequency === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      try {
        // Fetch critical actions for this user
        const { data: actions, count } = await supabase
          .from('audit_logs')
          .select('action, target_table, target_id, created_at, metadata', { count: 'exact' })
          .eq('actor_id', pref.user_id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false });

        // Filter critical actions
        const criticalActions = (actions || []).filter(a => 
          CRITICAL_TABLES.includes(a.target_table) || 
          CRITICAL_ACTIONS.some(ca => a.action.includes(ca))
        );

        const deletions = (actions || []).filter(a => a.action.includes('DELETE')).length;
        const permissionChanges = (actions || []).filter(a => 
          a.target_table === 'user_permissions' || a.target_table === 'user_roles'
        ).length;

        const reportData: UserReportData = {
          userId: pref.user_id,
          email,
          frequency,
          criticalActions: criticalActions.slice(0, 20) as CriticalAction[], // Top 20
          totalActions: count || 0,
          deletions,
          permissionChanges,
        };

        // Send email if resend is configured
        if (resend) {
          const periodLabel = frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuel';
          const periodRange = `${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`;

          const emailHtml = buildReportEmail(reportData, periodLabel, periodRange);

          const { error: emailError } = await resend.emails.send({
            from: 'LavoSmart <noreply@lavosmart.com>',
            to: [email],
            subject: `📊 Rapport d'audit ${periodLabel.toLowerCase()} - LavoSmart`,
            html: emailHtml,
          });

          if (emailError) {
            logStep(`Email error for ${pref.user_id}`, emailError);
            errors.push(`${email}: ${emailError}`);
          } else {
            reportsSent.push(email);
            logStep(`Report sent to ${email}`);
          }
        } else {
          // Log that we would send email (for testing)
          logStep(`Would send report to ${email}`, { 
            totalActions: reportData.totalActions, 
            criticalCount: criticalActions.length 
          });
          reportsSent.push(`${email} (no resend key)`);
        }

        // Update last sent timestamp
        await supabase
          .from('notification_preferences')
          .update({ last_audit_report_sent_at: now.toISOString() })
          .eq('user_id', pref.user_id);

      } catch (userError) {
        const errorMsg = userError instanceof Error ? userError.message : String(userError);
        errors.push(`${pref.user_id}: ${errorMsg}`);
        logStep(`Error processing user ${pref.user_id}`, { error: errorMsg });
      }
    }

    // Log to system_events
    await supabase.from('system_events').insert({
      source: 'send-audit-report',
      severity: errors.length > 0 ? 'warn' : 'info',
      code: 'REPORTS_SENT',
      message: `Audit reports sent: ${reportsSent.length} success, ${errors.length} errors`,
      meta: {
        reportsSent: reportsSent.length,
        errors: errors.length,
        frequencies,
      },
    });

    logStep("Job complete", { sent: reportsSent.length, errors: errors.length });

    return new Response(
      JSON.stringify({
        success: true,
        reportsSent: reportsSent.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildReportEmail(data: UserReportData, periodLabel: string, periodRange: string): string {
  const criticalSection = data.criticalActions.length > 0 
    ? `
      <h3 style="color: #dc2626; margin: 20px 0 10px;">⚠️ Actions critiques (${data.criticalActions.length})</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Date</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Action</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Table</th>
          </tr>
        </thead>
        <tbody>
          ${data.criticalActions.slice(0, 10).map(a => `
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date(a.created_at).toLocaleString('fr-FR')}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; color: ${a.action.includes('DELETE') ? '#dc2626' : '#1f2937'};">${a.action}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${a.target_table}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '<p style="color: #16a34a;">✅ Aucune action critique sur cette période.</p>';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
      <div style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="color: #1f2937; margin-bottom: 4px;">📊 Rapport d'audit ${periodLabel}</h1>
        <p style="color: #6b7280; margin-top: 0;">${periodRange}</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        
        <h2 style="color: #1f2937; font-size: 18px;">Résumé</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
          <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center;">
            <p style="font-size: 24px; font-weight: bold; margin: 0; color: #3b82f6;">${data.totalActions}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0;">Actions totales</p>
          </div>
          <div style="background: #fef2f2; padding: 16px; border-radius: 6px; text-align: center;">
            <p style="font-size: 24px; font-weight: bold; margin: 0; color: #dc2626;">${data.deletions}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0;">Suppressions</p>
          </div>
          <div style="background: #fefce8; padding: 16px; border-radius: 6px; text-align: center;">
            <p style="font-size: 24px; font-weight: bold; margin: 0; color: #ca8a04;">${data.permissionChanges}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0;">Permissions</p>
          </div>
        </div>
        
        ${criticalSection}
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;">
        
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          Pour modifier vos préférences de rapport, rendez-vous dans les paramètres de votre compte.<br>
          <a href="https://app.lavosmart.com/settings" style="color: #3b82f6;">Gérer mes paramètres</a>
        </p>
      </div>
    </body>
    </html>
  `;
}
