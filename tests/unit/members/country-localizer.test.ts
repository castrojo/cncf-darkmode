import { describe, it, expect, beforeEach } from 'vitest';
import { applyLocaleToDOM, _resetForTest } from '../../../src/lib/members/country-localizer';
import { loadLocale } from '../../../src/lib/i18n/locale-loader';

// Minimal DOM stub used across all tests.
function makeDOM(alpha2: string, textContent: string): HTMLElement {
  const el = document.createElement('span');
  el.setAttribute('data-country-alpha2', alpha2);
  el.textContent = textContent;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  // Reset cached locale between tests.
  _resetForTest();
  // Clear any DOM nodes added by previous tests.
  document.body.innerHTML = '';
});

describe('applyLocaleToDOM', () => {
  it('updates a single [data-country-alpha2] span', async () => {
    await loadLocale('de');
    const el = makeDOM('DE', 'Germany');
    applyLocaleToDOM('de');
    expect(el.textContent).toBe('Deutschland');
  });

  it('updates multiple spans in one pass', async () => {
    await loadLocale('de');
    const us = makeDOM('US', 'United States of America');
    const gb = makeDOM('GB', 'United Kingdom');
    applyLocaleToDOM('de');
    expect(us.textContent).toBe('Vereinigte Staaten von Amerika');
    expect(gb.textContent).toBe('Vereinigtes Königreich');
  });

  it('does not throw for unknown alpha2 code', async () => {
    await loadLocale('de');
    const el = makeDOM('ZZ', 'Unknown');
    // ZZ is not a valid alpha2 — textContent should remain unchanged
    expect(() => applyLocaleToDOM('de')).not.toThrow();
    // getCountryName returns 'ZZ' as fallback, which equals alpha2 → no update
    expect(el.textContent).toBe('Unknown');
  });

  it('does not update spans without data-country-alpha2 attribute', async () => {
    await loadLocale('de');
    const plain = document.createElement('span');
    plain.textContent = 'Not a country';
    document.body.appendChild(plain);
    applyLocaleToDOM('de');
    expect(plain.textContent).toBe('Not a country');
  });

  it('falls back gracefully when locale not yet loaded (English names stay)', () => {
    // English is always registered — calling applyLocaleToDOM('en') should no-op
    // (country-localizer bails early for 'en'); but testing applyLocaleToDOM directly:
    const el = makeDOM('GB', 'United Kingdom');
    // With 'en' locale the name equals the existing text — no mutation needed
    applyLocaleToDOM('en');
    expect(el.textContent).toBe('United Kingdom');
  });
});
