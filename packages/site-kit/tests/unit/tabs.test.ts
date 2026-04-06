import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initDataTabs, initDomTabs, migrateLegacyKey } from '../../src/lib/tabs';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// DOM element mock factory
function makeEl(id: string) {
  const classList = new Set<string>();
  const listeners: Record<string, EventListener[]> = {};
  return {
    id,
    style: {} as CSSStyleDeclaration,
    classList: {
      toggle: (cls: string, force?: boolean) => {
        if (force === undefined) {
          classList.has(cls) ? classList.delete(cls) : classList.add(cls);
        } else if (force) {
          classList.add(cls);
        } else {
          classList.delete(cls);
        }
      },
      has: (cls: string) => classList.has(cls),
    },
    addEventListener: (type: string, handler: EventListener) => {
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(handler);
    },
    removeEventListener: (type: string, handler: EventListener) => {
      listeners[type] = (listeners[type] ?? []).filter(h => h !== handler);
    },
    click: () => {
      listeners['click']?.forEach(h => h(new Event('click')));
    },
    _listenerCount: (type: string) => (listeners[type] ?? []).length,
  };
}

type MockEl = ReturnType<typeof makeEl>;

// querySelector mock
let queryMap: Record<string, MockEl | null> = {};
Object.defineProperty(document, 'querySelector', {
  value: (sel: string) => queryMap[sel] ?? null,
  configurable: true,
});

beforeEach(() => {
  localStorageMock.clear();
  queryMap = {};
  window.history.replaceState(null, '', '/');
  vi.clearAllMocks();
});

describe('initDataTabs', () => {
  it('activates defaultTab on init when no localStorage', () => {
    const onActivate = vi.fn();
    const el1 = makeEl('tab-a');
    const el2 = makeEl('tab-b');
    queryMap['#tab-a'] = el1;
    queryMap['#tab-b'] = el2;

    initDataTabs({
      site: 'projects',
      defaultTab: 'a' as const,
      tabs: [{ id: 'a' as const, selector: '#tab-a' }, { id: 'b' as const, selector: '#tab-b' }],
      onActivate,
    });

    expect(onActivate).toHaveBeenCalledWith('a');
    expect(el1.classList.has('active')).toBe(true);
    expect(el2.classList.has('active')).toBe(false);
  });

  it('restores tab from localStorage', () => {
    localStorageMock.setItem('cncf-projects-tab', 'b');
    const onActivate = vi.fn();
    const el1 = makeEl('tab-a');
    const el2 = makeEl('tab-b');
    queryMap['#tab-a'] = el1;
    queryMap['#tab-b'] = el2;

    initDataTabs({
      site: 'projects',
      defaultTab: 'a' as const,
      tabs: [{ id: 'a' as const, selector: '#tab-a' }, { id: 'b' as const, selector: '#tab-b' }],
      onActivate,
    });

    expect(onActivate).toHaveBeenCalledWith('b');
    expect(el2.classList.has('active')).toBe(true);
  });

  it('prefers hash over localStorage on first load', () => {
    localStorageMock.setItem('cncf-projects-tab', 'a');
    window.history.replaceState(null, '', '/#b');
    const onActivate = vi.fn();
    const el1 = makeEl('tab-a');
    const el2 = makeEl('tab-b');
    queryMap['#tab-a'] = el1;
    queryMap['#tab-b'] = el2;

    initDataTabs({
      site: 'projects',
      defaultTab: 'a' as const,
      tabs: [{ id: 'a' as const, selector: '#tab-a' }, { id: 'b' as const, selector: '#tab-b' }],
      onActivate,
    });

    expect(onActivate).toHaveBeenCalledWith('b');
    expect(el2.classList.has('active')).toBe(true);
  });

  it('falls back to default tab when hash is invalid', () => {
    localStorageMock.setItem('cncf-projects-tab', 'b');
    window.history.replaceState(null, '', '/#invalid');
    const onActivate = vi.fn();
    const el1 = makeEl('tab-a');
    const el2 = makeEl('tab-b');
    queryMap['#tab-a'] = el1;
    queryMap['#tab-b'] = el2;

    initDataTabs({
      site: 'projects',
      defaultTab: 'a' as const,
      tabs: [{ id: 'a' as const, selector: '#tab-a' }, { id: 'b' as const, selector: '#tab-b' }],
      onActivate,
    });

    expect(onActivate).toHaveBeenCalledWith('a');
    expect(window.location.hash).toBe('');
    expect(el1.classList.has('active')).toBe(true);
  });

  it('saves tab to localStorage on activateTab', () => {
    const el1 = makeEl('tab-a');
    const el2 = makeEl('tab-b');
    queryMap['#tab-a'] = el1;
    queryMap['#tab-b'] = el2;

    const ctrl = initDataTabs({
      site: 'projects',
      defaultTab: 'a' as const,
      tabs: [{ id: 'a' as const, selector: '#tab-a' }, { id: 'b' as const, selector: '#tab-b' }],
    });

    ctrl.activateTab('b');
    expect(localStorageMock.getItem('cncf-projects-tab')).toBe('b');
    expect(window.location.hash).toBe('#b');
  });

  it('reacts to hashchange for back/forward navigation', () => {
    const onActivate = vi.fn();
    const el1 = makeEl('tab-a');
    const el2 = makeEl('tab-b');
    queryMap['#tab-a'] = el1;
    queryMap['#tab-b'] = el2;

    initDataTabs({
      site: 'projects',
      defaultTab: 'a' as const,
      tabs: [{ id: 'a' as const, selector: '#tab-a' }, { id: 'b' as const, selector: '#tab-b' }],
      onActivate,
    });

    window.history.pushState(null, '', '/#b');
    window.dispatchEvent(new Event('hashchange'));

    expect(onActivate).toHaveBeenLastCalledWith('b');
    expect(el2.classList.has('active')).toBe(true);
  });

  it('activeTab() returns current tab', () => {
    const el1 = makeEl('tab-a');
    queryMap['#tab-a'] = el1;

    const ctrl = initDataTabs({
      site: 'projects',
      defaultTab: 'a' as const,
      tabs: [{ id: 'a' as const, selector: '#tab-a' }],
    });

    expect(ctrl.activeTab()).toBe('a');
  });

  it('destroy removes click listeners', () => {
    const el1 = makeEl('tab-a');
    queryMap['#tab-a'] = el1;

    const ctrl = initDataTabs({
      site: 'projects',
      defaultTab: 'a' as const,
      tabs: [{ id: 'a' as const, selector: '#tab-a' }],
    });

    ctrl.destroy();
    expect(el1._listenerCount('click')).toBe(0);
  });
});

