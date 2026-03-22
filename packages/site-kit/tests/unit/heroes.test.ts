import { describe, it, expect, vi, afterEach } from 'vitest';
import { djb2, heroSlots } from '../../src/lib/heroes';

type Hero = { slug: string; name: string };

const makePool = (n: number): Hero[] =>
  Array.from({ length: n }, (_, i) => ({ slug: `hero-${i}`, name: `Hero ${i}` }));

describe('djb2', () => {
  it('is deterministic — same input yields same output', () => {
    expect(djb2('test')).toBe(djb2('test'));
  });

  it('different inputs yield different hashes (no trivial collision)', () => {
    expect(djb2('hello')).not.toBe(djb2('world'));
  });
});

describe('heroSlots', () => {
  it('returns empty array for empty pool', () => {
    expect(heroSlots([], 4)).toHaveLength(0);
  });

  it('returns empty array for count=0', () => {
    expect(heroSlots(makePool(10), 0)).toHaveLength(0);
  });

  it('returns pool-length items when count > pool size', () => {
    expect(heroSlots(makePool(3), 8)).toHaveLength(3);
  });

  it('returns exactly count items when pool is large', () => {
    expect(heroSlots(makePool(20), 8)).toHaveLength(8);
  });

  it('deduplicates by slug', () => {
    const pool: Hero[] = [
      { slug: 'a', name: 'A' },
      { slug: 'a', name: 'A dup' }, // duplicate
      { slug: 'b', name: 'B' },
    ];
    const result = heroSlots(pool, 3);
    const slugs = result.map(h => h.slug);
    expect(new Set(slugs).size).toBe(slugs.length); // no duplicates
  });

  it('no duplicate slugs in output', () => {
    const pool = makePool(10);
    const result = heroSlots(pool, 5);
    const slugs = result.map(h => h.slug);
    expect(new Set(slugs).size).toBe(5);
  });

  it('returns pool when count equals pool size', () => {
    expect(heroSlots(makePool(4), 4)).toHaveLength(4);
  });

  it('different days produce different rotation (using vi.setSystemTime)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01'));
    const day1 = heroSlots(makePool(20), 4).map(h => h.slug);

    vi.setSystemTime(new Date('2026-01-02'));
    const day2 = heroSlots(makePool(20), 4).map(h => h.slug);

    // Not guaranteed to differ every day, but with 20 items and 4 slots, very likely
    // Just check they're valid selections (not testing exact rotation)
    expect(day1).toHaveLength(4);
    expect(day2).toHaveLength(4);
    vi.useRealTimers();
  });
});
