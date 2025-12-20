import { useCallback } from 'react';
import { useLocale } from './useLocale';

/**
 * Localized formatting helpers for currency, numbers, and dates
 * Uses Intl APIs with EUR currency (business France/Europe)
 */
export function useFormatters() {
  const { locale } = useLocale();

  /**
   * Format a number as EUR currency according to locale conventions
   * e.g. FR: 1 234,56 € | EN: €1,234.56 | DE: 1.234,56 €
   */
  const formatCurrencyEUR = useCallback((value: number): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, [locale]);

  /**
   * Format a number with locale-specific thousand separators
   * e.g. FR: 1 234,56 | EN: 1,234.56 | DE: 1.234,56
   */
  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    }).format(value);
  }, [locale]);

  /**
   * Format a date according to locale conventions
   * @param date - Date object or ISO string
   * @param format - 'short' | 'medium' | 'long' | 'full'
   */
  const formatDate = useCallback((
    date: Date | string,
    format: 'short' | 'medium' | 'long' | 'full' = 'medium'
  ): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      medium: { day: 'numeric', month: 'short', year: 'numeric' },
      long: { day: 'numeric', month: 'long', year: 'numeric' },
      full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    };
    const options = optionsMap[format];

    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  }, [locale]);

  /**
   * Format a date and time according to locale conventions
   */
  const formatDateTime = useCallback((
    date: Date | string,
    includeSeconds = false
  ): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds && { second: '2-digit' }),
    }).format(dateObj);
  }, [locale]);

  /**
   * Format a percentage with locale-specific formatting
   */
  const formatPercent = useCallback((value: number, decimals = 1): string => {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  }, [locale]);

  return {
    formatCurrencyEUR,
    formatNumber,
    formatDate,
    formatDateTime,
    formatPercent,
  };
}

/**
 * Standalone formatters for use outside React components
 * These use the stored locale from localStorage
 */
export function getStoredLocale(): string {
  return localStorage.getItem('lavcom_locale') || 'fr';
}

export function formatCurrencyEURStandalone(value: number): string {
  const locale = getStoredLocale();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumberStandalone(value: number): string {
  const locale = getStoredLocale();
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateStandalone(date: Date | string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const locale = getStoredLocale();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
  };
  const options = optionsMap[format];

  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}
