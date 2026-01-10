// Persistence keys for last visited paths
const LAST_SAAS_PATH_KEY = 'lavcom_last_saas_path';
const LAST_ADMIN_PATH_KEY = 'lavcom_last_admin_path';

// Paths to exclude from memory (auth routes, landing, etc.)
const EXCLUDED_PATHS = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/forgot-password',
  '/invitation',
  '/demo',
];

/**
 * Check if a path should be saved to memory
 */
function shouldSavePath(path: string): boolean {
  // Don't save excluded paths
  if (EXCLUDED_PATHS.includes(path)) return false;
  
  // Don't save paths with query strings that look like auth callbacks
  if (path.includes('access_token=') || path.includes('error=')) return false;
  
  return true;
}

/**
 * Get the last visited SaaS path (non-admin routes)
 */
export function getLastSaasPath(): string | null {
  try {
    return localStorage.getItem(LAST_SAAS_PATH_KEY);
  } catch {
    return null;
  }
}

/**
 * Set the last visited SaaS path
 */
export function setLastSaasPath(path: string): void {
  if (!shouldSavePath(path)) return;
  
  try {
    localStorage.setItem(LAST_SAAS_PATH_KEY, path);
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Get the last visited admin path (/admin/*)
 */
export function getLastAdminPath(): string | null {
  try {
    return localStorage.getItem(LAST_ADMIN_PATH_KEY);
  } catch {
    return null;
  }
}

/**
 * Set the last visited admin path
 */
export function setLastAdminPath(path: string): void {
  if (!shouldSavePath(path)) return;
  
  try {
    localStorage.setItem(LAST_ADMIN_PATH_KEY, path);
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Check if a path is an admin path
 */
export function isAdminPath(path: string): boolean {
  return path.startsWith('/admin');
}

/**
 * Update the appropriate last path based on current location
 */
export function updateLastPath(path: string): void {
  if (isAdminPath(path)) {
    setLastAdminPath(path);
  } else {
    setLastSaasPath(path);
  }
}
