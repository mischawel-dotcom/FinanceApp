import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/planning/planFacade", () => {
  const mockModel = {
    heroFree: 10000,
    buckets: { bound: 0, planned: 50000, invested: 0, free: 950000 },
    freeTimeline: [],
    shortfalls: [],
    goals: [{ goalId: "g1", name: "Auto", priority: 1, reachable: true }],
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

  const build = vi.fn(async () => mockModel);
  return { buildDashboardModelFromRepositories: build, __buildSpy: build };
});

test("renders Verplant > 0 and shows breakdown details", async () => {
  const { default: DashboardPlanningPreview } = await import("./DashboardPlanningPreview");
  const facade = (await import("@/planning/planFacade")) as any;
  const buildSpy = facade.__buildSpy as ReturnType<typeof vi.fn>;

  render(<DashboardPlanningPreview />);

  await waitFor(() => {
    expect(buildSpy).toHaveBeenCalled();
  });

  await waitFor(() => {
    expect(screen.queryByText(/Loading planning/i)).toBeNull();
  });

  // 1) "Verplant:" muss sichtbar sein
  const verplantLabel = await screen.findByText(/Verplant:/i);
  expect(verplantLabel).not.toBeNull();

  // 2) Betrag für "Verplant" im richtigen Kontext prüfen
  const verplantRow = verplantLabel.closest("div");
  expect(verplantRow).not.toBeNull();
  const plannedValueElement = verplantRow!.querySelector("b");
  expect(plannedValueElement).not.toBeNull();
  const normalize = (s: string) => s.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  const plannedText = normalize(plannedValueElement!.textContent ?? "");
  expect(plannedText).toBe("500,00 €");

  // 3) Breakdown öffnen
  const detailsBtn = await screen.findByText(/Details/i);
  fireEvent.click(detailsBtn);

  // 4) Breakdown-Container finden über Header
  const breakdownHeader = await screen.findByText(/Verplant Breakdown/i);
  expect(breakdownHeader).not.toBeNull();
  const breakdownContainer = breakdownHeader.parentElement;
  expect(breakdownContainer).not.toBeNull();

  // 5) Breakdown enthält Zielname und Betrag im richtigen Kontext
  const goalName = within(breakdownContainer!).getByText(/Auto/i);
  expect(goalName).not.toBeNull();
  const breakdownValue = within(breakdownContainer!).getByText(/500,00 €/);
  expect(breakdownValue).not.toBeNull();
  const breakdownText = normalize(breakdownValue.textContent ?? "");
  expect(breakdownText).toBe("500,00 €");
});