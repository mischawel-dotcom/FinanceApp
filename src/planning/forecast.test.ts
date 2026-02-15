        it('past one-time expense does not affect current or future month buckets', () => {
          const incomes = [
            { id: 'i1', name: 'Salary', amount: 100000, interval: 'monthly', confidence: 'fixed', startDate: '2026-01-01' },
          ];
          const expenses = [
            // Past one-time expense (should NOT affect any bucket)
            { id: 'ePast', name: 'Past One-Time', amount: 300000, interval: 'once', startDate: '2026-01-15' },
            // Current recurring expense (should affect both months)
            { id: 'eRec', name: 'Current Recurring', amount: 1000, interval: 'monthly', startDate: '2026-02-01' },
          ];
          const settings = { forecastMonths: 2, startMonth: '2026-02' };
          const input = mkInput({ incomes, expenses });
          const proj = buildPlanProjection(input, settings);
          expect(proj.timeline).toHaveLength(2);
          const m1 = proj.timeline[0];
          const m2 = proj.timeline[1];
          expect(m1.month).toBe('2026-02');
          expect(m2.month).toBe('2026-03');
          // Only the current recurring expense should be counted
          expect(m1.buckets.bound).toBe(1000);
          expect(m2.buckets.bound).toBe(1000);
          // Optional guards: integer/finite
          [m1.buckets.bound, m2.buckets.bound].forEach(x => {
            expect(Number.isFinite(x)).toBe(true);
            expect(Number.isInteger(x)).toBe(true);
          });
        });
      it('bound is month-scoped: future items do not leak into previous months', () => {
        const incomes = [
          { id: 'i1', name: 'Salary', amount: 100000, interval: 'monthly', confidence: 'fixed', startDate: '2026-01-01' },
        ]; // stable income
        const expenses = [
          { id: 'eA', name: 'Future Expense', amount: 1000, interval: 'monthly', startDate: '2026-02-01' }, // starts in m2
        ];
        const knownPayments = [
          { id: 'pB', name: 'Future Payment', amount: 2000, dueDate: '2026-02-15' }, // due in m2
        ];
        const settings = { forecastMonths: 2, startMonth: '2026-01' };
        const input = mkInput({ incomes, expenses, knownPayments });
        const proj = buildPlanProjection(input, settings);
        expect(proj.timeline).toHaveLength(2);
        const m1 = proj.timeline[0];
        const m2 = proj.timeline[1];
        expect(m1.month).toBe('2026-01');
        expect(m2.month).toBe('2026-02');
        // Bound for m1 should be 0 (no expenses/payments active)
        expect(m1.buckets.bound).toBe(0);
        // Bound for m2 should be 1000 (expenseA) + 2000 (paymentB) = 3000
        expect(m2.buckets.bound).toBe(3000);
        // Optional guards: integer/finite
        [m1.buckets.bound, m2.buckets.bound].forEach(x => {
          expect(Number.isFinite(x)).toBe(true);
          expect(Number.isInteger(x)).toBe(true);
        });
      });
    it('includes one-time income only in its month, recurring in all', () => {
      const recurringIncome: RecurringIncome = {
        id: 'i1',
        name: 'Salary',
        amount: 320000,
        interval: 'monthly',
        confidence: 'fixed',
        startDate: '2026-02-01',
      };
      const oneTimeIncome: RecurringIncome = {
        id: 'i2',
        name: 'Bonus',
        amount: 80000,
        interval: 'monthly',
        confidence: 'fixed',
        startDate: '2026-02-01',
        endDate: '2026-02-01',
      };
      const settings: PlanSettings = { forecastMonths: 2, startMonth: '2026-02' as MonthKey };
      const input = mkInput({ incomes: [recurringIncome, oneTimeIncome] });
      const proj = buildPlanProjection(input, settings);
      expect(proj.timeline).toHaveLength(2);
      // In February, both incomes count
      expect(proj.timeline[0].month).toBe('2026-02');
      expect(proj.timeline[0].income).toBe(320000 + 80000);
      // In March, only recurring income counts
      expect(proj.timeline[1].month).toBe('2026-03');
      expect(proj.timeline[1].income).toBe(320000);
    });
  it('caps planned goal contributions statefully', () => {
    const settings: PlanSettings = { forecastMonths: 2, startMonth: '2026-01' as MonthKey };
    const goals = [
      {
        id: 'g1',
        name: 'TestGoal',
        targetAmount: 100,
        currentAmount: 90,
        monthlyContribution: 50,
        priority: 1,
      },
    ];
    const input = mkInput({ goals });
    const proj = buildPlanProjection(input, settings);
    // Cap: only 0.10 needed in first month, then 0 in second
    expect(proj.timeline[0].buckets.planned).toBe(10); // cents
    expect(proj.timeline[1].buckets.planned).toBe(0);
    expect(proj.timeline[0].plannedGoalBreakdownById.g1).toBe(10);
    expect(proj.timeline[1].plannedGoalBreakdownById?.g1).toBeUndefined();
    // Guards: Integer cents
    expect(() => buildPlanProjection(input, settings)).not.toThrow();
    expect(Number.isInteger(proj.timeline[0].buckets.free)).toBe(true);
    expect(Number.isInteger(proj.timeline[0].buckets.planned)).toBe(true);
  });
