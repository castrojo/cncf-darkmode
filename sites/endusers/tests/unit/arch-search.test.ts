import { describe, it, expect, beforeEach } from 'vitest';
import { initArchSearch, searchArchSlugs, resetArchSearch } from '../../src/lib/arch-search';

/**
 * Helper — build minimal .arch-card DOM elements for search tests.
 * jsdom is the test environment (vitest.config.ts: environment: 'jsdom').
 */
function seedDom(cards: Array<{ slug: string; searchText: string }>): void {
  document.body.innerHTML = cards
    .map(c => `<article class="arch-card" data-slug="${c.slug}" data-search-text="${c.searchText}"></article>`)
    .join('\n');
}

const FIXTURES = [
  { slug: 'adobe',   searchText: 'Adobe Scaling Service Delivery cell-based kubernetes Platform Engineering' },
  { slug: 'allianz', searchText: 'Allianz Cloud Native Insurance Financial Services' },
  { slug: 'spotify', searchText: 'Spotify Backstage Internal Developer Portal CI/CD' },
];

beforeEach(() => {
  resetArchSearch();
  seedDom(FIXTURES);
});

describe('initArchSearch + searchArchSlugs', () => {
  it('returns null for empty query (show all)', () => {
    expect(searchArchSlugs('')).toBeNull();
    expect(searchArchSlugs('   ')).toBeNull();
  });

  it('returns matching slug for exact term', () => {
    const result = searchArchSlugs('Adobe');
    expect(result).not.toBeNull();
    expect(result!.has('adobe')).toBe(true);
    expect(result!.has('allianz')).toBe(false);
  });

  it('returns matching slug for prefix query', () => {
    const result = searchArchSlugs('Allia');
    expect(result).not.toBeNull();
    expect(result!.has('allianz')).toBe(true);
  });

  it('returns matching slug for fuzzy query (one-char typo)', () => {
    // 'Spotfy' → should match 'Spotify' via fuzzy=0.2
    const result = searchArchSlugs('Spotfy');
    expect(result).not.toBeNull();
    expect(result!.has('spotify')).toBe(true);
  });

  it('returns empty set for no match', () => {
    const result = searchArchSlugs('zzznomatch');
    expect(result).not.toBeNull();
    expect(result!.size).toBe(0);
  });

  it('is case-insensitive', () => {
    const result = searchArchSlugs('insurance');
    expect(result).not.toBeNull();
    expect(result!.has('allianz')).toBe(true);
  });

  it('matches across multiple cards', () => {
    // 'CI/CD' appears in spotify fixture
    const result = searchArchSlugs('CI/CD');
    expect(result).not.toBeNull();
    expect(result!.has('spotify')).toBe(true);
  });

  it('initArchSearch is idempotent — calling twice does not throw', () => {
    initArchSearch();
    expect(() => initArchSearch()).not.toThrow();
  });

  it('resetArchSearch clears index so re-init picks up new DOM', () => {
    // Prime the index with current DOM
    searchArchSlugs('Adobe');

    // Swap DOM and reset
    resetArchSearch();
    seedDom([{ slug: 'neworg', searchText: 'NewOrg Platform' }]);

    const result = searchArchSlugs('NewOrg');
    expect(result).not.toBeNull();
    expect(result!.has('neworg')).toBe(true);
    // Old entry no longer in index
    expect(result!.has('adobe')).toBe(false);
  });
});
