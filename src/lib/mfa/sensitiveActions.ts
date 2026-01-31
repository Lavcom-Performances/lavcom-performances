/**
 * Centralized definition of sensitive actions requiring MFA verification.
 * 
 * This file defines which actions require MFA when the user has MFA enrolled.
 * Actions are categorized by role level for clarity.
 */

// Platform Admin actions - always require MFA for enrolled admins
export const PLATFORM_ADMIN_ACTIONS = [
  'impersonate_user',
  'change_platform_role',
  'toggle_feature_flag',
  'run_dr_drill',
  'generate_compliance_report',
  'download_archive',
  'access_secrets',
  'system_config',
] as const;

// Company Admin / SaaS user actions
export const COMPANY_ADMIN_ACTIONS = [
  'export_csv',
  'export_financial',
  'remove_team_member',
  'change_user_role',
  'billing_change',
  'cancel_subscription',
  'change_password',
  'delete_site',
  'delete_account',
  'disable_mfa',
] as const;

// All sensitive actions
export const ALL_SENSITIVE_ACTIONS = [
  ...PLATFORM_ADMIN_ACTIONS,
  ...COMPANY_ADMIN_ACTIONS,
] as const;

export type PlatformAdminAction = typeof PLATFORM_ADMIN_ACTIONS[number];
export type CompanyAdminAction = typeof COMPANY_ADMIN_ACTIONS[number];
export type SensitiveAction = typeof ALL_SENSITIVE_ACTIONS[number];

/**
 * Check if an action requires MFA verification
 */
export function isSensitiveAction(action: string): action is SensitiveAction {
  return ALL_SENSITIVE_ACTIONS.includes(action as SensitiveAction);
}

/**
 * Check if an action is a platform admin action
 */
export function isPlatformAdminAction(action: string): action is PlatformAdminAction {
  return PLATFORM_ADMIN_ACTIONS.includes(action as PlatformAdminAction);
}

/**
 * Get the i18n key for an action label
 */
export function getActionLabelKey(action: SensitiveAction): string {
  const actionMap: Record<SensitiveAction, string> = {
    // Platform admin
    impersonate_user: 'impersonateUser',
    change_platform_role: 'changePlatformRole',
    toggle_feature_flag: 'toggleFeatureFlag',
    run_dr_drill: 'runDrDrill',
    generate_compliance_report: 'generateComplianceReport',
    download_archive: 'downloadArchive',
    access_secrets: 'accessSecrets',
    system_config: 'systemConfig',
    // Company admin
    export_csv: 'export',
    export_financial: 'exportFinancial',
    remove_team_member: 'removeTeamMember',
    change_user_role: 'changeUserRole',
    billing_change: 'billingChange',
    cancel_subscription: 'cancelSubscription',
    change_password: 'changePassword',
    delete_site: 'deleteSite',
    delete_account: 'deleteAccount',
    disable_mfa: 'disableMfa',
  };
  
  return `app:mfaChallenge.actionLabels.${actionMap[action]}`;
}
