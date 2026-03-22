export type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'cncf-theme';

export function getTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system';
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system';
}

export function setTheme(theme: Theme): void {
  if (theme === 'system') {
    localStorage.removeItem(STORAGE_KEY);
    applyTheme(getSystemTheme());
  } else {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
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
  var stored = localStorage.getItem('cncf-theme');
  var resolved = stored === 'dark' ? 'dark' : stored === 'light' ? 'light' : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', resolved);
})();
`.trim();
