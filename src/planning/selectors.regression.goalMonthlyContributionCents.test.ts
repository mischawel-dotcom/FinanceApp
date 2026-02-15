import { describe, it, expect } from 'vitest';
import { buildPlanProjection } from './forecast';
import type { PlanSettings } from './types';

describe('regression: goal monthlyContributionCents impacts buckets', () => {
  it('allocates monthlyContributionCents to planned/free in forecast', () => {
    const settings: PlanSettings = { startMonth: '2026-02', forecastMonths: 1 };
    const income = {
      id: 'inc1',
      name: 'Job',
      amount: 400000,
      interval: 'monthly',
      confidence: 'fixed',
      startDate: '2026-02-01',
    };
    const expense = {
      id: 'exp1',
      name: 'Rent',
      amount: 100000,
      interval: 'monthly',
      startDate: '2026-02-01',
    };
    const goal = {
      id: 'g1',
      name: 'Test Goal',
      targetAmountCents: 200000,
      monthlyContributionCents: 40000,
      priority: 1,
    };
    const planInput = {
      incomes: [income],
      expenses: [expense],
      reserves: [],
      goals: [goal],
      investments: [],
      knownPayments: [],
    };
    const proj = buildPlanProjection(planInput, settings);
    const month = proj.timeline[0];
    expect(month.month).toBe('2026-02');
    expect(month.income).toBe(400000);
    expect(month.buckets.bound).toBe(100000);
    expect(month.buckets.planned).toBe(40000); // should be 40000, currently 0
    expect(month.buckets.free).toBe(260000);   // should be 260000, currently 300000
  });
});
