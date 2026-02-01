/**
 * Standardized authentication error codes
 * Used across all auth flows for consistent error handling
 */

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'OTP_EXPIRED'
  | 'OTP_INVALID'
  | 'OTP_RATE_LIMITED'
  | 'OTP_TOO_MANY_ATTEMPTS'
  | 'MFA_REQUIRED_PLATFORM_ADMIN'
  | 'MFA_INVALID_CODE'
  | 'RECOVERY_CODE_INVALID'
  | 'RECOVERY_CODE_USED'
  | 'RECOVERY_CODE_EXHAUSTED'
  | 'EMAIL_NOT_CONFIRMED'
  | 'ACCOUNT_LOCKED'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'GENERIC_ERROR';

export interface AuthErrorInfo {
  code: AuthErrorCode;
  i18nKey: string;
  severity: 'error' | 'warning' | 'info';
  suggestRecoveryCode?: boolean;
  suggestContactSupport?: boolean;
}

/**
 * Map of error codes to their metadata
 */
export const AUTH_ERROR_INFO: Record<AuthErrorCode, Omit<AuthErrorInfo, 'code'>> = {
  INVALID_CREDENTIALS: {
    i18nKey: 'authErrors.invalidCredentials',
    severity: 'error',
  },
  OTP_EXPIRED: {
    i18nKey: 'authErrors.otpExpired',
    severity: 'warning',
  },
  OTP_INVALID: {
    i18nKey: 'authErrors.otpInvalid',
    severity: 'error',
  },
  OTP_RATE_LIMITED: {
    i18nKey: 'authErrors.otpRateLimited',
    severity: 'warning',
  },
  OTP_TOO_MANY_ATTEMPTS: {
    i18nKey: 'authErrors.otpTooManyAttempts',
    severity: 'error',
    suggestRecoveryCode: true,
  },
  MFA_REQUIRED_PLATFORM_ADMIN: {
    i18nKey: 'authErrors.mfaRequiredPlatformAdmin',
    severity: 'warning',
  },
  MFA_INVALID_CODE: {
    i18nKey: 'authErrors.mfaInvalidCode',
    severity: 'error',
  },
  RECOVERY_CODE_INVALID: {
    i18nKey: 'authErrors.recoveryCodeInvalid',
    severity: 'error',
  },
  RECOVERY_CODE_USED: {
    i18nKey: 'authErrors.recoveryCodeUsed',
    severity: 'error',
    suggestRecoveryCode: true,
  },
  RECOVERY_CODE_EXHAUSTED: {
    i18nKey: 'authErrors.recoveryCodeExhausted',
    severity: 'error',
    suggestContactSupport: true,
  },
  EMAIL_NOT_CONFIRMED: {
    i18nKey: 'authErrors.emailNotConfirmed',
    severity: 'warning',
  },
  ACCOUNT_LOCKED: {
    i18nKey: 'authErrors.accountLocked',
    severity: 'error',
    suggestContactSupport: true,
  },
  SESSION_EXPIRED: {
    i18nKey: 'authErrors.sessionExpired',
    severity: 'info',
  },
  NETWORK_ERROR: {
    i18nKey: 'authErrors.networkError',
    severity: 'error',
  },
  GENERIC_ERROR: {
    i18nKey: 'authErrors.genericError',
    severity: 'error',
    suggestContactSupport: true,
  },
};

/**
 * Parse raw error message to standardized error code
 */
export function parseAuthErrorCode(errorMessage: string): AuthErrorCode {
  const lowerMsg = errorMessage.toLowerCase();

  if (lowerMsg.includes('invalid') && (lowerMsg.includes('credentials') || lowerMsg.includes('login') || lowerMsg.includes('password'))) {
    return 'INVALID_CREDENTIALS';
  }
  if (lowerMsg.includes('expired') && lowerMsg.includes('otp')) {
    return 'OTP_EXPIRED';
  }
  if (lowerMsg.includes('invalid') && (lowerMsg.includes('otp') || lowerMsg.includes('code'))) {
    return 'OTP_INVALID';
  }
  if (lowerMsg.includes('rate') && lowerMsg.includes('limit')) {
    return 'OTP_RATE_LIMITED';
  }
  if (lowerMsg.includes('too many') && lowerMsg.includes('attempt')) {
    return 'OTP_TOO_MANY_ATTEMPTS';
  }
  if (lowerMsg.includes('mfa') && lowerMsg.includes('required')) {
    return 'MFA_REQUIRED_PLATFORM_ADMIN';
  }
  if (lowerMsg.includes('mfa') && lowerMsg.includes('invalid')) {
    return 'MFA_INVALID_CODE';
  }
  if (lowerMsg.includes('recovery') && lowerMsg.includes('used')) {
    return 'RECOVERY_CODE_USED';
  }
  if (lowerMsg.includes('recovery') && lowerMsg.includes('exhausted')) {
    return 'RECOVERY_CODE_EXHAUSTED';
  }
  if (lowerMsg.includes('recovery') && lowerMsg.includes('invalid')) {
    return 'RECOVERY_CODE_INVALID';
  }
  if (lowerMsg.includes('email') && lowerMsg.includes('confirm')) {
    return 'EMAIL_NOT_CONFIRMED';
  }
  if (lowerMsg.includes('locked') || lowerMsg.includes('blocked')) {
    return 'ACCOUNT_LOCKED';
  }
  if (lowerMsg.includes('session') && lowerMsg.includes('expired')) {
    return 'SESSION_EXPIRED';
  }
  if (lowerMsg.includes('network') || lowerMsg.includes('fetch')) {
    return 'NETWORK_ERROR';
  }

  return 'GENERIC_ERROR';
}

/**
 * Get error info from code
 */
export function getAuthErrorInfo(code: AuthErrorCode): AuthErrorInfo {
  return {
    code,
    ...AUTH_ERROR_INFO[code],
  };
}

/**
 * Generate a trace ID for error tracking
 */
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`.toUpperCase();
}
