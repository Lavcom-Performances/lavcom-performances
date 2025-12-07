/**
 * Utility functions for text formatting and normalization
 * Ensures consistent formatting across the application for data extraction
 */

/**
 * Capitalizes the first letter of a string
 * @param text - The input string
 * @returns The string with the first letter capitalized
 */
export function capitalizeFirst(text: string): string {
  if (!text || text.length === 0) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Capitalizes the first letter of each sentence in a string
 * Handles multiple sentences separated by . ! ? 
 * @param text - The input string
 * @returns The string with each sentence capitalized
 */
export function capitalizeSentences(text: string): string {
  if (!text || text.length === 0) return text;
  
  return text.replace(/(^|[.!?]\s+)([a-zàâäéèêëïîôùûüÿœæç])/gi, (match, separator, letter) => {
    return separator + letter.toUpperCase();
  }).replace(/^[a-zàâäéèêëïîôùûüÿœæç]/, (letter) => letter.toUpperCase());
}

/**
 * Trims whitespace and normalizes the text
 * @param text - The input string
 * @returns The normalized string
 */
export function normalizeText(text: string): string {
  if (!text) return text;
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Combines normalization and capitalization for form fields
 * @param text - The input string
 * @returns The formatted string ready for storage
 */
export function formatUserInput(text: string): string {
  if (!text) return text;
  return capitalizeFirst(normalizeText(text));
}
