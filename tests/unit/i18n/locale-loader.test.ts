import { describe, it, expect } from 'vitest';
import {
  loadLocale,
  getCountryName,
  getAlpha2FromEnglishName,
  getPreferredLocale,
  loadPreferredLocale,
} from '../../../src/lib/i18n/locale-loader';

describe('locale-loader — eager English baseline', () => {
  it('getCountryName returns English name for "en" without awaiting loadLocale', () => {
    expect(getCountryName('US', 'en')).toBe('United States of America');
  });

  it('getCountryName returns English name by default (no locale arg)', () => {
    expect(getCountryName('DE')).toBe('Germany');
  });

  it('getCountryName returns English fallback for unregistered locale', () => {
    // 'xx' is not a real locale — should fall back to English
    expect(getCountryName('GB', 'xx')).toBe('United Kingdom');
  });

  it('getCountryName returns alpha2 code when country not found', () => {
    expect(getCountryName('ZZ', 'en')).toBe('ZZ');
  });
});

describe('locale-loader — getAlpha2FromEnglishName', () => {
  it('resolves "United States" → "US"', () => {
    expect(getAlpha2FromEnglishName('United States of America')).toBe('US');
  });

  it('resolves "Germany" → "DE"', () => {
    expect(getAlpha2FromEnglishName('Germany')).toBe('DE');
  });

  it('resolves "United Kingdom" → "GB"', () => {
    expect(getAlpha2FromEnglishName('United Kingdom')).toBe('GB');
  });

  it('resolves "Canada" → "CA"', () => {
    expect(getAlpha2FromEnglishName('Canada')).toBe('CA');
  });

  it('returns undefined for unknown name', () => {
    expect(getAlpha2FromEnglishName('Nonexistent Country')).toBeUndefined();
  });
});

describe('locale-loader — loadLocale lazy loading', () => {
  it('loadLocale("en") resolves immediately (already registered)', async () => {
    await expect(loadLocale('en')).resolves.toBeUndefined();
  });

  it('loadLocale("de") resolves and enables German names', async () => {
    await loadLocale('de');
    expect(getCountryName('DE', 'de')).toBe('Deutschland');
  });

  it('loadLocale("fr") resolves and enables French names', async () => {
    await loadLocale('fr');
    expect(getCountryName('FR', 'fr')).toBe('France');
  });

  it('loadLocale strips region subtag ("pt-BR" → "pt")', async () => {
    await loadLocale('pt-BR');
    // Portuguese should be loaded — Brazil in Portuguese
    expect(getCountryName('BR', 'pt')).toBe('Brasil');
  });

  it('loadLocale is idempotent — calling twice does not throw', async () => {
    await expect(loadLocale('de')).resolves.toBeUndefined();
    await expect(loadLocale('de')).resolves.toBeUndefined();
  });

  it('loadLocale with unsupported locale silently succeeds', async () => {
    await expect(loadLocale('xx')).resolves.toBeUndefined();
  });
});

describe('locale-loader — getPreferredLocale', () => {
  it('returns "en" in non-browser (SSR/Node) context', () => {
    // navigator is undefined in vitest/Node
    expect(getPreferredLocale()).toBe('en');
  });
});

describe('locale-loader — loadPreferredLocale', () => {
  it('resolves to "en" in Node context and returns a string', async () => {
    const locale = await loadPreferredLocale();
    expect(typeof locale).toBe('string');
    expect(locale).toBe('en');
  });
});
