import { useState, useCallback, useEffect } from "react";

interface TutorialState {
  /** Whether the tutorial is currently active */
  isActive: boolean;
  /** Current step index (0-based) */
  currentStep: number;
  /** Whether user has opted to never show again */
  neverShow: boolean;
}

interface UseTutorialReturn extends TutorialState {
  /** Start the tutorial from the beginning */
  startTutorial: () => void;
  /** Go to next step */
  nextStep: () => void;
  /** Go to previous step */
  prevStep: () => void;
  /** Skip/close the tutorial (can be restarted) */
  skipTutorial: () => void;
  /** Dismiss and never show again */
  neverShowAgain: () => void;
  /** Check if should show the "Start Tutorial" button */
  showStartButton: boolean;
  /** Total number of steps */
  totalSteps: number;
}

const STORAGE_KEY = "tutorial-never-show";
const TOTAL_STEPS = 3;

/**
 * Hook to manage the interactive tutorial state
 * Tutorial is opt-in only - never auto-launches
 */
export function useTutorial(): UseTutorialReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [neverShow, setNeverShow] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setNeverShow(true);
    }
  }, []);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Tutorial completed
      setIsActive(false);
      setCurrentStep(0);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
  }, []);

  const neverShowAgain = useCallback(() => {
    setNeverShow(true);
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  return {
    isActive,
    currentStep,
    neverShow,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    neverShowAgain,
    showStartButton: !neverShow,
    totalSteps: TOTAL_STEPS,
  };
}
