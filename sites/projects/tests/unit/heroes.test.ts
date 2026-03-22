import { describe, it, expect } from 'vitest';
import { selectHeroSets } from '../../src/lib/heroes';
import type { SafeProject } from '../../src/lib/project-renderer';

const mkProject = (name: string, maturity: string, accepted = '2020-01-01'): SafeProject => ({
  name, slug: name.toLowerCase(), maturity, category: 'Test', subcategory: '', logoUrl: '', updatedAt: '', acceptedDate: accepted,
});

const bigPool = [
  mkProject('Kubernetes',   'graduated'),
  mkProject('Envoy',        'graduated'),
  mkProject('Prometheus',   'graduated'),
  mkProject('Helm',         'graduated'),
  mkProject('Linkerd',      'incubating'),
  mkProject('Flux',         'incubating'),
  mkProject('Dapr',         'incubating'),
  mkProject('TestSandbox',  'sandbox'),
  mkProject('Archived',     'archived'),
];

describe('selectHeroSets', () => {
  it('selects graduated heroes from graduated pool only', () => {
    const sets = selectHeroSets(bigPool);
    expect(sets.graduated.every(p => p.maturity === 'graduated')).toBe(true);
  });

  it('returns empty arrays for empty pool', () => {
    const sets = selectHeroSets([]);
    expect(sets.graduated).toHaveLength(0);
    expect(sets.everyone).toHaveLength(0);
  });

  it('everyone set has exactly 8 heroes', () => {
    const sets = selectHeroSets(bigPool);
    expect(sets.everyone).toHaveLength(8);
  });

  it('everyone row 1 (first 4) are all graduated', () => {
    const sets = selectHeroSets(bigPool);
    expect(sets.everyone.slice(0, 4).every(p => p.maturity === 'graduated')).toBe(true);
  });

  it('everyone row 2 positions 5-7 are all incubating', () => {
    const sets = selectHeroSets(bigPool);
    expect(sets.everyone.slice(4, 7).every(p => p.maturity === 'incubating')).toBe(true);
  });

  it('everyone position 8 is sandbox', () => {
    const sets = selectHeroSets(bigPool);
    expect(sets.everyone[7].maturity).toBe('sandbox');
  });

  it('excludes archived from everyone set', () => {
    const sets = selectHeroSets(bigPool);
    expect(sets.everyone.every(p => p.maturity !== 'archived')).toBe(true);
  });
});
