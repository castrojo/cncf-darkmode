import { describe, it, expect } from 'vitest';
import {
  resolveLogoUrl,
  renderMaintainerCard,
} from '../../../src/lib/people/maintainer-loader';

// ---------------------------------------------------------------------------
// resolveLogoUrl()
// ---------------------------------------------------------------------------
describe('resolveLogoUrl()', () => {
  const logos = {
    kubernetes: 'https://example.com/k8s.svg',
    prometheus: 'https://example.com/prometheus.svg',
    'open telemetry': 'https://example.com/otel.svg',
    fluentd: 'https://example.com/fluentd.svg',
  };

  it('returns URL for exact match', () => {
    expect(resolveLogoUrl('kubernetes', logos)).toBe('https://example.com/k8s.svg');
  });

  it('matches case-insensitively (lowercases input)', () => {
    expect(resolveLogoUrl('Kubernetes', logos)).toBe('https://example.com/k8s.svg');
    expect(resolveLogoUrl('PROMETHEUS', logos)).toBe('https://example.com/prometheus.svg');
  });

  it('strips colon and suffix for partial match', () => {
    // e.g. "Kubernetes: Core" → "kubernetes"
    const extendedLogos = { ...logos, 'kubernetes': 'https://example.com/k8s.svg' };
    expect(resolveLogoUrl('Kubernetes: Core', extendedLogos)).toBe('https://example.com/k8s.svg');
  });

  it('strips parenthetical suffix for partial match', () => {
    // e.g. "Fluentd (stable)" → "fluentd"
    expect(resolveLogoUrl('Fluentd (stable)', logos)).toBe('https://example.com/fluentd.svg');
  });

  it('matches by progressive word-prefix truncation', () => {
    // "open telemetry" is in logos; "Open Telemetry Extra" should match "open telemetry"
    expect(resolveLogoUrl('Open Telemetry Extra', logos)).toBe('https://example.com/otel.svg');
  });

  it('returns empty string when no match found', () => {
    expect(resolveLogoUrl('unknownproject', logos)).toBe('');
  });

  it('returns empty string for empty project name', () => {
    expect(resolveLogoUrl('', logos)).toBe('');
  });

  it('returns empty string for empty logos map', () => {
    expect(resolveLogoUrl('kubernetes', {})).toBe('');
  });
});

// ---------------------------------------------------------------------------
// renderMaintainerCard()
// ---------------------------------------------------------------------------

interface SafeMaintainer {
  name: string;
  handle: string;
  avatarUrl?: string;
  company?: string;
  location?: string;
  countryFlag?: string;
  bio?: string;
  projects: string[];
  projectDetails?: { name: string; maturity: string }[];
  maturity: string;
  ownersUrl?: string;
  logoUrl?: string;
  yearsContributing?: number;
}

function makeMaintainer(overrides: Partial<SafeMaintainer> = {}): SafeMaintainer {
  return {
    name: 'Alice Maintainer',
    handle: 'alicemaint',
    projects: ['Kubernetes'],
    maturity: 'Graduated',
    ...overrides,
  };
}

