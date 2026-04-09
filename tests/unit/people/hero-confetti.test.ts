import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock canvas-confetti before import (hero-confetti.ts calls confetti at module
// load time via loadLogoShapes()). We mock the entire module.
// ---------------------------------------------------------------------------
vi.mock('canvas-confetti', () => {
  const confettiFn = vi.fn().mockResolvedValue(null);
  (confettiFn as any).shapeFromText = vi.fn().mockReturnValue('mock-shape');
  (confettiFn as any).shapeFromImage = vi.fn().mockReturnValue('mock-image-shape');
  return { default: confettiFn };
});

// Mock Image for logo loading (jsdom Image doesn't load external URLs)
(globalThis as any).Image = class {
  crossOrigin = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';
  get src() { return this._src; }
  set src(val: string) {
    this._src = val;
    // Immediately trigger error (no real network in tests)
    setTimeout(() => this.onerror?.(), 0);
  }
};

// ---------------------------------------------------------------------------
// Now import the module under test
// ---------------------------------------------------------------------------
import {
  tryDebounce,
  cardOrigin,
  preloadOnHover,
  fireHearts,
  fireStarburst,
  fireFountain,
  fireConfetti,
} from '../../../src/lib/people/hero-confetti';

// ---------------------------------------------------------------------------
// tryDebounce()
// ---------------------------------------------------------------------------
describe('tryDebounce()', () => {
  it('returns true on first call for a new element', () => {
    const card = document.createElement('div');
    expect(tryDebounce(card)).toBe(true);
  });

  it('returns false when called again within debounce window', () => {
    const card = document.createElement('div');
    tryDebounce(card); // first call
    expect(tryDebounce(card)).toBe(false);
  });

  it('tracks debounce separately per element', () => {
    const card1 = document.createElement('div');
    const card2 = document.createElement('div');
    tryDebounce(card1);
    expect(tryDebounce(card2)).toBe(true); // different element, should succeed
  });

  it('allows firing again after debounce window passes', async () => {
    vi.useFakeTimers();
    const card = document.createElement('div');
    tryDebounce(card);
    // Advance time by more than DEBOUNCE_MS (300ms)
    vi.advanceTimersByTime(400);
    expect(tryDebounce(card)).toBe(true);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// cardOrigin()
// ---------------------------------------------------------------------------
describe('cardOrigin()', () => {
  let card: HTMLElement;

  beforeEach(() => {
    card = document.createElement('div');
    document.body.appendChild(card);
    // Mock getBoundingClientRect
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 200, width: 200, height: 100,
      right: 300, bottom: 300, x: 100, y: 200,
      toJSON: () => ({}),
    });
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('calculates x as center of card / window width', () => {
    const origin = cardOrigin(card);
    // center x = 100 + 200/2 = 200; x fraction = 200/1000 = 0.2
    expect(origin.x).toBeCloseTo(0.2);
  });

  it('calculates y at default yFraction=0.5', () => {
    const origin = cardOrigin(card);
    // y at 0.5 = 200 + 100*0.5 = 250; y fraction = 250/800 = 0.3125
    expect(origin.y).toBeCloseTo(0.3125);
  });

  it('calculates y at custom yFraction=0.3', () => {
    const origin = cardOrigin(card, 0.3);
    // y at 0.3 = 200 + 100*0.3 = 230; y fraction = 230/800 = 0.2875
    expect(origin.y).toBeCloseTo(0.2875);
  });

  it('returns an object with x and y properties', () => {
    const origin = cardOrigin(card);
    expect(typeof origin.x).toBe('number');
    expect(typeof origin.y).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// preloadOnHover()
// ---------------------------------------------------------------------------
describe('preloadOnHover()', () => {
  let card: HTMLElement;

  beforeEach(() => {
    card = document.createElement('div');
    document.body.appendChild(card);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not throw when called', () => {
    expect(() => preloadOnHover(card)).not.toThrow();
  });

  it('attaches event listeners without error', () => {
    const addSpy = vi.spyOn(card, 'addEventListener');
    preloadOnHover(card);
    expect(addSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function), expect.anything());
    expect(addSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), expect.anything());
  });
});

// ---------------------------------------------------------------------------
// fireHearts() / fireStarburst() / fireFountain() / fireConfetti()
// These call tryDebounce first, so use fresh elements for each test.
// ---------------------------------------------------------------------------
describe('fireHearts()', () => {
  it('does not throw', () => {
    const card = document.createElement('div');
    document.body.appendChild(card);
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 100, height: 100,
      right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    expect(() => fireHearts(card)).not.toThrow();
    document.body.removeChild(card);
  });

  it('returns early (no confetti call) if debounce blocks', async () => {
    const confetti = (await import('canvas-confetti')).default;
    const card = document.createElement('div');
    document.body.appendChild(card);
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 100, height: 100,
      right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    const callCountBefore = (confetti as any).mock.calls.length;
    fireHearts(card); // First call — fires
    const callCountAfterFirst = (confetti as any).mock.calls.length;
    fireHearts(card); // Second call within debounce — no-op
    const callCountAfterSecond = (confetti as any).mock.calls.length;
    // Second call should not add new confetti calls
    expect(callCountAfterSecond).toBe(callCountAfterFirst);
    expect(callCountAfterFirst).toBeGreaterThan(callCountBefore);
    document.body.removeChild(card);
  });
});

describe('fireStarburst()', () => {
  it('does not throw', () => {
    const card = document.createElement('div');
    document.body.appendChild(card);
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 100, height: 100,
      right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    expect(() => fireStarburst(card)).not.toThrow();
    document.body.removeChild(card);
  });
});

describe('fireFountain()', () => {
  it('does not throw', () => {
    const card = document.createElement('div');
    card.style.setProperty('--card-accent', '#D62293');
    document.body.appendChild(card);
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 100, height: 100,
      right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    expect(() => fireFountain(card)).not.toThrow();
    document.body.removeChild(card);
  });
});

describe('fireConfetti()', () => {
  it('does not throw', () => {
    const card = document.createElement('div');
    document.body.appendChild(card);
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 100, height: 100,
      right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
    });
    expect(() => fireConfetti(card)).not.toThrow();
    document.body.removeChild(card);
  });
});
