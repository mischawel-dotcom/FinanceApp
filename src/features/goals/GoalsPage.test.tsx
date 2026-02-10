import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GoalsPage from "./GoalsPage";


// Parametrisierbarer Mock für useAppStore
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

describe("GoalsPage", () => {
  beforeEach(() => {
    mockGoals = [];
  });

  it("renders heading", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GoalsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Finanzielle Ziele/i)).toBeInTheDocument();
  });

  it("shows empty state when no goals exist", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GoalsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Noch keine Ziele definiert/i)).toBeInTheDocument();
  });

  it("shows highlight on goal-row when highlight param is set", () => {
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
      <MemoryRouter initialEntries={["/goals?highlight=g1"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GoalsPage />
      </MemoryRouter>
    );
    const row = screen.getByTestId("goal-row-g1");
    expect(row).toBeInTheDocument();
    expect(row).toHaveAttribute("data-highlight", "true");
  });
});
