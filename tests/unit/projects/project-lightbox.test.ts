/**
 * tests/unit/projects/project-lightbox.test.ts
 *
 * Vitest unit tests for src/lib/projects/project-lightbox.ts
 *
 * Covers the pure renderProjectLightboxContent() renderer and
 * utility helpers (escapeHtml, safeHref, formatNumber, formatDate).
 * DOM-dependent functions (openProjectLightbox, closeProjectLightbox,
 * initProjectLightbox) are not tested here — they are exercised by the
 * Playwright e2e suite.
 */

import { describe, it, expect } from 'vitest';
import {
  renderProjectLightboxContent,
  escapeHtml,
  safeHref,
  formatNumber,
  formatDate,
  type Maintainer,
} from '../../../src/lib/projects/project-lightbox';
import type { SafeProject } from '../../../src/lib/projects/project-renderer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2026-01-01T00:00:00Z');

/** Minimal valid SafeProject. */
const BASE_PROJECT: SafeProject = {
  name: 'TestProject',
  slug: 'testproject',
  maturity: 'graduated',
  category: 'Test Category',
  subcategory: 'Sub',
  logoUrl: 'https://example.com/logo.svg',
  updatedAt: '2026-01-01T00:00:00Z',
};

/** A richer project fixture for integration-style rendering tests. */
const FULL_PROJECT: SafeProject = {
  name: 'Kyverno',
  slug: 'kyverno',
  description: 'Policy as code for Kubernetes',
  homepageUrl: 'https://kyverno.io/',
  repoUrl: 'https://github.com/kyverno/kyverno',
  logoUrl: 'https://landscape.cncf.io/logos/kyverno.svg',
  maturity: 'graduated',
  category: 'Provisioning',
  subcategory: 'Security & Compliance',
  twitterUrl: 'https://twitter.com/kyverno',
  devStatsUrl: 'https://kyverno.devstats.cncf.io/',
  slackUrl: 'https://kubernetes.slack.com/',
  lfxSlug: 'kyverno',
  cloMonitorName: 'kyverno',
  stars: 7578,
  forks: 1296,
  contributors: 501,
  lastCommitDate: '2026-01-01T00:00:00Z',
  lastReleaseDate: '2025-12-01T00:00:00Z',
  license: 'Apache License 2.0',
  primaryLanguage: 'Go',
  topics: ['kubernetes', 'policy-as-code', 'security'],
  lastAuditDate: '2023-11-28',
  lastAuditVendor: 'Ada Logics',
  acceptedDate: '2020-11-10',
  incubatingDate: '2022-07-13',
  graduatedDate: '2026-03-16',
  updatedAt: '2026-01-01T00:00:00Z',
};

const MAINTAINER_KYVERNO: Maintainer = {
  name: 'Jim Bugwadia',
  handle: 'jimbugwadia',
  avatarUrl: 'https://avatars.githubusercontent.com/jimbugwadia',
  projects: ['Kyverno'],
  projectDetails: [{ name: 'Kyverno', maturity: 'Graduated' }],
  company: 'Nirmata',
};

const MAINTAINER_OTHER: Maintainer = {
  name: 'Other Person',
  handle: 'otherperson',
  projects: ['Argo'],
  projectDetails: [{ name: 'Argo', maturity: 'Graduated' }],
};

// ---------------------------------------------------------------------------
// Utility tests
// ---------------------------------------------------------------------------

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('passes through safe strings unchanged', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123');
  });
});

describe('safeHref', () => {
  it('allows https URLs', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
  });

  it('allows http URLs', () => {
    expect(safeHref('http://example.com')).toBe('http://example.com');
  });

  it('allows mailto URLs', () => {
    expect(safeHref('mailto:user@example.com')).toBe('mailto:user@example.com');
  });

  it('blocks javascript: protocol', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#');
  });

  it('blocks data: protocol', () => {
    expect(safeHref('data:text/html,<h1>pwned</h1>')).toBe('#');
  });

  it('blocks invalid URLs', () => {
    expect(safeHref('not a url')).toBe('#');
  });

  it('escapes special chars in valid URLs', () => {
    const result = safeHref('https://example.com/foo?a=1&b=2');
    expect(result).toContain('&amp;');
  });
});

describe('formatNumber', () => {
  it('formats numbers < 1000 as-is', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(0)).toBe('0');
  });

  it('formats thousands with k suffix', () => {
    expect(formatNumber(1000)).toBe('1.0k');
    expect(formatNumber(7578)).toBe('7.6k');
    expect(formatNumber(1500)).toBe('1.5k');
  });

  it('formats millions with M suffix', () => {
    expect(formatNumber(1_000_000)).toBe('1.0M');
    expect(formatNumber(2_500_000)).toBe('2.5M');
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    const result = formatDate('2023-11-28T00:00:00Z');
    expect(result).toContain('2023');
    expect(result).toContain('Nov');
  });

  it('formats a date-only string', () => {
    const result = formatDate('2020-11-10');
    expect(result).toContain('2020');
  });

  it('returns the escaped input for invalid dates', () => {
    const result = formatDate('not-a-date');
    expect(result).toBe('not-a-date'); // escapeHtml of "not-a-date" = itself
  });
});

// ---------------------------------------------------------------------------
// renderProjectLightboxContent — structural checks
// ---------------------------------------------------------------------------

