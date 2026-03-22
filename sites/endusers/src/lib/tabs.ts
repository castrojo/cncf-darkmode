export type TabId = 'everyone' | 'platinum' | 'gold' | 'silver' | 'academic' | 'architectures';

const STORAGE_KEY = 'cncf-endusers-tab';
const LEGACY_KEY  = 'endusers-active-tab';

function readSavedTab(): TabId {
  // Migrate legacy key on first read
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_KEY);
    return legacy as TabId;
  }
  return (localStorage.getItem(STORAGE_KEY) as TabId) ?? 'everyone';
}

export function initTabs(onTabChange: (tabId: TabId) => void): void {
  const saved = readSavedTab();
  activateTab(saved, onTabChange);
  document.querySelectorAll('.section-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = (btn as HTMLElement).dataset.tab as TabId;
      if (tab) { localStorage.setItem(STORAGE_KEY, tab); activateTab(tab, onTabChange); }
    });
  });
}

export function activateTab(tabId: TabId, onTabChange: (tabId: TabId) => void): void {
  document.querySelectorAll('.section-link').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabId);
  });
  onTabChange(tabId);
}

export function filterByTab(members: import('./member-renderer').SafeMember[], tabId: TabId): import('./member-renderer').SafeMember[] {
  switch (tabId) {
    case 'everyone':      return members;
    case 'platinum':      return members.filter(m => m.tier === 'Platinum');
    case 'gold':          return members.filter(m => m.tier === 'Gold');
    case 'silver':        return members.filter(m => m.tier === 'Silver');
    case 'academic':      return members.filter(m => m.tier === 'Academic' || m.tier === 'Nonprofit');
    // architectures tab shows a separate grid — member list is hidden entirely.
    case 'architectures': return [];
    default:              return members;
  }
}
