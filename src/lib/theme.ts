export type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'cncf-theme';

export function getTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system';
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system';
  } catch {
    return 'system';
  }
}

export function setTheme(theme: Theme): void {
  try {
    if (theme === 'system') {
      localStorage.removeItem(STORAGE_KEY);
      applyTheme(getSystemTheme());
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
      applyTheme(theme);
    }
  } catch {
    applyTheme(theme === 'system' ? getSystemTheme() : theme);
  }
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', resolved);
}

export function initTheme(): () => void {
  const stored = getTheme();
  if (stored === 'system') {
    applyTheme(getSystemTheme());
  } else {
    applyTheme(stored);
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onMQChange = (e: MediaQueryListEvent) => {
    if (getTheme() === 'system') {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  };
  mq.addEventListener('change', onMQChange);

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      const newTheme = (e.newValue as Theme) ?? 'system';
      setTheme(newTheme);
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    mq.removeEventListener('change', onMQChange);
    window.removeEventListener('storage', onStorage);
  };
}

// Anti-flash inline script — use as is:inline in Astro head
export const antiFlashScript = `
(function() {
  try {
    var stored = localStorage.getItem('cncf-theme');
    // One-time migration: copy legacy 'theme' key and remove it
    if (!stored) {
      var legacy = localStorage.getItem('theme');
      if (legacy === 'dark' || legacy === 'light') {
        localStorage.setItem('cncf-theme', legacy);
        localStorage.removeItem('theme');
        stored = legacy;
      }
    }
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = stored === 'dark' ? 'dark' : stored === 'light' ? 'light' : (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (_) {
    var fallback = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', fallback);
  }
})();
`.trim();
