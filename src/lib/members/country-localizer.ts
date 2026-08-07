/**
 * country-localizer.ts
 *
 * Client-side module that localises country names on rendered member cards.
 *
 * After any batch of cards is rendered into the DOM, call
 * `localizeCountryNames()`.  It:
 *   1. On first call: detects user's preferred browser language, lazy-loads
 *      that locale's JSON chunk (async — not in critical path bundle).
 *   2. On all calls: walks `[data-country-alpha2]` spans in the DOM and
 *      updates their text content to the localised country name.
 *
 * English users see no extra network request (en is eager-loaded).
 * Non-English users fetch one JSON chunk (~6–9 KB) on the first call;
 * subsequent calls re-use the already-registered in-memory locale.
 *
 * The function is intentionally re-entrant: call it after every
 * `applyFilters()` / `renderCard()` batch to keep dynamically rendered
 * cards localised.
 */

import {
  loadPreferredLocale,
  getCountryName,
} from '../i18n/locale-loader';

/** Cached resolved locale — null until first successful load. */
let resolvedLocale: string | null = null;

/**
 * Localise all `[data-country-alpha2]` elements currently in the DOM.
 *
 * Safe to call multiple times — locale chunk is fetched at most once per
 * page load (locale-loader caches it internally).
 */
export async function localizeCountryNames(): Promise<void> {
  // Load (or reuse cached) preferred locale.
  if (resolvedLocale === null) {
    resolvedLocale = await loadPreferredLocale();
  }

  // English cards already display English names — nothing to do.
  if (resolvedLocale === 'en') return;

  applyLocaleToDOM(resolvedLocale);
}

/**
 * Apply localised country names to DOM nodes.
 *
 * Exported for unit tests which can call it synchronously after registering
 * a locale without needing a real browser environment.
 */
export function applyLocaleToDOM(locale: string): void {
  const nodes = document.querySelectorAll<HTMLElement>(
    '[data-country-alpha2]',
  );

  nodes.forEach((el) => {
    const alpha2 = el.dataset.countryAlpha2;
    if (!alpha2) return;
    const localised = getCountryName(alpha2, locale);
    // Only update if we got a real translation (not the fallback alpha2 code).
    if (localised && localised !== alpha2) {
      el.textContent = localised;
    }
  });
}

/** Reset cached locale (used in tests only). */
export function _resetForTest(): void {
  resolvedLocale = null;
}
