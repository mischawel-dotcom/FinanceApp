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
