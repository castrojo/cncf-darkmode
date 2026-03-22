import { describe, it, expect } from 'vitest';
import { renderChangelogEvent, type MemberEvent } from '../../src/lib/changelog-renderer';
import type { SafeMember } from '../../src/lib/member-renderer';

const baseEvent: MemberEvent = {
  id: 'evt-1',
  type: 'joined',
  memberName: 'Acme Corp',
  memberSlug: 'acme-corp',
  logoUrl: 'https://example.com/acme.svg',
  tier: 'Gold',
  timestamp: '2024-06-01T00:00:00Z',
  description: 'Acme Corp joined as a Gold member.',
};

const fullMember: SafeMember = {
  name: 'Acme Corp',
  slug: 'acme-corp',
  description: 'A great cloud native company.',
  homepageUrl: 'https://acme.example.com',
  logoUrl: 'https://example.com/acme.svg',
  tier: 'Gold',
  isEndUser: true,
  joinedAt: '2024-06-01',
  city: 'Austin',
  country: 'United States',
  countryFlag: '🇺🇸',
  industries: ['Cloud', 'Software'],
  totalFunding: 500_000_000,
  updatedAt: '2024-06-01',
};

describe('renderChangelogEvent — minimal (no member)', () => {
  it('includes member-event-card class', () => {
    const html = renderChangelogEvent(baseEvent);
    expect(html).toContain('member-event-card');
  });

  it('renders the member name', () => {
    const html = renderChangelogEvent(baseEvent);
    expect(html).toContain('Acme Corp');
  });

  it('renders joined event badge with label', () => {
    const html = renderChangelogEvent(baseEvent);
    expect(html).toContain('Joined');
  });

  it('renders joined event with green color', () => {
    const html = renderChangelogEvent(baseEvent);
    expect(html).toContain('#00A86B');
  });

  it('renders left event with red color', () => {
    const left: MemberEvent = { ...baseEvent, id: 'evt-2', type: 'left' };
    const html = renderChangelogEvent(left);
    expect(html).toContain('#ef4444');
    expect(html).toContain('Left');
  });

  it('renders tier_changed event with gold color', () => {
    const changed: MemberEvent = { ...baseEvent, id: 'evt-3', type: 'tier_changed', oldTier: 'Silver' };
    const html = renderChangelogEvent(changed);
    expect(html).toContain('#FFB300');
    expect(html).toContain('Tier Changed');
  });

  it('renders tier_changed event with old tier', () => {
    const changed: MemberEvent = { ...baseEvent, id: 'evt-4', type: 'tier_changed', oldTier: 'Silver' };
    const html = renderChangelogEvent(changed);
    expect(html).toContain('Silver');
  });

  it('renders updated event with blue color', () => {
    const updated: MemberEvent = { ...baseEvent, id: 'evt-5', type: 'updated' };
    const html = renderChangelogEvent(updated);
    expect(html).toContain('#0086FF');
    expect(html).toContain('Updated');
  });

  it('renders logo img tag', () => {
    const html = renderChangelogEvent(baseEvent);
    expect(html).toContain('src="https://example.com/acme.svg"');
  });

  it('renders tier badge', () => {
    const html = renderChangelogEvent(baseEvent);
    expect(html).toContain('Gold');
  });

  it('renders data-type attribute', () => {
    const html = renderChangelogEvent(baseEvent);
    expect(html).toContain('data-type="joined"');
  });

  it('renders data-slug attribute', () => {
    const html = renderChangelogEvent(baseEvent);
    expect(html).toContain('data-slug="acme-corp"');
  });

  it('escapes XSS in member name', () => {
    const evil: MemberEvent = { ...baseEvent, id: 'xss', memberName: '<script>alert(1)</script>', memberSlug: 'evil' };
    const html = renderChangelogEvent(evil);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('renderChangelogEvent — rich (with SafeMember)', () => {
  it('renders homepage link when member has one', () => {
    const html = renderChangelogEvent(baseEvent, fullMember);
    expect(html).toContain('href="https://acme.example.com"');
  });

  it('renders member description', () => {
    const html = renderChangelogEvent(baseEvent, fullMember);
    expect(html).toContain('A great cloud native company.');
  });

  it('renders city and country', () => {
    const html = renderChangelogEvent(baseEvent, fullMember);
    expect(html).toContain('Austin');
    expect(html).toContain('United States');
  });

  it('renders country flag emoji', () => {
    const html = renderChangelogEvent(baseEvent, fullMember);
    expect(html).toContain('🇺🇸');
  });

  it('renders funding when present', () => {
    const html = renderChangelogEvent(baseEvent, fullMember);
    expect(html).toContain('$500M');
  });

  it('renders industries', () => {
    const html = renderChangelogEvent(baseEvent, fullMember);
    expect(html).toContain('Cloud');
  });

  it('still renders event badge in rich mode', () => {
    const html = renderChangelogEvent(baseEvent, fullMember);
    expect(html).toContain('Joined');
    expect(html).toContain('#00A86B');
  });
});
