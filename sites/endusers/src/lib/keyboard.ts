import type { TabId } from './tabs';

interface Opts {
  onSearch: () => void; onHelp: () => void; onTheme: () => void;
  onTab: (n: number) => void; onEscape: () => void;
  onNext: () => void; onPrev: () => void;
  onOpenLink: () => void;
  onSitePrev?: () => void; onSiteNext?: () => void;
}

export function initKeyboard(opts: Opts): void {
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;

  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const inInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.tagName === 'SELECT';

    if (e.key === '/') {
      if (active !== searchInput) { e.preventDefault(); opts.onSearch(); }
      return;
    }

    if (e.key === '?' && !inInput) { opts.onHelp(); return; }

    if (e.key === 'Escape') {
      document.getElementById('keyboard-help-modal')?.classList.remove('visible');
      document.getElementById('keyboard-help-backdrop')?.classList.remove('visible');
      opts.onEscape();
      (document.activeElement as HTMLElement)?.blur();
      return;
    }

    if (!inInput) {
      if (e.key === 's') { e.preventDefault(); opts.onSearch(); }
      if (e.key === 't') opts.onTheme();
      if (e.key >= '1' && e.key <= '6') opts.onTab(parseInt(e.key));
      if (e.key === 'j') { e.preventDefault(); opts.onNext(); }
      if (e.key === 'k') { e.preventDefault(); opts.onPrev(); }
      if (e.key === 'h') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      if (e.key === ' ' && !e.shiftKey) { e.preventDefault(); window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' }); }
      if (e.key === ' ' && e.shiftKey) { e.preventDefault(); window.scrollBy({ top: -window.innerHeight * 0.85, behavior: 'smooth' }); }
      if (e.key === 'Tab') {
        const tabBtns = Array.from(document.querySelectorAll('.section-link[data-tab]'));
        if (tabBtns.length === 0) return;
        e.preventDefault();
        const activeBtn = tabBtns.find(b => b.classList.contains('active'));
        const cur = activeBtn ? tabBtns.indexOf(activeBtn) : 0;
        const next = e.shiftKey
          ? (cur - 1 + tabBtns.length) % tabBtns.length
          : (cur + 1) % tabBtns.length;
        (tabBtns[next] as HTMLElement).click();
        (tabBtns[next] as HTMLElement).scrollIntoView({ inline: 'nearest', block: 'nearest' });
      }
      if (e.key === 'o' || e.key === 'Enter') { opts.onOpenLink(); }
      if (e.key === '[') { e.preventDefault(); opts.onSitePrev?.(); }
      if (e.key === ']') { e.preventDefault(); opts.onSiteNext?.(); }
    }
  });
}

const TABS: TabId[] = ['everyone', 'platinum', 'gold', 'silver', 'academic', 'architectures'];
export function tabFromNumber(n: number): TabId { return TABS[n - 1] ?? 'everyone'; }
