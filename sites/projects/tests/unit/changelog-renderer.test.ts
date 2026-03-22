import { describe, it, expect } from 'vitest';
import { renderChangelogEvent, renderNewsletterItem } from '../../src/lib/changelog-renderer';
import type { ChangelogEvent } from '../../src/lib/tabs';
import type { SafeProject } from '../../src/lib/project-renderer';

const baseEvent: ChangelogEvent = {
  id: 'test-1',
  type: 'accepted',
  projectName: 'Kubernetes',
  projectSlug: 'kubernetes',
  logoUrl: 'https://example.com/k8s.svg',
  maturity: 'graduated',
  timestamp: '2024-01-01T00:00:00Z',
  description: 'Kubernetes was accepted as a CNCF project.',
};

// Full SafeProject with all the rich fields that must be rendered
const fullProject: SafeProject = {
  name: 'Kubernetes',
  slug: 'kubernetes',
  description: 'Production-grade container orchestration system used at scale worldwide.',
  maturity: 'graduated',
  category: 'Orchestration & Management',
  subcategory: 'Scheduling & Orchestration',
  logoUrl: 'https://example.com/k8s.svg',
  repoUrl: 'https://github.com/kubernetes/kubernetes',
  homepageUrl: 'https://kubernetes.io',
  stars: 110000,
  forks: 39000,
  contributors: 3500,
  primaryLanguage: 'Go',
  license: 'Apache-2.0',
  topics: ['orchestration', 'containers', 'cloud', 'cncf', 'kubernetes'],
  lfxSlug: 'kubernetes',
  cloMonitorName: 'kubernetes',
  lastReleaseDate: '2024-11-15T00:00:00Z',
  firstCommitDate: '2014-06-06T00:00:00Z',
  updatedAt: '2024-01-01',
};

describe('renderChangelogEvent — minimal (no project)', () => {
  it('renders changelog-event-card class', () => {
    const html = renderChangelogEvent(baseEvent);
    expect(html).toContain('changelog-event-card');
  });

  it('renders the project name', () => {
    const html = renderChangelogEvent(baseEvent);
    expect(html).toContain('Kubernetes');
  });

  it('renders the event type badge', () => {
    const html = renderChangelogEvent(baseEvent);
    expect(html).toContain('Accepted');
  });

  it('renders promoted event with old maturity', () => {
    const promoted: ChangelogEvent = {
      ...baseEvent, id: 'test-2', type: 'promoted',
      maturity: 'graduated', oldMaturity: 'incubating',
    };
    const html = renderChangelogEvent(promoted);
    expect(html).toContain('Promoted');
    expect(html).toContain('graduated');
  });

  it('renders removed event', () => {
    const removed: ChangelogEvent = { ...baseEvent, id: 'test-3', type: 'removed' };
    const html = renderChangelogEvent(removed);
    expect(html).toContain('Removed');
  });
});

// RICHNESS TESTS — these MUST fail before the fix, pass after
// These are the regression guard. Adding them RED-first enforces TDD.
describe('renderChangelogEvent — with full SafeProject (richness contract)', () => {
  // Stars, forks, contributors
  it('renders stars stat', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('stat-item');
    expect(html).toContain('110.0k');
  });

  it('renders forks stat', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('39.0k');
    expect(html).toContain('Forks');
  });

  it('renders contributors stat', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('3.5k');
    expect(html).toContain('Contributors');
  });

  // Action links
  it('renders GitHub link', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('href="https://github.com/kubernetes/kubernetes"');
    expect(html).toContain('>GitHub<');
  });

  it('renders homepage link', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('href="https://kubernetes.io"');
    expect(html).toContain('>Website<');
  });

  it('renders LFX Insights link', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('insights.lfx.linuxfoundation.org');
    expect(html).toContain('>LFX<');
  });

  it('renders CLO Monitor link', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('clomonitor.io/projects/cncf/kubernetes');
    expect(html).toContain('>CLO<');
  });

  // Description
  it('renders project description', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('Production-grade container orchestration');
  });

  // Taxonomy
  it('renders category', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('Orchestration &amp; Management');
  });

  // Language and license tags
  it('renders language tag', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('tag-language');
    expect(html).toContain('Go');
  });

  it('renders license tag', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('tag-license');
    expect(html).toContain('Apache-2.0');
  });

  // Topics
  it('renders topic tags', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('topic-tag');
    expect(html).toContain('orchestration');
    expect(html).toContain('containers');
  });

  // Logo size (64px, not 48px)
  it('renders 64px logo', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('width="64"');
    expect(html).toContain('height="64"');
  });

  // Age badge
  it('renders age badge from firstCommitDate', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('age-badge');
    expect(html).toContain('yr');
  });

  // Release activity
  it('renders last release date', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('Released');
    expect(html).toContain('release-item');
  });

  // Event badge still present alongside rich card
  it('still renders event type badge when project provided', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('Accepted');
  });

  // changelog-event-card class for keyboard nav compatibility
  it('rendered card has changelog-event-card class for keyboard nav', () => {
    const html = renderChangelogEvent(baseEvent, fullProject);
    expect(html).toContain('changelog-event-card');
  });
});

describe('renderNewsletterItem', () => {
  const newsletter: ChangelogEvent = {
    id: 'lwcn-1',
    type: 'newsletter',
    logoUrl: 'https://lwcn.dev/images/logo.svg',
    timestamp: '2024-01-08T00:00:00Z',
    description: 'This week: 52 releases, 200 news items.',
    lwcnTitle: 'Week 1 - January 2024',
    lwcnIssueUrl: 'https://lwcn.dev/newsletter/2024-week-1/',
  };

  it('renders a newsletter card with the newsletter-card class', () => {
    const html = renderNewsletterItem(newsletter);
    expect(html).toContain('newsletter-card');
  });

  it('renders the Newsletter badge', () => {
    const html = renderNewsletterItem(newsletter);
    expect(html).toContain('Newsletter');
  });

  it('renders the issue title', () => {
    const html = renderNewsletterItem(newsletter);
    expect(html).toContain('Week 1 - January 2024');
  });

  it('renders the LWCN logo', () => {
    const html = renderNewsletterItem(newsletter);
    expect(html).toContain('https://lwcn.dev/images/logo.svg');
  });

  it('renders a link to the issue', () => {
    const html = renderNewsletterItem(newsletter);
    expect(html).toContain('https://lwcn.dev/newsletter/2024-week-1/');
  });

  it('renders mentioned project chips when provided', () => {
    const withMentions: ChangelogEvent = {
      ...newsletter,
      mentionedProjects: [
        { name: 'Kubernetes', slug: 'kubernetes', logoUrl: 'https://k8s.io/logo.svg', maturity: 'graduated' },
      ],
    };
    const html = renderNewsletterItem(withMentions);
    expect(html).toContain('mentioned-chip');
    expect(html).toContain('Kubernetes');
  });
});
