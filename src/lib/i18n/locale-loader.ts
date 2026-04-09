/**
 * locale-loader.ts
 *
 * Lazy-loading wrapper for i18n-iso-countries locale data.
 *
 * - English (en) is eager-loaded: 0 ms resolution, always available.
 * - All 77 other locales are lazy-loaded via dynamic import() and cached.
 *   They are absent from the critical-path bundle; Vite/Rollup emits each as
 *   a separate async chunk that is only fetched when the user requests it.
 *
 * Usage:
 *   import { getCountryName, loadLocale } from './locale-loader';
 *   const name = await getCountryName('US', 'de'); // "Vereinigte Staaten von Amerika"
 */

import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

// Eager-register English so synchronous fallbacks always work.
countries.registerLocale(enLocale);

/** Locales that have been fully registered with i18n-iso-countries. */
const registeredLocales = new Set<string>(['en']);

/** In-flight promises — prevents duplicate fetches for the same locale. */
const pendingLoads = new Map<string, Promise<void>>();

/**
 * Dynamically import and register a locale's JSON data.
 * Idempotent: safe to call multiple times for the same locale.
 *
 * @param locale  BCP-47-style locale code understood by i18n-iso-countries
 *                (e.g. "de", "zh", "pt").  The language subtag is used; the
 *                region subtag (if present) is stripped before lookup.
 * @returns       Promise that resolves when the locale is ready, or
 *                immediately if it was already registered.
 */
export async function loadLocale(locale: string): Promise<void> {
  // Normalise: strip region subtag ("zh-TW" → "zh") and lowercase.
  const lang = locale.split('-')[0].toLowerCase();

  if (registeredLocales.has(lang)) return;

  const existing = pendingLoads.get(lang);
  if (existing) return existing;

  const load = (async () => {
    try {
      const data = await dynamicLocaleImport(lang);
      if (data) {
        countries.registerLocale(data as Parameters<typeof countries.registerLocale>[0]);
        registeredLocales.add(lang);
      }
    } catch {
      // Unsupported locale — fail silently; callers fall back to English.
    } finally {
      pendingLoads.delete(lang);
    }
  })();

  pendingLoads.set(lang, load);
  return load;
}

/**
 * Return the localised name of a country by ISO 3166-1 alpha-2 code.
 *
 * Falls back to English if the requested locale hasn't been loaded yet.
 * For guaranteed localised output, await {@link loadLocale} first.
 *
 * @param alpha2  ISO 3166-1 alpha-2 country code (e.g. "US", "GB").
 * @param locale  Target locale (e.g. "de", "zh").  Defaults to "en".
 */
export function getCountryName(alpha2: string, locale = 'en'): string {
  const lang = locale.split('-')[0].toLowerCase();
  const name =
    countries.getName(alpha2, lang) ??
    countries.getName(alpha2, 'en') ??
    alpha2;
  return name;
}

/**
 * Convert an English country name (as stored in SafeMember.country) to its
 * ISO 3166-1 alpha-2 code using the English locale.
 *
 * @param englishName  English country name, e.g. "United Kingdom".
 * @returns            Alpha-2 code or undefined if not found.
 */
export function getAlpha2FromEnglishName(englishName: string): string | undefined {
  return countries.getAlpha2Code(englishName, 'en') ?? undefined;
}

/**
 * Detect the user's preferred language from the browser environment.
 * Returns the BCP-47 language subtag (e.g. "de", "zh", "en").
 * Safe to call in SSR / non-browser contexts — returns "en" as fallback.
 */
export function getPreferredLocale(): string {
  if (typeof navigator === 'undefined') return 'en';
  const raw =
    (navigator.languages?.[0]) ??
    navigator.language ??
    'en';
  return raw.split('-')[0].toLowerCase();
}

/**
 * Load the locale matching the user's browser preference, then return it.
 * Combines {@link getPreferredLocale} + {@link loadLocale} in one call.
 */
export async function loadPreferredLocale(): Promise<string> {
  const locale = getPreferredLocale();
  await loadLocale(locale);
  return locale;
}

