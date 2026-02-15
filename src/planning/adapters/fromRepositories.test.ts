it('goal monthlyContributionCents survives repo mapping and impacts planned bucket (regression)', () => {
  // Setup deterministic repo data
  const repoIncomes = [
    {
      id: 'inc1',
      title: 'Job',
      amount: 400000,
      date: new Date('2026-02-01T00:00:00.000Z'),
      categoryId: 'cat1',
      isRecurring: true,
      recurrenceInterval: 'monthly',
      notes: '',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    },
  ];
  const repoExpenses = [
    {
      id: 'exp1',
      title: 'Miete',
      amount: 100000,
      date: new Date('2026-02-01T00:00:00.000Z'),
      categoryId: 'cat2',
      isRecurring: true,
      recurrenceInterval: 'monthly',
      importance: 1,
      notes: '',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    },
  ];
  const repoGoals = [
    {
      id: 'g1',
      name: 'Test Goal',
      targetAmountCents: 200000,
      monthlyContributionCents: 30000,
      // other fields as needed
    },
  ];
  const repoAssets = [];
  const planInput = buildPlanInputFromRepoData({
    incomes: repoIncomes,
    expenses: repoExpenses,
    goals: repoGoals,
    assets: repoAssets,
  });
  // Step 2: Assert goal monthlyContributionCents survives mapping
  expect(planInput.goals[0].monthlyContributionCents).toBe(30000);
  // Step 3: Project
  const settings = { forecastMonths: 1, startMonth: '2026-02' };
  const proj = buildPlanProjection(planInput, settings);
  // Step 4: Assert planned and free buckets
  const m = proj.timeline[0];
  expect(m.buckets.planned).toBe(30000);
  expect(m.buckets.free).toBe(270000);
  // All are integers
  expect(Number.isInteger(m.buckets.planned)).toBe(true);
  expect(Number.isInteger(m.buckets.free)).toBe(true);
});

import { describe, it, expect } from 'vitest';
import { buildPlanInputFromRepoData, mapIncomeToDomain, mapGoalToDomain, mapExpenseToDomain } from './fromRepositories';
import { buildPlanProjection } from '../forecast';
import type { Income, Expense, FinancialGoal } from '@shared/types';
it('dashboard bound excludes past and far-future one-time expenses (regression)', () => {
  // Setup deterministic repo data
  const repoIncomes = [
    {
      id: 'inc1',
      title: 'Recurring Income',
      amount: 400000,
      date: new Date('2026-02-01T00:00:00.000Z'),
      categoryId: 'cat1',
      isRecurring: true,
      recurrenceInterval: 'monthly',
      notes: '',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    },
  ];
  const repoExpenses = [
    // Recurring monthly expense (should count)
    {
      id: 'exp1',
      title: 'Miete',
      amount: 100000,
      date: new Date('2026-02-01T00:00:00.000Z'),
      categoryId: 'cat2',
      importance: 1,
      notes: '',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    },
    // Past one-time expense (should NOT count)
    {
      id: 'expPast',
      title: 'Past One-Time',
      amount: 1000000,
      date: new Date('2026-01-21T00:00:00.000Z'),
      categoryId: 'cat2',
      importance: 1,
      notes: '',
      createdAt: new Date('2026-01-21T00:00:00.000Z'),
      updatedAt: new Date('2026-01-21T00:00:00.000Z'),
    },
    // Far-future one-time expense (should NOT count)
    {
      id: 'expFuture',
      title: 'Future One-Time',
      amount: 300000,
      date: new Date('2026-05-05T00:00:00.000Z'),
      categoryId: 'cat2',
      importance: 1,
      notes: '',
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
      updatedAt: new Date('2026-05-05T00:00:00.000Z'),
    },
  ];
  const repoGoals = [];
  const repoAssets = [];
  // Build plan input from repo data
  const planInput = buildPlanInputFromRepoData({
    incomes: repoIncomes,
    expenses: repoExpenses,
    goals: repoGoals,
    assets: repoAssets,
  });
  // Use forecastMonths: 2, startMonth: 2026-02
  const settings = { forecastMonths: 2, startMonth: '2026-02' };
  const proj = buildPlanProjection(planInput, settings);
  // Extract month 2026-02
  const m1 = proj.timeline[0];
  expect(m1.month).toBe('2026-02');
  // Only the recurring expense should be counted
  expect(m1.buckets.bound).toBe(100000);
  expect(m1.buckets.bound).not.toBe(1100000); // would mean past one-time leaked
  expect(m1.buckets.bound).not.toBe(400000); // would mean future one-time leaked
  // Optionally check income/expenses/free if available
  if ('income' in m1) expect(m1.income).toBe(400000);
  if ('buckets' in m1 && 'free' in m1.buckets) expect(m1.buckets.free).toBe(300000);
});

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
  isRecurring: true,
  recurrenceInterval: 'monthly',
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
    expect(domain).not.toBeNull();
    expect(domain!.interval).toBe('monthly');
    expect(domain!.startDate).toBe('2026-02-01');
  });

  it('buildPlanInputFromRepoData returns correct PlanInput', () => {
    // Add a one-time expense for this test
    const oneTimeExpense: Expense = {
      id: 'exp2',
      title: 'One-Time',
      amount: 500,
      date: new Date('2026-03-01T00:00:00.000Z'),
      categoryId: 'cat3',
      importance: 1,
      notes: 'One-time expense',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      isRecurring: false,
    };
    const result = buildPlanInputFromRepoData({
      incomes: [sampleIncomeRecurring, sampleIncomeNonRecurring],
      expenses: [sampleExpense, oneTimeExpense],
      goals: [sampleGoal],
      assets: [],
    });
    // Only recurring expenses in expenses
    expect(result.expenses.length).toBe(1);
    expect(result.expenses[0].id).toBe('exp1');
    // One-time expense in knownPayments
    expect(result.knownPayments?.length).toBeGreaterThanOrEqual(1);
    expect(result.knownPayments?.some(kp => kp.id === 'exp2')).toBe(true);
    expect(result.goals.length).toBe(1);
    expect(result.investments.length).toBe(0);
  });
});
