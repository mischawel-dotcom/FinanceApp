// Helper: Money (Euro float) → Cents (int)
export function moneyToCents(money: number | undefined | null): number {
  if (typeof money !== "number" || !Number.isFinite(money)) return 0;
  return Math.round(money * 100);
}
