
import { describe, it, expect } from 'vitest';
import { buildPlanInputFromRepoData, mapIncomeToDomain, mapGoalToDomain, mapExpenseToDomain } from './fromRepositories';
import type { Income, Expense, FinancialGoal } from '@shared/types';

const sampleIncomeRecurring: Income = {
  id: 'inc1',
  title: 'Salary',
  amount: 3000,
  date: new Date('2026-02-01T00:00:00.000Z'),
  categoryId: 'cat1',
  isRecurring: true,
  recurrenceInterval: 'monthly',
  notes: 'Main job',
  createdAt: new Date('2026-02-01T00:00:00.000Z'),
  updatedAt: new Date('2026-02-01T00:00:00.000Z'),
};

const sampleIncomeNonRecurring: Income = {
  id: 'inc2',
  title: 'Gift',
  amount: 500,
  date: new Date('2026-02-01T00:00:00.000Z'),
  categoryId: 'cat1',
  isRecurring: false,
  recurrenceInterval: 'monthly',
  notes: 'Birthday',
  createdAt: new Date('2026-02-01T00:00:00.000Z'),
  updatedAt: new Date('2026-02-01T00:00:00.000Z'),
};

const sampleGoal: FinancialGoal = {
  id: 'goal1',
  name: 'Buy Car',
  targetAmount: 10000,
  currentAmount: 2000,
  targetDate: new Date('2026-02-01T00:00:00.000Z'),
  priority: 'high',
  description: 'Electric car',
  createdAt: new Date('2026-02-01T00:00:00.000Z'),
  updatedAt: new Date('2026-02-01T00:00:00.000Z'),
};

const sampleExpense: Expense = {
  id: 'exp1',
  title: 'Rent',
  amount: 800,
  date: new Date('2026-02-01T00:00:00.000Z'),
  categoryId: 'cat2',
  importance: 1,
  notes: 'Monthly rent',
  createdAt: new Date('2026-02-01T00:00:00.000Z'),
  updatedAt: new Date('2026-02-01T00:00:00.000Z'),
};

describe('fromRepositories adapter', () => {
  it('maps recurring Income to RecurringIncome with ISO date and monthly interval', () => {
    const domain = mapIncomeToDomain(sampleIncomeRecurring);
    expect(domain).toBeDefined();
    expect(domain?.interval).toBe('monthly');
    expect(domain?.startDate).toBe('2026-02-01');
    expect(domain?.name).toBe('Salary');
  });

  it('excludes non-recurring Income', () => {
    const domain = mapIncomeToDomain(sampleIncomeNonRecurring);
    expect(domain).toBeUndefined();
  });

  it('maps Goal priority "high" to numeric 2 and targetDate to wishDate ISO', () => {
    const domain = mapGoalToDomain(sampleGoal);
    expect(domain.priority).toBe(2);
    expect(domain.wishDate).toBe('2026-02-01');
  });

  it('maps Expense to monthly RecurringExpense', () => {
    const domain = mapExpenseToDomain(sampleExpense);
    expect(domain.interval).toBe('monthly');
    expect(domain.startDate).toBe('2026-02-01');
  });

  it('buildPlanInputFromRepoData returns correct PlanInput', () => {
    const result = buildPlanInputFromRepoData({
      incomes: [sampleIncomeRecurring, sampleIncomeNonRecurring],
      expenses: [sampleExpense],
      goals: [sampleGoal],
      assets: [],
    });
    expect(result.incomes.length).toBe(2);
    expect(result.expenses.length).toBe(1);
    expect(result.goals.length).toBe(1);
    expect(result.investments.length).toBe(0);
  });
});
