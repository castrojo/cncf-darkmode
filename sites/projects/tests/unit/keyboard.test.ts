import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('keyboard shortcuts', () => {
  let handlers: {
    onSearch: ReturnType<typeof vi.fn>;
    onHelp: ReturnType<typeof vi.fn>;
    onTheme: ReturnType<typeof vi.fn>;
    onTab: ReturnType<typeof vi.fn>;
    onEscape: ReturnType<typeof vi.fn>;
  };
  let cleanup: (() => void) | undefined;

  beforeEach(async () => {
    cleanup?.();
    handlers = {
      onSearch: vi.fn(),
      onHelp: vi.fn(),
      onTheme: vi.fn(),
      onTab: vi.fn(),
      onEscape: vi.fn(),
    };
    vi.resetModules();
    const { initKeyboard } = await import('../../src/lib/keyboard');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cleanup = initKeyboard(handlers as any) as (() => void) | undefined;
  });

  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('calls onSearch when "/" is pressed outside input', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    expect(handlers.onSearch).toHaveBeenCalledOnce();
  });

  it('calls onHelp when "?" is pressed', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(handlers.onHelp).toHaveBeenCalledOnce();
  });

  it('calls onTheme when "t" is pressed', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
    expect(handlers.onTheme).toHaveBeenCalledOnce();
  });

  it('calls onEscape when Escape is pressed', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(handlers.onEscape).toHaveBeenCalledOnce();
  });

  it('calls onTab with number when digit is pressed', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    expect(handlers.onTab).toHaveBeenCalledWith(2);
  });

  it('does not trigger shortcuts while composing IME text', () => {
    const evt = new KeyboardEvent('keydown', { key: '/', bubbles: true });
    Object.defineProperty(evt, 'isComposing', { value: true, configurable: true });
    document.dispatchEvent(evt);
    expect(handlers.onSearch).not.toHaveBeenCalled();
  });

  it('does not trigger shortcuts with ctrlKey held', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, ctrlKey: true }));
    expect(handlers.onSearch).not.toHaveBeenCalled();
  });

  it('does not trigger shortcuts with metaKey held', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true, metaKey: true }));
    expect(handlers.onTheme).not.toHaveBeenCalled();
  });
});
