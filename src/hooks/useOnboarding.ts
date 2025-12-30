import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const ONBOARDING_KEY = 'lavcom_onboarding_completed';

export function useOnboarding() {
  const { user, isAuthenticated } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setShowOnboarding(false);
      setIsLoading(false);
      return;
    }

    // Check if onboarding was completed for this user
    const completedUsers = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '[]');
    const hasCompleted = completedUsers.includes(user.id);

    // Check if user is new (created within last 5 minutes)
    const createdAt = new Date(user.created_at || Date.now());
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    const isNewUser = diffMinutes < 5;

    // Show onboarding for new users who haven't completed it
    setShowOnboarding(!hasCompleted && isNewUser);
    setIsLoading(false);
  }, [user, isAuthenticated]);

  const completeOnboarding = useCallback(() => {
    if (!user) return;
    
    const completedUsers = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '[]');
    if (!completedUsers.includes(user.id)) {
      completedUsers.push(user.id);
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify(completedUsers));
    }
    setShowOnboarding(false);
  }, [user]);

  const skipOnboarding = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const resetOnboarding = useCallback(() => {
    if (!user) return;
    
    const completedUsers = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '[]');
    const filtered = completedUsers.filter((id: string) => id !== user.id);
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(filtered));
    setShowOnboarding(true);
  }, [user]);

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  };
}