describe('renderMaintainerCard()', () => {
  it('returns an article element', () => {
    const html = renderMaintainerCard(makeMaintainer(), {});
    expect(html).toMatch(/^<article/);
    expect(html).toContain('</article>');
  });

  it('includes maintainer name', () => {
    const html = renderMaintainerCard(makeMaintainer(), {});
    expect(html).toContain('Alice Maintainer');
  });

  it('includes maintainer handle', () => {
    const html = renderMaintainerCard(makeMaintainer(), {});
    expect(html).toContain('@alicemaint');
  });

  it('includes GitHub profile link', () => {
    const html = renderMaintainerCard(makeMaintainer(), {});
    expect(html).toContain('https://github.com/alicemaint');
  });

  it('includes Maintainer badge', () => {
    const html = renderMaintainerCard(makeMaintainer(), {});
    expect(html).toContain('Maintainer');
  });

  it('renders project chip for each project', () => {
    const html = renderMaintainerCard(
      makeMaintainer({ projects: ['Kubernetes', 'Prometheus'] }),
      {}
    );
    expect(html).toContain('Kubernetes');
    expect(html).toContain('Prometheus');
    expect(html).toContain('project-chip');
  });

  it('uses projectDetails maturity per chip if provided', () => {
    const html = renderMaintainerCard(
      makeMaintainer({
        projects: ['Kubernetes', 'Sandbox-project'],
        projectDetails: [
          { name: 'Kubernetes', maturity: 'Graduated' },
          { name: 'Sandbox-project', maturity: 'Sandbox' },
        ],
      }),
      {}
    );
    expect(html).toContain('Sandbox-project');
    expect(html).toContain('Kubernetes');
  });

  it('renders "Since YEAR (Xy)" stats row when yearsContributing > 0', () => {
    const currentYear = new Date().getFullYear();
    const html = renderMaintainerCard(makeMaintainer({ yearsContributing: 4 }), {});
    expect(html).toContain(`Since ${currentYear - 4}`);
    expect(html).toContain('(4y)');
  });

  it('omits stats row when yearsContributing is 0', () => {
    const html = renderMaintainerCard(makeMaintainer({ yearsContributing: 0 }), {});
    expect(html).not.toContain('stats-row');
  });

  it('omits stats row when yearsContributing is undefined', () => {
    const html = renderMaintainerCard(makeMaintainer({ yearsContributing: undefined }), {});
    expect(html).not.toContain('stats-row');
  });

  it('renders company chip when company is provided', () => {
    const html = renderMaintainerCard(makeMaintainer({ company: 'CNCF Inc' }), {});
    expect(html).toContain('CNCF Inc');
    expect(html).toContain('company-chip');
  });

  it('omits company chip when company is missing', () => {
    const html = renderMaintainerCard(makeMaintainer({ company: undefined }), {});
    expect(html).not.toContain('company-chip');
  });

  it('renders bio when provided', () => {
    const html = renderMaintainerCard(makeMaintainer({ bio: 'Kubernetes core contributor' }), {});
    expect(html).toContain('Kubernetes core contributor');
  });

  it('omits bio when missing', () => {
    const html = renderMaintainerCard(makeMaintainer({ bio: undefined }), {});
    expect(html).not.toContain('class="bio"');
  });

  it('renders location and country flag', () => {
    const html = renderMaintainerCard(
      makeMaintainer({ location: 'Seattle, WA', countryFlag: '🇺🇸' }),
      {}
    );
    expect(html).toContain('Seattle, WA');
    expect(html).toContain('🇺🇸');
  });

  it('escapes XSS in name', () => {
    const html = renderMaintainerCard(
      makeMaintainer({ name: '<script>xss</script>', handle: 'safe-handle' }),
      {}
    );
    expect(html).not.toContain('<script>xss</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes XSS in handle', () => {
    const html = renderMaintainerCard(
      makeMaintainer({ handle: '"evil"' }),
      {}
    );
    expect(html).toContain('&quot;evil&quot;');
  });

  it('escapes XSS in company', () => {
    const html = renderMaintainerCard(
      makeMaintainer({ company: '<Evil Corp>' }),
      {}
    );
    expect(html).not.toContain('<Evil Corp>');
    expect(html).toContain('&lt;Evil Corp&gt;');
  });

  it('escapes XSS in project name', () => {
    const html = renderMaintainerCard(
      makeMaintainer({ projects: ['<script>bad</script>'] }),
      {}
    );
    expect(html).not.toContain('<script>bad</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders logo img when logoUrl is provided', () => {
    const html = renderMaintainerCard(
      makeMaintainer({ logoUrl: 'https://example.com/logo.svg' }),
      {}
    );
    expect(html).toContain('program-logo');
    expect(html).toContain('https://example.com/logo.svg');
  });

  it('uses landscape logo for project chip', () => {
    const logos = { kubernetes: 'https://example.com/k8s.svg' };
    const html = renderMaintainerCard(makeMaintainer({ projects: ['Kubernetes'] }), logos);
    expect(html).toContain('https://example.com/k8s.svg');
  });

  it('applies Graduated maturity accent color', () => {
    const html = renderMaintainerCard(makeMaintainer({ maturity: 'Graduated' }), {});
    expect(html).toContain('#996600');
  });

  it('applies Incubating maturity accent color', () => {
    const html = renderMaintainerCard(makeMaintainer({ maturity: 'Incubating' }), {});
    expect(html).toContain('#0060CC');
  });

  it('applies Sandbox maturity accent color', () => {
    const html = renderMaintainerCard(makeMaintainer({ maturity: 'Sandbox' }), {});
    expect(html).toContain('#57606a');
  });

  it('uses fallback accent color for unknown maturity', () => {
    const html = renderMaintainerCard(makeMaintainer({ maturity: 'Unknown' }), {});
    expect(html).toContain('#8b949e');
  });

  it('uses avatar URL when provided', () => {
    const html = renderMaintainerCard(
      makeMaintainer({ avatarUrl: 'https://example.com/avatar.png' }),
      {}
    );
    expect(html).toContain('https://example.com/avatar.png');
  });

  it('falls back to GitHub avatar when avatarUrl is missing', () => {
    const html = renderMaintainerCard(
      makeMaintainer({ handle: 'testuser', avatarUrl: undefined }),
      {}
    );
    expect(html).toContain('avatars.githubusercontent.com/testuser');
  });
});

// ---------------------------------------------------------------------------
// initMaintainerLoader() — async DOM integration
// ---------------------------------------------------------------------------

import { describe as describeInit, it as itInit, expect as expectInit, vi as viInit, beforeEach as beforeEachInit, afterEach as afterEachInit } from 'vitest';

const mockMaintainers: SafeMaintainer[] = [
  {
    name: 'Carol Maintainer',
    handle: 'carolmaint',
    projects: ['Kubernetes'],
    maturity: 'Graduated',
    company: 'CNCF',
    location: 'Berlin',
    yearsContributing: 3,
  },
  {
    name: 'Dave Maintainer',
    handle: 'davemaint',
    projects: ['Prometheus'],
    maturity: 'Graduated',
  },
];

function makeMockFetch(maintainers: unknown, ok = true, logosOk = true) {
  return viInit.fn().mockImplementation((url: string) => {
    if (String(url).includes('maintainers.json')) {
      return Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(maintainers) });
    }
    if (String(url).includes('landscape_logos.json') || String(url).includes('logos.json')) {
      return Promise.resolve({ ok: logosOk, status: logosOk ? 200 : 500, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  });
}

// Mock IntersectionObserver (not available in jsdom) — must be a real constructor
const observeMock = viInit.fn();
const disconnectMock = viInit.fn();
class MockIntersectionObserver {
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe = observeMock;
  disconnect = disconnectMock;
  unobserve = viInit.fn();
}

describeInit('initMaintainerLoader()', () => {
  beforeEachInit(() => {
    viInit.resetModules();
    document.body.innerHTML = '<div id="maintainer-feed"></div>';
    document.documentElement.dataset.baseUrl = '/cncf-darkmode';
    globalThis.fetch = makeMockFetch(mockMaintainers) as unknown as typeof fetch;
    (globalThis as any).IntersectionObserver = MockIntersectionObserver;
    observeMock.mockClear();
    disconnectMock.mockClear();
  });

  afterEachInit(() => {
    viInit.restoreAllMocks();
    document.body.innerHTML = '';
    delete document.documentElement.dataset.baseUrl;
  });

  itInit('does nothing when maintainer-feed element is missing', async () => {
    document.body.innerHTML = '';
    viInit.resetModules();
    const { initMaintainerLoader } = await import('../../../src/lib/people/maintainer-loader');
    await expectInit(initMaintainerLoader(0)).resolves.toBeUndefined();
  });

  itInit('creates sentinel element in feed', async () => {
    const { initMaintainerLoader } = await import('../../../src/lib/people/maintainer-loader');
    await initMaintainerLoader(0);
    expectInit(document.getElementById('maintainer-sentinel')).toBeTruthy();
  });

  itInit('calls fetch for maintainers.json', async () => {
    const fetchMock = makeMockFetch(mockMaintainers);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { initMaintainerLoader } = await import('../../../src/lib/people/maintainer-loader');
    await initMaintainerLoader(0);
    expectInit(fetchMock).toHaveBeenCalledWith(expectInit.stringContaining('maintainers.json'));
  });

  itInit('also fetches landscape_logos when preloadedLogos is not provided', async () => {
    const fetchMock = makeMockFetch(mockMaintainers);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { initMaintainerLoader } = await import('../../../src/lib/people/maintainer-loader');
    await initMaintainerLoader(0);
    const calls = fetchMock.mock.calls.map((c: unknown[]) => String(c[0]));
    expectInit(calls.some((u: string) => u.includes('maintainers.json'))).toBe(true);
    // Both fetch calls should have been made
    expectInit(fetchMock).toHaveBeenCalledTimes(2);
  });

  itInit('uses preloadedLogos and skips landscape_logos fetch', async () => {
    const fetchMock = makeMockFetch(mockMaintainers);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { initMaintainerLoader } = await import('../../../src/lib/people/maintainer-loader');
    await initMaintainerLoader(0, { kubernetes: 'https://example.com/k8s.svg' });
    // Only maintainers.json should be fetched
    expectInit(fetchMock).toHaveBeenCalledTimes(1);
  });

  itInit('appends rendered cards to feed', async () => {
    const { initMaintainerLoader } = await import('../../../src/lib/people/maintainer-loader');
    await initMaintainerLoader(0);
    const feed = document.getElementById('maintainer-feed')!;
    expectInit(feed.querySelectorAll('.maintainer-card').length).toBeGreaterThan(0);
  });

  itInit('does not append when fetch fails', async () => {
    globalThis.fetch = makeMockFetch(null, false) as unknown as typeof fetch;
    viInit.resetModules();
    const { initMaintainerLoader } = await import('../../../src/lib/people/maintainer-loader');
    await initMaintainerLoader(0);
    const feed = document.getElementById('maintainer-feed')!;
    expectInit(feed.querySelectorAll('.maintainer-card').length).toBe(0);
  });

  itInit('skips items already accounted for by staticCount', async () => {
    const { initMaintainerLoader } = await import('../../../src/lib/people/maintainer-loader');
    // With staticCount = 2 (= total maintainers), no new cards appended
    await initMaintainerLoader(2);
    const feed = document.getElementById('maintainer-feed')!;
    expectInit(feed.querySelectorAll('.maintainer-card').length).toBe(0);
  });

  itInit('creates an IntersectionObserver and observes sentinel', async () => {
    const { initMaintainerLoader } = await import('../../../src/lib/people/maintainer-loader');
    await initMaintainerLoader(0);
    expectInit(observeMock).toHaveBeenCalled();
  });
});
