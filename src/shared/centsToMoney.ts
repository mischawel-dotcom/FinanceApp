// Helper: Cents (int) → Money (Euro float)
export function centsToMoney(cents: number | undefined | null): number | undefined {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return undefined;
  return cents / 100;
}
