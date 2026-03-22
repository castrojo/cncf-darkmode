import { describe, it, expect } from 'vitest';
import { renderArchCard, renderArchCards, type SafeArchitecture, type ArchProject } from '../../src/lib/architecture-renderer';

const baseArch: SafeArchitecture = {
  slug: 'adobe',
  title: 'Scaling Service Delivery with Cell-based Architecture',
  orgName: 'Adobe',
  orgTeam: 'Developer Platform',
  orgUrl: 'https://adobe.com',
  orgLogoUrl: 'https://raw.githubusercontent.com/cncf/architecture/main/content/en/architectures/adobe/adobe-logo.svg',
  orgDescription: 'Adobe is a global software company.',
  orgSize: '25,000+',
  userSize: '30,000+',
  industries: ['Software', 'Digital Media', 'Creative Tools'],
  tags: ['cell-based', 'kubernetes'],
  refArchTypes: ['CI/CD', 'Platform Engineering'],
  archUrl: 'https://architecture.cncf.io/architectures/adobe/',
  submittedAt: '2024-06-01',
  projects: [
    { name: 'Kubernetes', logoUrl: 'https://raw.githubusercontent.com/cncf/artwork/main/projects/kubernetes/icon/color/kubernetes-icon-color.svg', maturity: 'graduated', usingSince: '2020' },
    { name: 'Flux', logoUrl: 'https://raw.githubusercontent.com/cncf/artwork/main/projects/flux/icon/color/flux-icon-color.svg', maturity: 'graduated' },
    { name: 'Argo', logoUrl: 'https://raw.githubusercontent.com/cncf/artwork/main/projects/argo/icon/color/argo-icon-color.svg', maturity: 'graduated' },
  ],
};

