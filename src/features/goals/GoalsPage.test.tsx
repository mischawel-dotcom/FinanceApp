  it("edits a goal and updates UI immediately", async () => {
    // Seed store with one goal and working updateGoal action
    const g1 = { id: "g1", name: "Urlaub", priority: "medium", targetAmountCents: 10000, currentAmountCents: 1000, monthlyContributionCents: 50000 };
    useAppStore.setState({
      goals: [g1],
      updateGoal: async (id: string, updatedFields: any) => {
        useAppStore.setState((state) => ({
          goals: state.goals.map((g) => g.id === id ? { ...g, ...updatedFields } : g)
        }));
      },
    }, true);
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GoalsPage />
      </MemoryRouter>
    );
    // Assert goal present
    const goalRow = screen.getByTestId("goal-row-g1");
    expect(goalRow).toBeInTheDocument();
    // Check that monthly savings is shown in the card
    const savingsRow = within(goalRow).getByTestId('goal-monthly-savings-row');
    expect(savingsRow).toHaveTextContent(/monatliche sparrate/i);
    expect(savingsRow).toHaveTextContent(/500,00\s*€/i);
    // Find edit button
    const editBtn = within(goalRow).getByText("Bearbeiten", { selector: 'button' });
    await act(async () => {
      editBtn.click();
    });
    // Wait for dialog
    const dialog = await screen.findByRole('dialog');
    // Try to find Zielbetrag input robustly
    let zielbetragInput =
      within(dialog).queryByRole('spinbutton', { name: /zielbetrag/i }) ??
      within(dialog).queryByRole('textbox', { name: /zielbetrag/i });
    if (!zielbetragInput) {
      // fallback: first numeric/text input in dialog
      const inputs = within(dialog).getAllByRole((role) => role === 'spinbutton' || role === 'textbox');
      zielbetragInput = inputs[0];
    }
    // Change value
    const { fireEvent } = require('@testing-library/react');
    fireEvent.change(zielbetragInput, { target: { value: '200' } });
    // Click Aktualisieren/Speichern
    const saveBtn = within(dialog).getByRole('button', { name: /aktualisieren|speichern/i });
    fireEvent.click(saveBtn);
    // Assert updated value in UI (euro format)
    await waitFor(() => {
      const updatedRow = screen.getByTestId("goal-row-g1");
      expect(updatedRow).toBeInTheDocument();
      const matches = within(updatedRow).getAllByText(/200[,\.]00\s*€/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GoalsPage from "./GoalsPage";
import { useAppStore } from "@/app/store/useAppStore";


describe("GoalsPage", () => {
  beforeEach(() => {
    useAppStore.setState({
      goals: [],
      loadData: vi.fn(),
      createGoal: vi.fn(),
      updateGoal: vi.fn(),
      deleteGoal: vi.fn(),
    }, true);
  });

  it("deletes a goal and updates UI immediately", async () => {
    // Seed store with two goals and a working deleteGoal action
    const g1 = { id: "g1", name: "Ziel 1", priority: "medium", targetAmountCents: 10000, currentAmountCents: 1000 };
    const g2 = { id: "g2", name: "Ziel 2", priority: "high", targetAmountCents: 20000, currentAmountCents: 5000 };
    useAppStore.setState({
      goals: [g1, g2],
      deleteGoal: async (id: string) => {
        useAppStore.setState((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
      },
    }, true);
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GoalsPage />
      </MemoryRouter>
    );
    // Assert both goals present
    expect(screen.getByTestId("goal-row-g1")).toBeInTheDocument();
    expect(screen.getByTestId("goal-row-g2")).toBeInTheDocument();
    // Find delete button for g1
    const goalRowG1 = screen.getByTestId("goal-row-g1");
    const deleteBtn = within(goalRowG1).getByText("Löschen", { selector: 'button' });
    window.confirm = () => true;
    await act(async () => {
      deleteBtn.click();
    });
    await waitFor(() => expect(screen.queryByTestId("goal-row-g1")).not.toBeInTheDocument());
    expect(screen.getByTestId("goal-row-g2")).toBeInTheDocument();
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
    const g1 = { id: "g1", name: "Mein Ziel", priority: "medium", targetAmountCents: 10000, currentAmountCents: 1000 };
    const g2 = { id: "g2", name: "Ziel 2", priority: "high", targetAmountCents: 20000, currentAmountCents: 5000 };
    useAppStore.setState({ goals: [g1, g2] }, true);
    render(
      <MemoryRouter initialEntries={["/goals?highlight=g1"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GoalsPage />
      </MemoryRouter>
    );
    const row1 = screen.getByTestId("goal-row-g1");
    const row2 = screen.getByTestId("goal-row-g2");
    expect(row1).toBeInTheDocument();
    expect(row1).toHaveAttribute("data-highlight", "true");
    expect(row2).toBeInTheDocument();
    expect(row2).toHaveAttribute("data-highlight", "false");
  });
});
