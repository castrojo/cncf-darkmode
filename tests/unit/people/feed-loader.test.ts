import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// feed-loader.ts reads import.meta.env.BASE_URL and uses document globals.
// We can test renderCard and the re-exported helpers (esc, dateHeader).

// ---------------------------------------------------------------------------
// IntersectionObserver mock class (jsdom doesn't provide this)
// ---------------------------------------------------------------------------
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  observe = vi.fn().mockImplementation((target: Element) => {
    // Immediately trigger intersection so appendBatch runs synchronously
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  });
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
}

// ---------------------------------------------------------------------------
// Test the re-exported pure functions: esc, dateHeader, renderCard
// ---------------------------------------------------------------------------
describe('feed-loader re-exports', () => {
  it('exports esc function', async () => {
    const { esc } = await import('../../../src/lib/people/feed-loader');
    expect(typeof esc).toBe('function');
    expect(esc('<b>test</b>')).toBe('&lt;b&gt;test&lt;/b&gt;');
  });

  it('exports dateHeader function', async () => {
    const { dateHeader } = await import('../../../src/lib/people/feed-loader');
    expect(typeof dateHeader).toBe('function');
    const result = dateHeader('2024-03-15T00:00:00Z');
    expect(result).toContain('March');
    expect(result).toContain('2024');
  });

  it('exports renderCard function', async () => {
    const { renderCard } = await import('../../../src/lib/people/feed-loader');
    expect(typeof renderCard).toBe('function');
  });
});

describe('renderCard()', () => {
  it('delegates to renderPersonCard — returns article HTML', async () => {
    const { renderCard } = await import('../../../src/lib/people/feed-loader');
    const event = {
      id: 'test-1',
      type: 'added',
      timestamp: '2024-06-01T12:00:00Z',
      person: {
        name: 'Test Person',
        handle: 'testperson',
        github: 'https://github.com/testperson',
        category: ['Kubestronaut'],
      },
    };
    const html = renderCard(event, {});
    expect(html).toMatch(/^<article/);
    expect(html).toContain('Test Person');
  });
});

// ---------------------------------------------------------------------------
// initFeedLoader() — DOM-interactive tests
// ---------------------------------------------------------------------------
describe('initFeedLoader()', () => {
  const mockChangelog = [
    {
      id: 'evt-0',
      type: 'added',
      timestamp: '2024-06-01T10:00:00Z',
      person: { name: 'Person Zero', handle: 'p0', category: ['Kubestronaut'] },
    },
    {
      id: 'evt-1',
      type: 'added',
      timestamp: '2024-06-01T11:00:00Z',
      person: { name: 'Person One', handle: 'p1', category: ['Ambassadors'] },
    },
    {
      id: 'evt-2',
      type: 'updated',
      timestamp: '2024-05-15T09:00:00Z',
      person: { name: 'Person Two', handle: 'p2', category: ['Staff'] },
    },
  ];

  beforeEach(() => {
    vi.resetModules();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockChangelog),
    }) as unknown as typeof fetch;

    // Set up IntersectionObserver mock (jsdom doesn't have it)
    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

    // CSS.escape mock for jsdom
    if (typeof globalThis.CSS === 'undefined' || !globalThis.CSS.escape) {
      (globalThis as any).CSS = { escape: (s: string) => s.replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^`{|}~]/g, '\\$&') };
    }

    document.body.innerHTML = '<div id="timeline-feed"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('does nothing when timeline-feed element is missing', async () => {
    document.body.innerHTML = '';
    const { initFeedLoader } = await import('../../../src/lib/people/feed-loader');
    await expect(initFeedLoader(0, {}, undefined)).resolves.toBeUndefined();
  });

  it('does nothing when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    vi.resetModules();
    const { initFeedLoader } = await import('../../../src/lib/people/feed-loader');
    document.body.innerHTML = '<div id="timeline-feed"></div>';
    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    await initFeedLoader(0, {}, undefined);
    const feed = document.getElementById('timeline-feed')!;
    // Only sentinel should be present, no person cards
    expect(feed.querySelectorAll('.person-card').length).toBe(0);
  });

  it('renders cards after loading (staticCount=0)', async () => {
    const { initFeedLoader } = await import('../../../src/lib/people/feed-loader');
    await initFeedLoader(0, {});
    const feed = document.getElementById('timeline-feed')!;
    expect(feed.querySelectorAll('.person-card').length).toBeGreaterThan(0);
  });

  it('skips already-rendered cards (staticCount=2)', async () => {
    const { initFeedLoader } = await import('../../../src/lib/people/feed-loader');
    await initFeedLoader(2, {});
    const feed = document.getElementById('timeline-feed')!;
    // Only 1 card should be rendered (the 3rd one, index 2)
    expect(feed.querySelectorAll('.person-card').length).toBe(1);
  });

  it('groups cards by date', async () => {
    const { initFeedLoader } = await import('../../../src/lib/people/feed-loader');
    await initFeedLoader(0, {});
    const feed = document.getElementById('timeline-feed')!;
    const groups = feed.querySelectorAll('.day-group');
    // Two different dates: 2024-06-01 and 2024-05-15
    expect(groups.length).toBe(2);
  });

  it('calls onBatchLoaded callback', async () => {
    const onBatch = vi.fn();
    const { initFeedLoader } = await import('../../../src/lib/people/feed-loader');
    await initFeedLoader(0, {}, onBatch);
    expect(onBatch).toHaveBeenCalled();
  });

  it('adds a sentinel element to the feed', async () => {
    const { initFeedLoader } = await import('../../../src/lib/people/feed-loader');
    await initFeedLoader(0, {});
    const feed = document.getElementById('timeline-feed')!;
    expect(feed.querySelector('#feed-sentinel')).toBeTruthy();
  });
});
