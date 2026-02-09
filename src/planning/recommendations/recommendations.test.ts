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
