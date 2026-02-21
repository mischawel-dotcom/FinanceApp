import { getCurrencyConfig } from '@/shared/hooks/useCurrency';

export function formatCents(cents: number): string {
  const { locale, currency } = getCurrencyConfig();
  return Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

/** @deprecated Use formatCents instead */
export const formatCentsEUR = formatCents;
