export type TabId = 'everyone' | 'graduated' | 'incubating' | 'sandbox' | 'archived';

export interface ChangelogEvent {
  id: string;
  type: string; // accepted|promoted|archived|updated|removed|newsletter
  projectName?: string;
  projectSlug?: string;
  logoUrl: string;
  maturity?: string;
  oldMaturity?: string;
  timestamp: string;
  description: string;
  lwcnIssueUrl?: string;
  lwcnTitle?: string;
  lwcnWelcome?: string;
  mentionedProjects?: Array<{ name: string; slug: string; logoUrl: string; maturity: string }>;
}

const TAB_STORAGE_KEY = 'cncf-projects-tab';
const LEGACY_KEY = 'projects-active-tab';

export function initTabs(onTabChange: (tabId: TabId) => void): void {
  // Migrate legacy key on first read
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      localStorage.setItem(TAB_STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    // localStorage unavailable
  }
  const savedTab = (localStorage.getItem(TAB_STORAGE_KEY) as TabId) ?? 'everyone';
  activateTab(savedTab, onTabChange);

  document.querySelectorAll('.section-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = (btn as HTMLElement).dataset.tab as TabId;
      if (tab) {
        try { localStorage.setItem(TAB_STORAGE_KEY, tab); } catch { /* unavailable */ }
        activateTab(tab, onTabChange);
      }
    });
  });
}

export function activateTab(tabId: TabId, onTabChange: (tabId: TabId) => void): void {
  document.querySelectorAll('.section-link').forEach(btn => {
    const active = (btn as HTMLElement).dataset.tab === tabId;
    btn.classList.toggle('active', active);
  });
  onTabChange(tabId);
}

export function filterByTab(projects: import('./project-renderer').SafeProject[], tabId: TabId): import('./project-renderer').SafeProject[] {
  if (tabId === 'everyone') return projects.filter(p => p.maturity !== 'archived');
  return projects.filter(p => p.maturity === tabId);
}

export function filterChangelogByTab(events: ChangelogEvent[], tabId: TabId): ChangelogEvent[] {
  if (tabId === 'everyone') return events;
  // Scoped tabs: exclude newsletter events; include project events where maturity or oldMaturity matches
  return events.filter(e =>
    e.type !== 'newsletter' &&
    (e.maturity === tabId || e.oldMaturity === tabId)
  );
}
