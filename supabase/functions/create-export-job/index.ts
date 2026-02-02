import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed export types by scope
const SAAS_EXPORT_TYPES = ['transactions', 'billing_summary', 'maintenance_report', 'site_usage', 'company_users'];
const PLATFORM_EXPORT_TYPES = ['sites_list', 'users_list', 'global_activity', 'admin_audit', 'subscriptions_report'];

interface CreateExportRequest {
  export_type: string;
  filters?: Record<string, unknown>;
  company_id?: string;
  site_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User client for auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for privileged ops
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: CreateExportRequest = await req.json();
    const { export_type, filters = {}, company_id, site_id } = body;

    if (!export_type) {
      return new Response(
        JSON.stringify({ error: 'export_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is platform admin
    const { data: platformRoleData } = await serviceClient
      .from('platform_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin'])
      .limit(1);

    const isPlatformAdmin = platformRoleData && platformRoleData.length > 0;

    // Determine role scope based on export type and user role
    let role_scope: 'platform_admin' | 'saas_user';
    let validatedCompanyId: string | null = null;

    if (isPlatformAdmin && PLATFORM_EXPORT_TYPES.includes(export_type)) {
      role_scope = 'platform_admin';
      validatedCompanyId = null; // Platform exports don't require company_id
    } else if (SAAS_EXPORT_TYPES.includes(export_type)) {
      role_scope = 'saas_user';
      
      // Get user's company from user_roles
      const { data: userRoleData } = await serviceClient
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!userRoleData || userRoleData.length === 0) {
        return new Response(
          JSON.stringify({ error: 'User not associated with any company' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      validatedCompanyId = userRoleData[0].organization_id;

      // Verify company_id if provided matches user's company
      if (company_id && company_id !== validatedCompanyId) {
        return new Response(
          JSON.stringify({ error: 'Cannot export for another company' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Check if it's a valid type at all
      const allTypes = [...SAAS_EXPORT_TYPES, ...PLATFORM_EXPORT_TYPES];
      if (!allTypes.includes(export_type)) {
        return new Response(
          JSON.stringify({ error: `Invalid export_type: ${export_type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Platform type but user is not platform admin
      return new Response(
        JSON.stringify({ error: 'Unauthorized export type for your role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate site_id if provided (for saas_user)
    let validatedSiteId: string | null = null;
    if (site_id && role_scope === 'saas_user') {
      const { data: siteData } = await serviceClient
        .from('sites')
        .select('id, user_id')
        .eq('id', site_id)
        .single();

      if (!siteData || siteData.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Site not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      validatedSiteId = site_id;
    }

    // Sanitize and validate filters
    const sanitizedFilters = sanitizeFilters(export_type, filters);

    // Insert the export job using service role
    const { data: jobData, error: insertError } = await serviceClient
      .from('export_jobs')
      .insert({
        created_by: user.id,
        role_scope,
        company_id: validatedCompanyId,
        site_id: validatedSiteId,
        export_type,
        filters: sanitizedFilters,
        status: 'queued',
        progress: 0,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating export job:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create export job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to system_events
    await serviceClient.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'export',
      p_severity: 'info',
      p_code: 'EXPORT_REQUESTED',
      p_message: `Export job created: ${export_type}`,
      p_meta: {
        job_id: jobData.id,
        export_type,
        role_scope,
        company_id: validatedCompanyId,
        site_id: validatedSiteId,
        filters_summary: Object.keys(sanitizedFilters),
        actor_id: user.id,
        actor_email: user.email,
      }
    });

    console.log(`Export job created: ${jobData.id} (type: ${export_type}, scope: ${role_scope})`);

    return new Response(
      JSON.stringify({ job_id: jobData.id }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-export-job:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Sanitize filters based on export type (whitelist keys)
function sanitizeFilters(exportType: string, filters: Record<string, unknown>): Record<string, unknown> {
  const allowedKeys: Record<string, string[]> = {
    transactions: ['date_from', 'date_to', 'payment_mode', 'machine_type'],
    billing_summary: ['date_from', 'date_to', 'include_details'],
    maintenance_report: ['date_from', 'date_to', 'include_resolved'],
    site_usage: ['date_from', 'date_to', 'site_id'],
    company_users: ['include_inactive'],
    sites_list: ['country', 'department', 'include_demo'],
    users_list: ['status', 'include_trials'],
    global_activity: ['date_from', 'date_to'],
    admin_audit: ['date_from', 'date_to', 'action_type'],
    subscriptions_report: ['status', 'plan_type'],
  };

  const allowed = allowedKeys[exportType] || [];
  const sanitized: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in filters && filters[key] !== undefined && filters[key] !== null) {
      sanitized[key] = filters[key];
    }
  }

  // Validate date ranges if present
  if (sanitized.date_from && typeof sanitized.date_from === 'string') {
    const date = new Date(sanitized.date_from);
    if (isNaN(date.getTime())) {
      delete sanitized.date_from;
    }
  }
  if (sanitized.date_to && typeof sanitized.date_to === 'string') {
    const date = new Date(sanitized.date_to);
    if (isNaN(date.getTime())) {
      delete sanitized.date_to;
    }
  }

  return sanitized;
}
