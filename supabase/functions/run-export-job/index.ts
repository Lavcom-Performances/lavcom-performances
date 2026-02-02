import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface ExportJob {
  id: string;
  created_by: string;
  role_scope: 'platform_admin' | 'saas_user';
  company_id: string | null;
  site_id: string | null;
  export_type: string;
  filters: Record<string, unknown>;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This function runs with service role only (cron or direct invoke)
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    
    // Also allow auth header for manual trigger by platform admin
    const authHeader = req.headers.get('Authorization');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    let isAuthorized = false;
    
    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      isAuthorized = true;
    } else if (authHeader) {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await userClient.auth.getUser();
      
      if (user) {
        const { data: platformRole } = await serviceClient
          .from('platform_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'super_admin'])
          .limit(1);
        
        if (platformRole && platformRole.length > 0) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optional: process specific job
    let specificJobId: string | null = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        specificJobId = body.job_id || null;
      } catch {
        // No body or invalid JSON
      }
    }

    // Pick queued jobs (up to 5 at a time)
    let query = serviceClient
      .from('export_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(5);

    if (specificJobId) {
      query = serviceClient
        .from('export_jobs')
        .select('*')
        .eq('id', specificJobId)
        .eq('status', 'queued')
        .limit(1);
    }

    const { data: jobs, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching queued jobs:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch queued jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No queued jobs to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: { job_id: string; status: string; error?: string }[] = [];

    for (const job of jobs as ExportJob[]) {
      try {
        // Update to running
        await serviceClient
          .from('export_jobs')
          .update({
            status: 'running',
            started_at: new Date().toISOString(),
            progress: 5,
          })
          .eq('id', job.id);

        // Log export started
        await serviceClient.rpc('rpc_log_system_event', {
          p_env: 'prod',
          p_source: 'export',
          p_severity: 'info',
          p_code: 'EXPORT_STARTED',
          p_message: `Export job started: ${job.export_type}`,
          p_meta: {
            job_id: job.id,
            export_type: job.export_type,
            role_scope: job.role_scope,
          }
        });

        // Generate export data
        const csvContent = await generateExportData(serviceClient, job);

        // Update progress
        await serviceClient
          .from('export_jobs')
          .update({ progress: 75 })
          .eq('id', job.id);

        // Upload to storage
        const filename = `export_${job.export_type}_${Date.now()}.csv`;
        const storagePath = `${job.role_scope}/${job.company_id || 'global'}/${job.id}/${filename}`;

        const { error: uploadError } = await serviceClient.storage
          .from('exports')
          .upload(storagePath, new Blob([csvContent], { type: 'text/csv' }), {
            contentType: 'text/csv',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        // Mark as success
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await serviceClient
          .from('export_jobs')
          .update({
            status: 'success',
            progress: 100,
            result_path: storagePath,
            result_filename: filename,
            result_mime: 'text/csv',
            expires_at: expiresAt.toISOString(),
            finished_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        // Log completion
        await serviceClient.rpc('rpc_log_system_event', {
          p_env: 'prod',
          p_source: 'export',
          p_severity: 'info',
          p_code: 'EXPORT_COMPLETED',
          p_message: `Export job completed: ${job.export_type}`,
          p_meta: {
            job_id: job.id,
            export_type: job.export_type,
            role_scope: job.role_scope,
            file_size: csvContent.length,
          }
        });

        results.push({ job_id: job.id, status: 'success' });
        console.log(`Export job ${job.id} completed successfully`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Export job ${job.id} failed:`, error);

        // Mark as failed
        await serviceClient
          .from('export_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage.slice(0, 500),
            finished_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        // Log failure
        await serviceClient.rpc('rpc_log_system_event', {
          p_env: 'prod',
          p_source: 'export',
          p_severity: 'error',
          p_code: 'EXPORT_FAILED',
          p_message: `Export job failed: ${job.export_type}`,
          p_meta: {
            job_id: job.id,
            export_type: job.export_type,
            error: errorMessage.slice(0, 200),
          }
        });

        results.push({ job_id: job.id, status: 'failed', error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in run-export-job:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// deno-lint-ignore no-explicit-any
type AnyClient = any;

// Generate CSV data based on export type
async function generateExportData(
  client: AnyClient,
  job: ExportJob
): Promise<string> {
  const { export_type, role_scope, company_id, site_id, filters } = job;

  switch (export_type) {
    case 'transactions':
      return await generateTransactionsExport(client, site_id, filters);
    case 'billing_summary':
      return await generateBillingSummaryExport(client, company_id, filters);
    case 'sites_list':
      return await generateSitesListExport(client, filters);
    case 'users_list':
      return await generateUsersListExport(client, role_scope, company_id, filters);
    case 'admin_audit':
      return await generateAuditLogsExport(client, filters);
    case 'subscriptions_report':
      return await generateSubscriptionsExport(client, filters);
    default:
      return generateGenericExport(export_type, filters);
  }
}

// Sanitize cell for CSV injection
function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Prefix with ' if starts with dangerous characters
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  // Escape quotes and wrap if contains comma/newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvLine(cells: unknown[]): string {
  return cells.map(sanitizeCell).join(',');
}

async function generateTransactionsExport(
  client: AnyClient,
  siteId: string | null,
  filters: Record<string, unknown>
): Promise<string> {
  let query = client.from('operations').select('*');

  if (siteId) {
    query = query.eq('site_id', siteId);
  }
  if (filters.date_from) {
    query = query.gte('operation_date', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('operation_date', filters.date_to);
  }
  if (filters.payment_mode) {
    query = query.eq('payment_mode', filters.payment_mode);
  }

  query = query.order('operation_date', { ascending: false }).limit(10000);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

  const headers = ['Date', 'Time', 'Machine', 'Amount', 'Payment Mode', 'Program'];
  const lines = [headers.join(',')];

  // deno-lint-ignore no-explicit-any
  for (const op of (data || []) as any[]) {
    lines.push(buildCsvLine([
      op.operation_date,
      op.operation_time,
      op.machine,
      op.amount,
      op.payment_mode,
      op.program
    ]));
  }

  return lines.join('\n');
}

async function generateBillingSummaryExport(
  client: AnyClient,
  companyId: string | null,
  filters: Record<string, unknown>
): Promise<string> {
  // Get analytics data for billing
  let query = client.from('analytics_daily').select('*');

  if (filters.date_from) {
    query = query.gte('date', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('date', filters.date_to);
  }

  query = query.order('date', { ascending: false }).limit(5000);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch billing data: ${error.message}`);

  const headers = ['Date', 'Revenue', 'Transactions', 'Revenue Card', 'Revenue Cash', 'Avg Basket'];
  const lines = [headers.join(',')];

  // deno-lint-ignore no-explicit-any
  for (const row of (data || []) as any[]) {
    lines.push(buildCsvLine([
      row.date,
      row.revenue,
      row.transactions,
      row.revenue_card,
      row.revenue_cash,
      row.average_basket
    ]));
  }

  return lines.join('\n');
}

async function generateSitesListExport(
  client: AnyClient,
  filters: Record<string, unknown>
): Promise<string> {
  let query = client.from('sites').select('*');

  if (filters.country) {
    query = query.eq('country_code', filters.country);
  }
  if (filters.department) {
    query = query.eq('department_code', filters.department);
  }
  if (!filters.include_demo) {
    query = query.eq('is_demo', false);
  }

  query = query.order('created_at', { ascending: false }).limit(5000);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch sites: ${error.message}`);

  const headers = ['ID', 'Name', 'Address', 'City', 'Postal Code', 'Department', 'Country', 'Created At'];
  const lines = [headers.join(',')];

  // deno-lint-ignore no-explicit-any
  for (const site of (data || []) as any[]) {
    lines.push(buildCsvLine([
      site.id,
      site.name,
      site.address,
      site.city,
      site.postal_code,
      site.department_code,
      site.country_code,
      site.created_at
    ]));
  }

  return lines.join('\n');
}

async function generateUsersListExport(
  client: AnyClient,
  roleScope: string,
  companyId: string | null,
  filters: Record<string, unknown>
): Promise<string> {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) throw new Error(`Failed to fetch users: ${error.message}`);

  const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Company', 'Created At'];
  const lines = [headers.join(',')];

  // deno-lint-ignore no-explicit-any
  for (const profile of (data || []) as any[]) {
    lines.push(buildCsvLine([
      profile.id,
      profile.email,
      profile.first_name,
      profile.last_name,
      profile.company_name,
      profile.created_at
    ]));
  }

  return lines.join('\n');
}

async function generateAuditLogsExport(
  client: AnyClient,
  filters: Record<string, unknown>
): Promise<string> {
  let query = client.from('audit_logs').select('*');

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }
  if (filters.action_type) {
    query = query.eq('action', filters.action_type);
  }

  query = query.order('created_at', { ascending: false }).limit(10000);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);

  const headers = ['ID', 'Actor ID', 'Action', 'Target Table', 'Target ID', 'Created At'];
  const lines = [headers.join(',')];

  // deno-lint-ignore no-explicit-any
  for (const log of (data || []) as any[]) {
    lines.push(buildCsvLine([
      log.id,
      log.actor_id,
      log.action,
      log.target_table,
      log.target_id,
      log.created_at
    ]));
  }

  return lines.join('\n');
}

async function generateSubscriptionsExport(
  client: AnyClient,
  filters: Record<string, unknown>
): Promise<string> {
  let query = client.from('subscriptions').select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.plan_type) {
    query = query.eq('plan_type', filters.plan_type);
  }

  query = query.order('created_at', { ascending: false }).limit(5000);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch subscriptions: ${error.message}`);

  const headers = ['ID', 'User ID', 'Plan Type', 'Status', 'Laundry Count', 'Trial End', 'Period End', 'Created At'];
  const lines = [headers.join(',')];

  // deno-lint-ignore no-explicit-any
  for (const sub of (data || []) as any[]) {
    lines.push(buildCsvLine([
      sub.id,
      sub.user_id,
      sub.plan_type,
      sub.status,
      sub.laundry_count,
      sub.trial_end_date,
      sub.current_period_end,
      sub.created_at
    ]));
  }

  return lines.join('\n');
}

function generateGenericExport(exportType: string, filters: Record<string, unknown>): string {
  return [
    `Export Type: ${exportType}`,
    `Generated At: ${new Date().toISOString()}`,
    `Filters: ${JSON.stringify(filters)}`,
    '',
    'No data available for this export type.'
  ].join('\n');
}
