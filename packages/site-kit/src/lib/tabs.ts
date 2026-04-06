export interface DataTabConfig<TabId extends string> {
  site: string; // 'projects', 'endusers', 'people' — used for localStorage key
  defaultTab: TabId;
  tabs: ReadonlyArray<{ id: TabId; selector: string }>;
  onActivate?: (tabId: TabId) => void;
}

export interface DomTabConfig {
  site: string;
  defaultTab: string;
  tabs: ReadonlyArray<{ id: string; selector: string; contentSelector: string }>;
  onActivate?: (tabId: string) => void;
}

export interface TabController<TabId extends string> {
  activeTab: () => TabId;
  activateTab: (tabId: TabId) => void;
  destroy: () => void;
}

function storageKey(site: string): string {
  return `cncf-${site}-tab`;
}

// Migrate legacy unprefixed key (people's bare 'active-tab') to prefixed key
function migrateLegacyKey(site: string, legacyKey: string): void {
  try {
    const old = localStorage.getItem(legacyKey);
    if (old !== null) {
      localStorage.setItem(storageKey(site), old);
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // localStorage unavailable
  }
}

function loadSavedTab<TabId extends string>(
  site: string,
  validIds: ReadonlyArray<TabId>,
  defaultTab: TabId
): TabId {
  try {
    const saved = localStorage.getItem(storageKey(site)) as TabId | null;
    if (saved && (validIds as ReadonlyArray<string>).includes(saved)) {
      return saved;
    }
  } catch {
    // localStorage unavailable
  }
  return defaultTab;
}

function saveTab(site: string, tabId: string): void {
  try {
    localStorage.setItem(storageKey(site), tabId);
  } catch {
    // localStorage unavailable
  }
}

function readHashTab<TabId extends string>(validIds: ReadonlyArray<TabId>): TabId | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '') as TabId;
  if (!hash) return null;
  return (validIds as ReadonlyArray<string>).includes(hash) ? hash : null;
}

function writeHash<TabId extends string>(tabId: TabId, defaultTab: TabId, mode: 'push' | 'replace'): void {
  if (typeof window === 'undefined') return;
  const base = `${window.location.pathname}${window.location.search}`;
  const url = tabId === defaultTab ? base : `${base}#${tabId}`;
  if (mode === 'replace') {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
}

// Data-filter mode (projects, endusers) — tabs filter a data array
export function initDataTabs<TabId extends string>(
  config: DataTabConfig<TabId>
): TabController<TabId> {
  const validIds = config.tabs.map(t => t.id) as ReadonlyArray<TabId>;
  const hasHash = typeof window !== 'undefined' && window.location.hash.length > 1;
  const hashTab = readHashTab(validIds);
  let current = hasHash
    ? (hashTab ?? config.defaultTab)
    : loadSavedTab(config.site, validIds, config.defaultTab);

  const tabEls = config.tabs
    .map(t => ({ id: t.id, el: document.querySelector(t.selector) as HTMLElement | null }))
    .filter(t => t.el !== null);

  const activate = (tabId: TabId, mode: 'push' | 'replace' | 'none' = 'push') => {
    current = tabId;
    saveTab(config.site, tabId);
    if (mode !== 'none') {
      writeHash(tabId, config.defaultTab, mode);
    }
    tabEls.forEach(t => {
      t.el!.classList.toggle('active', t.id === tabId);
    });
    config.onActivate?.(tabId);
  };

  // Wire click handlers
  const clickHandlers: Array<{ el: HTMLElement; handler: EventListener }> = [];
  tabEls.forEach(({ id, el }) => {
    const handler = () => activate(id, 'push');
    el!.addEventListener('click', handler);
    clickHandlers.push({ el: el!, handler });
  });

  const hashHandler = () => {
    const hashTab = readHashTab(validIds);
    if (hashTab && hashTab !== current) {
      activate(hashTab, 'none');
      return;
    }
    if (!hashTab && current !== config.defaultTab) {
      activate(config.defaultTab, 'none');
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', hashHandler);
  }

  // Activate initial tab
  activate(current, 'replace');

  return {
    activeTab: () => current,
    activateTab: (tabId: TabId) => activate(tabId, 'push'),
    destroy: () => {
      clickHandlers.forEach(({ el, handler }) => el.removeEventListener('click', handler));
      if (typeof window !== 'undefined') {
        window.removeEventListener('hashchange', hashHandler);
      }
    },
  };
}

// DOM-toggle mode (people) — tabs show/hide DOM sections
export function initDomTabs(config: DomTabConfig): TabController<string> {
  let current = loadSavedTab(config.site, config.tabs.map(t => t.id), config.defaultTab);

  const tabEls = config.tabs.map(t => ({
    id: t.id,
    tab: document.querySelector(t.selector) as HTMLElement | null,
    content: document.querySelector(t.contentSelector) as HTMLElement | null,
  }));

  const activate = (tabId: string) => {
    current = tabId;
    saveTab(config.site, tabId);
    tabEls.forEach(t => {
      const isActive = t.id === tabId;
      t.tab?.classList.toggle('active', isActive);
      if (t.content) {
        t.content.style.display = isActive ? '' : 'none';
      }
    });
    config.onActivate?.(tabId);
  };

  const clickHandlers: Array<{ el: HTMLElement; handler: EventListener }> = [];
  tabEls.forEach(({ id, tab }) => {
    if (!tab) return;
    const handler = () => activate(id);
    tab.addEventListener('click', handler);
    clickHandlers.push({ el: tab, handler });
  });

  activate(current);

  return {
    activeTab: () => current,
    activateTab: (id: string) => activate(id),
    destroy: () => {
      clickHandlers.forEach(({ el, handler }) => el.removeEventListener('click', handler));
    },
  };
}

// Export migration helper for sites that need it
export { migrateLegacyKey };
