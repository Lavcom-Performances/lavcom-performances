import { useState, useCallback } from 'react';

/**
 * Check if a password has been exposed in data breaches using HaveIBeenPwned API.
 * Uses k-anonymity: only the first 5 characters of the SHA-1 hash are sent to the API,
 * keeping the actual password private.
 */
export function usePasswordBreachCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [isBreached, setIsBreached] = useState<boolean | null>(null);
  const [breachCount, setBreachCount] = useState<number>(0);

  const checkPassword = useCallback(async (password: string): Promise<{ breached: boolean; count: number }> => {
    if (!password || password.length < 1) {
      setIsBreached(null);
      setBreachCount(0);
      return { breached: false, count: 0 };
    }

    setIsChecking(true);

    try {
      // Generate SHA-1 hash of the password
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      // Split hash: first 5 chars (prefix) and rest (suffix)
      const prefix = hashHex.slice(0, 5);
      const suffix = hashHex.slice(5);

      // Query HaveIBeenPwned API with k-anonymity
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: {
          'Add-Padding': 'true' // Adds padding to prevent response length analysis
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check password');
      }

      const text = await response.text();
      const lines = text.split('\n');

      // Check if our suffix is in the response
      for (const line of lines) {
        const [hashSuffix, countStr] = line.split(':');
        if (hashSuffix.trim() === suffix) {
          const count = parseInt(countStr.trim(), 10);
          setIsBreached(true);
          setBreachCount(count);
          setIsChecking(false);
          return { breached: true, count };
        }
      }

      // Password not found in breaches
      setIsBreached(false);
      setBreachCount(0);
      setIsChecking(false);
      return { breached: false, count: 0 };
    } catch (error) {
      console.error('Error checking password breach:', error);
      // On error, don't block the user - just assume it's safe
      setIsBreached(null);
      setBreachCount(0);
      setIsChecking(false);
      return { breached: false, count: 0 };
    }
  }, []);

  const reset = useCallback(() => {
    setIsBreached(null);
    setBreachCount(0);
    setIsChecking(false);
  }, []);

  return {
    checkPassword,
    isChecking,
    isBreached,
    breachCount,
    reset
  };
}
