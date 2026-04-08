import { createSearchSync, type SearchInstance } from '../search';
import type { SafeProject } from './project-renderer';

interface IndexedProject extends SafeProject {
  id: number;
  categoryStr: string;
  topicsStr: string;
}

let search: SearchInstance<IndexedProject> | null = null;
let allProjects: SafeProject[] = [];

export function initSearch(projects: SafeProject[]): void {
  allProjects = projects;
  const indexed: IndexedProject[] = projects.map((p, i) => ({
    ...p,
    id: i,
    categoryStr: `${p.category} ${p.subcategory}`,
    topicsStr: (p.topics ?? []).join(' '),
  }));
  search = createSearchSync(indexed, {
    fields: ['name', 'description', 'category', 'subcategory', 'categoryStr', 'topicsStr', 'primaryLanguage'],
    storeFields: Object.keys(indexed[0] ?? {}) as string[],
    boost: { name: 5, description: 2, category: 1.5 },
    fuzzy: 0,
  });
}

export function searchProjects(query: string): SafeProject[] {
  if (!query.trim() || !search) return [];
  return search.search(query).map(({ id: _id, categoryStr: _categoryStr, topicsStr: _topicsStr, ...project }) => project);
}

export function getAllProjects(): SafeProject[] {
  return allProjects;
}
