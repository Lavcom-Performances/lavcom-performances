/**
 * App context management for platform ↔ SaaS switching
 * 
 * RULES:
 * - isPlatformAdmin = role in (super_admin, admin) on platform_roles
 * - isPlatformBilling = role == billing on platform_roles
 * - company_admin is NEVER a platform role (it's an organization role)
 */

const APP_CONTEXT_KEY = 'lavcom_app_context';

export type AppContext = 'platform' | 'saas';

/**
 * Get the current app context from localStorage
 */
export function getAppContext(): AppContext | null {
  try {
    const value = localStorage.getItem(APP_CONTEXT_KEY);
    if (value === 'platform' || value === 'saas') {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set the app context
 */
export function setAppContext(context: AppContext): void {
  try {
    localStorage.setItem(APP_CONTEXT_KEY, context);
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Get the default context based on user's platform role
 */
export function getDefaultContext(isPlatformAdmin: boolean, isPlatformBilling: boolean): AppContext {
  // If user has any platform role, default to platform
  if (isPlatformAdmin || isPlatformBilling) {
    return 'platform';
  }
  // Otherwise default to SaaS
  return 'saas';
}

/**
 * Get the effective context (stored or default)
 */
export function getEffectiveContext(isPlatformAdmin: boolean, isPlatformBilling: boolean): AppContext {
  const stored = getAppContext();
  if (stored) {
    // Validate: can only be in platform context if user has platform role
    if (stored === 'platform' && !isPlatformAdmin && !isPlatformBilling) {
      return 'saas';
    }
    return stored;
  }
  return getDefaultContext(isPlatformAdmin, isPlatformBilling);
}

/**
 * Clear the app context
 */
export function clearAppContext(): void {
  try {
    localStorage.removeItem(APP_CONTEXT_KEY);
  } catch {
    // localStorage may be unavailable
  }
}
