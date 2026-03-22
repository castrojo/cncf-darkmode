import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
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

// Mock matchMedia
const mqMock = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
Object.defineProperty(globalThis, 'window', {
  value: {
    matchMedia: vi.fn().mockReturnValue(mqMock),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

// Mock document
Object.defineProperty(globalThis, 'document', {
  value: { documentElement: { setAttribute: vi.fn() } },
  writable: true,
});

import { getTheme, setTheme, initTheme } from '../../src/lib/theme';

describe('theme', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    mqMock.matches = false;
  });

  it('getTheme returns system when nothing stored', () => {
    expect(getTheme()).toBe('system');
  });

  it('getTheme returns stored value', () => {
    localStorageMock.setItem('cncf-theme', 'dark');
    expect(getTheme()).toBe('dark');
  });

  it('setTheme light stores value and applies', () => {
    setTheme('light');
    expect(localStorageMock.getItem('cncf-theme')).toBe('light');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('setTheme dark stores value and applies', () => {
    setTheme('dark');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('setTheme system removes key and follows OS', () => {
    localStorageMock.setItem('cncf-theme', 'dark');
    mqMock.matches = false; // OS is light
    setTheme('system');
    expect(localStorageMock.getItem('cncf-theme')).toBeNull();
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('setTheme system with dark OS applies dark', () => {
    mqMock.matches = true;
    setTheme('system');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('initTheme returns cleanup function that removes listeners', () => {
    const cleanup = initTheme();
    expect(typeof cleanup).toBe('function');
    cleanup();
    expect(mqMock.removeEventListener).toHaveBeenCalled();
  });
});
