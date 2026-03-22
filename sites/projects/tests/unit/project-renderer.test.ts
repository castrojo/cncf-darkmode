import { describe, it, expect } from 'vitest';
import { renderCard, type SafeProject } from '../../src/lib/project-renderer';

const base: SafeProject = {
  name: 'Kubernetes',
  slug: 'kubernetes',
  description: 'Production-grade container orchestration',
  maturity: 'graduated',
  category: 'Orchestration & Management',
  subcategory: 'Scheduling & Orchestration',
  logoUrl: 'https://example.com/k8s.svg',
  stars: 110000,
  contributors: 3000,
  updatedAt: '2024-01-01',
};

describe('renderCard', () => {
  it('renders graduated card with gold badge', () => {
    const html = renderCard(base);
    expect(html).toContain('data-maturity="graduated"');
    expect(html).toContain('#FFB300');
    expect(html).toContain('Kubernetes');
  });

  it('renders sandbox card with gray badge', () => {
    const html = renderCard({ ...base, maturity: 'sandbox', name: 'MySandbox', slug: 'mysandbox' });
    expect(html).toContain('#8b949e');
    expect(html).toContain('Sandbox');
  });

  it('renders stars and contributors with icons', () => {
    const html = renderCard(base);
    expect(html).toContain('stat-item');
    expect(html).toContain('110.0k');
    expect(html).toContain('3.0k');
  });

  it('escapes XSS in name', () => {
    const html = renderCard({ ...base, name: '<script>alert(1)</script>', slug: 'xss' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('handles missing optional fields gracefully', () => {
    const html = renderCard({ name: 'Minimal', slug: 'minimal', maturity: 'sandbox', category: 'Test', subcategory: '', logoUrl: '', updatedAt: '' });
    expect(html).toContain('Minimal');
  });

  it('renders language and license tags', () => {
    const html = renderCard({ ...base, primaryLanguage: 'Go', license: 'Apache-2.0' });
    expect(html).toContain('tag-language');
    expect(html).toContain('Go');
    expect(html).toContain('tag-license');
    expect(html).toContain('Apache-2.0');
  });

  it('renders topic tags up to 5', () => {
    const html = renderCard({ ...base, topics: ['cloud', 'containers', 'orchestration', 'kubernetes', 'cncf', 'overflow-topic'] });
    expect(html).toContain('topic-tag');
    expect(html).toContain('cloud');
    expect(html).toContain('cncf');
    expect(html).not.toContain('overflow-topic');
  });

  it('renders audit badge when audited', () => {
    const html = renderCard({ ...base, lastAuditDate: '2024-06-01', lastAuditVendor: 'Trail of Bits' });
    expect(html).toContain('audit-badge');
    expect(html).toContain('Audited');
    expect(html).toContain('Trail of Bits');
  });

  it('renders activity info', () => {
    const html = renderCard({ ...base, lastCommitDate: '2024-12-01', lastReleaseDate: '2024-11-15' });
    expect(html).toContain('card-activity');
    expect(html).toContain('activity-item');
  });

  it('renders blog and twitter links', () => {
    const html = renderCard({ ...base, blogUrl: 'https://blog.example.com', twitterUrl: 'https://twitter.com/k8s' });
    expect(html).toContain('Blog');
    expect(html).toContain('Twitter');
  });

  it('topics overflow badge: 6 topics shows 5 and +1', () => {
    const html = renderCard({ ...base, topics: ['a', 'b', 'c', 'd', 'e', 'overflow-hidden'] });
    expect(html).toContain('topic-tag');
    expect(html).toContain('>a<');
    expect(html).toContain('>e<');
    expect(html).toContain('+1');
    expect(html).not.toContain('overflow-hidden');
  });

  it('summary fallback when no description', () => {
    const html = renderCard({ ...base, description: undefined, summary: 'This is a useful summary about the project.' });
    expect(html).toContain('This is a useful summary about the project.');
  });

  it('summary used when description shorter than 80 chars', () => {
    const html = renderCard({ ...base, description: 'Short desc', summary: 'This is the longer summary that should be used instead of the short description.' });
    expect(html).toContain('This is the longer summary that should be used instead of the short description.');
    expect(html).not.toContain('Short desc');
  });

  it('description wins over summary when >= 80 chars', () => {
    const longDesc = 'This is a long description that is definitely at least eighty characters in total length here.';
    const html = renderCard({ ...base, description: longDesc, summary: 'Summary text' });
    expect(html).toContain(longDesc);
    expect(html).not.toContain('Summary text');
  });

  it('renders forks stat', () => {
    const html = renderCard({ ...base, forks: 5000 });
    expect(html).toContain('stat-item');
    expect(html).toContain('5.0k');
    expect(html).toContain('Forks');
  });

  it('renders lfxSlug link', () => {
    const html = renderCard({ ...base, lfxSlug: 'kubernetes' });
    expect(html).toContain('href="https://insights.lfx.linuxfoundation.org/foundation/cncf/overview/github?project=kubernetes"');
    expect(html).toContain('LFX');
  });

  it('renders cloMonitorName link', () => {
    const html = renderCard({ ...base, cloMonitorName: 'kubernetes' });
    expect(html).toContain('href="https://clomonitor.io/projects/cncf/kubernetes"');
    expect(html).toContain('CLO');
  });

  it('renders lastReleaseDate in activity', () => {
    const html = renderCard({ ...base, lastReleaseDate: '2024-11-15' });
    expect(html).toContain('Released');
    expect(html).toContain('release-item');
  });

  it('renders firstCommitDate age badge with years', () => {
    const html = renderCard({ ...base, firstCommitDate: '2014-06-06' });
    expect(html).toContain('age-badge');
    expect(html).toContain('yr');
  });

  it('escapes XSS in lfxSlug and cloMonitorName', () => {
    const html = renderCard({ ...base, lfxSlug: '"><script>alert(1)</script>', cloMonitorName: '"><script>bad</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
