import MiniSearch from 'minisearch';
import type { SafeMember } from './member-renderer';

interface Indexed extends SafeMember { id: number; industriesStr: string; }

let ms: MiniSearch | null = null;
let allMembers: SafeMember[] = [];

export function initSearch(members: SafeMember[]): void {
  allMembers = members;
  const instance = new MiniSearch<Indexed>({
    fields: ['name', 'description', 'city', 'country', 'industriesStr'],
    storeFields: ['name', 'slug', 'tier', 'isEndUser', 'logoUrl', 'updatedAt', 'description',
      'homepageUrl', 'twitterUrl', 'linkedInUrl', 'city', 'country', 'countryFlag',
      'employeesMin', 'employeesMax', 'totalFunding', 'industries', 'stockExchange', 'ticker',
      'joinedAt', 'region', 'companyType'],
    searchOptions: { fuzzy: 0.2, prefix: true, boost: { name: 5, description: 2, industriesStr: 1.5 } },
  });
  instance.addAll(members.map((m, i) => ({ ...m, id: i, industriesStr: (m.industries ?? []).join(' ') })));
  ms = instance;
}

export function searchMembers(query: string): SafeMember[] {
  if (!query.trim() || !ms) return [];
  return ms.search(query).map(r => r as unknown as SafeMember);
}

export function getAllMembers(): SafeMember[] { return allMembers; }
