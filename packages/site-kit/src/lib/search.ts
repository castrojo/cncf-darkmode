import MiniSearch from 'minisearch';

export interface SearchConfig<T> {
  fields: string[];
  storeFields: string[];
  boost?: Record<string, number>;
  fuzzy?: number;
  prefix?: boolean;
  limit?: number;
  toIndexable?: (item: T) => Record<string, string>;
}

export interface SearchInstance<T> {
  search: (query: string) => T[];
  all: () => T[];
}

export interface AsyncSearchInstance<T> {
  search: (query: string) => T[];
  all: () => T[];
  ready: () => boolean;
  load: () => Promise<void>;
}

// HTML-escape to prevent XSS in innerHTML insertion
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildIndex<T extends { slug: string }>(
  items: T[],
  config: SearchConfig<T>
): MiniSearch<T> {
  const ms = new MiniSearch<T>({
    fields: config.fields,
    storeFields: config.storeFields,
    idField: 'slug',
    searchOptions: {
      fuzzy: config.fuzzy ?? 0.2,
      prefix: config.prefix ?? true,
      boost: config.boost,
    },
  });

  if (config.toIndexable) {
    const docs = items.map(item => ({
      ...config.toIndexable!(item),
      slug: item.slug,
    }));
    ms.addAll(docs as unknown as T[]);
  } else {
    ms.addAll(items);
  }

  return ms;
}

// Sync mode — data available at build time (projects, endusers)
export function createSearchSync<T extends { slug: string }>(
  items: T[],
  config: SearchConfig<T>
): SearchInstance<T> {
  const ms = buildIndex(items, config);
  const limit = config.limit ?? 50;

  return {
    search: (query: string): T[] => {
      const q = query.trim();
      if (!q) return [];
      try {
        return ms.search(q, { limit }) as unknown as T[];
      } catch {
        return [];
      }
    },
    all: () => items,
  };
}

// Async mode — data lazy-loaded at runtime (people)
export function createSearchAsync<T extends { slug: string }>(
  loader: () => Promise<T[]>,
  config: SearchConfig<T>
): AsyncSearchInstance<T> {
  let ms: MiniSearch<T> | null = null;
  let items: T[] = [];
  let loadPromise: Promise<void> | null = null;
  const limit = config.limit ?? 50;

  const load = (): Promise<void> => {
    if (loadPromise) return loadPromise;
    loadPromise = loader().then(data => {
      items = data;
      ms = buildIndex(data, config);
    });
    return loadPromise;
  };

  return {
    search: (query: string): T[] => {
      if (!ms) return [];
      const q = query.trim();
      if (!q) return [];
      try {
        return ms.search(q, { limit }) as unknown as T[];
      } catch {
        return [];
      }
    },
    all: () => items,
    ready: () => ms !== null,
    load,
  };
}
