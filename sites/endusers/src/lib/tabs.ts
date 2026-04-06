import { initDataTabs, migrateLegacyKey } from '@cncf/site-kit/lib/tabs';
export type TabId = 'everyone' | 'platinum' | 'gold' | 'silver' | 'academic' | 'architectures';
const TABS: TabId[] = ['everyone', 'platinum', 'gold', 'silver', 'academic', 'architectures'];

const LEGACY_KEY  = 'endusers-active-tab';

export function initTabs(onTabChange: (tabId: TabId) => void): void {
  migrateLegacyKey('endusers', LEGACY_KEY);
  initDataTabs<TabId>({
    site: 'endusers',
    defaultTab: 'everyone',
    tabs: [
      { id: 'everyone', selector: '.section-link[data-tab="everyone"]' },
      { id: 'platinum', selector: '.section-link[data-tab="platinum"]' },
      { id: 'gold', selector: '.section-link[data-tab="gold"]' },
      { id: 'silver', selector: '.section-link[data-tab="silver"]' },
      { id: 'academic', selector: '.section-link[data-tab="academic"]' },
      { id: 'architectures', selector: '.section-link[data-tab="architectures"]' },
    ],
    onActivate: onTabChange,
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

export function tabFromNumber(n: number): TabId {
  return TABS[n - 1] ?? 'everyone';
}
