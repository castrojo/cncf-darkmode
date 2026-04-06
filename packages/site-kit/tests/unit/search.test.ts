import { describe, it, expect, vi } from 'vitest';
import { createSearchSync, createSearchAsync, escapeHtml } from '../../src/lib/search';

type Item = { slug: string; name: string; description: string };

const items: Item[] = [
  { slug: 'kubernetes', name: 'Kubernetes', description: 'Container orchestration' },
  { slug: 'prometheus', name: 'Prometheus', description: 'Metrics and alerting' },
  { slug: 'grafana', name: 'Grafana', description: 'Observability dashboards' },
  { slug: 'envoy', name: 'Envoy', description: 'Cloud native proxy' },
  { slug: 'xss-test', name: '<script>alert(1)</script>', description: 'XSS attempt' },
];

const config = {
  fields: ['name', 'description'],
  storeFields: ['slug', 'name', 'description'],
  boost: { name: 5 },
};

describe('escapeHtml', () => {
  it('escapes script tags', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });
});

describe('createSearchSync', () => {
  const search = createSearchSync(items, config);

  it('finds exact name match', () => {
    const results = search.search('Kubernetes');
    expect(results.some((r: Item) => r.slug === 'kubernetes')).toBe(true);
  });

  it('finds fuzzy match', () => {
    const results = search.search('kubernets'); // typo
    expect(results.length).toBeGreaterThan(0);
  });

  it('empty query returns empty array', () => {
    expect(search.search('')).toHaveLength(0);
  });

  it('whitespace-only query returns empty array', () => {
    expect(search.search('   ')).toHaveLength(0);
  });

  it('limit parameter is respected', () => {
    const limitedSearch = createSearchSync(items, { ...config, limit: 2 });
    const results = limitedSearch.search('cloud');
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('all() returns all items', () => {
    expect(search.all()).toHaveLength(items.length);
  });

  it('special characters in query do not throw', () => {
    expect(() => search.search('"kubernetes"')).not.toThrow();
    expect(() => search.search('kube\\')).not.toThrow();
    expect(() => search.search('(proxy)')).not.toThrow();
  });

  it('deduplicates duplicate slugs instead of throwing', () => {
    const withDuplicateSlug: Item[] = [
      ...items,
      { slug: 'kubernetes', name: 'Kubernetes Duplicate', description: 'duplicate entry' },
    ];
    const deduped = createSearchSync(withDuplicateSlug, config);
    expect(() => deduped.search('kubernetes')).not.toThrow();
    expect(deduped.all().filter((r: Item) => r.slug === 'kubernetes')).toHaveLength(1);
  });
});

describe('createSearchAsync', () => {
  it('returns empty before load', () => {
    const loader = vi.fn().mockResolvedValue(items);
    const search = createSearchAsync(loader, config);
    expect(search.search('kube')).toHaveLength(0);
    expect(search.ready()).toBe(false);
  });

  it('returns results after load', async () => {
    const loader = vi.fn().mockResolvedValue(items);
    const search = createSearchAsync(loader, config);
    await search.load();
    expect(search.ready()).toBe(true);
    expect(search.search('Kubernetes').length).toBeGreaterThan(0);
  });

  it('concurrent load() calls share one promise', async () => {
    const loader = vi.fn().mockResolvedValue(items);
    const search = createSearchAsync(loader, config);
    const p1 = search.load();
    const p2 = search.load();
    expect(p1).toBe(p2); // same promise reference
    await p1;
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('all() returns loaded items after load', async () => {
    const loader = vi.fn().mockResolvedValue(items);
    const search = createSearchAsync(loader, config);
    await search.load();
    expect(search.all()).toHaveLength(items.length);
  });

  it('deduplicates duplicate slugs in async loader output', async () => {
    const withDuplicateSlug: Item[] = [
      ...items,
      { slug: 'prometheus', name: 'Prometheus Duplicate', description: 'duplicate entry' },
    ];
    const loader = vi.fn().mockResolvedValue(withDuplicateSlug);
    const search = createSearchAsync(loader, config);
    await search.load();
    expect(search.all().filter((r: Item) => r.slug === 'prometheus')).toHaveLength(1);
  });
});
