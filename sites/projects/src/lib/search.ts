import MiniSearch from 'minisearch';
import type { SafeProject } from './project-renderer';

interface IndexedProject extends SafeProject {
  id: number;
  categoryStr: string;
  topicsStr: string;
}

let miniSearch: MiniSearch | null = null;
let allProjects: SafeProject[] = [];

export function initSearch(projects: SafeProject[]): void {
  allProjects = projects;
  const ms = new MiniSearch<IndexedProject>({
    fields: ['name', 'description', 'category', 'subcategory', 'categoryStr', 'topicsStr', 'primaryLanguage'],
    storeFields: Object.keys(projects[0] ?? {}) as (keyof SafeProject)[],
    searchOptions: {
      fuzzy: 0.2,
      prefix: true,
      boost: { name: 5, description: 2, category: 1.5 },
    },
  });
  const indexed: IndexedProject[] = projects.map((p, i) => ({
    ...p,
    id: i,
    categoryStr: `${p.category} ${p.subcategory}`,
    topicsStr: (p.topics ?? []).join(' '),
  }));
  ms.addAll(indexed);
  miniSearch = ms;
}

export function searchProjects(query: string): SafeProject[] {
  if (!query.trim() || !miniSearch) return [];
  return miniSearch.search(query).map(r => r as unknown as SafeProject);
}

export function getAllProjects(): SafeProject[] {
  return allProjects;
}
