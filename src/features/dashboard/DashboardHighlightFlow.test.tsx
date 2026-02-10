import "@testing-library/jest-dom";
vi.mock("@/data/repositories/goalRepository", () => ({
  goalRepository: {
    getAll: async () => [
      { id: "g1", name: "Mein Ziel", priority: 1, targetAmount: 100, currentAmount: 10 },
    ],
  },
}));
vi.mock("@/data/repositories/incomeRepository", () => ({
  incomeRepository: { getAll: async () => [] },
}));
vi.mock("@/data/repositories/expenseRepository", () => ({
  expenseRepository: { getAll: async () => [] },
}));
vi.mock("@/data/repositories/assetRepository", () => ({
  assetRepository: { getAll: async () => [] },
}));
vi.mock("@/planning/recommendations", () => ({
  selectDashboardRecommendations: vi.fn(() => [
    {
      id: "rec3",
      type: "goal_contrib_issue",
      title: "Ziel fehlt",
      reason: "Für das Ziel fehlt ein Beitrag.",
      evidence: { goalId: "g1" },
      score: { impact: 1, urgency: 1, simplicity: 1, robustness: 1, total: 1 },
      action: {
        kind: "navigate",
        label: "Zum Ziel",
        payload: { path: "/goals", query: { highlight: "g1" } },
      },
    },
  ]),
}));
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";

let mockGoals: any[] = [];
vi.mock("@/app/store/useAppStore", () => ({
  useAppStore: () => ({
    goals: mockGoals,
    loadData: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
  }),
}));

vi.mock("@/planning/planFacade", () => {
  const mockModel = {
    heroFree: 10000,
    buckets: { bound: 0, planned: 50000, invested: 0, free: 950000 },
    freeTimeline: [],
    shortfalls: [],
    goals: [{ goalId: "g1", name: "Mein Ziel", priority: 1, reachable: true }],
    domainGoals: [{ id: "g1", name: "Mein Ziel", priority: 1, targetAmount: 100, currentAmount: 10 }],
    projection: {
      timeline: [
        {
          month: "2026-01",
          buckets: { bound: 0, planned: 50000, invested: 0, free: 950000 },
          plannedGoalBreakdownById: { g1: 50000 },
        },
      ],
    },
  };
  // Ensure domainGoals and projection are available for selectDashboardRecommendations
  const build = vi.fn(async () => mockModel);
  return {
    buildDashboardModelFromRepositories: build,
    __mockModel: mockModel,
  };
});

describe("Dashboard → GoalsPage Highlight-Flow", () => {
  beforeEach(() => { mockGoals = []; });
  it("dashboard recommendation action navigates and triggers highlight in GoalsPage", async () => {
      const recs = await import("@/planning/recommendations");
      (recs.selectDashboardRecommendations as any).mockImplementation(() => [
        {
          id: "rec3",
          type: "goal_contrib_issue",
          title: "Ziel fehlt",
          reason: "Für das Ziel fehlt ein Beitrag.",
          evidence: { goalId: "g1" },
          score: { impact: 1, urgency: 1, simplicity: 1, robustness: 1, total: 1 },
          action: {
            kind: "navigate",
            label: "Zum Ziel",
            payload: { path: "/goals", query: { highlight: "g1" } },
          },
        },
      ]);
      const { default: DashboardPlanningPreview } = await import("./DashboardPlanningPreview");
      const { default: GoalsPage } = await import("../goals/GoalsPage");
    mockGoals = [
      {
        id: "g1",
        name: "Mein Ziel",
        priority: "medium",
        targetAmount: 100,
        currentAmount: 10,
      },
    ];
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<DashboardPlanningPreview />} />
          <Route path="/goals" element={<GoalsPage />} />
        </Routes>
      </MemoryRouter>
    );
    // Wait for the recommendation button to appear
    const btn = await screen.findByRole("button", { name: /Zum Ziel/i });
    fireEvent.click(btn);
    expect(await screen.findByText(/Finanzielle Ziele/i)).toBeInTheDocument();
    const row = screen.getByTestId("goal-row-g1");
    expect(row).toBeInTheDocument();
    expect(row).toHaveAttribute("data-highlight", "true");
  });
});
