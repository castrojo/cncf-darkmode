import { describe, it, expect } from 'vitest';
import {
  esc,
  safeHref,
  dateHeader,
  renderPersonCard,
  CATEGORY_MAP,
  LOGO_PRIORITY,
  PROGRAM_LOGOS,
  TYPE_LABEL,
  type Person,
  type PersonEvent,
} from '../../../src/lib/people/person-renderer';

// ---------------------------------------------------------------------------
// esc() — HTML entity escaping
// ---------------------------------------------------------------------------
describe('esc()', () => {
  it('escapes ampersand', () => expect(esc('a&b')).toBe('a&amp;b'));
  it('escapes less-than', () => expect(esc('a<b')).toBe('a&lt;b'));
  it('escapes greater-than', () => expect(esc('a>b')).toBe('a&gt;b'));
  it('escapes double-quote', () => expect(esc('"value"')).toBe('&quot;value&quot;'));
  it('escapes all special chars together', () => {
    expect(esc('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });
  it('passes through plain text unchanged', () => {
    expect(esc('Hello World 123')).toBe('Hello World 123');
  });
  it('handles empty string', () => expect(esc('')).toBe(''));
});

// ---------------------------------------------------------------------------
// safeHref() — XSS-safe URL validation
// ---------------------------------------------------------------------------
describe('safeHref()', () => {
  it('allows https URLs', () => expect(safeHref('https://example.com')).toBe('https://example.com'));
  it('allows http URLs', () => expect(safeHref('http://example.com')).toBe('http://example.com'));
  it('rejects javascript: scheme', () => expect(safeHref('javascript:alert(1)')).toBe('#'));
  it('rejects data: scheme', () => expect(safeHref('data:text/html,<h1>xss</h1>')).toBe('#'));
  it('rejects vbscript: scheme', () => expect(safeHref('vbscript:msgbox(1)')).toBe('#'));
  it('rejects relative paths (not parseable as URL)', () => expect(safeHref('/path/only')).toBe('#'));
  it('rejects empty string', () => expect(safeHref('')).toBe('#'));
  it('rejects malformed URL', () => expect(safeHref('not a url at all')).toBe('#'));
  it('allows https URL with path/query/fragment', () => {
    const url = 'https://github.com/user?tab=overview#section';
    expect(safeHref(url)).toBe(url);
  });
});

// ---------------------------------------------------------------------------
// dateHeader() — date formatting
// ---------------------------------------------------------------------------
describe('dateHeader()', () => {
  it('formats a known ISO timestamp', () => {
    const result = dateHeader('2024-03-15T00:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('March');
    expect(result).toContain('15');
  });
  it('includes day of week in output', () => {
    const result = dateHeader('2024-01-01T00:00:00Z');
    // 2024-01-01 is a Monday
    expect(result).toMatch(/Monday/i);
  });
});

// ---------------------------------------------------------------------------
// CATEGORY_MAP constants
// ---------------------------------------------------------------------------
describe('CATEGORY_MAP', () => {
  it('has entry for Kubestronaut', () => {
    expect(CATEGORY_MAP['Kubestronaut']).toBeDefined();
    expect(CATEGORY_MAP['Kubestronaut'].name).toBe('Kubestronaut');
  });
  it('has entry for Golden-Kubestronaut', () => {
    expect(CATEGORY_MAP['Golden-Kubestronaut'].name).toContain('Golden');
  });
  it('has entry for Ambassadors', () => {
    expect(CATEGORY_MAP['Ambassadors'].name).toBe('Ambassador');
  });
  it('has entry for Staff', () => {
    expect(CATEGORY_MAP['Staff'].name).toBe('Staff');
  });
  it('has color values for all entries', () => {
    for (const key of Object.keys(CATEGORY_MAP)) {
      expect(CATEGORY_MAP[key].color).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// LOGO_PRIORITY
// ---------------------------------------------------------------------------
describe('LOGO_PRIORITY', () => {
  it('is an array', () => expect(Array.isArray(LOGO_PRIORITY)).toBe(true));
  it('has Golden-Kubestronaut first', () => expect(LOGO_PRIORITY[0]).toBe('Golden-Kubestronaut'));
  it('contains Kubestronaut', () => expect(LOGO_PRIORITY).toContain('Kubestronaut'));
  it('contains Ambassadors', () => expect(LOGO_PRIORITY).toContain('Ambassadors'));
});

// ---------------------------------------------------------------------------
// TYPE_LABEL constants
// ---------------------------------------------------------------------------
describe('TYPE_LABEL', () => {
  it('labels added as "+ Joined"', () => expect(TYPE_LABEL['added']).toBe('+ Joined'));
  it('labels removed as "Emeritus"', () => expect(TYPE_LABEL['removed']).toBe('Emeritus'));
  it('labels updated as "✎ Updated"', () => expect(TYPE_LABEL['updated']).toBe('✎ Updated'));
  it('labels staff as "Staff"', () => expect(TYPE_LABEL['staff']).toBe('Staff'));
});

// ---------------------------------------------------------------------------
// Helpers for renderPersonCard tests
// ---------------------------------------------------------------------------
function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    name: 'Alice Example',
    handle: 'alice',
    github: 'https://github.com/alice',
    category: ['Kubestronaut'],
    ...overrides,
  };
}

function makeEvent(overrides: Partial<PersonEvent> = {}, personOverrides: Partial<Person> = {}): PersonEvent {
  return {
    id: 'test-event-1',
    type: 'added',
    timestamp: '2024-06-01T12:00:00Z',
    person: makePerson(personOverrides),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// renderPersonCard() — core HTML generation
// ---------------------------------------------------------------------------
describe('renderPersonCard() — basic structure', () => {
  it('returns an article element', () => {
    const html = renderPersonCard(makeEvent(), {});
    expect(html).toMatch(/^<article/);
    expect(html).toContain('</article>');
  });

  it('includes person name in output', () => {
    const html = renderPersonCard(makeEvent(), {});
    expect(html).toContain('Alice Example');
  });

  it('includes the handle', () => {
    const html = renderPersonCard(makeEvent(), {});
    expect(html).toContain('@alice');
  });

  it('includes event id as data-id attribute', () => {
    const html = renderPersonCard(makeEvent({ id: 'unique-id-123' }), {});
    expect(html).toContain('data-id="unique-id-123"');
  });

  it('includes event type as data-type attribute', () => {
    const html = renderPersonCard(makeEvent({ type: 'removed' }), {});
    expect(html).toContain('data-type="removed"');
  });

  it('includes category as data-category attribute', () => {
    const html = renderPersonCard(makeEvent(), {});
    expect(html).toContain('data-category="kubestronaut"');
  });

  it('includes data-categories attribute with pipe-separated lowercase categories', () => {
    const html = renderPersonCard(
      makeEvent({}, { category: ['Kubestronaut', 'Ambassadors'] }),
      {}
    );
    expect(html).toContain('data-categories="kubestronaut|ambassadors"');
  });
});

// ---------------------------------------------------------------------------
// renderPersonCard() — XSS safety
// ---------------------------------------------------------------------------
describe('renderPersonCard() — XSS safety', () => {
  it('escapes < and > in person name', () => {
    const html = renderPersonCard(makeEvent({}, { name: '<script>xss</script>' }), {});
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes double-quotes in handle', () => {
    const html = renderPersonCard(makeEvent({}, { handle: '"evil"', github: 'https://github.com/user' }), {});
    expect(html).not.toContain('href="@"evil"');
    // The name/handle should be escaped
    expect(html).toContain('&quot;evil&quot;');
  });

  it('escapes ampersand in bio', () => {
    const html = renderPersonCard(makeEvent({}, { bio: 'Love & Coffee' }), {});
    expect(html).toContain('Love &amp; Coffee');
  });

  it('escapes HTML in company name', () => {
    const html = renderPersonCard(makeEvent({}, { company: '<Evil Corp>' }), {});
    expect(html).not.toContain('<Evil Corp>');
    expect(html).toContain('&lt;Evil Corp&gt;');
  });

  it('escapes HTML in location', () => {
    const html = renderPersonCard(makeEvent({}, { location: '<XSS>' }), {});
    expect(html).not.toContain('<XSS>');
    expect(html).toContain('&lt;XSS&gt;');
  });

  it('blocks javascript: URL in github field via safeHref', () => {
    const html = renderPersonCard(
      makeEvent({}, { github: 'javascript:alert(1)', category: ['Kubestronaut'] }),
      {}
    );
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="#"');
  });

  it('blocks javascript: URL in linkedin field', () => {
    const html = renderPersonCard(
      makeEvent({}, { linkedin: 'javascript:evil()', github: undefined, handle: undefined }),
      {}
    );
    expect(html).not.toContain('href="javascript:');
  });

  it('blocks javascript: URL in website field (companyLandscapeUrl)', () => {
    const html = renderPersonCard(
      makeEvent({}, { companyLandscapeUrl: 'javascript:steal()', company: 'ACME' }),
      {}
    );
    expect(html).not.toContain('href="javascript:');
  });
});

// ---------------------------------------------------------------------------
// renderPersonCard() — missing / optional fields
// ---------------------------------------------------------------------------
describe('renderPersonCard() — missing fields', () => {
  it('renders without avatar (imageUrl) gracefully', () => {
    const html = renderPersonCard(makeEvent({}, { github: 'https://github.com/bob', imageUrl: undefined }), {});
    expect(html).toContain('avatar');
  });

  it('renders avatar-placeholder when no avatar URL provided', () => {
    const html = renderPersonCard(
      makeEvent({}, { avatarUrl: undefined, imageUrl: undefined }),
      {}
    );
    expect(html).toContain('avatar-placeholder');
  });

  it('renders with avatar URL when avatarUrl is set', () => {
    const html = renderPersonCard(
      makeEvent({}, { avatarUrl: 'https://example.com/avatar.png' }),
      {}
    );
    expect(html).toContain('https://example.com/avatar.png');
  });

  it('omits handle line when handle is missing', () => {
    const html = renderPersonCard(
      makeEvent({}, { handle: undefined, github: 'https://github.com/alice' }),
      {}
    );
    expect(html).not.toContain('@undefined');
    // Should still contain person name
    expect(html).toContain('Alice Example');
  });

  it('omits bio section when bio is missing', () => {
    const html = renderPersonCard(makeEvent({}, { bio: undefined }), {});
    expect(html).not.toContain('<p class="bio">');
  });

  it('renders bio when provided', () => {
    const html = renderPersonCard(makeEvent({}, { bio: 'Kubernetes enthusiast' }), {});
    expect(html).toContain('Kubernetes enthusiast');
  });

  it('omits company section when company is missing', () => {
    const html = renderPersonCard(makeEvent({}, { company: undefined }), {});
    expect(html).not.toContain('company-chip');
  });

  it('renders company when provided', () => {
    const html = renderPersonCard(makeEvent({}, { company: 'Acme Corp' }), {});
    expect(html).toContain('Acme Corp');
  });

  it('renders pronouns when provided', () => {
    const html = renderPersonCard(makeEvent({}, { pronouns: 'they/them' }), {});
    expect(html).toContain('they/them');
  });

  it('omits pronouns section when missing', () => {
    const html = renderPersonCard(makeEvent({}, { pronouns: undefined }), {});
    expect(html).not.toContain('pronouns');
  });

  it('renders empty category gracefully', () => {
    const html = renderPersonCard(makeEvent({}, { category: [] }), {});
    expect(html).toContain('data-categories=""');
  });

  it('renders without timestamp gracefully (no <time> tag)', () => {
    const html = renderPersonCard(makeEvent({ timestamp: '' }), {});
    expect(html).not.toContain('<time');
  });

  it('renders <time> element when timestamp is set', () => {
    const html = renderPersonCard(makeEvent({ timestamp: '2024-06-01T12:00:00Z' }), {});
    expect(html).toContain('<time');
  });
});

// ---------------------------------------------------------------------------
// renderPersonCard() — type labels and badge rendering
// ---------------------------------------------------------------------------
describe('renderPersonCard() — type labels and badges', () => {
  it('renders "+ Joined" badge for added events', () => {
    const html = renderPersonCard(makeEvent({ type: 'added' }), {});
    expect(html).toContain('+ Joined');
  });

  it('renders "Emeritus" badge for removed events', () => {
    const html = renderPersonCard(makeEvent({ type: 'removed' }), {});
    expect(html).toContain('Emeritus');
  });

  it('renders "✎ Updated" badge for updated events', () => {
    const html = renderPersonCard(makeEvent({ type: 'updated' }), {});
    expect(html).toContain('✎ Updated');
  });

  it('renders raw type when type is not in TYPE_LABEL', () => {
    const html = renderPersonCard(makeEvent({ type: 'custom_type' }), {});
    expect(html).toContain('custom_type');
  });

  it('renders category badges for each category', () => {
    const html = renderPersonCard(
      makeEvent({}, { category: ['Kubestronaut', 'Ambassadors'] }),
      {}
    );
    expect(html).toContain('Kubestronaut');
    expect(html).toContain('Ambassador');
  });

  it('renders Governing Board category badge', () => {
    const html = renderPersonCard(makeEvent({}, { category: ['Governing Board'] }), {});
    expect(html).toContain('Governing Board');
  });
});

// ---------------------------------------------------------------------------
// renderPersonCard() — program logo selection
// ---------------------------------------------------------------------------
describe('renderPersonCard() — program logo', () => {
  it('renders program logo for Kubestronaut', () => {
    const html = renderPersonCard(makeEvent({}, { category: ['Kubestronaut'] }), {});
    expect(html).toContain('program-logos/kubestronaut.svg');
  });

  it('renders golden-kubestronaut logo for Golden-Kubestronaut category', () => {
    const html = renderPersonCard(makeEvent({}, { category: ['Golden-Kubestronaut'] }), {});
    expect(html).toContain('golden-kubestronaut.svg');
  });

  it('uses primaryBadge override for logo selection', () => {
    const html = renderPersonCard(
      makeEvent({}, { category: ['Ambassadors'], primaryBadge: 'Kubestronaut' }),
      {}
    );
    expect(html).toContain('kubestronaut.svg');
  });

  it('renders no program-logo img when category has no mapped logo', () => {
    const html = renderPersonCard(makeEvent({}, { category: ['Governing Board'] }), {});
    // Governing Board is not in LOGO_PRIORITY, so no program-logo image
    expect(html).not.toContain('program-logos/');
  });
});

// ---------------------------------------------------------------------------
// renderPersonCard() — stats row
// ---------------------------------------------------------------------------
describe('renderPersonCard() — stats row', () => {
  it('renders contributions count', () => {
    const html = renderPersonCard(makeEvent({}, { contributions: 1234 }), {});
    expect(html).toContain('1,234');
    expect(html).toContain('contributions');
  });

  it('renders public repos count', () => {
    const html = renderPersonCard(makeEvent({}, { publicRepos: 42 }), {});
    expect(html).toContain('42');
    expect(html).toContain('repos');
  });

  it('renders years contributing as "Since YYYY (Xy)"', () => {
    const currentYear = new Date().getFullYear();
    const html = renderPersonCard(makeEvent({}, { yearsContributing: 5 }), {});
    expect(html).toContain(`Since ${currentYear - 5}`);
    expect(html).toContain('(5y)');
  });

  it('omits stats row when no stats provided', () => {
    const html = renderPersonCard(
      makeEvent({}, { contributions: undefined, publicRepos: undefined, yearsContributing: undefined }),
      {}
    );
    expect(html).not.toContain('stats-row');
  });
});

// ---------------------------------------------------------------------------
// renderPersonCard() — projects row
// ---------------------------------------------------------------------------
describe('renderPersonCard() — projects row', () => {
  it('renders project chips when projects are provided', () => {
    const html = renderPersonCard(makeEvent({}, { projects: ['Kubernetes', 'Prometheus'] }), {});
    expect(html).toContain('Kubernetes');
    expect(html).toContain('Prometheus');
    expect(html).toContain('project-chip');
  });

  it('uses landscape logo for project chip when available', () => {
    const logos = { kubernetes: 'https://example.com/k8s.svg' };
    const html = renderPersonCard(makeEvent({}, { projects: ['Kubernetes'] }), logos);
    expect(html).toContain('https://example.com/k8s.svg');
  });

  it('renders project chip without logo when not in landscapeLogos', () => {
    const html = renderPersonCard(makeEvent({}, { projects: ['UnknownProject'] }), {});
    expect(html).toContain('UnknownProject');
  });

  it('omits projects row when projects is empty', () => {
    const html = renderPersonCard(makeEvent({}, { projects: [] }), {});
    expect(html).not.toContain('projects-row');
  });

  it('omits projects row when projects is undefined', () => {
    const html = renderPersonCard(makeEvent({}, { projects: undefined }), {});
    expect(html).not.toContain('projects-row');
  });
});

// ---------------------------------------------------------------------------
// renderPersonCard() — social links
// ---------------------------------------------------------------------------
describe('renderPersonCard() — social links', () => {
  it('renders GitHub link', () => {
    const html = renderPersonCard(makeEvent({}, { github: 'https://github.com/alice' }), {});
    expect(html).toContain('href="https://github.com/alice"');
  });

  it('renders LinkedIn link', () => {
    const html = renderPersonCard(makeEvent({}, { linkedin: 'https://linkedin.com/in/alice' }), {});
    expect(html).toContain('href="https://linkedin.com/in/alice"');
  });

  it('renders Twitter link', () => {
    const html = renderPersonCard(makeEvent({}, { twitter: 'https://twitter.com/alice' }), {});
    expect(html).toContain('href="https://twitter.com/alice"');
  });

  it('renders YouTube link', () => {
    const html = renderPersonCard(makeEvent({}, { youtube: 'https://youtube.com/@alice' }), {});
    expect(html).toContain('href="https://youtube.com/@alice"');
  });

  it('renders Bluesky link', () => {
    const html = renderPersonCard(makeEvent({}, { bluesky: 'https://bsky.app/profile/alice' }), {});
    expect(html).toContain('href="https://bsky.app/profile/alice"');
  });

  it('renders cert directory link', () => {
    const html = renderPersonCard(makeEvent({}, { certDirectory: 'https://example.com/certs/alice' }), {});
    expect(html).toContain('href="https://example.com/certs/alice"');
  });
});

// ---------------------------------------------------------------------------
// renderPersonCard() — changes/changelog details
// ---------------------------------------------------------------------------
describe('renderPersonCard() — changes section', () => {
  it('renders changes details when changes are provided', () => {
    const html = renderPersonCard(
      makeEvent({
        type: 'updated',
        changes: [{ field: 'company', from: 'Old Corp', to: 'New Corp' }],
      }),
      {}
    );
    expect(html).toContain('changes-details');
    expect(html).toContain('Old Corp');
    expect(html).toContain('New Corp');
    expect(html).toContain('company');
  });

  it('renders plural "fields changed" for multiple changes', () => {
    const html = renderPersonCard(
      makeEvent({
        changes: [
          { field: 'company', from: 'A', to: 'B' },
          { field: 'location', from: 'X', to: 'Y' },
        ],
      }),
      {}
    );
    expect(html).toContain('2 fields changed');
  });

  it('renders singular "field changed" for single change', () => {
    const html = renderPersonCard(
      makeEvent({ changes: [{ field: 'bio', from: 'old', to: 'new' }] }),
      {}
    );
    expect(html).toContain('1 field changed');
  });

  it('escapes XSS in change values', () => {
    const html = renderPersonCard(
      makeEvent({
        changes: [{ field: 'bio', from: '<script>bad</script>', to: 'clean' }],
      }),
      {}
    );
    expect(html).not.toContain('<script>bad</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('omits changes section when no changes', () => {
    const html = renderPersonCard(makeEvent({ changes: [] }), {});
    expect(html).not.toContain('changes-details');
  });

  it('omits changes section when changes is undefined', () => {
    const html = renderPersonCard(makeEvent({ changes: undefined }), {});
    expect(html).not.toContain('changes-details');
  });

  it('renders "(empty)" when change.from is empty string', () => {
    const html = renderPersonCard(
      makeEvent({ changes: [{ field: 'bio', from: '', to: 'new value' }] }),
      {}
    );
    expect(html).toContain('(empty)');
  });
});

// ---------------------------------------------------------------------------
// renderPersonCard() — card accent color from category
// ---------------------------------------------------------------------------
describe('renderPersonCard() — card accent', () => {
  it('applies Kubestronaut accent color', () => {
    const html = renderPersonCard(makeEvent({}, { category: ['Kubestronaut'] }), {});
    expect(html).toContain('--card-accent:');
    expect(html).toContain('--color-kubestronaut');
  });

  it('falls back to #888 for unknown category', () => {
    const html = renderPersonCard(makeEvent({}, { category: ['UnknownCategory'] }), {});
    expect(html).toContain('--card-accent:#888');
  });

  it('applies Ambassador accent color', () => {
    const html = renderPersonCard(makeEvent({}, { category: ['Ambassadors'] }), {});
    expect(html).toContain('--color-ambassador');
  });
});

// ---------------------------------------------------------------------------
// renderPersonCard() — profile URL resolution
// ---------------------------------------------------------------------------
describe('renderPersonCard() — profile URL resolution', () => {
  it('uses github field as profile URL', () => {
    const html = renderPersonCard(makeEvent({}, { github: 'https://github.com/alice' }), {});
    expect(html).toContain('href="https://github.com/alice"');
  });

  it('falls back to handle-based GitHub URL when github is missing', () => {
    const html = renderPersonCard(
      makeEvent({}, { github: undefined, handle: 'alice', linkedin: undefined }),
      {}
    );
    expect(html).toContain('href="https://github.com/alice"');
  });

  it('falls back to linkedin URL when github and handle are missing', () => {
    const html = renderPersonCard(
      makeEvent({}, { github: undefined, handle: undefined, linkedin: 'https://linkedin.com/in/alice' }),
      {}
    );
    expect(html).toContain('href="https://linkedin.com/in/alice"');
  });

  it('uses # as profile URL when all sources are missing', () => {
    const html = renderPersonCard(
      makeEvent({}, { github: undefined, handle: undefined, linkedin: undefined }),
      {}
    );
    // href="#" should appear for the profile link
    expect(html).toContain('href="#"');
  });
});

// ---------------------------------------------------------------------------
// renderPersonCard() — company with landscape URL
// ---------------------------------------------------------------------------
describe('renderPersonCard() — company landscape link', () => {
  it('renders company as a link when companyLandscapeUrl is set', () => {
    const html = renderPersonCard(
      makeEvent({}, { company: 'CNCF', companyLandscapeUrl: 'https://landscape.cncf.io/?item=cncf' }),
      {}
    );
    expect(html).toContain('company-chip-link');
    expect(html).toContain('https://landscape.cncf.io/?item=cncf');
  });

  it('renders company as a plain span when companyLandscapeUrl is missing', () => {
    const html = renderPersonCard(makeEvent({}, { company: 'CNCF', companyLandscapeUrl: undefined }), {});
    expect(html).toContain('company-chip');
    expect(html).not.toContain('company-chip-link');
  });

  it('blocks javascript: in companyLandscapeUrl', () => {
    const html = renderPersonCard(
      makeEvent({}, { company: 'Evil', companyLandscapeUrl: 'javascript:evil()' }),
      {}
    );
    expect(html).not.toContain('href="javascript:');
  });
});
