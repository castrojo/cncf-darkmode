import { describe, it, expect } from 'vitest';
import { filterByTab, filterChangelogByTab } from '../../src/lib/tabs';
import type { SafeProject } from '../../src/lib/project-renderer';
import type { ChangelogEvent } from '../../src/lib/tabs';

const projects: SafeProject[] = [
  { name: 'K8s', slug: 'k8s', maturity: 'graduated', category: 'Orch', subcategory: '', logoUrl: '', updatedAt: '' },
  { name: 'Envoy', slug: 'envoy', maturity: 'graduated', category: 'Net', subcategory: '', logoUrl: '', updatedAt: '' },
  { name: 'Sandbox1', slug: 'sandbox1', maturity: 'sandbox', category: 'Test', subcategory: '', logoUrl: '', updatedAt: '' },
  { name: 'Incub1', slug: 'incub1', maturity: 'incubating', category: 'Test', subcategory: '', logoUrl: '', updatedAt: '' },
  { name: 'Arch1', slug: 'arch1', maturity: 'archived', category: 'Test', subcategory: '', logoUrl: '', updatedAt: '' },
];

const events: ChangelogEvent[] = [
  { id: '1', type: 'accepted',    projectSlug: 'k8s',      logoUrl: '', maturity: 'graduated',  timestamp: '2024-01-01T00:00:00Z', description: '' },
  { id: '2', type: 'accepted',    projectSlug: 'incub1',   logoUrl: '', maturity: 'incubating', timestamp: '2024-01-02T00:00:00Z', description: '' },
  { id: '3', type: 'accepted',    projectSlug: 'sandbox1', logoUrl: '', maturity: 'sandbox',    timestamp: '2024-01-03T00:00:00Z', description: '' },
  { id: '4', type: 'archived',    projectSlug: 'arch1',    logoUrl: '', maturity: 'archived', oldMaturity: 'sandbox', timestamp: '2024-01-04T00:00:00Z', description: '' },
  { id: '5', type: 'newsletter',  logoUrl: 'https://lwcn.dev/images/logo.svg', timestamp: '2024-01-05T00:00:00Z', description: 'Newsletter', lwcnTitle: 'Week 1', lwcnIssueUrl: 'https://lwcn.dev/newsletter/2024-week-1/' },
];

describe('filterByTab (projects)', () => {
  it('everyone excludes archived', () => {
    const result = filterByTab(projects, 'everyone');
    expect(result.some(p => p.maturity === 'archived')).toBe(false);
    expect(result.length).toBe(4);
  });

  it('graduated shows only graduated', () => {
    const result = filterByTab(projects, 'graduated');
    expect(result.every(p => p.maturity === 'graduated')).toBe(true);
    expect(result.length).toBe(2);
  });

  it('archived shows only archived', () => {
    const result = filterByTab(projects, 'archived');
    expect(result.every(p => p.maturity === 'archived')).toBe(true);
  });
});

describe('filterChangelogByTab', () => {
  it('everyone returns all events including newsletters', () => {
    const result = filterChangelogByTab(events, 'everyone');
    expect(result).toHaveLength(5);
    expect(result.some(e => e.type === 'newsletter')).toBe(true);
  });

  it('graduated returns only graduated events, no newsletters', () => {
    const result = filterChangelogByTab(events, 'graduated');
    expect(result.every(e => e.maturity === 'graduated')).toBe(true);
    expect(result.some(e => e.type === 'newsletter')).toBe(false);
  });

  it('sandbox includes events where oldMaturity matches (archived projects)', () => {
    const result = filterChangelogByTab(events, 'sandbox');
    // event id:3 (sandbox accepted) + event id:4 (oldMaturity === 'sandbox')
    expect(result.some(e => e.id === '3')).toBe(true);
    expect(result.some(e => e.id === '4')).toBe(true);
  });

  it('scoped tabs exclude newsletter events', () => {
    for (const tab of ['graduated', 'incubating', 'sandbox'] as const) {
      const result = filterChangelogByTab(events, tab);
      expect(result.some(e => e.type === 'newsletter')).toBe(false);
    }
  });
});
