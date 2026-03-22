export interface KeyboardConfig {
  tabCount: number;
  searchInput: HTMLInputElement | null;
}

export interface KeyboardCallbacks {
  onSearch?: () => void;
  onHelp?: () => void;
  onTheme?: () => void;
  onTab?: (n: number) => void;
  onEscape?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onScrollTop?: () => void;
  onPageDown?: () => void;
  onPageUp?: () => void;
  onTabCycle?: (reverse: boolean) => void;
  onOpen?: () => void;
  onResetFocus?: () => void;
  onSitePrev?: () => void;
  onSiteNext?: () => void;
}

export function initKeyboard(
  config: KeyboardConfig,
  callbacks: KeyboardCallbacks
): () => void {
  const handler = (e: KeyboardEvent) => {
    // IME composition guard — prevents CJK input from triggering shortcuts
    if (e.isComposing) return;

    // Modifier guard — skip most shortcuts when modifier keys held
    // Exception: Shift alone is allowed (Shift+Space, Shift+Tab)
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const inInput =
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement ||
      (document.activeElement as HTMLElement)?.isContentEditable;

    // Tab number shortcuts (1-9)
    if (!inInput && e.key >= '1' && e.key <= '9') {
      const n = parseInt(e.key, 10);
      if (n <= config.tabCount) {
        callbacks.onTab?.(n);
      }
      return;
    }

    // Handle shortcuts
    switch (e.key) {
      case '/':
      case 's':
        if (!inInput) {
          e.preventDefault();
          config.searchInput?.focus();
          callbacks.onSearch?.();
        }
        break;

      case '?':
        if (!inInput) {
          callbacks.onHelp?.();
        }
        break;

      case 't':
        if (!inInput) {
          callbacks.onTheme?.();
        }
        break;

      case 'Escape':
        callbacks.onEscape?.();
        break;

      case 'j':
        if (!inInput) {
          e.preventDefault();
          callbacks.onNext?.();
        }
        break;

      case 'k':
        if (!inInput) {
          e.preventDefault();
          callbacks.onPrev?.();
        }
        break;

      case 'h':
        if (!inInput) {
          e.preventDefault();
          callbacks.onScrollTop?.();
        }
        break;

      case ' ':
        if (!inInput) {
          e.preventDefault();
          if (e.shiftKey) {
            callbacks.onPageUp?.();
          } else {
            callbacks.onPageDown?.();
          }
        }
        break;

      case 'Tab':
        if (!inInput) {
          e.preventDefault();
          callbacks.onTabCycle?.(e.shiftKey);
        }
        break;

      case 'Enter':
      case 'o':
        if (!inInput) {
          callbacks.onOpen?.();
        }
        break;

      case '[':
        if (!inInput) {
          e.preventDefault();
          callbacks.onSitePrev?.();
        }
        break;

      case ']':
        if (!inInput) {
          e.preventDefault();
          callbacks.onSiteNext?.();
        }
        break;
    }
  };

  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
