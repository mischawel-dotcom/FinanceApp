import { useCallback, useSyncExternalStore } from 'react';

export type CurrencyCode = 'EUR' | 'CHF';
const STORAGE_KEY = 'finance-app-currency';

const CURRENCY_CONFIG: Record<CurrencyCode, { locale: string; currency: string }> = {
  EUR: { locale: 'de-DE', currency: 'EUR' },
  CHF: { locale: 'de-CH', currency: 'CHF' },
};

function getStoredCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'EUR';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'CHF' ? 'CHF' : 'EUR';
}

let listeners: (() => void)[] = [];
let currentCurrency: CurrencyCode = getStoredCurrency();

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): CurrencyCode {
  return currentCurrency;
}

export function setCurrency(currency: CurrencyCode) {
  currentCurrency = currency;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, currency);
  }
  listeners.forEach((l) => l());
}

/** Current currency without React – for use in services/utilities */
export function getCurrency(): CurrencyCode {
  return currentCurrency;
}

export function getCurrencyConfig() {
  return CURRENCY_CONFIG[currentCurrency];
}

export function getCurrencySymbol(): string {
  return currentCurrency === 'EUR' ? '€' : 'CHF';
}

export function useCurrency() {
  const currency = useSyncExternalStore(subscribe, getSnapshot);
  const toggle = useCallback(() => {
    setCurrency(currency === 'EUR' ? 'CHF' : 'EUR');
  }, [currency]);
  return { currency, setCurrency, toggleCurrency: toggle } as const;
}
