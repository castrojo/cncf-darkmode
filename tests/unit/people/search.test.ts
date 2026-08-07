import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { searchPeople, preloadSearchIndex } from '../../../src/lib/people/search';

// ---------------------------------------------------------------------------
// Mock fetch for search index loading
// ---------------------------------------------------------------------------
const samplePeople = [
  {
    name: 'Alice Kubestronaut',
    handle: 'alicek',
    github: 'https://github.com/alicek',
    category: ['Kubestronaut'],
    company: 'Acme Cloud',
    location: 'Seattle, WA',
    bio: 'Kubernetes expert and cloud native advocate',
    contributions: 500,
    yearsContributing: 3,
  },
  {
    name: 'Bob Ambassador',
    handle: 'boba',
    github: 'https://github.com/boba',
    category: ['Ambassadors'],
    company: 'Beta Systems',
    location: 'Berlin, Germany',
    bio: 'CNCF Ambassador promoting open source',
  },
  {
    name: 'Carol TOC',
    handle: 'caroltoc',
    category: ['Technical Oversight Committee'],
    company: 'Gamma Tech',
    location: 'San Francisco, CA',
    bio: 'TOC member focused on project governance',
  },
  {
    name: 'Dave Staff',
    handle: 'davestaff',
    category: ['Staff'],
    company: 'CNCF',
    location: 'New York, NY',
  },
];

function makeFetchMock(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  });
}

describe('searchPeople()', () => {
  beforeEach(() => {
    // Reset module state between tests by resetting modules
    vi.resetModules();
    // Provide a default fetch mock
    globalThis.fetch = makeFetchMock(samplePeople) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array for empty query', async () => {
    const results = await searchPeople('', '/cncf-darkmode');
    expect(results).toEqual([]);
  });

  it('returns empty array for whitespace-only query', async () => {
    const results = await searchPeople('   ', '/cncf-darkmode');
    expect(results).toEqual([]);
  });

  it('finds results by name', async () => {
    const results = await searchPeople('Alice', '/cncf-darkmode');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Alice Kubestronaut');
  });

  it('finds results by handle', async () => {
    const results = await searchPeople('boba', '/cncf-darkmode');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.handle === 'boba')).toBe(true);
  });

  it('finds results by company', async () => {
    const results = await searchPeople('Acme Cloud', '/cncf-darkmode');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.name === 'Alice Kubestronaut')).toBe(true);
  });

  it('finds results by location', async () => {
    const results = await searchPeople('Berlin', '/cncf-darkmode');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.handle === 'boba')).toBe(true);
  });

  it('finds results by bio content', async () => {
    const results = await searchPeople('kubernetes', '/cncf-darkmode');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns results with score and terms fields', async () => {
    const results = await searchPeople('Alice', '/cncf-darkmode');
    expect(results.length).toBeGreaterThan(0);
    expect(typeof results[0].score).toBe('number');
    expect(Array.isArray(results[0].terms)).toBe(true);
  });

  it('returns results with category as array', async () => {
    const results = await searchPeople('Alice', '/cncf-darkmode');
    expect(results.length).toBeGreaterThan(0);
    expect(Array.isArray(results[0].category)).toBe(true);
  });

  it('respects the limit parameter', async () => {
    // Provide many results
    const manyPeople = Array.from({ length: 20 }, (_, i) => ({
      name: `Person ${i}`,
      handle: `person${i}`,
      category: ['Kubestronaut'],
      bio: 'cloud native person',
    }));
    globalThis.fetch = makeFetchMock(manyPeople) as unknown as typeof fetch;
    vi.resetModules();
    const { searchPeople: search2 } = await import('../../../src/lib/people/search');
    const results = await search2('person', '/cncf-darkmode', 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('does not crash on special regex characters in query', async () => {
    await expect(searchPeople('a[b](c)*', '/cncf-darkmode')).resolves.toBeDefined();
  });

  it('constructs fetch URL from baseUrl', async () => {
    const fetchMock = makeFetchMock(samplePeople);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.resetModules();
    const { searchPeople: search2 } = await import('../../../src/lib/people/search');
    await search2('Alice', 'https://example.com/base');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('people-index.json')
    );
  });

  it('returns empty array when fetch fails (HTTP error)', async () => {
    globalThis.fetch = makeFetchMock(null, false) as unknown as typeof fetch;
    vi.resetModules();
    const { searchPeople: search2 } = await import('../../../src/lib/people/search');
    const results = await search2('Alice', '/cncf-darkmode');
    expect(results).toEqual([]);
  });

  it('returns empty array when fetch throws network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;
    vi.resetModules();
    const { searchPeople: search2 } = await import('../../../src/lib/people/search');
    const results = await search2('Alice', '/cncf-darkmode');
    expect(results).toEqual([]);
  });
});

describe('preloadSearchIndex()', () => {
  it('does not throw', async () => {
    globalThis.fetch = makeFetchMock(samplePeople) as unknown as typeof fetch;
    vi.resetModules();
    const { preloadSearchIndex: preload } = await import('../../../src/lib/people/search');
    expect(() => preload('/cncf-darkmode')).not.toThrow();
  });

  it('calls fetch in background', async () => {
    const fetchMock = makeFetchMock(samplePeople);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.resetModules();
    const { preloadSearchIndex: preload } = await import('../../../src/lib/people/search');
    preload('/cncf-darkmode');
    // Give it a tick to initiate
    await new Promise(r => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalled();
  });
});