describe('initDomTabs', () => {
  it('hides non-active content sections on init', () => {
    const tab1 = makeEl('tab-a');
    const tab2 = makeEl('tab-b');
    const content1 = makeEl('content-a');
    const content2 = makeEl('content-b');
    queryMap['#tab-a'] = tab1;
    queryMap['#tab-b'] = tab2;
    queryMap['#content-a'] = content1;
    queryMap['#content-b'] = content2;

    initDomTabs({
      site: 'people',
      defaultTab: 'a',
      tabs: [
        { id: 'a', selector: '#tab-a', contentSelector: '#content-a' },
        { id: 'b', selector: '#tab-b', contentSelector: '#content-b' },
      ],
    });

    expect(content1.style.display).not.toBe('none');
    expect(content2.style.display).toBe('none');
  });

  it('shows content when activateTab called', () => {
    const tab1 = makeEl('tab-a');
    const tab2 = makeEl('tab-b');
    const content1 = makeEl('content-a');
    const content2 = makeEl('content-b');
    queryMap['#tab-a'] = tab1;
    queryMap['#tab-b'] = tab2;
    queryMap['#content-a'] = content1;
    queryMap['#content-b'] = content2;

    const ctrl = initDomTabs({
      site: 'people',
      defaultTab: 'a',
      tabs: [
        { id: 'a', selector: '#tab-a', contentSelector: '#content-a' },
        { id: 'b', selector: '#tab-b', contentSelector: '#content-b' },
      ],
    });

    ctrl.activateTab('b');
    expect(content2.style.display).not.toBe('none');
    expect(content1.style.display).toBe('none');
  });
});

describe('migrateLegacyKey', () => {
  it('migrates value from legacy key to prefixed key', () => {
    localStorageMock.setItem('old-tab-key', 'graduated');
    migrateLegacyKey('projects', 'old-tab-key');
    expect(localStorageMock.getItem('cncf-projects-tab')).toBe('graduated');
    expect(localStorageMock.getItem('old-tab-key')).toBeNull();
  });

  it('is a no-op when legacy key is absent', () => {
    migrateLegacyKey('projects', 'nonexistent-key');
    expect(localStorageMock.getItem('cncf-projects-tab')).toBeNull();
  });
});
