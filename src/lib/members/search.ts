import { createSearchSync, type SearchInstance } from '../search';
import type { SafeMember } from './member-renderer';

interface Indexed extends SafeMember { id: number; industriesStr: string; }

let search: SearchInstance<Indexed> | null = null;
let allMembers: SafeMember[] = [];

export function initSearch(members: SafeMember[]): void {
  allMembers = members;
  const indexed = members.map((m, i) => ({ ...m, id: i, industriesStr: (m.industries ?? []).join(' ') }));
  search = createSearchSync(indexed, {
    fields: ['name', 'description', 'city', 'country', 'industriesStr'],
    storeFields: ['name', 'slug', 'tier', 'isEndUser', 'logoUrl', 'updatedAt', 'description',
      'homepageUrl', 'twitterUrl', 'linkedInUrl', 'city', 'country', 'countryFlag',
      'employeesMin', 'employeesMax', 'totalFunding', 'industries', 'stockExchange', 'ticker',
      'joinedAt', 'region', 'companyType', 'id', 'industriesStr'],
    boost: { name: 5, description: 2, industriesStr: 1.5 },
    fuzzy: 0,
  });
}

export function searchMembers(query: string): SafeMember[] {
  if (!query.trim() || !search) return [];
  return search.search(query, { prefix: true, fuzzy: 0.2 }).map(({ id: _id, industriesStr: _industriesStr, ...member }) => member);
}

export function getAllMembers(): SafeMember[] { return allMembers; }
