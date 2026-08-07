/**
 * Unit tests for src/lib/people/person-lightbox.ts
 *
 * Covers:
 *  - renderProjectChip()         — HTML generation, maturity colors, XSS escaping
 *  - renderSocialLinks()         — all social platforms, empty case
 *  - renderStatsRow()            — yearsContributing, contributions, publicRepos
 *  - renderPersonLightboxContent() — full card HTML, avatars, badges, projects
 *  - openPersonLightbox()        — DOM side-effects, showModal
 *  - closePersonLightbox()       — dialog.close()
 *  - initPersonLightbox()        — event wiring (close btn, backdrop)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderProjectChip,
  renderSocialLinks,
  renderStatsRow,
  renderPersonLightboxContent,
  openPersonLightbox,
  closePersonLightbox,
  initPersonLightbox,
  type ProjectDetail,
  type PersonLightboxData,
} from '../../../src/lib/people/person-lightbox';
import type { Person } from '../../../src/lib/people/person-renderer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    name: 'Alice Example',
    handle: 'aliceex',
    github: 'https://github.com/aliceex',
    category: ['Kubestronaut'],
    ...overrides,
  };
}

function makeDetail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    name: 'Kubernetes',
    logoUrl: 'https://example.com/k8s.svg',
    maturity: 'Graduated',
    slug: 'kubernetes',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// renderProjectChip()
// ---------------------------------------------------------------------------

describe('renderProjectChip()', () => {
  it('renders an anchor element', () => {
    const html = renderProjectChip('Kubernetes', makeDetail(), '/base/');
    expect(html).toMatch(/<a /);
    expect(html).toContain('</a>');
  });

  it('includes project name', () => {
    const html = renderProjectChip('Kubernetes', makeDetail(), '/base/');
    expect(html).toContain('Kubernetes');
  });

  it('includes logo img when logoUrl is provided', () => {
    const html = renderProjectChip('Kubernetes', makeDetail({ logoUrl: 'https://example.com/k8s.svg' }), '');
    expect(html).toContain('plb-project-logo');
    expect(html).toContain('https://example.com/k8s.svg');
  });

  it('renders a fallback letter when no logoUrl', () => {
    const html = renderProjectChip('Prometheus', makeDetail({ name: 'Prometheus', logoUrl: undefined }), '');
    expect(html).toContain('plb-project-logo--fallback');
    expect(html).toContain('P'); // first letter of Prometheus
  });

  it('includes maturity dot when maturity is set', () => {
    const html = renderProjectChip('Kubernetes', makeDetail({ maturity: 'Graduated' }), '');
    expect(html).toContain('plb-maturity-dot');
  });

  it('omits maturity dot when maturity is empty', () => {
    const html = renderProjectChip('Kubernetes', makeDetail({ maturity: '' }), '');
    expect(html).not.toContain('plb-maturity-dot');
  });

  it('includes link to projects page when projectsPageBase is set', () => {
    const html = renderProjectChip('Kubernetes', makeDetail({ slug: 'kubernetes' }), '/cncf-darkmode/');
    expect(html).toContain('cncf-darkmode');
    expect(html).toContain('kubernetes');
  });

  it('links to # when no projectsPageBase', () => {
    const html = renderProjectChip('Kubernetes', makeDetail(), '');
    expect(html).toContain('href="#"');
  });

  it('escapes XSS in project name', () => {
    const html = renderProjectChip('<script>bad</script>', undefined, '');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('handles undefined detail gracefully', () => {
    expect(() => renderProjectChip('MyProject', undefined, '')).not.toThrow();
    const html = renderProjectChip('MyProject', undefined, '');
    expect(html).toContain('MyProject');
  });

  it('uses slug from detail if present', () => {
    const html = renderProjectChip('Kubernetes', makeDetail({ slug: 'kube-custom' }), '/base/');
    expect(html).toContain('kube-custom');
  });

  it('generates slug from name when detail has no slug', () => {
    const html = renderProjectChip('Open Telemetry', makeDetail({ name: 'Open Telemetry', slug: undefined }), '/base/');
    expect(html).toContain('open-telemetry');
  });

  it('applies graduated maturity color', () => {
    const html = renderProjectChip('K8s', makeDetail({ maturity: 'Graduated' }), '');
    expect(html).toContain('#00B5D8'); // graduated color
  });

  it('applies incubating maturity color', () => {
    const html = renderProjectChip('K8s', makeDetail({ maturity: 'Incubating' }), '');
    expect(html).toContain('#F6AD55'); // incubating color
  });

  it('applies fallback color for unknown maturity', () => {
    const html = renderProjectChip('K8s', makeDetail({ maturity: 'Unknown' }), '');
    expect(html).toContain('#8b949e');
  });
});

// ---------------------------------------------------------------------------
// renderSocialLinks()
// ---------------------------------------------------------------------------

describe('renderSocialLinks()', () => {
  it('returns empty string when no social links', () => {
    const html = renderSocialLinks(makePerson({ github: undefined }));
    expect(html).toBe('');
  });

  it('includes github link', () => {
    const html = renderSocialLinks(makePerson({ github: 'https://github.com/aliceex' }));
    expect(html).toContain('GitHub profile');
    expect(html).toContain('https://github.com/aliceex');
  });

  it('includes linkedin link', () => {
    const html = renderSocialLinks(makePerson({ github: undefined, linkedin: 'https://linkedin.com/in/alice' }));
    expect(html).toContain('LinkedIn profile');
    expect(html).toContain('linkedin.com/in/alice');
  });

  it('includes twitter link', () => {
    const html = renderSocialLinks(makePerson({ github: undefined, twitter: 'https://twitter.com/alice' }));
    expect(html).toContain('X / Twitter');
    expect(html).toContain('twitter.com/alice');
  });

  it('includes bluesky link', () => {
    const html = renderSocialLinks(makePerson({ github: undefined, bluesky: 'https://bsky.app/profile/alice' }));
    expect(html).toContain('Bluesky');
    expect(html).toContain('bsky.app');
  });

  it('includes website link', () => {
    const html = renderSocialLinks(makePerson({ github: undefined, website: 'https://alice.dev' }));
    expect(html).toContain('Personal website');
    expect(html).toContain('alice.dev');
  });

  it('includes certDirectory link', () => {
    const html = renderSocialLinks(makePerson({ github: undefined, certDirectory: 'https://certs.example.com/alice' }));
    expect(html).toContain('Certificate directory');
    expect(html).toContain('certs.example.com');
  });

  it('renders plb-social-links wrapper when links exist', () => {
    const html = renderSocialLinks(makePerson({ github: 'https://github.com/alice' }));
    expect(html).toContain('plb-social-links');
  });

  it('includes multiple links', () => {
    const html = renderSocialLinks(makePerson({
      github: 'https://github.com/alice',
      linkedin: 'https://linkedin.com/in/alice',
    }));
    expect(html).toContain('GitHub profile');
    expect(html).toContain('LinkedIn profile');
  });

  it('sanitizes javascript: scheme URLs', () => {
    const html = renderSocialLinks(makePerson({ github: 'javascript:alert(1)' }));
    expect(html).not.toContain('javascript:');
  });
});

// ---------------------------------------------------------------------------
// renderStatsRow()
// ---------------------------------------------------------------------------

describe('renderStatsRow()', () => {
  it('returns empty string when no stats', () => {
    const html = renderStatsRow(makePerson());
    expect(html).toBe('');
  });

  it('renders yearsContributing stat', () => {
    const currentYear = new Date().getFullYear();
    const html = renderStatsRow(makePerson({ yearsContributing: 5 }));
    expect(html).toContain(`Since ${currentYear - 5}`);
    expect(html).toContain('(5y)');
  });

  it('does not render yearsContributing when 0', () => {
    const html = renderStatsRow(makePerson({ yearsContributing: 0 }));
    expect(html).toBe('');
  });

  it('renders contributions count', () => {
    const html = renderStatsRow(makePerson({ contributions: 1234 }));
    expect(html).toContain('1,234');
    expect(html).toContain('contributions');
  });

  it('does not render contributions when 0', () => {
    const html = renderStatsRow(makePerson({ contributions: 0 }));
    expect(html).not.toContain('contributions');
  });

  it('renders publicRepos count', () => {
    const html = renderStatsRow(makePerson({ publicRepos: 42 }));
    expect(html).toContain('42');
    expect(html).toContain('repos');
  });

  it('does not render publicRepos when 0', () => {
    const html = renderStatsRow(makePerson({ publicRepos: 0 }));
    expect(html).not.toContain('repos');
  });

  it('renders plb-stats-row wrapper when stats exist', () => {
    const html = renderStatsRow(makePerson({ yearsContributing: 3 }));
    expect(html).toContain('plb-stats-row');
  });

  it('renders all three stats together', () => {
    const html = renderStatsRow(makePerson({ yearsContributing: 2, contributions: 500, publicRepos: 20 }));
    expect(html).toContain('Since');
    expect(html).toContain('500');
    expect(html).toContain('20');
  });
});

// ---------------------------------------------------------------------------
// renderPersonLightboxContent()
// ---------------------------------------------------------------------------

describe('renderPersonLightboxContent()', () => {
  it('returns non-empty HTML', () => {
    const html = renderPersonLightboxContent(makePerson());
    expect(html.trim()).toBeTruthy();
  });

  it('includes person name', () => {
    const html = renderPersonLightboxContent(makePerson({ name: 'Alice Example' }));
    expect(html).toContain('Alice Example');
  });

  it('includes handle', () => {
    const html = renderPersonLightboxContent(makePerson({ handle: 'aliceex' }));
    expect(html).toContain('@aliceex');
  });

  it('includes avatar img when avatarUrl is set', () => {
    const html = renderPersonLightboxContent(makePerson({ avatarUrl: 'https://example.com/avatar.jpg' }));
    expect(html).toContain('plb-avatar');
    expect(html).toContain('https://example.com/avatar.jpg');
  });

  it('uses imageUrl as fallback avatar', () => {
    const html = renderPersonLightboxContent(makePerson({ avatarUrl: undefined, imageUrl: 'https://example.com/img.jpg' }));
    expect(html).toContain('https://example.com/img.jpg');
  });

  it('renders placeholder letter when no avatar', () => {
    const html = renderPersonLightboxContent(makePerson({ avatarUrl: undefined, imageUrl: undefined }));
    expect(html).toContain('plb-avatar--placeholder');
    expect(html).toContain('A'); // first letter of Alice
  });

  it('includes category badge', () => {
    const html = renderPersonLightboxContent(makePerson({ category: ['Kubestronaut'] }));
    expect(html).toContain('Kubestronaut');
    expect(html).toContain('plb-badge');
  });

  it('includes bio when provided', () => {
    const html = renderPersonLightboxContent(makePerson({ bio: 'Cloud native enthusiast.' }));
    expect(html).toContain('Cloud native enthusiast.');
    expect(html).toContain('plb-bio');
  });

  it('omits bio section when missing', () => {
    const html = renderPersonLightboxContent(makePerson({ bio: undefined }));
    expect(html).not.toContain('plb-bio');
  });

  it('includes location', () => {
    const html = renderPersonLightboxContent(makePerson({ location: 'Seattle, WA', countryFlag: '🇺🇸' }));
    expect(html).toContain('Seattle, WA');
    expect(html).toContain('🇺🇸');
  });

  it('omits location when missing', () => {
    const html = renderPersonLightboxContent(makePerson({ location: undefined }));
    expect(html).not.toContain('plb-location');
  });

  it('includes company as plain span when no landscapeUrl', () => {
    const html = renderPersonLightboxContent(makePerson({ company: 'CNCF Foundation' }));
    expect(html).toContain('CNCF Foundation');
    expect(html).toContain('plb-company');
  });

  it('includes company as link when companyLandscapeUrl is set', () => {
    const html = renderPersonLightboxContent(makePerson({
      company: 'CNCF Inc',
      companyLandscapeUrl: 'https://landscape.cncf.io',
    }));
    expect(html).toContain('href=');
    expect(html).toContain('CNCF Inc');
  });

  it('renders project section when projects are present', () => {
    const html = renderPersonLightboxContent(
      makePerson({ projects: ['Kubernetes', 'Prometheus'] }),
      [makeDetail(), makeDetail({ name: 'Prometheus', slug: 'prometheus' })],
    );
    expect(html).toContain('plb-section');
    expect(html).toContain('Kubernetes');
    expect(html).toContain('Prometheus');
  });

  it('omits project section when no projects', () => {
    const html = renderPersonLightboxContent(makePerson({ projects: undefined }));
    expect(html).not.toContain('plb-section');
  });

  it('includes pronouns when provided', () => {
    const html = renderPersonLightboxContent(makePerson({ pronouns: 'she/her' }));
    expect(html).toContain('she/her');
    expect(html).toContain('plb-pronouns');
  });

  it('omits pronouns when missing', () => {
    const html = renderPersonLightboxContent(makePerson({ pronouns: undefined }));
    expect(html).not.toContain('plb-pronouns');
  });

  it('escapes XSS in name', () => {
    const html = renderPersonLightboxContent(makePerson({ name: '<script>xss</script>' }));
    expect(html).not.toContain('<script>xss</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes XSS in bio', () => {
    const html = renderPersonLightboxContent(makePerson({ bio: '<img onerror=alert(1)>' }));
    expect(html).not.toContain('<img onerror=alert(1)>');
    expect(html).toContain('&lt;img');
  });

  it('renders program logo for Kubestronaut', () => {
    const html = renderPersonLightboxContent(makePerson({ category: ['Kubestronaut'] }));
    // Should have program logo img or at least category badge
    expect(html).toContain('Kubestronaut');
  });

  it('falls back to linkedin as profileUrl when no github', () => {
    const html = renderPersonLightboxContent(makePerson({
      github: undefined,
      handle: undefined,
      linkedin: 'https://linkedin.com/in/alice',
    }));
    expect(html).toContain('linkedin.com/in/alice');
  });

  it('uses # as profileUrl fallback when no github/handle/linkedin', () => {
    const html = renderPersonLightboxContent(makePerson({
      github: undefined,
      handle: undefined,
      linkedin: undefined,
    }));
    expect(html).toContain('href="#"');
  });

  it('renders multiple categories as badges', () => {
    const html = renderPersonLightboxContent(makePerson({
      category: ['Kubestronaut', 'Ambassadors'],
    }));
    expect(html).toContain('Kubestronaut');
    expect(html).toContain('Ambassador');
  });
});

// ---------------------------------------------------------------------------
// openPersonLightbox() / closePersonLightbox()
// ---------------------------------------------------------------------------

describe('openPersonLightbox()', () => {
  let dialog: HTMLDialogElement;
  let content: HTMLDivElement;

  beforeEach(() => {
    dialog = document.createElement('dialog');
    dialog.id = 'person-modal';
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    content = document.createElement('div');
    content.id = 'person-modal-content';
    dialog.appendChild(content);
    document.body.appendChild(dialog);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('sets innerHTML of person-modal-content', () => {
    openPersonLightbox(makePerson());
    expect(content.innerHTML).not.toBe('');
  });

  it('calls showModal on the dialog', () => {
    openPersonLightbox(makePerson());
    expect(dialog.showModal).toHaveBeenCalledOnce();
  });

  it('renders person name in content', () => {
    openPersonLightbox(makePerson({ name: 'Alice Example' }));
    expect(content.innerHTML).toContain('Alice Example');
  });

  it('does nothing if dialog element is missing', () => {
    document.body.innerHTML = '';
    expect(() => openPersonLightbox(makePerson())).not.toThrow();
  });

  it('does nothing if content element is missing', () => {
    document.body.innerHTML = '<dialog id="person-modal"></dialog>';
    const d = document.getElementById('person-modal') as HTMLDialogElement;
    d.showModal = vi.fn();
    expect(() => openPersonLightbox(makePerson())).not.toThrow();
  });

  it('passes projectDetails to renderer', () => {
    openPersonLightbox(
      makePerson({ projects: ['Kubernetes'] }),
      [makeDetail()],
      '/base/',
    );
    expect(content.innerHTML).toContain('Kubernetes');
  });
});

describe('closePersonLightbox()', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('calls close on the dialog when it exists', () => {
    const dialog = document.createElement('dialog');
    dialog.id = 'person-modal';
    dialog.close = vi.fn();
    document.body.appendChild(dialog);

    closePersonLightbox();
    expect(dialog.close).toHaveBeenCalledOnce();
  });

  it('does not throw when dialog is missing', () => {
    expect(() => closePersonLightbox()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// initPersonLightbox()
// ---------------------------------------------------------------------------

describe('initPersonLightbox()', () => {
  let dialog: HTMLDialogElement;

  beforeEach(() => {
    dialog = document.createElement('dialog');
    dialog.id = 'person-modal';
    dialog.close = vi.fn();
    dialog.showModal = vi.fn();

    const closeBtn = document.createElement('button');
    closeBtn.id = 'person-modal-close';
    dialog.appendChild(closeBtn);

    const inner = document.createElement('div');
    inner.className = 'plb-dialog';
    dialog.appendChild(inner);

    document.body.appendChild(dialog);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('does not throw when called', () => {
    expect(() => initPersonLightbox()).not.toThrow();
  });

  it('close button click calls closePersonLightbox', () => {
    initPersonLightbox();
    const closeBtn = document.getElementById('person-modal-close')!;
    closeBtn.click();
    expect(dialog.close).toHaveBeenCalled();
  });

  it('backdrop click closes the dialog', () => {
    initPersonLightbox();
    // Simulate a click directly on the dialog element (backdrop)
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: dialog, configurable: true });
    dialog.dispatchEvent(event);
    expect(dialog.close).toHaveBeenCalled();
  });

  it('click on inner content does not close dialog', () => {
    initPersonLightbox();
    const inner = dialog.querySelector('.plb-dialog')!;
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: inner, configurable: true });
    dialog.dispatchEvent(event);
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('does nothing when dialog element is missing', () => {
    document.body.innerHTML = '';
    expect(() => initPersonLightbox()).not.toThrow();
  });
});
