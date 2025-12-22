import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: string;
  userAgent: string;
}

// Parse user agent to extract browser and OS info
const parseUserAgent = (ua: string): DeviceInfo => {
  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'desktop';

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
    deviceType = 'mobile';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
    deviceType = ua.includes('iPad') ? 'tablet' : 'mobile';
  }

  return { browser, os, deviceType, userAgent: ua };
};

// Generate a simple hash for device fingerprinting
const generateDeviceHash = async (deviceInfo: DeviceInfo): Promise<string> => {
  const fingerprint = `${deviceInfo.browser}-${deviceInfo.os}-${navigator.language}-${screen.width}x${screen.height}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const useLoginLogger = () => {
  const logLogin = useCallback(async (userId: string) => {
    try {
      const userAgent = navigator.userAgent;
      const deviceInfo = parseUserAgent(userAgent);
      const deviceHash = await generateDeviceHash(deviceInfo);

      // Call edge function to log login (uses service role for INSERT)
      const { data, error } = await supabase.functions.invoke('log-login', {
        body: {
          user_agent: deviceInfo.userAgent,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          device_type: deviceInfo.deviceType,
          device_hash: deviceHash,
        },
      });

      if (error) {
        console.error('Failed to log login:', error);
        return { isNewDevice: false };
      }

      const isNewDevice = data?.is_new_device ?? false;
      
      if (isNewDevice) {
        console.log('New device detected - login logged');
      }

      return { isNewDevice };
    } catch (err) {
      console.error('Error logging login:', err);
      return { isNewDevice: false };
    }
  }, []);

  return { logLogin };
};

export const useLoginLoggerOnAuth = () => {
  const { logLogin } = useLoginLogger();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Defer the login logging to avoid blocking auth flow
          setTimeout(() => {
            logLogin(session.user.id);
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [logLogin]);
};
