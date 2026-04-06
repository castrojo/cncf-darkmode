/**
 * arch-search.ts
 *
 * Client-side MiniSearch index for Reference Architecture cards.
 * Reads data attributes injected by renderArchCard() — no separate JSON payload.
 *
 * Usage:
 *   initArchSearch()          — build index from DOM (lazy; idempotent)
 *   searchArchSlugs(query)    — returns Set<string> of matching slugs, or null if query empty
 *   resetArchSearch()         — clear index (call before re-init if DOM changes)
 */

import MiniSearch from 'minisearch';

interface ArchDoc {
  id: string;       // data-slug
  searchText: string; // data-search-text
}

let ms: MiniSearch<ArchDoc> | null = null;

/** Build the MiniSearch index from rendered .arch-card DOM elements. */
export function initArchSearch(): void {
  if (ms !== null) return; // already initialised

  ms = new MiniSearch<ArchDoc>({
    fields: ['searchText'],
    storeFields: ['id'],
    idField: 'id',
    searchOptions: {
      fuzzy: 0.2,
      prefix: true,
      boost: { searchText: 1 },
    },
  });

  const docs: ArchDoc[] = [];
  document.querySelectorAll<HTMLElement>('.arch-card[data-slug]').forEach(card => {
    const id = card.dataset.slug ?? '';
    const searchText = card.dataset.searchText ?? '';
    if (id) docs.push({ id, searchText });
  });

  ms.addAll(docs);
}

/**
 * Search the arch index for a query string.
 * Returns a Set of matching slugs, or null if the query is empty (show all).
 */
export function searchArchSlugs(query: string): Set<string> | null {
  if (!query.trim()) return null;
  if (!ms) initArchSearch();
  const results = ms!.search(query);
  return new Set(results.map(r => r.id as string));
}

/** Clear the index so initArchSearch() rebuilds on next call. */
export function resetArchSearch(): void {
  ms = null;
}
