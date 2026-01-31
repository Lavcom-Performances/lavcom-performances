/**
 * Security Health Score Calculator
 * TAEX-234: Deterministic scoring logic for user security posture
 */

export interface SecurityHealthInputs {
  hasMfaEnabled: boolean;
  hasRecoveryCodes: boolean;
  trustedDeviceCount: number;
  riskyLoginsLast30Days: number;
  otpFailuresLast30Days: number;
}

export interface SecurityHealthScore {
  score: number;
  status: 'good' | 'needs_improvement' | 'at_risk';
  breakdown: {
    base: number;
    mfa: number;
    recoveryCodes: number;
    trustedDevices: number;
    riskyLoginsPenalty: number;
    otpFailuresPenalty: number;
  };
}

/**
 * Calculate security health score based on user's security posture
 * 
 * Scoring:
 * - Base: 40 points
 * - +30 if MFA enabled
 * - +20 if recovery codes generated
 * - +5 if at least 1 trusted device
 * - -10 if 3+ risky logins in last 30 days
 * - -10 if 5+ OTP failures in last 30 days
 * 
 * Score clamped to [0, 100]
 */
export function calculateSecurityHealthScore(inputs: SecurityHealthInputs): SecurityHealthScore {
  const {
    hasMfaEnabled,
    hasRecoveryCodes,
    trustedDeviceCount,
    riskyLoginsLast30Days,
    otpFailuresLast30Days,
  } = inputs;

  const breakdown = {
    base: 40,
    mfa: hasMfaEnabled ? 30 : 0,
    recoveryCodes: hasRecoveryCodes ? 20 : 0,
    trustedDevices: trustedDeviceCount >= 1 ? 5 : 0,
    riskyLoginsPenalty: riskyLoginsLast30Days >= 3 ? -10 : 0,
    otpFailuresPenalty: otpFailuresLast30Days >= 5 ? -10 : 0,
  };

  const rawScore = 
    breakdown.base +
    breakdown.mfa +
    breakdown.recoveryCodes +
    breakdown.trustedDevices +
    breakdown.riskyLoginsPenalty +
    breakdown.otpFailuresPenalty;

  // Clamp to [0, 100]
  const score = Math.max(0, Math.min(100, rawScore));

  // Determine status
  let status: SecurityHealthScore['status'];
  if (score >= 80) {
    status = 'good';
  } else if (score >= 50) {
    status = 'needs_improvement';
  } else {
    status = 'at_risk';
  }

  return {
    score,
    status,
    breakdown,
  };
}

/**
 * Get recommended actions based on current security state
 */
export interface RecommendedAction {
  id: string;
  priority: number; // Lower = higher priority
  completed: boolean;
}

export function getRecommendedActions(inputs: SecurityHealthInputs): RecommendedAction[] {
  const actions: RecommendedAction[] = [
    {
      id: 'enable_mfa',
      priority: 1,
      completed: inputs.hasMfaEnabled,
    },
    {
      id: 'generate_recovery_codes',
      priority: 2,
      completed: inputs.hasRecoveryCodes,
    },
    {
      id: 'review_trusted_devices',
      priority: 3,
      completed: inputs.trustedDeviceCount > 0,
    },
    {
      id: 'enable_new_device_alerts',
      priority: 4,
      completed: false, // Will be set by the hook based on notification preferences
    },
  ];

  return actions.sort((a, b) => a.priority - b.priority);
}
