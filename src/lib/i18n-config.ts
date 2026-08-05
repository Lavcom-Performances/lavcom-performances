import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import FR translations
import frCommon from '@/locales/fr/common.json';
import frLanding from '@/locales/fr/landing.json';
import frApp from '@/locales/fr/app.json';
import frErrors from '@/locales/fr/errors.json';
import frPaidSimulator from '@/locales/fr/paid-simulator.json';

// Import EN translations
import enCommon from '@/locales/en/common.json';
import enLanding from '@/locales/en/landing.json';
import enApp from '@/locales/en/app.json';
import enErrors from '@/locales/en/errors.json';

// Import ES translations (skeleton with FR fallback)
import esCommon from '@/locales/es/common.json';
import esLanding from '@/locales/es/landing.json';
import esApp from '@/locales/es/app.json';
import esErrors from '@/locales/es/errors.json';

// Import IT translations (skeleton with FR fallback)
import itCommon from '@/locales/it/common.json';
import itLanding from '@/locales/it/landing.json';
import itApp from '@/locales/it/app.json';
import itErrors from '@/locales/it/errors.json';

// Import DE translations (skeleton with FR fallback)
import deCommon from '@/locales/de/common.json';
import deLanding from '@/locales/de/landing.json';
import deApp from '@/locales/de/app.json';
import deErrors from '@/locales/de/errors.json';

// Import NL translations (skeleton with FR fallback)
import nlCommon from '@/locales/nl/common.json';
import nlLanding from '@/locales/nl/landing.json';
import nlApp from '@/locales/nl/app.json';
import nlErrors from '@/locales/nl/errors.json';

export const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'it', 'de', 'nl'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  de: 'Deutsch',
  nl: 'Nederlands',
};

export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  it: '🇮🇹',
  de: '🇩🇪',
  nl: '🇳🇱',
};

const resources = {
  fr: {
    common: frCommon,
    landing: frLanding,
    app: frApp,
    errors: frErrors,
  },
  en: {
    common: enCommon,
    landing: enLanding,
    app: enApp,
    errors: enErrors,
  },
  es: {
    common: esCommon,
    landing: esLanding,
    app: esApp,
    errors: esErrors,
  },
  it: {
    common: itCommon,
    landing: itLanding,
    app: itApp,
    errors: itErrors,
  },
  de: {
    common: deCommon,
    landing: deLanding,
    app: deApp,
    errors: deErrors,
  },
  nl: {
    common: nlCommon,
    landing: nlLanding,
    app: nlApp,
    errors: nlErrors,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    defaultNS: 'common',
    ns: ['common', 'landing', 'app', 'errors'],
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'lavcom_locale',
      caches: ['localStorage'],
    },
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },

    // Debug in development only
    debug: import.meta.env.DEV,
  });

export default i18n;
