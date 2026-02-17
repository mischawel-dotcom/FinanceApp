// Centralized money conversion helpers

/**
 * Converts euro input string to integer cents.
 * Handles comma/point, thousands separators, trims, robust parsing.
 * Examples: "1", "1.0", "1,00", "1.000,50", "1000.50" → integer cents
 */
export function euroInputToCents(input: string): number {
  if (!input) return 0;
  let normalized = input.trim().replace(/\s+/g, '');
  // If input uses comma as decimal separator, convert to dot
  if (normalized.includes(',')) {
    // Remove thousands separators (dot) before comma
    normalized = normalized.replace(/\.(?=\d{3}(,|$))/g, '');
    normalized = normalized.replace(/,/g, '.');
  } else {
    // Remove thousands separators (dot) before dot
    normalized = normalized.replace(/\.(?=\d{3}(\.|$))/g, '');
  }
  const floatVal = parseFloat(normalized);
  if (!Number.isFinite(floatVal)) return 0;
  return Math.round(floatVal * 100);
}

/**
 * Converts integer cents to euro string for input fields.
 * Example: 100 → "1.00"
 */
export function centsToEuroInput(cents: number): string {
  const n = typeof cents === 'number' && Number.isFinite(cents) ? cents : NaN;
  if (!Number.isFinite(n)) return '';
  return (n / 100).toFixed(2);
}

/**
 * Asserts that n is integer cents (for dev/debug).
 */
export function assertIntegerCents(n: number): number {
  if (import.meta.env.DEV && (!Number.isInteger(n) || n < 0)) {
    throw new Error(`Value is not valid integer cents: ${n}`);
  }
  return n;
}

// Helper in money.ts
export function asCentsSafe(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Robust Euro->Cents parsing for forms and normalization
 */
export function euroInputToCentsSafe(input: unknown): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.round(input * 100);
  }
  if (typeof input === 'string') {
    const cents = euroInputToCents(input);
    return Number.isFinite(cents) ? cents : 0;
  }
  return 0;
}
