import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initKeyboard } from '../../src/lib/keyboard';

// Setup DOM mocks
const mockInput = {
  focus: vi.fn(),
} as unknown as HTMLInputElement;

const makeEvent = (key: string, opts: Partial<KeyboardEvent> = {}): KeyboardEvent => {
  return {
    key,
    isComposing: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: vi.fn(),
    ...opts,
  } as unknown as KeyboardEvent;
};

let activeElement: HTMLElement | null = null;

const docListeners: Record<string, (e: KeyboardEvent) => void> = {};

beforeEach(() => {
  vi.clearAllMocks();
  activeElement = null;
  Object.defineProperty(document, 'activeElement', {
    get: () => activeElement,
    configurable: true,
  });
  Object.defineProperty(document, 'addEventListener', {
    value: vi.fn((type: string, handler: (e: KeyboardEvent) => void) => {
      docListeners[type] = handler;
    }),
    configurable: true,
  });
  Object.defineProperty(document, 'removeEventListener', {
    value: vi.fn((type: string) => {
      delete docListeners[type];
    }),
    configurable: true,
  });
});

const fire = (e: KeyboardEvent) => docListeners['keydown']?.(e);

const makeKeyboard = (tabCount = 5, cbs: Record<string, unknown> = {}) => {
  const callbacks = {
    onSearch: vi.fn(),
    onHelp: vi.fn(),
    onTheme: vi.fn(),
    onTab: vi.fn(),
    onEscape: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onScrollTop: vi.fn(),
    onPageDown: vi.fn(),
    onPageUp: vi.fn(),
    onTabCycle: vi.fn(),
    onOpen: vi.fn(),
    onSitePrev: vi.fn(),
    onSiteNext: vi.fn(),
    ...cbs,
  };
  const cleanup = initKeyboard({ tabCount, searchInput: mockInput }, callbacks);
  return { callbacks, cleanup };
};

describe('keyboard — IME guard', () => {
  it('e.isComposing blocks all shortcuts', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('/', { isComposing: true }));
    expect(callbacks.onSearch).not.toHaveBeenCalled();
  });
});

describe('keyboard — modifier guard', () => {
  it('e.ctrlKey blocks shortcuts', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('/', { ctrlKey: true }));
    expect(callbacks.onSearch).not.toHaveBeenCalled();
  });

  it('e.metaKey blocks shortcuts', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('k', { metaKey: true }));
    expect(callbacks.onNext).not.toHaveBeenCalled();
  });
});

describe('keyboard — input guard', () => {
  it('/ is no-op when already in input', () => {
    const { callbacks } = makeKeyboard();
    activeElement = document.createElement('input');
    fire(makeEvent('/'));
    expect(callbacks.onSearch).not.toHaveBeenCalled();
  });
});

describe('keyboard — shortcuts', () => {
  it('/ fires onSearch and focuses input', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('/'));
    expect(callbacks.onSearch).toHaveBeenCalled();
    expect(mockInput.focus).toHaveBeenCalled();
  });

  it('s fires onSearch', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('s'));
    expect(callbacks.onSearch).toHaveBeenCalled();
  });

  it('? fires onHelp', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('?'));
    expect(callbacks.onHelp).toHaveBeenCalled();
  });

  it('t fires onTheme', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('t'));
    expect(callbacks.onTheme).toHaveBeenCalled();
  });

  it('Escape fires onEscape', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('Escape'));
    expect(callbacks.onEscape).toHaveBeenCalled();
  });

  it('j fires onNext', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('j'));
    expect(callbacks.onNext).toHaveBeenCalled();
  });

  it('k fires onPrev', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('k'));
    expect(callbacks.onPrev).toHaveBeenCalled();
  });

  it('h fires onScrollTop', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('h'));
    expect(callbacks.onScrollTop).toHaveBeenCalled();
  });

  it('Space fires onPageDown', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent(' '));
    expect(callbacks.onPageDown).toHaveBeenCalled();
  });

  it('Shift+Space fires onPageUp', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent(' ', { shiftKey: true }));
    expect(callbacks.onPageUp).toHaveBeenCalled();
  });

  it('Tab fires onTabCycle(false)', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('Tab'));
    expect(callbacks.onTabCycle).toHaveBeenCalledWith(false);
  });

  it('Shift+Tab fires onTabCycle(true)', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('Tab', { shiftKey: true }));
    expect(callbacks.onTabCycle).toHaveBeenCalledWith(true);
  });

  it('Enter fires onOpen', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('Enter'));
    expect(callbacks.onOpen).toHaveBeenCalled();
  });

  it('o fires onOpen', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('o'));
    expect(callbacks.onOpen).toHaveBeenCalled();
  });

  it('[ fires onSitePrev', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent('['));
    expect(callbacks.onSitePrev).toHaveBeenCalled();
  });

  it('] fires onSiteNext', () => {
    const { callbacks } = makeKeyboard();
    fire(makeEvent(']'));
    expect(callbacks.onSiteNext).toHaveBeenCalled();
  });
});

describe('keyboard — tab numbers', () => {
  it('1 fires onTab(1)', () => {
    const { callbacks } = makeKeyboard(5);
    fire(makeEvent('1'));
    expect(callbacks.onTab).toHaveBeenCalledWith(1);
  });

  it('5 fires onTab(5) for tabCount=5', () => {
    const { callbacks } = makeKeyboard(5);
    fire(makeEvent('5'));
    expect(callbacks.onTab).toHaveBeenCalledWith(5);
  });

  it('6 is ignored when tabCount=5', () => {
    const { callbacks } = makeKeyboard(5);
    fire(makeEvent('6'));
    expect(callbacks.onTab).not.toHaveBeenCalled();
  });
});

describe('keyboard — cleanup', () => {
  it('cleanup removes event listener', () => {
    const { cleanup } = makeKeyboard();
    cleanup();
    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
