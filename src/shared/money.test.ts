import { describe, it, expect } from "vitest";
import { moneyToCents } from "./moneyToCents";
import { centsToMoney } from "./centsToMoney";

describe("money utils", () => {
  it("moneyToCents(400) === 40000", () => {
    expect(moneyToCents(400)).toBe(40000);
  });
  it("centsToMoney(40000) === 400", () => {
    expect(centsToMoney(40000)).toBe(400);
  });
  it("roundtrip: moneyToCents(centsToMoney(x)) === x", () => {
    const x = 12345;
    expect(moneyToCents(centsToMoney(x)!)).toBe(x);
  });
  it("edge: undefined/null handling", () => {
    expect(moneyToCents(undefined)).toBe(0);
    expect(centsToMoney(undefined)).toBeUndefined();
    expect(centsToMoney(null)).toBeUndefined();
  });
});
