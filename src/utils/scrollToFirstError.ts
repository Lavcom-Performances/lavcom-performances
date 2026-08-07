/** CSS selector for error message elements (ShadCN field errors). */
const ERROR_SELECTOR = '[data-slot="field-error"]';
/** CSS selector for focusable form control elements. */
const FOCUSABLE_SELECTOR = 'input, select, textarea, [role="combobox"]';

/**
 * Checks if an HTML element is visible in the DOM.
 * An element is considered visible if it has a layout (offsetParent) or renders content (client rects).
 *
 * @param element - The HTML element to check for visibility.
 * @returns true if the element is visible, false otherwise.
 */
function isVisible(element: HTMLElement): boolean {
  return element.offsetParent !== null || element.getClientRects().length > 0;
}

/**
 * Scrolls to the first visible error message in the form and focuses the associated input.
 * Respects the user's reduced motion preference for the scroll behavior.
 *
 * @param root - The root node to search for errors. Defaults to the entire document.
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
