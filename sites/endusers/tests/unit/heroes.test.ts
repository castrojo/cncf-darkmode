import { describe, it, expect } from 'vitest';
import { selectHeroSets } from '../../src/lib/heroes';
import type { SafeMember } from '../../src/lib/member-renderer';

const mk = (name: string, tier: string): SafeMember => ({
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  tier,
  isEndUser: true,
  logoUrl: '',
  updatedAt: '',
  joinedAt: '2020-01-01',
});

const platinumPool  = Array.from({ length: 10 }, (_, i) => mk(`Platinum${i}`, 'Platinum'));
const goldPool      = Array.from({ length: 10 }, (_, i) => mk(`Gold${i}`, 'Gold'));
const silverPool    = Array.from({ length: 20 }, (_, i) => mk(`Silver${i}`, 'Silver'));
const academicPool  = Array.from({ length: 5 },  (_, i) => mk(`Academic${i}`, 'Academic'));
const nonprofitPool = Array.from({ length: 5 },  (_, i) => mk(`Nonprofit${i}`, 'Nonprofit'));
const allMembers    = [...platinumPool, ...goldPool, ...silverPool, ...academicPool, ...nonprofitPool];

describe('selectHeroSets', () => {
  const sets = selectHeroSets(allMembers);

  it('returns all 5 tab keys', () => {
    expect(Object.keys(sets)).toEqual(
      expect.arrayContaining(['everyone', 'platinum', 'gold', 'silver', 'academic'])
    );
  });

  it('everyone has exactly 6 heroes (2 platinum + 2 gold + 2 silver)', () => {
    expect(sets.everyone).toHaveLength(6);
  });

  it('platinum set is non-empty', () => {
    expect(sets.platinum.length).toBeGreaterThan(0);
  });

  it('gold set is non-empty', () => {
    expect(sets.gold.length).toBeGreaterThan(0);
  });

  it('silver set is non-empty', () => {
    expect(sets.silver.length).toBeGreaterThan(0);
  });

  it('academic set is non-empty', () => {
    expect(sets.academic.length).toBeGreaterThan(0);
  });

  it('platinum set contains only Platinum members', () => {
    expect(sets.platinum.every(m => m.tier === 'Platinum')).toBe(true);
  });

  it('gold set contains only Gold members', () => {
    expect(sets.gold.every(m => m.tier === 'Gold')).toBe(true);
  });

  it('silver set contains only Silver members', () => {
    expect(sets.silver.every(m => m.tier === 'Silver')).toBe(true);
  });

  it('academic set contains only Academic or Nonprofit members', () => {
    expect(sets.academic.every(m => m.tier === 'Academic' || m.tier === 'Nonprofit')).toBe(true);
  });

  it('returns empty sets gracefully when members list is empty', () => {
    const empty = selectHeroSets([]);
    expect(empty.everyone).toHaveLength(0);
    expect(empty.platinum).toHaveLength(0);
    expect(empty.silver).toHaveLength(0);
  });

  it('everyone set has no duplicate slugs', () => {
    const slugs = sets.everyone.map(m => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('per-tier sets have correct caps (platinum≤2, gold≤5, silver≤6, academic≤4)', () => {
    expect(sets.platinum.length).toBeLessThanOrEqual(2);
    expect(sets.gold.length).toBeLessThanOrEqual(5);
    expect(sets.silver.length).toBeLessThanOrEqual(6);
    expect(sets.academic.length).toBeLessThanOrEqual(4);
  });

  it('everyone composition: 2 Platinum + 2 Gold + 2 Silver = 6', () => {
    const tiers = sets.everyone.map(m => m.tier);
    const platCount = tiers.filter(t => t === 'Platinum').length;
    const goldCount  = tiers.filter(t => t === 'Gold').length;
    const silvCount  = tiers.filter(t => t === 'Silver').length;
    expect(platCount).toBe(2);
    expect(goldCount).toBe(2);
    expect(silvCount).toBe(2);
  });

  it('is deterministic (same output on repeated calls)', () => {
    const a = selectHeroSets(allMembers).everyone.map(m => m.slug);
    const b = selectHeroSets(allMembers).everyone.map(m => m.slug);
    expect(a).toEqual(b);
  });
});