describe('renderProjectLightboxContent', () => {
  it('returns a non-empty HTML string', () => {
    const html = renderProjectLightboxContent(BASE_PROJECT, [], NOW);
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  it('wraps content in .plb2-content with data-slug', () => {
    const html = renderProjectLightboxContent(BASE_PROJECT, [], NOW);
    expect(html).toContain('class="plb2-content"');
    expect(html).toContain('data-slug="testproject"');
  });

  it('includes project name in h2#project-modal-title', () => {
    const html = renderProjectLightboxContent(BASE_PROJECT, [], NOW);
    expect(html).toContain('id="project-modal-title"');
    expect(html).toContain('TestProject');
  });

  it('escapes XSS in project name', () => {
    const xss: SafeProject = {
      ...BASE_PROJECT,
      name: '<script>alert(1)</script>',
      slug: 'xss-test',
    };
    const html = renderProjectLightboxContent(xss, [], NOW);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('shows maturity badge', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('plb2-maturity-badge');
    expect(html).toContain('Graduated');
  });

  it('shows description when present', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('Policy as code for Kubernetes');
  });

  it('falls back to summary when description is absent', () => {
    const p: SafeProject = {
      ...BASE_PROJECT,
      summary: 'Summary text here',
    };
    const html = renderProjectLightboxContent(p, [], NOW);
    expect(html).toContain('Summary text here');
  });

  it('renders stats row with formatted numbers', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('plb2-stats-row');
    // 7578 stars → 7.6k
    expect(html).toContain('7.6k');
  });

  it('renders topics chips when topics array is non-empty', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('plb2-topic-chip');
    expect(html).toContain('kubernetes');
    expect(html).toContain('policy-as-code');
  });

  it('renders no topics section when topics is empty', () => {
    const p: SafeProject = { ...BASE_PROJECT, topics: [] };
    const html = renderProjectLightboxContent(p, [], NOW);
    expect(html).not.toContain('plb2-topic-chip');
  });

  it('renders external links when repoUrl is present', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('plb2-ext-link');
    expect(html).toContain('GitHub');
  });

  it('renders CLO Monitor link when cloMonitorName present', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('clomonitor.io/projects/cncf/kyverno');
  });

  it('renders health bar with score', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('plb2-health-bar');
    expect(html).toContain('/ 100');
  });

  it('renders last audit info when present', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('Ada Logics');
  });

  it('renders end users section', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('plb2-endusers');
    expect(html).toContain('CNCF End Users');
  });

  it('renders LFX Insights link when lfxSlug present', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('insights.lfx.linuxfoundation.org');
  });

  it('renders OpenSSF Scorecard link when repoUrl is a GitHub URL', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('scorecard.dev');
  });
});

// ---------------------------------------------------------------------------
// Contributor minicards
// ---------------------------------------------------------------------------

describe('renderProjectLightboxContent — contributor minicards', () => {
  it('shows matched maintainer minicard', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [MAINTAINER_KYVERNO], NOW);
    expect(html).toContain('Jim Bugwadia');
    expect(html).toContain('jimbugwadia');
  });

  it('does NOT show unrelated maintainer', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [MAINTAINER_OTHER], NOW);
    expect(html).not.toContain('Other Person');
  });

  it('shows fallback when no maintainers match', () => {
    const html = renderProjectLightboxContent(BASE_PROJECT, [], NOW);
    expect(html).toContain('No maintainers listed');
  });

  it('shows up to 6 minicards', () => {
    const many: Maintainer[] = Array.from({ length: 10 }, (_, i) => ({
      name: `Maintainer ${i}`,
      handle: `handle${i}`,
      projects: ['TestProject'],
    }));
    const html = renderProjectLightboxContent(BASE_PROJECT, many, NOW);
    const count = (html.match(/plb2-minicard"/g) ?? []).length;
    expect(count).toBe(6);
  });

  it('uses projectDetails cross-ref when projects[] is absent', () => {
    const m: Maintainer = {
      name: 'Detail Only',
      handle: 'detailonly',
      projectDetails: [{ name: 'TestProject', maturity: 'Graduated' }],
    };
    const html = renderProjectLightboxContent(BASE_PROJECT, [m], NOW);
    expect(html).toContain('Detail Only');
  });

  it('cross-ref is case-insensitive', () => {
    const m: Maintainer = {
      name: 'Case Insensitive',
      handle: 'ci',
      projects: ['TESTPROJECT'], // uppercase
    };
    const html = renderProjectLightboxContent(BASE_PROJECT, [m], NOW);
    expect(html).toContain('Case Insensitive');
  });

  it('renders logo image when logoUrl is present', () => {
    const html = renderProjectLightboxContent(FULL_PROJECT, [], NOW);
    expect(html).toContain('plb2-logo');
    expect(html).toContain('kyverno.svg');
  });

  it('renders placeholder when logoUrl is absent', () => {
    const p: SafeProject = { ...BASE_PROJECT, logoUrl: '' };
    const html = renderProjectLightboxContent(p, [], NOW);
    expect(html).toContain('plb2-logo-placeholder');
  });
});

// ---------------------------------------------------------------------------
// Sandbox / incubating maturity colours
// ---------------------------------------------------------------------------

describe('renderProjectLightboxContent — maturity badge colors', () => {
  it('uses incubating color for incubating projects', () => {
    const p: SafeProject = { ...BASE_PROJECT, maturity: 'incubating' };
    const html = renderProjectLightboxContent(p, [], NOW);
    expect(html).toContain('#0060CC'); // incubating color
    expect(html).toContain('Incubating');
  });

  it('uses sandbox color for sandbox projects', () => {
    const p: SafeProject = { ...BASE_PROJECT, maturity: 'sandbox' };
    const html = renderProjectLightboxContent(p, [], NOW);
    expect(html).toContain('#57606a');
    expect(html).toContain('Sandbox');
  });
});
