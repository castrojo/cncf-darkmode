import { initDataTabs, migrateLegacyKey } from '../tabs';
export type TabId = 'everyone' | 'graduated' | 'incubating' | 'sandbox' | 'archived';
const TABS: TabId[] = ['everyone', 'graduated', 'incubating', 'sandbox', 'archived'];

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

const LEGACY_KEY = 'projects-active-tab';

export function initTabs(onTabChange: (tabId: TabId) => void): void {
  migrateLegacyKey('projects', LEGACY_KEY);
  initDataTabs<TabId>({
    site: 'projects',
    defaultTab: 'everyone',
    tabs: [
      { id: 'everyone', selector: '.section-link[data-tab="everyone"]' },
      { id: 'graduated', selector: '.section-link[data-tab="graduated"]' },
      { id: 'incubating', selector: '.section-link[data-tab="incubating"]' },
      { id: 'sandbox', selector: '.section-link[data-tab="sandbox"]' },
      { id: 'archived', selector: '.section-link[data-tab="archived"]' },
    ],
    onActivate: onTabChange,
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

export function tabFromNumber(n: number): TabId {
  return TABS[n - 1] ?? 'everyone';
}
