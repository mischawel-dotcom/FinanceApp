import { useCallback, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'finance-app-theme';

function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem(STORAGE_KEY, theme);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#030712' : '#2563eb');
  }
}

let listeners: (() => void)[] = [];
let currentTheme: Theme = getTheme();

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot() {
  return currentTheme;
}

function setTheme(theme: Theme) {
  currentTheme = theme;
  applyTheme(theme);
  listeners.forEach((l) => l());
}

// Apply on module load
if (typeof window !== 'undefined') {
  applyTheme(currentTheme);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme]);
  return { theme, toggleTheme, setTheme } as const;
}
