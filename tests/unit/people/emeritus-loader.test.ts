import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// emeritus-loader.ts reads document.documentElement.dataset.baseUrl at load.
// ---------------------------------------------------------------------------
const mockEmeritusData = [
  {
    handle: 'alice-emeritus',
    name: 'Alice Emeritus',
    removedDate: '2023-06-15',
    category: 'Kubestronaut',
  },
  {
    handle: 'bob-emeritus',
    name: 'Bob Emeritus',
    removedDate: '2022-01-10',
    category: ['Ambassadors', 'Kubestronaut'],
  },
  {
    // Entry without a handle — renders as a simple name row
    name: 'Carol No-Handle',
    category: 'Staff',
  },
];

function makeFetchMock(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  });
}

describe('initEmeritusLoader()', () => {
  beforeEach(() => {
    document.documentElement.dataset.baseUrl = '/cncf-darkmode';
    vi.resetModules();
    globalThis.fetch = makeFetchMock(mockEmeritusData) as unknown as typeof fetch;
    document.body.innerHTML = '<div id="emeritus-cards-feed"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    delete document.documentElement.dataset.baseUrl;
  });

  it('populates the emeritus feed', async () => {
    const { initEmeritusLoader } = await import('../../../src/lib/people/emeritus-loader');
    await initEmeritusLoader({});
    const feed = document.getElementById('emeritus-cards-feed')!;
    expect(feed.innerHTML.length).toBeGreaterThan(0);
  });

  it('renders a person-card for entries with handles', async () => {
    const { initEmeritusLoader } = await import('../../../src/lib/people/emeritus-loader');
    await initEmeritusLoader({});
    const feed = document.getElementById('emeritus-cards-feed')!;
    const cards = feed.querySelectorAll('.person-card');
    expect(cards.length).toBe(2); // alice-emeritus and bob-emeritus
  });

  it('renders a name-only row for entries without handle', async () => {
    const { initEmeritusLoader } = await import('../../../src/lib/people/emeritus-loader');
    await initEmeritusLoader({});
    const feed = document.getElementById('emeritus-cards-feed')!;
    expect(feed.innerHTML).toContain('emeritus-name-row');
    expect(feed.innerHTML).toContain('Carol No-Handle');
  });

  it('renders "Emeritus" type badge on cards', async () => {
    const { initEmeritusLoader } = await import('../../../src/lib/people/emeritus-loader');
    await initEmeritusLoader({});
    const feed = document.getElementById('emeritus-cards-feed')!;
    expect(feed.innerHTML).toContain('Emeritus');
  });

  it('uses GitHub avatar URL for emeritus entries', async () => {
    const { initEmeritusLoader } = await import('../../../src/lib/people/emeritus-loader');
    await initEmeritusLoader({});
    const feed = document.getElementById('emeritus-cards-feed')!;
    expect(feed.innerHTML).toContain('avatars.githubusercontent.com/alice-emeritus');
  });

  it('renders person names', async () => {
    const { initEmeritusLoader } = await import('../../../src/lib/people/emeritus-loader');
    await initEmeritusLoader({});
    const feed = document.getElementById('emeritus-cards-feed')!;
    expect(feed.innerHTML).toContain('Alice Emeritus');
    expect(feed.innerHTML).toContain('Bob Emeritus');
  });

  it('handles array category for entries', async () => {
    const { initEmeritusLoader } = await import('../../../src/lib/people/emeritus-loader');
    await initEmeritusLoader({});
    const feed = document.getElementById('emeritus-cards-feed')!;
    // Bob has ['Ambassadors', 'Kubestronaut'] categories - should be in the output
    expect(feed.innerHTML).toContain('Bob Emeritus');
  });

  it('does nothing when feed element is missing', async () => {
    document.body.innerHTML = '';
    const { initEmeritusLoader } = await import('../../../src/lib/people/emeritus-loader');
    await expect(initEmeritusLoader({})).resolves.toBeUndefined();
  });

  it('does not populate feed when fetch fails', async () => {
    globalThis.fetch = makeFetchMock(null, false) as unknown as typeof fetch;
    vi.resetModules();
    const { initEmeritusLoader } = await import('../../../src/lib/people/emeritus-loader');
    document.body.innerHTML = '<div id="emeritus-cards-feed"></div>';
    await initEmeritusLoader({});
    const feed = document.getElementById('emeritus-cards-feed')!;
    expect(feed.children.length).toBe(0);
  });

  it('is idempotent — does not load twice', async () => {
    const fetchMock = makeFetchMock(mockEmeritusData);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.resetModules();
    const { initEmeritusLoader } = await import('../../../src/lib/people/emeritus-loader');
    document.body.innerHTML = '<div id="emeritus-cards-feed"></div>';
    await initEmeritusLoader({});
    await initEmeritusLoader({});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('escapes XSS in name-only rows', async () => {
    const xssData = [{ name: '<script>alert("xss")</script>' }];
    globalThis.fetch = makeFetchMock(xssData) as unknown as typeof fetch;
    vi.resetModules();
    const { initEmeritusLoader } = await import('../../../src/lib/people/emeritus-loader');
    document.body.innerHTML = '<div id="emeritus-cards-feed"></div>';
    await initEmeritusLoader({});
    const feed = document.getElementById('emeritus-cards-feed')!;
    expect(feed.innerHTML).not.toContain('<script>alert');
    expect(feed.innerHTML).toContain('&lt;script&gt;');
  });
});
