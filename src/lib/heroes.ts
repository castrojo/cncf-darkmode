// djb2 hash — deterministic, same input always same output
export function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash;
}

export interface HeroItem {
  slug: string;
}

// Returns `count` heroes from pool, deduplicated by slug, rotating by day
export function heroSlots<T extends HeroItem>(pool: T[], count: number): T[] {
  if (pool.length === 0) return [];
  if (count <= 0) return [];

  // Dedup by slug
  const seen = new Set<string>();
  const unique = pool.filter(item => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });

  if (unique.length === 0) return [];
  const n = Math.min(count, unique.length);

  // Daily rotation: offset changes each day
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const offset = djb2(today) % unique.length;

  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    result.push(unique[(offset + i) % unique.length]);
  }
  return result;
}
