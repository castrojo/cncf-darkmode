import { describe, it, expect } from 'vitest';
import { renderTimeline } from '../../src/lib/archived-timeline';
import type { SafeProject } from '../../src/lib/project-renderer';

const mk = (overrides: Partial<SafeProject> = {}): SafeProject => ({
  name: 'TestProject', slug: 'test-project', maturity: 'archived',
  category: 'Test', subcategory: '', logoUrl: '', updatedAt: '',
  ...overrides,
});

const two: SafeProject[] = [
  mk({ name: 'OldProject', slug: 'old-project', archivedDate: '2024-06-01' }),
  mk({ name: 'OlderProject', slug: 'older-project', archivedDate: '2023-03-15' }),
];

describe('renderTimeline', () => {
  it('sorts by archived date descending (recent first)', () => {
    const html = renderTimeline(two);
    expect(html.indexOf('OldProject')).toBeLessThan(html.indexOf('OlderProject'));
  });

  it('shows year chapter markers', () => {
    const html = renderTimeline(two);
    expect(html).toContain('2024');
    expect(html).toContain('2023');
  });

  it('year markers use timeline-year-badge class', () => {
    const html = renderTimeline(two);
    expect(html).toContain('timeline-year-badge');
  });

  it('returns empty state for no archived projects', () => {
    const html = renderTimeline([]);
    expect(html).toContain('No archived');
  });

  it('includes subtitle for non-empty list', () => {
    const html = renderTimeline(two);
    expect(html).toContain('archived-subtitle');
    expect(html).toContain('For every gardener');
  });

  it('shows numbered milestone nodes', () => {
    const html = renderTimeline(two);
    expect(html).toContain('timeline-node');
    expect(html).toContain('>1<');
    expect(html).toContain('>2<');
  });

  it('handles project with undefined archivedDate — sorts last', () => {
    const projects = [
      mk({ name: 'Dated', slug: 'dated', archivedDate: '2024-01-01' }),
      mk({ name: 'Undated', slug: 'undated', archivedDate: undefined }),
    ];
    const html = renderTimeline(projects);
    expect(html.indexOf('Dated')).toBeLessThan(html.indexOf('Undated'));
  });

  it('shows "Date unknown" for missing archivedDate', () => {
    const html = renderTimeline([mk({ archivedDate: undefined })]);
    expect(html).toContain('Date unknown');
  });

  it('shows lifespan strip when acceptedDate is present', () => {
    const html = renderTimeline([mk({
      archivedDate: '2024-06-01',
      acceptedDate: '2021-01-01',
    })]);
    expect(html).toContain('timeline-lifespan');
    expect(html).toContain('in CNCF');
  });

  it('omits lifespan strip when acceptedDate is missing', () => {
    const html = renderTimeline([mk({ archivedDate: '2024-06-01', acceptedDate: undefined })]);
    expect(html).not.toContain('timeline-lifespan');
  });

  it('shows peak maturity as Graduated when graduatedDate is set', () => {
    const html = renderTimeline([mk({
      archivedDate: '2024-06-01',
      graduatedDate: '2022-01-01',
    })]);
    expect(html).toContain('Graduated');
    expect(html).toContain('#FFB300');
  });

  it('shows peak maturity as Incubating when incubatingDate set but no graduatedDate', () => {
    const html = renderTimeline([mk({
      archivedDate: '2024-06-01',
      incubatingDate: '2021-01-01',
    })]);
    expect(html).toContain('Incubating');
    expect(html).toContain('#0086FF');
  });

  it('falls back to Sandbox peak maturity', () => {
    const html = renderTimeline([mk({ archivedDate: '2024-06-01' })]);
    expect(html).toContain('Sandbox');
  });

  it('escapes XSS in project name', () => {
    const html = renderTimeline([mk({ name: '<script>alert(1)</script>', slug: 'xss' })]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders GitHub and Website links when present', () => {
    const html = renderTimeline([mk({
      archivedDate: '2024-01-01',
      repoUrl: 'https://github.com/cncf/test',
      homepageUrl: 'https://test.cncf.io',
    })]);
    expect(html).toContain('GitHub');
    expect(html).toContain('Website');
  });

  it('renders single project without duplicate year marker', () => {
    const html = renderTimeline([mk({ archivedDate: '2024-03-01' })]);
    const count = (html.match(/timeline-year-badge/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('data-slug attribute is set on each timeline-item', () => {
    const html = renderTimeline(two);
    expect(html).toContain('data-slug="old-project"');
    expect(html).toContain('data-slug="older-project"');
  });
});
