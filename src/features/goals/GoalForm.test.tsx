  it("submits targetAmountCents (integer) and not targetAmount", async () => {
    let submitted: any = null;
    const { getByLabelText, container } = render(
      <GoalForm
        onSubmit={(data) => { submitted = data; }}
        onCancel={() => {}}
      />
    );
    fireEvent.change(getByLabelText(/Name des Ziels/i), { target: { value: "urlaub" } });
    fireEvent.change(getByLabelText(/Zielbetrag/i), { target: { value: "2000" } });
    fireEvent.change(getByLabelText(/Rate/i), { target: { value: "400" } });
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => expect(submitted).not.toBeNull());
    expect(submitted.targetAmount).toBe(2000);
    expect(submitted.monthlyContributionCents).toBe(40000);
  });
import { render, fireEvent, waitFor } from "@testing-library/react";
import { GoalForm } from "./GoalForm";

describe("GoalForm cents regression", () => {
  it("converts input '50' to 5000 cents", async () => {
    let submitted: any = null;
    const { getByLabelText, container } = render(
      <GoalForm
        onSubmit={(data) => { submitted = data; }}
        onCancel={() => {}}
      />
    );
    // Pflichtfelder setzen
    fireEvent.change(getByLabelText(/Name des Ziels/i), { target: { value: "Auto" } });
    fireEvent.change(getByLabelText(/Zielbetrag/i), { target: { value: "100" } });
    fireEvent.change(getByLabelText(/Rate/i), { target: { value: "50" } });
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => expect(submitted).not.toBeNull());
    expect(submitted.monthlyContributionCents).toBe(5000);
  });

  it("creates goal with amount and monthly contribution as integer cents", async () => {
    let submitted: any = null;
    const { getByLabelText, container } = render(
      <GoalForm
        onSubmit={(data) => { submitted = data; }}
        onCancel={() => {}}
      />
    );
    fireEvent.change(getByLabelText(/Name des Ziels/i), { target: { value: "urlaub" } });
    fireEvent.change(getByLabelText(/Zielbetrag/i), { target: { value: "2000" } });
    fireEvent.change(getByLabelText(/Rate/i), { target: { value: "400" } });
    fireEvent.change(getByLabelText(/Priorität/i), { target: { value: "medium" } });
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => expect(submitted).not.toBeNull());
    expect(submitted.targetAmount).toBe(2000);
    expect(submitted.monthlyContributionCents).toBe(40000);
    expect(Number.isInteger(submitted.monthlyContributionCents)).toBe(true);
  });

  it("empty input leads to undefined", async () => {
    let submitted: any = null;
    const { getByLabelText, container } = render(
      <GoalForm
        onSubmit={(data) => { submitted = data; }}
        onCancel={() => {}}
      />
    );
    // Pflichtfelder setzen
    fireEvent.change(getByLabelText(/Name des Ziels/i), { target: { value: "Auto" } });
    fireEvent.change(getByLabelText(/Zielbetrag/i), { target: { value: "100" } });
    fireEvent.change(getByLabelText(/Rate/i), { target: { value: "" } });
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => expect(submitted).not.toBeNull());
    expect(submitted.monthlyContributionCents).toBeUndefined();
  });
});
