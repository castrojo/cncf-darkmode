import { describe, it, expect } from 'vitest';
import { renderCard, renderShowcaseCard, type SafeMember } from '../../src/lib/member-renderer';

const base: SafeMember = {
  name: 'Google', slug: 'google', description: 'Cloud and tech company',
  tier: 'Platinum', isEndUser: false, logoUrl: 'https://example.com/google.svg',
  country: 'United States', city: 'Mountain View', updatedAt: '2024-01-01',
  joinedAt: '2016-03-15', industries: ['Cloud', 'Software'],
};

describe('renderCard', () => {
  it('renders platinum card', () => {
    const html = renderCard(base);
    expect(html).toContain('Platinum');
    expect(html).toContain('Google');
  });

  it('escapes XSS in name', () => {
    const html = renderCard({ ...base, name: '<script>xss</script>', slug: 'xss' });
    expect(html).not.toContain('<script>');
  });

  it('renders location', () => {
    const html = renderCard(base);
    expect(html).toContain('Mountain View');
  });

  it('renders industries', () => {
    const html = renderCard(base);
    expect(html).toContain('Cloud');
  });

  it('renders end user tier color', () => {
    const eu: SafeMember = { ...base, tier: 'End User', isEndUser: true, slug: 'eu-test' };
    const html = renderCard(eu);
    expect(html).toContain('End User');
    expect(html).toContain('#0086FF');
  });

  it('formats funding', () => {
    const funded: SafeMember = { ...base, slug: 'funded', totalFunding: 2_500_000_000 };
    const html = renderCard(funded);
    expect(html).toContain('$2.5B');
  });

  it('renders platinum tier color #E5E4E2', () => {
    const html = renderCard(base);
    expect(html).toContain('#E5E4E2');
  });

  it('renders gold tier color #FFB300', () => {
    const gold: SafeMember = { ...base, slug: 'gold-co', tier: 'Gold', isEndUser: false };
    const html = renderCard(gold);
    expect(html).toContain('#FFB300');
  });

  it('renders homepage link as href', () => {
    const m: SafeMember = { ...base, slug: 'link-test', homepageUrl: 'https://google.com' };
    const html = renderCard(m);
    expect(html).toContain('href="https://google.com"');
  });

  it('sets data-enduser="true" for end users', () => {
    const eu: SafeMember = { ...base, slug: 'eu-attr', tier: 'End User', isEndUser: true };
    const html = renderCard(eu);
    expect(html).toContain('data-enduser="true"');
  });

  it('renders country and city in location', () => {
    const m: SafeMember = { ...base, slug: 'flag-test', city: 'Toronto', country: 'Canada', countryFlag: 'CA' };
    const html = renderCard(m);
    expect(html).toContain('CA');
  });

  it('formats employee range with en-dash', () => {
    const m: SafeMember = { ...base, slug: 'emp-test', employeesMin: 1000, employeesMax: 5000 };
    const html = renderCard(m);
    expect(html).toContain('1,000');
    expect(html).toContain('5,000');
  });

  it('renders stock exchange and ticker', () => {
    const m: SafeMember = { ...base, slug: 'ticker-test', ticker: 'GOOG', stockExchange: 'NASDAQ' };
    const html = renderCard(m);
    expect(html).toContain('NASDAQ: GOOG');
  });

  it('renders silver tier color #C0C0C0', () => {
    const silver: SafeMember = { ...base, slug: 'silver-co', tier: 'Silver' };
    const html = renderCard(silver);
    expect(html).toContain('#C0C0C0');
  });

  it('renders academic tier color #7B2FBE', () => {
    const ac: SafeMember = { ...base, slug: 'academic-co', tier: 'Academic' };
    const html = renderCard(ac);
    expect(html).toContain('#7B2FBE');
  });

  it('renders logo img with src when logoUrl is present', () => {
    const m: SafeMember = { ...base, slug: 'logo-test', logoUrl: 'https://example.com/logo.svg' };
    const html = renderCard(m);
    expect(html).toContain('src="https://example.com/logo.svg"');
  });

  it('renders LinkedIn link when linkedInUrl is present', () => {
    const m: SafeMember = { ...base, slug: 'linkedin-test', linkedInUrl: 'https://linkedin.com/company/google' };
    const html = renderCard(m);
    expect(html).toContain('href="https://linkedin.com/company/google"');
    expect(html).toContain('LinkedIn');
  });

  it('renders Twitter link when twitterUrl is present', () => {
    const m: SafeMember = { ...base, slug: 'twitter-test', twitterUrl: 'https://twitter.com/google' };
    const html = renderCard(m);
    expect(html).toContain('href="https://twitter.com/google"');
    expect(html).toContain('Twitter');
  });

  it('does not render ticker section when ticker is absent', () => {
    const m: SafeMember = { ...base, slug: 'no-ticker' };
    const html = renderCard(m);
    expect(html).not.toContain('NASDAQ');
    expect(html).not.toContain('card-ticker');
  });

  it('does not render funding when totalFunding is absent', () => {
    const m: SafeMember = { ...base, slug: 'no-funding' };
    const html = renderCard(m);
    expect(html).not.toContain('Funding:');
  });

  it('does not render description paragraph when description is absent', () => {
    const m: SafeMember = { ...base, slug: 'no-desc', description: undefined };
    const html = renderCard(m);
    expect(html).not.toContain('card-description');
  });

  it('renders data-tier attribute lowercased', () => {
    const html = renderCard(base);
    expect(html).toContain('data-tier="platinum"');
  });

  it('does NOT render type-badge (for_profit/non_profit)', () => {
    const m: SafeMember = { ...base, slug: 'no-tb', companyType: 'for_profit' };
    const html = renderCard(m);
    expect(html).not.toContain('for_profit');
    expect(html).not.toContain('type-badge');
  });
});

