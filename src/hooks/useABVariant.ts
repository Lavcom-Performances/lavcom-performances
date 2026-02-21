// src/hooks/useABVariant.ts
// Assigns a variant (A or B) once per session and keeps it stable across re-renders.
// Usage: const { variant, ctaLabel } = useABVariant('cta_button')

import { useState } from "react";

export type ABVariant = "A" | "B";

interface ABConfig {
  A: string;
  B: string;
}

const AB_TESTS: Record<string, ABConfig> = {
  cta_button: {
    A: "RECEVOIR MA SYNTHÈSE",
    B: "VOIR MES RECOMMANDATIONS",
  },
};

function assignVariant(testId: string): ABVariant {
  const key = `ab_${testId}`;
  try {
    const stored = sessionStorage.getItem(key) as ABVariant | null;
    if (stored === "A" || stored === "B") return stored;
    const assigned: ABVariant = Math.random() < 0.5 ? "A" : "B";
    sessionStorage.setItem(key, assigned);
    return assigned;
  } catch {
    // SSR or sessionStorage unavailable
    return Math.random() < 0.5 ? "A" : "B";
  }
}

export function useABVariant(testId: string): {
  variant: ABVariant;
  ctaLabel: string;
} {
  const [variant] = useState<ABVariant>(() => assignVariant(testId));
  const config = AB_TESTS[testId];
  const ctaLabel = config?.[variant] ?? config?.A ?? "";
  return { variant, ctaLabel };
}
