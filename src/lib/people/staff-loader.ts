// staff-loader.ts — lazy-loads staff person cards on first tab activation.
import { renderPersonCard, type PersonEvent } from './person-renderer';

const BASE = (document.documentElement.dataset.baseUrl ?? '/cncf-darkmode').replace(/\/$/, '');
const STAFF_URL = `${BASE}/data/people/staff-index.json`;

interface StaffEntry {
  name: string;
  github?: string;
  imageUrl?: string;
  bio?: string;
  pronouns?: string;
  company?: string;
  location?: string;
  countryFlag?: string;
  primaryBadge?: string;
  linkedin?: string;
  category: string | string[];
}

type LoadState = 'idle' | 'loading' | 'loaded';
let state: LoadState = 'idle';

export async function initStaffLoader(landscapeLogos: Record<string, string> = {}): Promise<void> {
  if (state !== 'idle') return;
  state = 'loading';

  const feed = document.getElementById('alpha-feed-staff');
  if (!feed) { state = 'idle'; return; }

  let entries: StaffEntry[];
  try {
    const res = await fetch(STAFF_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    entries = await res.json() as StaffEntry[];
  } catch {
    state = 'idle'; // allow retry on next tab click
    return;
  }

  // Sort alphabetically by name (matches previous SSR order)
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const s of entries) {
    const handle = s.github
      ? s.github.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '')
      : undefined;
    const event: PersonEvent = {
      id: `staff-${s.github ?? s.name}`,
      type: 'staff',
      timestamp: '',
      person: {
        name: s.name,
        handle,
        github: s.github,
        avatarUrl: s.imageUrl ?? (handle ? `https://avatars.githubusercontent.com/${handle}` : undefined),
        bio: s.bio,
        pronouns: s.pronouns,
        company: s.company,
        location: s.location,
        countryFlag: s.countryFlag,
        primaryBadge: s.primaryBadge,
        linkedin: s.linkedin,
        category: ['Staff'],
      },
    };
    feed.insertAdjacentHTML('beforeend', renderPersonCard(event, landscapeLogos));
  }

  state = 'loaded';
}