describe('renderShowcaseCard', () => {
  it('has hero-card--showcase class', () => {
    const html = renderShowcaseCard(base);
    expect(html).toContain('hero-card--showcase');
  });

  it('has large logo box with showcase-logo-box class', () => {
    const html = renderShowcaseCard(base);
    expect(html).toContain('showcase-logo-box');
  });

  it('renders name as a link when homepageUrl present', () => {
    const m: SafeMember = { ...base, slug: 'sc-link', homepageUrl: 'https://google.com' };
    const html = renderShowcaseCard(m);
    expect(html).toContain('href="https://google.com"');
    expect(html).toContain('Google');
  });

  it('renders description', () => {
    const html = renderShowcaseCard(base);
    expect(html).toContain('Cloud and tech company');
  });

  it('renders country', () => {
    const html = renderShowcaseCard(base);
    expect(html).toContain('United States');
  });

  it('renders industry', () => {
    const html = renderShowcaseCard(base);
    expect(html).toContain('Cloud');
  });

  it('renders employee count', () => {
    const m: SafeMember = { ...base, slug: 'sc-emp', employeesMin: 10000, employeesMax: 50000 };
    const html = renderShowcaseCard(m);
    expect(html).toContain('10,000');
  });

  it('renders funding', () => {
    const m: SafeMember = { ...base, slug: 'sc-fund', totalFunding: 2_500_000_000 };
    const html = renderShowcaseCard(m);
    expect(html).toContain('$2.5B');
  });

  it('renders joined date', () => {
    const html = renderShowcaseCard(base);
    expect(html).toContain('March 2016');
  });

  it('renders LinkedIn link', () => {
    const m: SafeMember = { ...base, slug: 'sc-li', linkedInUrl: 'https://linkedin.com/company/google' };
    const html = renderShowcaseCard(m);
    expect(html).toContain('href="https://linkedin.com/company/google"');
    expect(html).toContain('LinkedIn');
  });

  it('does NOT render type-badge (for_profit/non_profit)', () => {
    const m: SafeMember = { ...base, slug: 'sc-type', companyType: 'for_profit' };
    const html = renderShowcaseCard(m);
    expect(html).not.toContain('for_profit');
    expect(html).not.toContain('type-badge');
  });

  it('has tier accent color as CSS variable', () => {
    const html = renderShowcaseCard(base);
    expect(html).toContain('#E5E4E2'); // Platinum color
  });

  it('renders logo img src', () => {
    const html = renderShowcaseCard(base);
    expect(html).toContain('https://example.com/google.svg');
  });

  it('escapes XSS in name', () => {
    const html = renderShowcaseCard({ ...base, name: '<script>xss</script>', slug: 'xss-sc' });
    expect(html).not.toContain('<script>');
  });
});
