import type { TabId } from './tabs';

interface KeyboardOptions {
  searchInput: HTMLInputElement | null;
  onSearch: () => void;
  onHelp: () => void;
  onTheme: () => void;
  onTab: (n: number) => void;
  onEscape: () => void;
  onNext: () => void;
  onPrev: () => void;
  onScrollTop: () => void;
  onPageDown: () => void;
  onPageUp: () => void;
  onTabCycle: (reverse: boolean) => void;
  onOpen: () => boolean;
  onResetFocus?: () => void;
  onSitePrev?: () => void;
  onSiteNext?: () => void;
}

export function initKeyboard(opts: KeyboardOptions): void {
  document.addEventListener('keydown', (e) => {
    const active = document.activeElement as HTMLElement;
    const tag = active?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // '/' focuses search — skip if already in input
    if (e.key === '/') {
      if (active !== opts.searchInput) {
        e.preventDefault();
        opts.onSearch();
      }
      return;
    }

    if (e.key === '?' && !inInput) {
      opts.onHelp();
      return;
    }

    if (e.key === 'Escape') {
      opts.onEscape();
      active?.blur();
      opts.onResetFocus?.();
      return;
    }

    if (inInput) return;

    if (e.key === 's') { e.preventDefault(); opts.onSearch(); }
    else if (e.key === 't') { opts.onTheme(); }
    else if (e.key >= '1' && e.key <= '5') { opts.onTab(parseInt(e.key)); }
    else if (e.key === 'j') { e.preventDefault(); opts.onNext(); }
    else if (e.key === 'k') { e.preventDefault(); opts.onPrev(); }
    else if (e.key === 'h') { e.preventDefault(); opts.onScrollTop(); }
    else if (e.key === ' ' && !e.shiftKey) { e.preventDefault(); opts.onPageDown(); }
    else if (e.key === ' ' && e.shiftKey) { e.preventDefault(); opts.onPageUp(); }
    else if (e.key === 'Tab') { e.preventDefault(); opts.onTabCycle(e.shiftKey); }
    else if (e.key === '[') { opts.onSitePrev?.(); }
    else if (e.key === ']') { opts.onSiteNext?.(); }
    else if (e.key === 'o' || e.key === 'Enter') {
      if (opts.onOpen()) e.preventDefault();
    }
  });
}

const TABS: TabId[] = ['everyone', 'graduated', 'incubating', 'sandbox', 'archived'];
export function tabFromNumber(n: number): TabId {
  return TABS[n - 1] ?? 'everyone';
}
