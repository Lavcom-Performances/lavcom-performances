const ERROR_SELECTOR = '[data-slot="field-error"]';
const FOCUSABLE_SELECTOR = 'input, select, textarea, [role="combobox"]';

function isVisible(element: HTMLElement): boolean {
  return element.offsetParent !== null || element.getClientRects().length > 0;
}

/**
 * Scrolls to the first visible field error and focuses its related control.
 */
export function scrollToFirstError(root: ParentNode = document): void {
  if (typeof window === "undefined") return;

  const errors = Array.from(root.querySelectorAll<HTMLElement>(ERROR_SELECTOR));
  const firstError = errors.find(isVisible);
  if (!firstError) return;

  const prefersReducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  firstError.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "center",
  });

  const field = firstError.closest<HTMLElement>('[data-slot="field"]');
  const control = field?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  control?.focus({ preventScroll: true });
}
