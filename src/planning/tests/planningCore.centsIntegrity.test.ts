              it("planned is 0 after goal is fully funded (no fallback)", () => {
                const input = {
                  incomes: [
                    {
                      id: "inc1",
                      title: "High Income",
                      amount: 1000000,
                      interval: "monthly",
                      startDate: "2026-02-01",
                    }
                  ],
                  expenses: [],
                  reserves: [],
                  investments: [],
                  goals: [
                    {
                      id: "goal1",
                      name: "Test Goal",
                      targetAmountCents: 130000,
                      currentAmountCents: 30000,
                      monthlyContributionCents: 50000,
                    }
                  ],
                };
                const settings = { forecastMonths: 5, startMonth: "2026-02" };
                const proj = buildPlanProjection(input, settings);
                // Month 1: planned = 50000
                expect(proj.timeline[0].buckets.planned).toBe(50000);
                // Month 2: planned = 50000
                expect(proj.timeline[1].buckets.planned).toBe(50000);
                // Month 3: planned = 0 (goal fully funded)
                expect(proj.timeline[2].buckets.planned).toBe(0);
                // Month 4+: planned = 0
                expect(proj.timeline[3].buckets.planned).toBe(0);
                expect(proj.timeline[4].buckets.planned).toBe(0);
                // Free increases by 50000 starting with Month 3
                const free1 = proj.timeline[0].buckets.free;
                const free3 = proj.timeline[2].buckets.free;
                expect(free3 - free1).toBe(50000);
              });
            it("first month result is identical regardless of forecast length", () => {
              const input = {
                incomes: [
                  {
                    id: "inc1",
                    title: "Recurring Income",
                    amount: 10000,
                    interval: "monthly",
                    startDate: "2026-02-01",
                    endDate: "2026-04-01",
                  }
                ],
                expenses: [
                  {
                    id: "exp1",
                    title: "Recurring Expense",
                    amount: 100,
                    interval: "monthly",
                    startDate: "2026-02-01",
                    endDate: "2026-04-01",
                  }
                ],
                reserves: [],
                goals: [],
                investments: [],
              };
              const settings1 = { forecastMonths: 1, startMonth: "2026-02" };
              const settings3 = { forecastMonths: 3, startMonth: "2026-02" };
              const proj1 = buildPlanProjection(input, settings1);
              const proj3 = buildPlanProjection(input, settings3);
              const m1 = proj1.timeline[0];
              const m3 = proj3.timeline[0];
              expect(m1.month).toBe("2026-02");
              expect(m3.month).toBe("2026-02");
              expect(m1.income).toBe(m3.income);
              expect(m1.buckets.bound).toBe(m3.buckets.bound);
              expect(m1.buckets.free).toBe(m3.buckets.free);
              // Integer/finite assertions
              [m1.income, m1.buckets.bound, m1.buckets.free, m3.income, m3.buckets.bound, m3.buckets.free].forEach(x => {
                expect(Number.isFinite(x)).toBe(true);
                expect(Number.isInteger(x)).toBe(true);
              });
            });
          it("counts one-time expense exactly in its month, not before/after", () => {
            const input = {
              incomes: [
                {
                  id: "inc1",
                  title: "Recurring Income",
                  amount: 10000,
                  interval: "monthly",
                  startDate: "2026-02-01",
                  endDate: "2026-04-01",
                }
              ],
              expenses: [
                {
                  id: "exp1",
                  title: "Recurring Expense",
                  amount: 100,
                  interval: "monthly",
                  startDate: "2026-02-01",
                  endDate: "2026-04-01",
                },
                {
                  id: "exp2",
                  title: "One-time Expense",
                  amount: 500,
                  interval: "monthly",
                  startDate: "2026-03-15",
                  endDate: "2026-03-15",
                }
              ],
              reserves: [],
              goals: [],
              investments: [],
            };
            const settings = { forecastMonths: 3, startMonth: "2026-02" };
            const result = buildPlanProjection(input, settings);
            const months = ["2026-02", "2026-03", "2026-04"];
            const expected = [
              { income: 10000, bound: 100, free: 9900 },
              { income: 10000, bound: 600, free: 9400 },
              { income: 10000, bound: 100, free: 9900 },
            ];
            months.forEach((monthKey, idx) => {
              const entry = result.timeline[idx];
              expect(entry.month).toBe(monthKey);
              expect(entry.income).toBe(expected[idx].income);
              expect(entry.buckets.bound).toBe(expected[idx].bound);
              expect(entry.buckets.free).toBe(expected[idx].free);
              // Integer/finite assertions
              [entry.income, entry.buckets.bound, entry.buckets.free].forEach(x => {
                expect(Number.isFinite(x)).toBe(true);
                expect(Number.isInteger(x)).toBe(true);
              });
            });
            // ×100 guard for March one-time expense
            const marchEntry = result.timeline[1];
            expect(marchEntry.buckets.bound).not.toBe(50100);
            expect(marchEntry.buckets.bound).not.toBe(60000);
          });
        it("produces consistent 3-month timeline projection for recurring items", () => {
          const input = {
            incomes: [
              {
                id: "inc1",
                title: "Recurring Income",
                amount: 10000,
                interval: "monthly",
                startDate: "2026-02-01",
                endDate: "2026-04-01",
              }
            ],
            expenses: [
              {
                id: "exp1",
                title: "Recurring Expense",
                amount: 100,
                interval: "monthly",
                startDate: "2026-02-01",
                endDate: "2026-04-01",
              }
            ],
            reserves: [],
            goals: [],
            investments: [],
          };
          const settings = { forecastMonths: 3, startMonth: "2026-02" };
          const result = buildPlanProjection(input, settings);
          const months = ["2026-02", "2026-03", "2026-04"];
          months.forEach((monthKey, idx) => {
            const entry = result.timeline[idx];
            expect(entry.month).toBe(monthKey);
            expect(entry.income).toBe(10000);
            expect(entry.buckets.bound).toBe(100);
            expect(entry.buckets.free).toBe(9900);
            // Integer/finite assertions
            [entry.income, entry.buckets.bound, entry.buckets.free].forEach(x => {
              expect(Number.isFinite(x)).toBe(true);
              expect(Number.isInteger(x)).toBe(true);
            });
          });
        });
      it("does not count recurring monthly income after end month", () => {
        // RecurringIncome supports endDate (endMonth)
        const input = {
          incomes: [
            {
              id: "inc1",
              title: "Recurring Income",
              amount: 10000,
              interval: "monthly",
              startDate: "2026-02-01",
              endDate: "2026-03-01",
            }
          ],
          expenses: [],
          reserves: [],
          goals: [],
          investments: [],
        };
        const settings = { forecastMonths: 1, startMonth: "2026-04" };
        const result = buildPlanProjection(input, settings);
        const monthEntry = result.timeline[0];
        expect(monthEntry.income).toBe(0);
        expect(monthEntry.buckets.bound).toBe(0);
        expect(monthEntry.buckets.free).toBe(0);
        // Regression guards
        expect(monthEntry.income).not.toBe(10000);
        expect(monthEntry.buckets.free).not.toBe(10000);
        // Integer/finite assertions
        [monthEntry.income, monthEntry.buckets.bound, monthEntry.buckets.free].forEach(x => {
          expect(Number.isFinite(x)).toBe(true);
          expect(Number.isInteger(x)).toBe(true);
        });
      });
    it("does not count recurring monthly income before start month", () => {
      const input = {
        incomes: [
          {
            id: "inc1",
            title: "Recurring Income",
            amount: 10000,
            interval: "monthly",
            startDate: "2026-03-01",
            endDate: undefined,
          }
        ],
        expenses: [],
        reserves: [],
        goals: [],
        investments: [],
      };
      const settings = { forecastMonths: 1, startMonth: "2026-02" };
      const result = buildPlanProjection(input, settings);
      const monthEntry = result.timeline[0];
      expect(monthEntry.income).toBe(0);
      expect(monthEntry.buckets.bound).toBe(0);
      expect(monthEntry.buckets.free).toBe(0);
      // Regression guards
      expect(monthEntry.income).not.toBe(10000);
      expect(monthEntry.buckets.free).not.toBe(10000);
      // Integer/finite assertions
      [monthEntry.income, monthEntry.buckets.bound, monthEntry.buckets.free].forEach(x => {
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isInteger(x)).toBe(true);
      });
    });
  it("counts recurring monthly income and expense exactly once", () => {
    const input = {
      incomes: [
        {
          id: "inc1",
          title: "Recurring Income",
          amount: 10000,
          interval: "monthly",
          startDate: "2026-02-01",
          endDate: undefined,
        }
      ],
      expenses: [
        {
          id: "exp1",
          title: "Recurring Expense",
          amount: 100,
          interval: "monthly",
          startDate: "2026-02-01",
          endDate: undefined,
        }
      ],
      reserves: [],
      goals: [],
      investments: [],
    };
    const settings = { forecastMonths: 1, startMonth: "2026-02" };
    const result = buildPlanProjection(input, settings);
    const monthEntry = result.timeline[0];
    // Assert recurring items are counted exactly once
    expect(monthEntry.income).toBe(10000);
    expect(monthEntry.buckets.bound).toBe(100);
    expect(monthEntry.buckets.free).toBe(9900);
  });
