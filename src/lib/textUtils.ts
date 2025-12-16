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

/**
 * Formats a last name to UPPERCASE
 * TAEX-066 - Harmonisation des noms
 * @param lastName - The last name input
 * @returns The last name in uppercase
 */
export function formatLastName(text: string): string {
  if (!text) return text;
  return normalizeText(text).toUpperCase();
}

/**
 * Formats a first name with first letter capitalized
 * TAEX-066 - Harmonisation des prénoms
 * Preserves accented characters
 * @param firstName - The first name input
 * @returns The first name properly capitalized
 */
export function formatFirstName(text: string): string {
  if (!text) return text;
  const normalized = normalizeText(text).toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Formats a phone number with French country code
 * TAEX-067 - Harmonisation des numéros de téléphone
 * @param phone - The phone number input
 * @returns The phone number in international format (+33...)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If already has international prefix, keep it
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2);
  }
  
  // French number starting with 0
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+33' + cleaned.slice(1);
  }
  
  // If it's 9 digits (without leading 0), assume French
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    return '+33' + cleaned;
  }
  
  return cleaned;
}

/**
 * Formats a phone number for display (readable format)
 * TAEX-067 - Affichage lisible
 * @param phone - The phone number in storage format
 * @returns The phone number in readable format
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return phone;
  
  // Handle French numbers
  if (phone.startsWith('+33')) {
    const digits = phone.slice(3);
    if (digits.length === 9) {
      return `+33 ${digits.charAt(0)} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
    }
  }
  
  // For other formats, just add spaces every 2 digits after country code
  if (phone.startsWith('+')) {
    const countryCode = phone.match(/^\+\d{1,3}/)?.[0] || '';
    const rest = phone.slice(countryCode.length);
    const formatted = rest.match(/.{1,2}/g)?.join(' ') || rest;
    return `${countryCode} ${formatted}`;
  }
  
  return phone;
}

/**
 * Validates a SIRET number format (14 digits)
 * @param siret - The SIRET number to validate
 * @returns boolean indicating if the format is valid
 */
export function isValidSiret(siret: string): boolean {
  if (!siret) return false;
  const cleaned = siret.replace(/\s/g, '');
  return /^\d{14}$/.test(cleaned);
}

/**
 * Formats a SIRET for display (with spaces)
 * @param siret - The SIRET number
 * @returns Formatted SIRET (XXX XXX XXX XXXXX)
 */
export function formatSiretDisplay(siret: string): string {
  if (!siret) return siret;
  const cleaned = siret.replace(/\s/g, '');
  if (cleaned.length !== 14) return siret;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9, 14)}`;
}
