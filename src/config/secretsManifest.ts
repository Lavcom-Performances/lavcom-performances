/**
 * Secrets Manifest - Defines all required and optional secrets for the platform
 * 
 * IMPORTANT: This file never contains secret values, only metadata.
 * Values are checked at runtime in the secrets-health edge function.
 */

export type SecretSeverity = 'blocker' | 'warn';

export interface SecretDefinition {
  name: string;
  purpose: string;
  usedBy: string[];
  severity: SecretSeverity;
  required: boolean;
  impactIfMissing: string;
  setupLocation: 'Lovable Cloud Secrets' | 'Supabase Vault' | 'Edge Function Env';
}

export const secretsManifest: SecretDefinition[] = [
  // ===== REQUIRED (blocker) =====
  {
    name: 'CRON_SECRET',
    purpose: 'Authenticates scheduled cron jobs to prevent unauthorized execution',
    usedBy: ['compute-analytics-cron', 'stripe-reconcile-cron', 'smoke-tests-cron', 'backup-drill-reminder', 'import-parser-tests-cron', 'cleanup-audit-logs', 'cleanup-login-logs'],
    severity: 'blocker',
    required: true,
    impactIfMissing: 'All scheduled jobs will fail authentication',
    setupLocation: 'Lovable Cloud Secrets',
  },
  {
    name: 'STRIPE_SECRET_KEY',
    purpose: 'Server-side Stripe API access for payments and subscriptions',
    usedBy: ['stripe-webhook', 'create-subscription-checkout', 'create-addon-checkout', 'customer-portal', 'list-invoices', 'stripe-reconcile-cron'],
    severity: 'blocker',
    required: true,
    impactIfMissing: 'All payment operations will fail',
    setupLocation: 'Lovable Cloud Secrets',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    purpose: 'Validates incoming Stripe webhook signatures',
    usedBy: ['stripe-webhook'],
    severity: 'blocker',
    required: true,
    impactIfMissing: 'Stripe events (payments, subscriptions) will not be processed',
    setupLocation: 'Lovable Cloud Secrets',
  },
  {
    name: 'RESEND_API_KEY',
    purpose: 'Email delivery via Resend for transactional emails',
    usedBy: ['send-contact', 'send-team-invitation', 'send-admin-invitation', 'send-subscription-email', 'trial-reminder', 'send-audit-report', 'send-cron-alert', 'dr-drill-reminder'],
    severity: 'blocker',
    required: true,
    impactIfMissing: 'No emails will be sent (invitations, alerts, reports)',
    setupLocation: 'Lovable Cloud Secrets',
  },

  // ===== OPTIONAL (warn) =====
  {
    name: 'SLACK_WEBHOOK_URL',
    purpose: 'Sends critical alerts and notifications to Slack channel',
    usedBy: ['send-system-alert', 'send-cron-alert', 'send-suspicious-login-alert', 'check-churn-alert'],
    severity: 'warn',
    required: false,
    impactIfMissing: 'Slack notifications disabled; alerts only via email',
    setupLocation: 'Lovable Cloud Secrets',
  },
  {
    name: 'DEMO_SITE_ID_ALLOWLIST',
    purpose: 'Comma-separated UUIDs of sites allowed for DR drill simulations',
    usedBy: ['run-dr-drill'],
    severity: 'warn',
    required: false,
    impactIfMissing: 'Automated DR drills will be blocked (safe default)',
    setupLocation: 'Lovable Cloud Secrets',
  },
  {
    name: 'SCREENSHOTONE_API_KEY',
    purpose: 'Captures automated screenshots during DR drills for evidence',
    usedBy: ['run-dr-drill'],
    severity: 'warn',
    required: false,
    impactIfMissing: 'DR drill screenshots will not be captured automatically',
    setupLocation: 'Lovable Cloud Secrets',
  },
  {
    name: 'SIRENE_API_KEY',
    purpose: 'INSEE SIRENE API for French company validation via SIRET',
    usedBy: ['fetch-from-siret'],
    severity: 'warn',
    required: false,
    impactIfMissing: 'SIRET lookup will fail; manual company entry required',
    setupLocation: 'Lovable Cloud Secrets',
  },
];

// Helper to get only required secrets
export const getRequiredSecrets = (): SecretDefinition[] => 
  secretsManifest.filter(s => s.required);

// Helper to get only optional secrets
export const getOptionalSecrets = (): SecretDefinition[] => 
  secretsManifest.filter(s => !s.required);

// Helper to generate plain text checklist
export const generateSecretsChecklist = (secrets: SecretDefinition[]): string => {
  const lines = [
    '# Platform Secrets Setup Checklist',
    `# Generated: ${new Date().toISOString()}`,
    '',
    '## Required Secrets (blocker if missing)',
    '',
  ];

  const required = secrets.filter(s => s.required);
  const optional = secrets.filter(s => !s.required);

  required.forEach(s => {
    lines.push(`[ ] ${s.name}`);
    lines.push(`    Purpose: ${s.purpose}`);
    lines.push(`    Used by: ${s.usedBy.join(', ')}`);
    lines.push(`    Setup: ${s.setupLocation}`);
    lines.push('');
  });

  lines.push('## Optional Secrets (recommended)');
  lines.push('');

  optional.forEach(s => {
    lines.push(`[ ] ${s.name}`);
    lines.push(`    Purpose: ${s.purpose}`);
    lines.push(`    Used by: ${s.usedBy.join(', ')}`);
    lines.push(`    Setup: ${s.setupLocation}`);
    lines.push('');
  });

  return lines.join('\n');
};
