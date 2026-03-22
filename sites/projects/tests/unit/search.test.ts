import { describe, it, expect, beforeEach } from 'vitest';
import { initSearch, searchProjects } from '../../src/lib/search';
import type { SafeProject } from '../../src/lib/project-renderer';

const projects: SafeProject[] = [
  { name: 'Kubernetes', slug: 'kubernetes', maturity: 'graduated', category: 'Orchestration', subcategory: 'Scheduling', description: 'Container orchestration', logoUrl: '', updatedAt: '' },
  { name: 'Prometheus', slug: 'prometheus', maturity: 'graduated', category: 'Observability', subcategory: 'Monitoring', description: 'Metrics and alerting', logoUrl: '', updatedAt: '' },
  { name: 'Sandbox Project', slug: 'sandbox-project', maturity: 'sandbox', category: 'Storage', subcategory: 'Key-Value', description: 'Key value store', logoUrl: '', updatedAt: '' },
];

describe('search', () => {
  beforeEach(() => initSearch(projects));

  it('finds exact name match', () => {
    const results = searchProjects('Kubernetes');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Kubernetes');
  });

  it('finds by description', () => {
    const results = searchProjects('metrics');
    expect(results.some(r => r.slug === 'prometheus')).toBe(true);
  });

  it('returns empty for empty query', () => {
    expect(searchProjects('')).toHaveLength(0);
  });
});