// Version 2.0.1 – Planning Core Regression Test (Cents Integrity Guard)

import { describe, it, expect } from "vitest";
import { buildPlanProjection } from "../forecast";

describe("Planning Core – Cents Integrity Guard", () => {
  it("minimal monthly input returns correct integer cents", () => {
    const input = {
      incomes: [
        {
          id: "inc1",
          title: "Test Income",
          amount: 10000,
          interval: "monthly",
          startDate: "2026-02-01",
          endDate: undefined,
        }
      ],
      expenses: [
        {
          id: "exp1",
          title: "Test Expense",
          amount: 100,
          interval: "monthly",
          startDate: "2026-02-01",
          endDate: undefined,
        }
      ],
      reserves: [],
      goals: [],
      investments: [],
    };
    const settings = { forecastMonths: 1, startMonth: "2026-02" };
    const result = buildPlanProjection(input, settings);
    const monthEntry = result.timeline[0];
    const monthlyIncomeCents = monthEntry.income;
    const monthlyExpenseCents = monthEntry.buckets.bound;
    const freeCents = monthEntry.buckets.free;
    const boundCents = monthEntry.buckets.bound;

    // Value assertions
    expect(monthlyIncomeCents).toBe(10000);
    expect(monthlyExpenseCents).toBe(100);
    expect(freeCents).toBe(9900);
    expect(boundCents).toBe(100);

    // Integer/finite assertions
    [monthlyIncomeCents, monthlyExpenseCents, freeCents, boundCents].forEach(x => {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isInteger(x)).toBe(true);
    });

    // ×100 regression guards
    expect(freeCents).not.toBe(990000);
    expect(monthlyExpenseCents).not.toBe(10000);
    expect(boundCents).not.toBe(10000);
  });

  it("throws on float cents input", () => {
    const input = {
      incomes: [
        {
          id: "inc1",
          title: "Float Income",
          amount: 100.5,
          interval: "monthly",
          startDate: "2026-02-01",
          endDate: undefined,
        }
      ],
      expenses: [],
      reserves: [],
      goals: [],
      investments: [],
    };
    const settings = { forecastMonths: 1, startMonth: "2026-02" };
    expect(() => buildPlanProjection(input, settings)).toThrow(/finite integer cents/);
  });

  it("throws on NaN cents input", () => {
    const input = {
      incomes: [
        {
          id: "inc1",
          title: "NaN Income",
          amount: Number("nope") as any,
          interval: "monthly",
          startDate: "2026-02-01",
          endDate: undefined,
        }
      ],
      expenses: [],
      reserves: [],
      goals: [],
      investments: [],
    };
    const settings = { forecastMonths: 1, startMonth: "2026-02" };
    expect(() => buildPlanProjection(input, settings)).toThrow(/finite integer cents/);
  });
});
