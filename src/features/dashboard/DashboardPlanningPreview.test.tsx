test("renders and handles action button for low_income recommendation", async () => {
  const mod = await import("@/planning/recommendations");
  (mod.selectDashboardRecommendations as any).mockImplementation(() => [
    {
      id: "rec5",
      type: "low_income",
      title: "Niedrige Einnahmen",
      reason: "Deine Einnahmen sind diesen Monat besonders niedrig.",
      evidence: {},
      score: { impact: 1, urgency: 1, simplicity: 1, robustness: 1, total: 1 },
      action: { label: "Zu Einnahmen", intent: "income" },
    },
  ]);
  const { default: DashboardPlanningPreview } = await import("./DashboardPlanningPreview");
  render(
    <MemoryRouter>
      <DashboardPlanningPreview />
    </MemoryRouter>
  );
  const btn = await screen.findByRole("button", { name: /Zu Einnahmen/i });
  expect(btn).toBeInTheDocument();
  fireEvent.click(btn);
  expect(mockNavigate).toHaveBeenCalledWith("/income");
});
test("renders and handles action button for high_expenses recommendation", async () => {
  const mod = await import("@/planning/recommendations");
  (mod.selectDashboardRecommendations as any).mockImplementation(() => [
    {
      id: "rec4",
      type: "high_expenses",
      title: "Hohe Ausgaben",
      reason: "Deine Ausgaben sind diesen Monat besonders hoch.",
      evidence: {},
      score: { impact: 1, urgency: 1, simplicity: 1, robustness: 1, total: 1 },
      action: { label: "Zu Ausgaben", intent: "expenses" },
    },
  ]);
  const { default: DashboardPlanningPreview } = await import("./DashboardPlanningPreview");
  render(
    <MemoryRouter>
      <DashboardPlanningPreview />
    </MemoryRouter>
  );
  const btn = await screen.findByRole("button", { name: /Zu Ausgaben/i });
  expect(btn).toBeInTheDocument();
  fireEvent.click(btn);
  expect(mockNavigate).toHaveBeenCalledWith("/expenses");
});
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { test, expect, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

// Partial mock for react-router-dom: only useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = (await vi.importActual("react-router-dom")) as typeof import("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// Parametrized goals for useAppStore
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

// Stable planFacade mock
const planFacadeModel = {
  heroFree: 10000,
  buckets: { bound: 0, planned: 50000, invested: 0, free: 950000 },
  freeTimeline: [],
  shortfalls: [],
  goals: [{ goalId: "g1", name: "Auto", priority: 1, reachable: true }],
  domainGoals: [{ id: "g1", name: "Auto", priority: 1, targetAmount: 100, currentAmount: 10 }],
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
vi.mock("@/planning/planFacade", () => {
  const build = vi.fn(async () => planFacadeModel);
  return { buildDashboardModelFromRepositories: build, __buildSpy: build };
});

// Stable recommendations mock
vi.mock("@/planning/recommendations", () => ({
  selectDashboardRecommendations: vi.fn(),
}));

beforeEach(() => {
  mockGoals = [];
  mockNavigate.mockReset();
});

test("renders action button for goal_contrib_issue", async () => {
  const mod = await import("@/planning/recommendations");
  (mod.selectDashboardRecommendations as any).mockImplementation(() => [
    {
      id: "rec3",
      type: "goal_contrib_issue",
      title: "Ziel fehlt",
      reason: "Für das Ziel fehlt ein Beitrag.",
      evidence: { goalId: "g1" },
      score: { impact: 1, urgency: 1, simplicity: 1, robustness: 1, total: 1 },
      action: { label: "Ziel öffnen", intent: "goals" },
    },
  ]);
  const { default: DashboardPlanningPreview } = await import("./DashboardPlanningPreview");
  render(
    <MemoryRouter>
      <DashboardPlanningPreview />
    </MemoryRouter>
  );
  const btn = await screen.findByRole("button", { name: /Ziel öffnen/i });
  expect(btn).not.toBeNull();
});

test("clicking action button for goal_contrib_issue navigates with highlight param", async () => {
  const mod = await import("@/planning/recommendations");
  (mod.selectDashboardRecommendations as any).mockImplementation(() => [
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
  render(
    <MemoryRouter>
      <DashboardPlanningPreview />
    </MemoryRouter>
  );
  const btn = await screen.findByRole("button", { name: /Zum Ziel/i });
  fireEvent.click(btn);
  expect(mockNavigate).toHaveBeenCalledWith("/goals?highlight=g1");
});

test("recommendation shows explanation text", async () => {
  const mod = await import("@/planning/recommendations");
  (mod.selectDashboardRecommendations as any).mockImplementation(() => [
    {
      id: "rec1",
      type: "shortfall_risk",
      title: "Fehlbetrag",
      reason: "Im Monat 2026-01 entsteht ein Fehlbetrag.",
      evidence: { month: "2026-01", amountCents: 10000 },
      score: { impact: 1, urgency: 1, simplicity: 1, robustness: 1, total: 1 },
      action: null,
    },
  ]);
  const { default: DashboardPlanningPreview } = await import("./DashboardPlanningPreview");
  render(
    <MemoryRouter>
      <DashboardPlanningPreview />
    </MemoryRouter>
  );
  const explanation = await screen.findByTestId("dashboard-recommendation-explanation");
  expect(explanation).toHaveTextContent(/Fehlbetrag von/i);
});