// ---------------------------------------------------------------------------
// Dynamic import map — explicit static strings let Vite/Rollup split each
// locale into its own async chunk without runtime string interpolation that
// would force all 78 locale files into the main bundle.
// ---------------------------------------------------------------------------
async function dynamicLocaleImport(lang: string): Promise<unknown> {
  switch (lang) {
    case 'af': return (await import('i18n-iso-countries/langs/af.json')).default;
    case 'am': return (await import('i18n-iso-countries/langs/am.json')).default;
    case 'ar': return (await import('i18n-iso-countries/langs/ar.json')).default;
    case 'az': return (await import('i18n-iso-countries/langs/az.json')).default;
    case 'be': return (await import('i18n-iso-countries/langs/be.json')).default;
    case 'bg': return (await import('i18n-iso-countries/langs/bg.json')).default;
    case 'bn': return (await import('i18n-iso-countries/langs/bn.json')).default;
    case 'br': return (await import('i18n-iso-countries/langs/br.json')).default;
    case 'bs': return (await import('i18n-iso-countries/langs/bs.json')).default;
    case 'ca': return (await import('i18n-iso-countries/langs/ca.json')).default;
    case 'cs': return (await import('i18n-iso-countries/langs/cs.json')).default;
    case 'cy': return (await import('i18n-iso-countries/langs/cy.json')).default;
    case 'da': return (await import('i18n-iso-countries/langs/da.json')).default;
    case 'de': return (await import('i18n-iso-countries/langs/de.json')).default;
    case 'dv': return (await import('i18n-iso-countries/langs/dv.json')).default;
    case 'el': return (await import('i18n-iso-countries/langs/el.json')).default;
    case 'es': return (await import('i18n-iso-countries/langs/es.json')).default;
    case 'et': return (await import('i18n-iso-countries/langs/et.json')).default;
    case 'eu': return (await import('i18n-iso-countries/langs/eu.json')).default;
    case 'fa': return (await import('i18n-iso-countries/langs/fa.json')).default;
    case 'fi': return (await import('i18n-iso-countries/langs/fi.json')).default;
    case 'fr': return (await import('i18n-iso-countries/langs/fr.json')).default;
    case 'ga': return (await import('i18n-iso-countries/langs/ga.json')).default;
    case 'gl': return (await import('i18n-iso-countries/langs/gl.json')).default;
    case 'ha': return (await import('i18n-iso-countries/langs/ha.json')).default;
    case 'he': return (await import('i18n-iso-countries/langs/he.json')).default;
    case 'hi': return (await import('i18n-iso-countries/langs/hi.json')).default;
    case 'hr': return (await import('i18n-iso-countries/langs/hr.json')).default;
    case 'hu': return (await import('i18n-iso-countries/langs/hu.json')).default;
    case 'hy': return (await import('i18n-iso-countries/langs/hy.json')).default;
    case 'id': return (await import('i18n-iso-countries/langs/id.json')).default;
    case 'is': return (await import('i18n-iso-countries/langs/is.json')).default;
    case 'it': return (await import('i18n-iso-countries/langs/it.json')).default;
    case 'ja': return (await import('i18n-iso-countries/langs/ja.json')).default;
    case 'ka': return (await import('i18n-iso-countries/langs/ka.json')).default;
    case 'kk': return (await import('i18n-iso-countries/langs/kk.json')).default;
    case 'km': return (await import('i18n-iso-countries/langs/km.json')).default;
    case 'ko': return (await import('i18n-iso-countries/langs/ko.json')).default;
    case 'ku': return (await import('i18n-iso-countries/langs/ku.json')).default;
    case 'ky': return (await import('i18n-iso-countries/langs/ky.json')).default;
    case 'lt': return (await import('i18n-iso-countries/langs/lt.json')).default;
    case 'lv': return (await import('i18n-iso-countries/langs/lv.json')).default;
    case 'mk': return (await import('i18n-iso-countries/langs/mk.json')).default;
    case 'ml': return (await import('i18n-iso-countries/langs/ml.json')).default;
    case 'mn': return (await import('i18n-iso-countries/langs/mn.json')).default;
    case 'mr': return (await import('i18n-iso-countries/langs/mr.json')).default;
    case 'ms': return (await import('i18n-iso-countries/langs/ms.json')).default;
    case 'mt': return (await import('i18n-iso-countries/langs/mt.json')).default;
    case 'nb': return (await import('i18n-iso-countries/langs/nb.json')).default;
    case 'nl': return (await import('i18n-iso-countries/langs/nl.json')).default;
    case 'nn': return (await import('i18n-iso-countries/langs/nn.json')).default;
    case 'no': return (await import('i18n-iso-countries/langs/no.json')).default;
    case 'pl': return (await import('i18n-iso-countries/langs/pl.json')).default;
    case 'ps': return (await import('i18n-iso-countries/langs/ps.json')).default;
    case 'pt': return (await import('i18n-iso-countries/langs/pt.json')).default;
    case 'ro': return (await import('i18n-iso-countries/langs/ro.json')).default;
    case 'ru': return (await import('i18n-iso-countries/langs/ru.json')).default;
    case 'sd': return (await import('i18n-iso-countries/langs/sd.json')).default;
    case 'sk': return (await import('i18n-iso-countries/langs/sk.json')).default;
    case 'sl': return (await import('i18n-iso-countries/langs/sl.json')).default;
    case 'so': return (await import('i18n-iso-countries/langs/so.json')).default;
    case 'sq': return (await import('i18n-iso-countries/langs/sq.json')).default;
    case 'sr': return (await import('i18n-iso-countries/langs/sr.json')).default;
    case 'sv': return (await import('i18n-iso-countries/langs/sv.json')).default;
    case 'sw': return (await import('i18n-iso-countries/langs/sw.json')).default;
    case 'ta': return (await import('i18n-iso-countries/langs/ta.json')).default;
    case 'tg': return (await import('i18n-iso-countries/langs/tg.json')).default;
    case 'th': return (await import('i18n-iso-countries/langs/th.json')).default;
    case 'tk': return (await import('i18n-iso-countries/langs/tk.json')).default;
    case 'tr': return (await import('i18n-iso-countries/langs/tr.json')).default;
    case 'tt': return (await import('i18n-iso-countries/langs/tt.json')).default;
    case 'ug': return (await import('i18n-iso-countries/langs/ug.json')).default;
    case 'uk': return (await import('i18n-iso-countries/langs/uk.json')).default;
    case 'ur': return (await import('i18n-iso-countries/langs/ur.json')).default;
    case 'uz': return (await import('i18n-iso-countries/langs/uz.json')).default;
    case 'vi': return (await import('i18n-iso-countries/langs/vi.json')).default;
    case 'zh': return (await import('i18n-iso-countries/langs/zh.json')).default;
    // 'en' is eager-loaded above and never reaches this switch.
    default:   return null;
  }
}
