import { describe, it, expect, vi } from "vitest";

describe("Integration: monthlyContributionCents in forecast", () => {
  it("Goal with monthlyContributionCents is planned in forecast", async () => {
    vi.mock("@/planning/adapters/fromPersistedStore", () => {
      const __persistedSpy = vi.fn();
      const mockPlanInput = {
        incomes: [],
        expenses: [],
        assets: [],
        goals: [
          {
            goalId: "goal1",
            name: "Auto",
            targetAmountCents: 100000,
            currentAmountCents: 0,
            monthlyContributionCents: 5000,
            priority: 1,
          },
        ],
        reserves: [],
        investments: [],
        currentMonth: "2026-01",
      };
      return {
        buildPlanInputFromPersistedStore: () => {
          __persistedSpy();
          return mockPlanInput;
        },
        __persistedSpy,
      };
    });
    const { buildDashboardModelFromRepositories } = await import("@/planning/planFacade");
    const persisted = await import("@/planning/adapters/fromPersistedStore") as any;
    const model = await buildDashboardModelFromRepositories({ forecastMonths: 1 });
    const month = model.projection.timeline[0];
    expect(persisted.__persistedSpy).toHaveBeenCalled();
    expect(model.goals.length).toBe(1);
    expect(month.buckets.planned).toBe(5000);
    expect(month.plannedGoalBreakdownById?.goal1).toBe(5000);
  });
});
