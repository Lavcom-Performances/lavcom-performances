/**
 * TAEX-245: CSV Adapter Registry
 * 
 * Central registry for all CSV provider adapters.
 * Handles format detection and routing to the correct adapter.
 */

import { 
  CsvAdapter, 
  CsvProvider, 
  AdapterRegistry, 
  PROVIDER_DISPLAY_NAMES 
} from './types';
import { wilineAdapter } from './wilineAdapter';
import { lmControlAdapter } from './lmControlAdapter';
import { normalizeCsvText, detectSeparator, parseCsvLine } from '../normalizeCsvText';

/**
 * All registered adapters
 */
const ADAPTERS: CsvAdapter[] = [
  wilineAdapter,
  lmControlAdapter,
  // Future: ckSquareAdapter, electrocablageAdapter
];

/**
 * Adapter registry implementation
 */
class AdapterRegistryImpl implements AdapterRegistry {
  private adapters: CsvAdapter[] = ADAPTERS;
  
  getAdapters(): CsvAdapter[] {
    return [...this.adapters];
  }
  
  getAdapter(provider: CsvProvider): CsvAdapter | null {
    return this.adapters.find(a => a.provider === provider) || null;
  }
  
  detectAdapter(headers: string[], sampleRows?: string[][]): CsvAdapter | null {
    let bestAdapter: CsvAdapter | null = null;
    let bestConfidence = 0;
    
    for (const adapter of this.adapters) {
      const confidence = adapter.detectFormat(headers, sampleRows);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestAdapter = adapter;
      }
    }
    
    // Require minimum confidence threshold
    return bestConfidence >= 0.5 ? bestAdapter : null;
  }
  
  validateProviderMatch(
    headers: string[], 
    expectedProvider: CsvProvider
  ): { matches: boolean; detectedProvider: CsvProvider | null; confidence: number } {
    const expectedAdapter = this.getAdapter(expectedProvider);
    const detectedAdapter = this.detectAdapter(headers);
    
    if (!expectedAdapter) {
      return {
        matches: false,
        detectedProvider: detectedAdapter?.provider || null,
        confidence: 0,
      };
    }
    
    const expectedConfidence = expectedAdapter.detectFormat(headers);
    const detectedConfidence = detectedAdapter?.detectFormat(headers) || 0;
    
    return {
      matches: expectedProvider === detectedAdapter?.provider || expectedConfidence >= 0.7,
      detectedProvider: detectedAdapter?.provider || null,
      confidence: expectedConfidence,
    };
  }
}

/**
 * Singleton adapter registry
 */
export const adapterRegistry: AdapterRegistry = new AdapterRegistryImpl();

/**
 * Parse CSV headers from raw content
 */
export function parseHeadersFromContent(content: string): string[] {
  const normalized = normalizeCsvText(content);
  const separator = detectSeparator(normalized);
  const lines = normalized.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return [];
  
  // Find header line (skip preamble)
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toLowerCase().trim();
    if (!line || line === 'events') continue;
    
    const fields = parseCsvLine(lines[i], separator);
    // A header line typically has multiple fields with text
    if (fields.length >= 3 && fields.some(f => /[a-zA-Z]/.test(f))) {
      return fields;
    }
  }
  
  return parseCsvLine(lines[0], detectSeparator(normalized));
}

/**
 * Detect provider from CSV content
 */
export function detectProviderFromContent(content: string): CsvProvider | null {
  const headers = parseHeadersFromContent(content);
  const adapter = adapterRegistry.detectAdapter(headers);
  return adapter?.provider || null;
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: CsvProvider): string {
  return PROVIDER_DISPLAY_NAMES[provider] || provider;
}

/**
 * Validate CSV matches site's configured provider
 */
export function validateCsvForSite(
  content: string, 
  siteProvider: CsvProvider
): { 
  valid: boolean; 
  detectedProvider: CsvProvider | null; 
  errorMessage: string | null;
} {
  const headers = parseHeadersFromContent(content);
  const validation = adapterRegistry.validateProviderMatch(headers, siteProvider);
  
  if (validation.matches) {
    return {
      valid: true,
      detectedProvider: validation.detectedProvider,
      errorMessage: null,
    };
  }
  
  const detectedName = validation.detectedProvider 
    ? getProviderDisplayName(validation.detectedProvider)
    : 'inconnu';
  const expectedName = getProviderDisplayName(siteProvider);
  
  return {
    valid: false,
    detectedProvider: validation.detectedProvider,
    errorMessage: `Ce fichier CSV semble être au format ${detectedName}, mais votre laverie est configurée pour ${expectedName}. Veuillez vérifier le fichier.`,
  };
}

// Re-export types and adapters
export * from './types';
export { wilineAdapter } from './wilineAdapter';
export { lmControlAdapter } from './lmControlAdapter';
