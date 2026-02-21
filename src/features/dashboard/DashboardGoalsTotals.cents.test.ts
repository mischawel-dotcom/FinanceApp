import { describe, it, expect } from "vitest";
import { formatCents } from "../../ui/formatMoney";

// Minimal dashboard selector logic for test
function getDashboardGoalTotals(goals: Array<{ targetAmountCents: number, currentAmountCents: number }>) {
  const totalTargetCents = goals.reduce(
    (sum, goal) => sum + (typeof goal.targetAmountCents === 'number' && Number.isFinite(goal.targetAmountCents) ? goal.targetAmountCents : 0),
    0
  );
  const totalCurrentCents = goals.reduce(
    (sum, goal) => sum + (typeof goal.currentAmountCents === 'number' && Number.isFinite(goal.currentAmountCents) ? goal.currentAmountCents : 0),
    0
  );
  let pct = 0;
  if (totalTargetCents > 0) {
    const raw = (totalCurrentCents / totalTargetCents) * 100;
    pct = Number.isFinite(raw) ? raw : 0;
  }
  return { totalTargetCents, totalCurrentCents, pct };
}

describe("Dashboard goals cents-only contract", () => {
  it("shows correct totals for cents-only goals", () => {
    const goals = [
      { id: "g1", targetAmountCents: 200000, currentAmountCents: 50000 },
      { id: "g2", targetAmountCents: 0, currentAmountCents: 0 },
    ];
    const { totalTargetCents, totalCurrentCents, pct } = getDashboardGoalTotals(goals);
    expect(totalTargetCents).toBe(200000);
    expect(totalCurrentCents).toBe(50000);
    expect(formatCents(totalTargetCents)).toBe("2.000,00 €");
    expect(formatCents(totalCurrentCents)).toBe("500,00 €");
    expect(Number.isNaN(pct)).toBe(false);
    expect(pct).toBe(25);
  });

  it("does not produce NaN when targetAmountCents is 0", () => {
    const goals = [
      { id: "g1", targetAmountCents: 0, currentAmountCents: 0 },
    ];
    const { totalTargetCents, totalCurrentCents, pct } = getDashboardGoalTotals(goals);
    expect(totalTargetCents).toBe(0);
    expect(totalCurrentCents).toBe(0);
    expect(Number.isNaN(pct)).toBe(false);
    expect(pct).toBe(0);
  });
});
