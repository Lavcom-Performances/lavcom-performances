/**
 * Hook to manage page-by-page UX clarity feedback.
 * 
 * Features:
 * - Tracks which pages have already been shown the questionnaire
 * - Stores state in localStorage, scoped by user
 * - Only triggers on first visit per page
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "lavcom_ux_feedback_shown";

interface UxFeedbackState {
  [pageSlug: string]: boolean;
}

export function useUxFeedback(pagePath: string) {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // Generate a stable page slug from path
  const pageSlug = pagePath.replace(/\//g, "_").replace(/^_/, "") || "home";

  // Get storage key with user scope
  const getStorageKey = useCallback(() => {
    const userId = user?.id || "anonymous";
    return `${STORAGE_KEY}_${userId}`;
  }, [user?.id]);

  // Check if this page was already shown
  useEffect(() => {
    const storageKey = getStorageKey();
    try {
      const stored = localStorage.getItem(storageKey);
      const state: UxFeedbackState = stored ? JSON.parse(stored) : {};
      
      if (state[pageSlug]) {
        setHasShown(true);
        setShouldShow(false);
      } else {
        setHasShown(false);
        // Delay showing to avoid immediate popup on page load
        const timer = setTimeout(() => {
          setShouldShow(true);
        }, 5000); // Show after 5 seconds on page
        
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.warn("Error reading UX feedback state:", err);
    }
  }, [pageSlug, getStorageKey]);

  // Mark page as shown
  const markAsShown = useCallback(() => {
    const storageKey = getStorageKey();
    try {
      const stored = localStorage.getItem(storageKey);
      const state: UxFeedbackState = stored ? JSON.parse(stored) : {};
      state[pageSlug] = true;
      localStorage.setItem(storageKey, JSON.stringify(state));
      setHasShown(true);
      setShouldShow(false);
    } catch (err) {
      console.warn("Error saving UX feedback state:", err);
    }
  }, [pageSlug, getStorageKey]);

  // Dismiss without submitting (still marks as shown)
  const dismiss = useCallback(() => {
    markAsShown();
  }, [markAsShown]);

  return {
    shouldShow,
    hasShown,
    markAsShown,
    dismiss,
    pageSlug,
  };
}
