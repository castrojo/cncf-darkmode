import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// staff-loader.ts uses `document.documentElement.dataset.baseUrl` at module
// load time. We must set that up before importing.
// ---------------------------------------------------------------------------
function setupDocument(baseUrl = '/cncf-darkmode') {
  document.documentElement.dataset.baseUrl = baseUrl;
}

const mockStaffData = [
  {
    name: 'Zoe Staff',
    github: 'https://github.com/zoestaff',
    imageUrl: 'https://example.com/zoe.jpg',
    bio: 'CNCF staff member',
    pronouns: 'she/her',
    company: 'CNCF',
    location: 'San Francisco, CA',
    countryFlag: '🇺🇸',
    primaryBadge: 'Staff',
    linkedin: 'https://linkedin.com/in/zoe',
    twitter: 'https://twitter.com/zoestaff',
    youtube: undefined,
    website: 'https://zoe.dev',
    bluesky: undefined,
    mastodon: undefined,
    category: 'Staff',
  },
  {
    name: 'Alice Staff',
    github: 'https://github.com/alicestaff',
    imageUrl: 'https://example.com/alice.jpg',
    bio: 'Another CNCF staff member',
    company: 'CNCF',
    location: 'Remote',
    category: ['Staff'],
  },
  {
    // Entry without github handle
    name: 'Bob NoGithub',
    imageUrl: 'https://example.com/bob.jpg',
    company: 'CNCF',
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

describe('initStaffLoader()', () => {
  beforeEach(() => {
    setupDocument();
    vi.resetModules();
    globalThis.fetch = makeFetchMock(mockStaffData) as unknown as typeof fetch;
    // Set up DOM with the expected feed element
    document.body.innerHTML = '<div id="alpha-feed-staff"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    delete document.documentElement.dataset.baseUrl;
  });

  it('populates the staff feed with rendered cards', async () => {
    const { initStaffLoader } = await import('../../../src/lib/people/staff-loader');
    await initStaffLoader({});
    const feed = document.getElementById('alpha-feed-staff')!;
    expect(feed.children.length).toBeGreaterThan(0);
  });

  it('renders a card for each staff member', async () => {
    const { initStaffLoader } = await import('../../../src/lib/people/staff-loader');
    await initStaffLoader({});
    const feed = document.getElementById('alpha-feed-staff')!;
    // 3 entries: all have names, should all render
    expect(feed.querySelectorAll('.person-card').length).toBe(3);
  });

  it('sorts staff alphabetically by name', async () => {
    const { initStaffLoader } = await import('../../../src/lib/people/staff-loader');
    await initStaffLoader({});
    const feed = document.getElementById('alpha-feed-staff')!;
    const cards = feed.querySelectorAll<HTMLElement>('.person-card');
    // Alice should appear before Zoe
    const names = Array.from(cards).map(c => c.textContent ?? '');
    const aliceIdx = names.findIndex(n => n.includes('Alice'));
    const zoeIdx = names.findIndex(n => n.includes('Zoe'));
    expect(aliceIdx).toBeLessThan(zoeIdx);
  });

  it('extracts handle from github URL', async () => {
    const { initStaffLoader } = await import('../../../src/lib/people/staff-loader');
    await initStaffLoader({});
    const feed = document.getElementById('alpha-feed-staff')!;
    expect(feed.innerHTML).toContain('@alicestaff');
  });

  it('renders staff member name in card', async () => {
    const { initStaffLoader } = await import('../../../src/lib/people/staff-loader');
    await initStaffLoader({});
    const feed = document.getElementById('alpha-feed-staff')!;
    expect(feed.innerHTML).toContain('Zoe Staff');
    expect(feed.innerHTML).toContain('Alice Staff');
  });

  it('does nothing when feed element is missing', async () => {
    document.body.innerHTML = ''; // Remove the feed
    const { initStaffLoader } = await import('../../../src/lib/people/staff-loader');
    await expect(initStaffLoader({})).resolves.toBeUndefined();
  });

  it('does not populate feed when fetch fails', async () => {
    globalThis.fetch = makeFetchMock(null, false) as unknown as typeof fetch;
    vi.resetModules();
    const { initStaffLoader } = await import('../../../src/lib/people/staff-loader');
    document.body.innerHTML = '<div id="alpha-feed-staff"></div>';
    await initStaffLoader({});
    const feed = document.getElementById('alpha-feed-staff')!;
    expect(feed.children.length).toBe(0);
  });

  it('does not call fetch twice on repeated calls (idempotent after loading)', async () => {
    const fetchMock = makeFetchMock(mockStaffData);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.resetModules();
    const { initStaffLoader } = await import('../../../src/lib/people/staff-loader');
    await initStaffLoader({});
    await initStaffLoader({}); // second call should be a no-op
    // Fetch should only be called once
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('handles staff with array category', async () => {
    const { initStaffLoader } = await import('../../../src/lib/people/staff-loader');
    await initStaffLoader({});
    const feed = document.getElementById('alpha-feed-staff')!;
    // Alice Staff has category: ['Staff'] - should render
    expect(feed.innerHTML).toContain('Alice Staff');
  });

  it('handles staff member without github (uses name-based id)', async () => {
    const { initStaffLoader } = await import('../../../src/lib/people/staff-loader');
    await initStaffLoader({});
    const feed = document.getElementById('alpha-feed-staff')!;
    expect(feed.innerHTML).toContain('Bob NoGithub');
  });
});
