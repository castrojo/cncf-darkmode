import { describe, it, expect, beforeEach } from 'vitest';
import { initSearch, searchMembers, getAllMembers } from '../../src/lib/search';
import type { SafeMember } from '../../src/lib/member-renderer';

const members: SafeMember[] = [
  { name: 'Acme Corp', slug: 'acme-corp', tier: 'Platinum', isEndUser: true, logoUrl: '', updatedAt: '', country: 'United States', description: 'Cloud infrastructure provider' },
  { name: 'Beta Systems', slug: 'beta-systems', tier: 'Gold', isEndUser: false, logoUrl: '', updatedAt: '', country: 'Germany', description: 'Enterprise software vendor' },
  { name: 'Cloud Nine', slug: 'cloud-nine', tier: 'Silver', isEndUser: true, logoUrl: '', updatedAt: '', country: 'Japan', description: 'Managed Kubernetes platform' },
  { name: 'Delta Dynamics', slug: 'delta-dynamics', tier: 'End User', isEndUser: true, logoUrl: '', updatedAt: '', description: 'Retail and e-commerce operator' },
  { name: 'Echo Inc', slug: 'echo-inc', tier: 'Silver', isEndUser: false, logoUrl: '', updatedAt: '', city: 'San Francisco', description: 'Observability tooling' },
];

describe('search', () => {
  beforeEach(() => initSearch(members));

  it('finds exact name match', () => {
    const results = searchMembers('Acme Corp');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Acme Corp');
  });

  it('finds fuzzy match on description', () => {
    const results = searchMembers('kubernetes');
    expect(results.some(r => r.slug === 'cloud-nine')).toBe(true);
  });

  it('returns empty array for empty query', () => {
    expect(searchMembers('')).toHaveLength(0);
  });

  it('does not crash on special characters', () => {
    expect(() => searchMembers('a[b]c(d)')).not.toThrow();
  });

  it('getAllMembers returns all members after init', () => {
    const all = getAllMembers();
    expect(all).toHaveLength(members.length);
    expect(all[0].name).toBe('Acme Corp');
  });
});
