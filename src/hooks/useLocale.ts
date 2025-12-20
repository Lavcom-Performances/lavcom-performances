import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { SUPPORTED_LOCALES, SupportedLocale, LOCALE_NAMES, LOCALE_FLAGS } from '@/lib/i18n-config';

const LOCALE_STORAGE_KEY = 'lavcom_locale';

/**
 * Hook to manage locale state and switching
 * Uses localStorage for persistence (BDD integration deferred to TAEX-100)
 */
export function useLocale() {
  const { i18n } = useTranslation();

  const locale = (i18n.language?.substring(0, 2) || 'fr') as SupportedLocale;
  
  // Validate locale is supported, fallback to 'fr' if not
  const validLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'fr';

  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) {
      console.warn(`[i18n] Unsupported locale: ${newLocale}, falling back to 'fr'`);
      newLocale = 'fr';
    }

    // Persist to localStorage
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);

    // Change language
    await i18n.changeLanguage(newLocale);

    // Log for dev diagnostics
    if (import.meta.env.DEV) {
      console.log(`[i18n] Locale changed to: ${newLocale}`);
    }
  }, [i18n]);

  return {
    locale: validLocale,
    setLocale,
    supportedLocales: SUPPORTED_LOCALES,
    localeNames: LOCALE_NAMES,
    localeFlags: LOCALE_FLAGS,
  };
}
