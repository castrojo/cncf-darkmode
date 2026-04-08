// emeritus-loader.ts — lazy-loads emeritus person cards on first tab activation.
import { renderPersonCard, type PersonEvent } from './person-renderer';

const BASE = (document.documentElement.dataset.baseUrl ?? '/cncf-darkmode').replace(/\/$/, '');
const EMERITUS_URL = `${BASE}/data/people/people-emeritus.json`;

interface EmeritusEntry {
  handle?: string;
  name: string;
  removedDate?: string;
  category?: string | string[];
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type LoadState = 'idle' | 'loading' | 'loaded';
let state: LoadState = 'idle';

export async function initEmeritusLoader(landscapeLogos: Record<string, string> = {}): Promise<void> {
  if (state !== 'idle') return;
  state = 'loading';

  const feed = document.getElementById('emeritus-cards-feed');
  if (!feed) { state = 'idle'; return; }

  let entries: EmeritusEntry[];
  try {
    const res = await fetch(EMERITUS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    entries = await res.json() as EmeritusEntry[];
  } catch {
    state = 'idle'; // allow retry on next tab click
    return;
  }

  for (const e of entries) {
    if (e.handle) {
      const cats = Array.isArray(e.category) ? e.category : (e.category ? [e.category] : []);
      const event: PersonEvent = {
        id: `emeritus-${e.handle}`,
        type: 'removed',
        timestamp: e.removedDate ?? '',
        person: {
          name: e.name,
          handle: e.handle,
          github: `https://github.com/${e.handle}`,
          avatarUrl: `https://avatars.githubusercontent.com/${e.handle}`,
          category: cats,
        },
      };
      feed.insertAdjacentHTML('beforeend', renderPersonCard(event, landscapeLogos));
    } else {
      feed.insertAdjacentHTML('beforeend', `<div class="emeritus-name-row">${esc(e.name)}</div>`);
    }
  }

  state = 'loaded';
}
