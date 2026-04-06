import { describe, it, expect, beforeEach } from 'vitest';
import { filterByTab, initTabs } from '../../src/lib/tabs';
import type { SafeMember } from '../../src/lib/member-renderer';

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

const mk = (name: string, tier: string, isEndUser = false): SafeMember => ({
  name, slug: name.toLowerCase(), tier, isEndUser, logoUrl: '', updatedAt: '',
});

const members = [
  mk('Google', 'Platinum'), mk('Adidas', 'Silver', true), mk('MIT', 'Academic'),
  mk('CERN', 'Nonprofit'), mk('Apple', 'Gold'),
];

describe('filterByTab', () => {
  it('everyone returns all', () => expect(filterByTab(members, 'everyone')).toHaveLength(5));
  it('platinum returns platinum', () => expect(filterByTab(members, 'platinum').every(m => m.tier === 'Platinum')).toBe(true));
  it('academic returns academic and nonprofit', () => {
    const result = filterByTab(members, 'academic');
    expect(result.every(m => m.tier === 'Academic' || m.tier === 'Nonprofit')).toBe(true);
  });
  it('gold returns only gold', () => expect(filterByTab(members, 'gold').every(m => m.tier === 'Gold')).toBe(true));
  it('silver returns only silver', () => expect(filterByTab(members, 'silver').every(m => m.tier === 'Silver')).toBe(true));
  it('architectures returns empty list (separate arch grid)', () => {
    expect(filterByTab(members, 'architectures')).toHaveLength(0);
  });
});

describe('localStorage key', () => {
  beforeEach(() => {
    localStorageMock.clear();
    window.history.replaceState(null, '', '/');
    document.body.innerHTML = `
      <button class="section-link" data-tab="everyone">Everyone</button>
      <button class="section-link" data-tab="platinum">Platinum</button>
      <button class="section-link" data-tab="gold">Gold</button>
      <button class="section-link" data-tab="silver">Silver</button>
      <button class="section-link" data-tab="academic">Academic</button>
      <button class="section-link" data-tab="architectures">Architectures</button>
    `;
  });

  it('migrates endusers-active-tab to cncf-endusers-tab', () => {
    localStorage.setItem('endusers-active-tab', 'gold');
    initTabs(() => {});
    expect(localStorage.getItem('cncf-endusers-tab')).toBe('gold');
    expect(localStorage.getItem('endusers-active-tab')).toBeNull();
  });

  it('activates stored tab from cncf-endusers-tab', () => {
    localStorage.setItem('cncf-endusers-tab', 'silver');
    let activated: string | null = null;
    initTabs((tab) => { activated = tab; });
    expect(activated).toBe('silver');
    const active = document.querySelector('.section-link.active') as HTMLElement | null;
    expect(active?.dataset.tab).toBe('silver');
  });
});
