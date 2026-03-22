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

// Data-filter mode (projects, endusers) — tabs filter a data array
export function initDataTabs<TabId extends string>(
  config: DataTabConfig<TabId>
): TabController<TabId> {
  const validIds = config.tabs.map(t => t.id) as ReadonlyArray<TabId>;
  let current = loadSavedTab(config.site, validIds, config.defaultTab);

  const tabEls = config.tabs
    .map(t => ({ id: t.id, el: document.querySelector(t.selector) as HTMLElement | null }))
    .filter(t => t.el !== null);

  const activate = (tabId: TabId) => {
    current = tabId;
    saveTab(config.site, tabId);
    tabEls.forEach(t => {
      t.el!.classList.toggle('active', t.id === tabId);
    });
    config.onActivate?.(tabId);
  };

  // Wire click handlers
  const clickHandlers: Array<{ el: HTMLElement; handler: EventListener }> = [];
  tabEls.forEach(({ id, el }) => {
    const handler = () => activate(id);
    el!.addEventListener('click', handler);
    clickHandlers.push({ el: el!, handler });
  });

  // Activate initial tab
  activate(current);

  return {
    activeTab: () => current,
    activateTab: activate,
    destroy: () => {
      clickHandlers.forEach(({ el, handler }) => el.removeEventListener('click', handler));
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