describe('renderArchCard', () => {
  it('renders org name', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('Adobe');
  });

  it('renders title', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('Scaling Service Delivery with Cell-based Architecture');
  });

  it('renders 🏆 Reference Architecture badge', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('🏆 Reference Architecture');
  });

  it('renders org logo with correct src', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('src="https://raw.githubusercontent.com/cncf/architecture/main/content/en/architectures/adobe/adobe-logo.svg"');
  });

  it('does not render arch link in card (link lives in modal footer instead)', () => {
    const html = renderArchCard(baseArch);
    expect(html).not.toContain('href="https://architecture.cncf.io/architectures/adobe/"');
  });

  it('renders industry tags', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('Software');
    expect(html).toContain('Digital Media');
  });

  it('renders refarch types', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('CI/CD');
    expect(html).toContain('Platform Engineering');
  });

  it('renders org and user sizes', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('25,000+ org');
    expect(html).toContain('30,000+ users');
  });

  it('escapes XSS in org name', () => {
    const html = renderArchCard({ ...baseArch, orgName: '<script>xss</script>' });
    expect(html).not.toContain('<script>xss</script>');
    expect(html).toContain('&lt;script&gt;xss&lt;/script&gt;');
  });

  it('escapes XSS in title', () => {
    const html = renderArchCard({ ...baseArch, title: '"><img src=x onerror=alert(1)>' });
    // The dangerous chars are escaped — no raw unescaped HTML injection
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });

  it('renders project chip with graduated maturity color', () => {
    const html = renderArchCard(baseArch);
    // graduated = #00B5D8 teal
    expect(html).toContain('#00B5D8');
  });

  it('renders project chip with incubating maturity color', () => {
    const arch: SafeArchitecture = {
      ...baseArch,
      projects: [{ name: 'Backstage', maturity: 'incubating' }],
    };
    const html = renderArchCard(arch);
    expect(html).toContain('#F6AD55');
  });

  it('renders project chip with sandbox maturity color', () => {
    const arch: SafeArchitecture = {
      ...baseArch,
      projects: [{ name: 'SomeProject', maturity: 'sandbox' }],
    };
    const html = renderArchCard(arch);
    expect(html).toContain('#8b949e');
  });

  it('renders project name in ribbon chip', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('Kubernetes');
    expect(html).toContain('Flux');
  });

  it('renders gracefully with no projects', () => {
    const html = renderArchCard({ ...baseArch, projects: [] });
    // No ribbon rendered at all
    expect(html).not.toContain('arch-ribbon');
  });

  it('renders all projects without overflow badge when >6 projects', () => {
    const projects: ArchProject[] = Array.from({ length: 8 }, (_, i) => ({
      name: `Project${i}`,
      maturity: 'graduated',
    }));
    const html = renderArchCard({ ...baseArch, projects });
    // All projects are shown — no overflow cap or badge.
    for (let i = 0; i < 8; i++) {
      expect(html).toContain(`Project${i}`);
    }
    expect(html).not.toContain('more');
  });

  it('does not render overflow badge when exactly 6 projects', () => {
    const projects: ArchProject[] = Array.from({ length: 6 }, (_, i) => ({
      name: `Project${i}`,
      maturity: 'graduated',
    }));
    const html = renderArchCard({ ...baseArch, projects });
    expect(html).not.toContain('more');
  });

  it('renders data-slug attribute', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('data-slug="adobe"');
  });

  it('renders usingSince in chip title', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('since 2020');
  });

  it('renders description when present', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('Adobe is a global software company.');
  });

  it('omits description div when absent', () => {
    const html = renderArchCard({ ...baseArch, orgDescription: undefined });
    expect(html).not.toContain('arch-description');
  });

  it('renders submittedAt as <time> with datetime attr', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('class="arch-submitted"');
    expect(html).toContain('datetime="2024-06-01"');
    expect(html).toContain('Submitted 2024-06-01');
  });

  it('omits arch-submitted when submittedAt is absent', () => {
    const html = renderArchCard({ ...baseArch, submittedAt: undefined });
    expect(html).not.toContain('arch-submitted');
  });

  it('renders tags as arch-tag chips', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('arch-tag');
    expect(html).toContain('cell-based');
    expect(html).toContain('kubernetes');
  });

  it('omits arch-tags section when tags are absent', () => {
    const html = renderArchCard({ ...baseArch, tags: undefined });
    expect(html).not.toContain('arch-tag');
  });

  it('omits arch-tags section when tags array is empty', () => {
    const html = renderArchCard({ ...baseArch, tags: [] });
    expect(html).not.toContain('arch-tag');
  });

  it('renders data-search-text attribute containing orgName and title', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('data-search-text=');
    expect(html).toContain('Adobe');
    expect(html).toContain('Scaling Service Delivery');
  });

  it('renders data-industries attribute as comma-separated string', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('data-industries="Software,Digital Media,Creative Tools"');
  });

  it('renders data-reftypes attribute as comma-separated string', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('data-reftypes="CI/CD,Platform Engineering"');
  });

  it('renders data-tags attribute as comma-separated string', () => {
    const html = renderArchCard(baseArch);
    expect(html).toContain('data-tags="cell-based,kubernetes"');
  });

  it('escapes XSS in data-search-text', () => {
    const html = renderArchCard({ ...baseArch, orgName: '<script>xss</script>' });
    expect(html).not.toContain('<script>xss</script>');
    // The escaped form should appear somewhere in data-search-text
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders empty data-industries when industries absent', () => {
    const html = renderArchCard({ ...baseArch, industries: undefined });
    expect(html).toContain('data-industries=""');
  });

  it('renders empty data-tags when tags absent', () => {
    const html = renderArchCard({ ...baseArch, tags: undefined });
    expect(html).toContain('data-tags=""');
  });
});

describe('renderArchCards', () => {
  it('renders all architectures joined', () => {
    const arch2: SafeArchitecture = { ...baseArch, slug: 'allianz', orgName: 'Allianz', title: 'Cloud Native at Allianz' };
    const html = renderArchCards([baseArch, arch2]);
    expect(html).toContain('data-slug="adobe"');
    expect(html).toContain('data-slug="allianz"');
  });

  it('returns empty string for empty array', () => {
    expect(renderArchCards([])).toBe('');
  });
});
