import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'finance-app-min-buffer';
const DEFAULT_CENTS = 50000; // 500 in Cents

function getStored(): number {
  if (typeof window === 'undefined') return DEFAULT_CENTS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_CENTS;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CENTS;
}

let listeners: (() => void)[] = [];
let currentValue: number = getStored();

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): number {
  return currentValue;
}

export function setMinBufferCents(cents: number) {
  currentValue = Math.max(0, Math.round(cents));
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(currentValue));
  }
  listeners.forEach((l) => l());
}

/** Read without React – for use in services/rules */
export function getMinBufferCents(): number {
  return currentValue;
}

export function useMinBuffer() {
  const minBufferCents = useSyncExternalStore(subscribe, getSnapshot);

  const setMinBufferEuro = useCallback((euro: number) => {
    setMinBufferCents(Math.round(euro * 100));
  }, []);

  return {
    minBufferCents,
    minBufferEuro: minBufferCents / 100,
    setMinBufferEuro,
    setMinBufferCents,
  } as const;
}
