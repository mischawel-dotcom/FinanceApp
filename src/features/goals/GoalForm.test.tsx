import { render, fireEvent, waitFor } from "@testing-library/react";
import { GoalForm } from "./GoalForm";

describe("GoalForm monthlyContributionCents", () => {
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
    // Monatliche Sparrate setzen
    fireEvent.change(getByLabelText(/Monatliche Sparrate/i), { target: { value: "50" } });
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => expect(submitted).not.toBeNull());
    expect(submitted.monthlyContributionCents).toBe(5000);
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
    // Monatliche Sparrate leeren
    fireEvent.change(getByLabelText(/Monatliche Sparrate/i), { target: { value: "" } });
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => expect(submitted).not.toBeNull());
    expect(submitted.monthlyContributionCents).toBeUndefined();
  });
});