import { describe, it, expect } from 'vitest';
import { buildPlanProjection } from './forecast';
import type { PlanInput, PlanSettings, MonthKey } from './types';
import type {
  RecurringIncome,
  RecurringExpense,
  ReserveBucket,
  Goal,
  InvestmentPlan,
  KnownFuturePayment,
} from '../domain/types';

function mkInput(partial?: Partial<PlanInput>): PlanInput {
  return {
    incomes: [],
    expenses: [],
    reserves: [],
    goals: [],
    investments: [],
    knownPayments: [],
    ...partial,
  };
}

describe('buildPlanProjection (Planning / Forecast MVP)', () => {
  it('normalizes yearly expense 1200 to 100 per month', () => {
    const expenses: RecurringExpense[] = [
      {
        id: 'e1',
        name: 'Insurance',
        amount: 1200,
        interval: 'yearly',
        // startDate/endDate optional
      },
    ];

    const settings: PlanSettings = { forecastMonths: 1, startMonth: '2026-02' as MonthKey };
    const input = mkInput({ expenses });

    const proj = buildPlanProjection(input, settings);
    expect(proj.timeline).toHaveLength(1);
    expect(proj.timeline[0].buckets.bound).toBeCloseTo(100, 10);
  });

  it('includes known future payment amount in bound bucket for that month', () => {
    const incomes: RecurringIncome[] = [
      { id: 'i1', name: 'Salary', amount: 2000, interval: 'monthly', confidence: 'fixed' },
    ];

    const knownPayments: KnownFuturePayment[] = [
      { id: 'p1', name: 'Tax bill', amount: 500, dueDate: '2026-03-15' },
    ];

    const settings: PlanSettings = { forecastMonths: 2, startMonth: '2026-02' as MonthKey };
    const input = mkInput({ incomes, knownPayments });

    const proj = buildPlanProjection(input, settings);
    expect(proj.timeline).toHaveLength(2);

    const feb = proj.timeline[0];
    const mar = proj.timeline[1];

    expect(feb.month).toBe('2026-02');
    expect(mar.month).toBe('2026-03');

    // In March, bound should include the 500 payment
    expect(mar.buckets.bound).toBeCloseTo(500, 10);

    // And free should reflect it (income 2000 - bound 500)
    expect(mar.buckets.free).toBeCloseTo(1500, 10);
  });

  it('creates a shortfall event when free is negative', () => {
    const incomes: RecurringIncome[] = [
      { id: 'i1', name: 'Salary', amount: 1000, interval: 'monthly', confidence: 'fixed' },
    ];
    const expenses: RecurringExpense[] = [
      { id: 'e1', name: 'Rent', amount: 1500, interval: 'monthly' },
    ];

    const settings: PlanSettings = { forecastMonths: 1, startMonth: '2026-02' as MonthKey };
    const input = mkInput({ incomes, expenses });

    const proj = buildPlanProjection(input, settings);

    expect(proj.timeline[0].buckets.free).toBeLessThan(0);

    const shortfalls = proj.events.filter(e => e.type === 'shortfall');
    expect(shortfalls.length).toBe(1);
    expect(shortfalls[0].month).toBe('2026-02');
  });
});
