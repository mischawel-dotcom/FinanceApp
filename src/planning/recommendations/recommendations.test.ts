  it("is deterministic for identical input (regression)", () => {
    // Use a stable, minimal projection and goals
    const timeline: TimelineMonth[] = [
      {
        month: "2026-03",
        income: 0,
        buckets: { bound: 0, planned: 0, invested: 0, free: -5000 },
        plannedGoalBreakdownById: {},
      },
    ];
    const projection = makeProjection(timeline);
    const goals: Goal[] = [];
    const heroFreeCents = 10000;
    // Run 5 times
    const outputs = Array.from({ length: 5 }, () =>
      selectDashboardRecommendations(projection, goals, heroFreeCents).map(r => r.type ?? r.id)
    );
    // All outputs must be deeply equal
    for (let i = 1; i < outputs.length; ++i) {
      expect(outputs[i]).toEqual(outputs[0]);
    }
  });
  import { describe, it, expect } from "vitest";
  import { selectDashboardRecommendations } from "./index";
  import { buildPlanProjection } from "../forecast";
  import type { PlanProjection } from "../types";
  import type { Goal } from "../../domain/types";

  it("is deterministic and stable for first month regardless of forecastMonths", () => {
    // Setup: deterministic input
    const settings1 = { forecastMonths: 1, startMonth: "2026-02" };
    const settings6 = { forecastMonths: 6, startMonth: "2026-02" };
    // Recurring income and two expenses (one causes deficit)
    const recurringIncome = {
      id: "inc1",
      name: "Recurring Income",
      amount: 400000,
      interval: "monthly",
      confidence: "fixed",
      startDate: "2026-02-01",
    };
    const recurringExpense = {
      id: "exp1",
      name: "Recurring Expense",
      amount: 100000,
      interval: "monthly",
      startDate: "2026-02-01",
    };
    const deficitExpense = {
      id: "exp2",
      name: "Deficit Expense",
      amount: 500000,
      interval: "monthly",
      startDate: "2026-02-01",
    };
    const planInput = {
      incomes: [recurringIncome],
      expenses: [recurringExpense, deficitExpense],
      reserves: [],
      goals: [],
      investments: [],
      knownPayments: [],
    };
    const proj1 = buildPlanProjection(planInput, settings1);
    const proj6 = buildPlanProjection(planInput, settings6);
    // Recommendations for first month
    const goals: Goal[] = [];
    const recs1 = selectDashboardRecommendations(proj1, goals, proj1.timeline[0].buckets.free);
    const recs6 = selectDashboardRecommendations(proj6, goals, proj6.timeline[0].buckets.free);
    // Assert: first month recommendations are identical
    expect(recs1.length).toBeLessThanOrEqual(2);
    expect(recs6.length).toBeLessThanOrEqual(2);
    expect(recs1.length).toBeGreaterThan(0);
    expect(recs6.length).toBeGreaterThan(0);
    expect(recs1[0].title).toBe(recs6[0].title);
    expect(recs1[0].message).toBe(recs6[0].message);
    // No duplicates
    expect(new Set(recs1.map(r => r.title)).size).toBe(recs1.length);
    expect(new Set(recs6.map(r => r.title)).size).toBe(recs6.length);
    // Recommendation is based on freeCents < 0
    expect(proj1.timeline[0].buckets.free).toBeLessThan(0);
    expect(proj6.timeline[0].buckets.free).toBeLessThan(0);
  });
import { describe, it, expect } from "vitest";
import { selectDashboardRecommendations } from "./index";
import type { PlanProjection } from "../types";
import type { Goal } from "../../domain/types";


type TimelineMonth = PlanProjection["timeline"][number];
type Month = PlanProjection["timeline"][number];

function makeProjection(timeline: TimelineMonth[], overrides: Partial<PlanProjection> = {}): PlanProjection {
  return {
    settings: { forecastMonths: timeline.length, startMonth: timeline[0]?.month ?? "2026-01" },
    timeline,
    goals: [],
    events: [],
    ...overrides,
  };
}

describe("Dashboard Recommendations", () => {
  it("Case A: shortfall in Monat 1 → shortfall_risk empfohlen", () => {
    const timeline: TimelineMonth[] = [
      {
        month: "2026-03",
        income: 0,
        buckets: { bound: 0, planned: 0, invested: 0, free: -5000 },
        plannedGoalBreakdownById: {},
      },
    ];
    const projection = makeProjection(timeline);
    const goals: Goal[] = [];
    const heroFreeCents = 10000;
    const recs = selectDashboardRecommendations(projection, goals, heroFreeCents);
    expect(recs[0].type).toBe("shortfall_risk");
    expect(recs[0].evidence?.month).toBe("2026-03");
    expect(recs[0].evidence?.amountCents).toBe(-5000);
  });

  it("Case B: heroFree sehr klein ohne shortfall → low_slack empfohlen", () => {
    const timeline: TimelineMonth[] = [
      {
        month: "2026-03",
        income: 0,
        buckets: { bound: 0, planned: 0, invested: 0, free: 5000 },
        plannedGoalBreakdownById: {},
      },
    ];
    const projection = makeProjection(timeline);
    const goals: Goal[] = [];
    const heroFreeCents = 800;
    const recs = selectDashboardRecommendations(projection, goals, heroFreeCents);
    expect(recs.some(r => r.type === "low_slack")).toBe(true);
    expect(recs[0].evidence?.amountCents).toBe(800);
  });

  it("Case C: Goal mit monthlyContributionCents>0 aber plannedGoalBreakdownById fehlt → goal_contrib_issue empfohlen", () => {
    const timeline: Month[] = [
      {
        month: "2026-03",
        income: 0,
        buckets: { bound: 0, planned: 0, invested: 0, free: 10000 },
        plannedGoalBreakdownById: {},
      },
    ];
    const projection = makeProjection(timeline);
    const goals: Goal[] = [
      { id: "g1", name: "Goal 1", targetAmount: 0, priority: 1, monthlyContribution: 5000 },
      { id: "g2", name: "Goal 2", targetAmount: 0, priority: 1, monthlyContribution: 0 },
    ];
    const heroFreeCents = 10000;
    const recs = selectDashboardRecommendations(projection, goals, heroFreeCents);
    expect(recs.some(r => r.type === "goal_contrib_issue" && r.evidence?.goalId === "g1")).toBe(true);
  });

  it("Case D: Wenn 3 Kandidaten entstehen → max 2 zurückgegeben, sortiert nach total", () => {
    const timeline: Month[] = [
      {
        month: "2026-03",
        income: 0,
        buckets: { bound: 0, planned: 0, invested: 0, free: -10000 },
        plannedGoalBreakdownById: {},
      },
    ];
    const projection = makeProjection(timeline);
    const goals: Goal[] = [
      { id: "g1", name: "Goal 1", targetAmount: 0, priority: 1, monthlyContribution: 5000 },
    ];
    const heroFreeCents = 800;
    const recs = selectDashboardRecommendations(projection, goals, heroFreeCents);
    expect(recs.length).toBe(2);
    expect(recs[0].score.total).toBeGreaterThanOrEqual(recs[1].score.total);
  });
});
