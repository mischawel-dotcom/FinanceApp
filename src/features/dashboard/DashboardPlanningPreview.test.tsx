test("renders correct 'Verplant' value for goal monthlyContributionCents", async () => {
  // Setup: income 400000, expense 100000, goal monthlyContributionCents 40000
  const model = {
    heroFree: 260000,
    buckets: { bound: 100000, planned: 40000, invested: 0, free: 260000 },
    freeTimeline: [],
    shortfalls: [],
    goals: [{ goalId: "g1", name: "Test Goal", priority: 1, reachable: true }],
    domainGoals: [{ id: "g1", name: "Test Goal", priority: 1, targetAmountCents: 200000, monthlyContributionCents: 40000 }],
    projection: {
      timeline: [
        {
          month: "2026-02",
          buckets: { bound: 100000, planned: 40000, invested: 0, free: 260000 },
          plannedGoalBreakdownById: { g1: 40000 },
        },
      ],
    },
  };
  // Patch the planFacade mock for this test only
  const { buildDashboardModelFromRepositories } = await import("@/planning/planFacade");
  (buildDashboardModelFromRepositories as any).mockImplementationOnce(async () => model);
  const { default: DashboardPlanningPreview } = await import("./DashboardPlanningPreview");
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DashboardPlanningPreview />
    </MemoryRouter>
  );
  // Wait for the "Verplant" value to appear and assert robustly
  const label = await screen.findByText(/Verplant:/i);
  const row = label.closest("div") ?? label.parentElement;
  expect(
    within(row!).getByText((content) =>
      content.replace(/\s/g, "") === "400,00€"
    )
  ).toBeInTheDocument();
});
test("clicking action button for planning intent navigates to /planning", async () => {
  const mod = await import("@/planning/recommendations");
  (mod.selectDashboardRecommendations as any).mockImplementation(() => [
    {
      id: "recPlanning",
      type: "info",
      title: "Planung ansehen",
      reason: "Sieh dir die Planung an.",
      evidence: {},
      score: { impact: 1, urgency: 1, simplicity: 1, robustness: 1, total: 1 },
      action: { label: "Ansehen", intent: "planning" },
    },
  ]);
  const { default: DashboardPlanningPreview } = await import("./DashboardPlanningPreview");
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DashboardPlanningPreview />
    </MemoryRouter>
  );
  const btn = await screen.findByRole("button", { name: /Ansehen/i });
  fireEvent.click(btn);
  expect(mockNavigate).toHaveBeenCalledWith("/planning");
});
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
      action: { label: "Zu Einnahmen", kind: "open_income" },
    },
  ]);
  const { default: DashboardPlanningPreview } = await import("./DashboardPlanningPreview");
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
      action: { label: "Zu Ausgaben", kind: "open_expenses" },
    },
  ]);
  const { default: DashboardPlanningPreview } = await import("./DashboardPlanningPreview");
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
import { within } from "@testing-library/react";
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
      score: { impact: 1, urgency: 1, simplicity: 1, robustness: 1, total: 1 },
      action: { label: "Ziel öffnen", intent: "goals" },
    },
  ]);
  const { default: DashboardPlanningPreview } = await import("./DashboardPlanningPreview");
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DashboardPlanningPreview />
    </MemoryRouter>
  );
  const explanation = await screen.findByTestId("dashboard-recommendation-explanation");
  expect(explanation).toHaveTextContent(/Fehlbetrag von/i);
});