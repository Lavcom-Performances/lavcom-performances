import { useCallback, useMemo } from 'react';

const DEVICE_ID_KEY = 'lavcom_device_id';

interface DeviceInfo {
  device_id: string;
  user_agent_hash: string;
  timezone: string;
  locale: string;
  browser: string;
  os: string;
  device_type: string;
}

/**
 * Generate a stable device ID stored in localStorage
 */
function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate a new device ID
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    deviceId = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Hash a string using SHA-256 (truncated)
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse user agent to extract browser and OS info
 */
function parseUserAgent(ua: string): { browser: string; os: string; device_type: string } {
  let browser = 'Unknown';
  let os = 'Unknown';
  let device_type = 'desktop';

  // Detect browser
  if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
  } else if (ua.includes('Chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari')) {
    browser = 'Safari';
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    browser = 'Opera';
  }

  // Detect OS
  if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS')) {
    os = 'macOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
    device_type = 'mobile';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
    device_type = ua.includes('iPad') ? 'tablet' : 'mobile';
  }

  return { browser, os, device_type };
}

/**
 * Get device name for display
 */
function getDeviceName(): string {
  const ua = navigator.userAgent;
  const { browser, os, device_type } = parseUserAgent(ua);
  
  if (device_type === 'mobile') {
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return 'Android';
  }
  
  return `${browser} on ${os}`;
}

/**
 * Hook for device fingerprinting and identification
 */
export function useDeviceFingerprint() {
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const deviceName = useMemo(() => getDeviceName(), []);

  const getDeviceInfo = useCallback(async (): Promise<DeviceInfo> => {
    const ua = navigator.userAgent;
    const userAgentHash = await hashString(ua);
    const { browser, os, device_type } = parseUserAgent(ua);

    return {
      device_id: deviceId,
      user_agent_hash: userAgentHash,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language,
      browser,
      os,
      device_type,
    };
  }, [deviceId]);

  return {
    deviceId,
    deviceName,
    getDeviceInfo,
  };
}

export type { DeviceInfo };
