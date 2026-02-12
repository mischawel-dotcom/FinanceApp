import type { PlanInput } from '../types';

import type {
  RecurringIncome,
  RecurringExpense,
  Goal as DomainGoal,
  InvestmentPlan,
  Interval,
  IsoDate,
  GoalPriority as DomainGoalPriority,
  Confidence,
} from '../../domain/types';

// Use your REAL app types (Date fields etc.)
import type { Income, Expense, Asset, FinancialGoal, RecurrenceInterval, GoalPriority as RepoGoalPriority } from '@shared/types';

function toIsoDate(d?: Date): IsoDate | undefined {
  if (!d) return undefined;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function mapRecurrenceIntervalToInterval(i?: RecurrenceInterval): Interval {
  switch (i) {
    case 'monthly': return 'monthly';
    case 'quarterly': return 'quarterly';
    case 'yearly': return 'yearly';
    // MVP: unsupported in planning v1 → fallback
    case 'daily':
    case 'weekly':
    case 'biweekly':
    default:
      return 'monthly';
  }
}

function mapRepoGoalPriorityToDomain(p: RepoGoalPriority): DomainGoalPriority {
  // Domain: 1..5 (1 highest)
  // Repo: low | medium | high | critical
  switch (p) {
    case 'critical': return 1;
    case 'high': return 2;
    case 'medium': return 3;
    case 'low': return 5;
    default: return 3;
  }
}


// Map recurring incomes as before
export function mapIncomeToDomain(i: Income): RecurringIncome | undefined {
  if (!i.isRecurring) return undefined;
  const interval = mapRecurrenceIntervalToInterval(i.recurrenceInterval);
  const confidence: Confidence = 'fixed';
  let amountCents: number = 0;
  if (typeof (i as any).amountCents === 'number' && Number.isInteger((i as any).amountCents)) {
    amountCents = (i as any).amountCents;
  } else if (typeof i.amount === 'number') {
    amountCents = Math.round(i.amount * 100);
  }
  return {
    id: i.id,
    name: i.title,
    amount: amountCents,
    interval,
    confidence,
    startDate: toIsoDate(i.date),
    note: i.notes,
  };
}

// Map one-time incomes to RecurringIncome for the correct month only
function mapOneTimeIncomeToDomain(i: Income): RecurringIncome {
  let amountCents: number = 0;
  if (typeof (i as any).amountCents === 'number' && Number.isInteger((i as any).amountCents)) {
    amountCents = (i as any).amountCents;
  } else if (typeof i.amount === 'number') {
    amountCents = Math.round(i.amount * 100);
  }
  return {
    id: i.id,
    name: i.title,
    amount: amountCents,
    interval: 'monthly',
    confidence: 'fixed',
    startDate: toIsoDate(i.date),
    endDate: toIsoDate(i.date),
    note: i.notes,
  };
}

export function mapExpenseToDomain(e: Expense): RecurringExpense {
  // Expense currently has no recurrenceInterval in your model.
  // MVP assumption: all expenses represent monthly planned expenses.
  const interval: Interval = 'monthly';

  return {
    id: e.id,
    name: e.title,
    amount: e.amount,
    interval,
    startDate: toIsoDate(e.date),
    note: e.notes,
  };
}

export function mapGoalToDomain(g: FinancialGoal): DomainGoal {
  return {
    id: g.id,
    name: g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    wishDate: toIsoDate(g.targetDate),
    priority: mapRepoGoalPriorityToDomain(g.priority),
    note: g.description,
  };
}

export function mapAssetToInvestmentPlan(a: Asset): InvestmentPlan {
  return {
    id: a.id,
    name: a.name,
    currentValue: a.currentValue,
    monthlyContribution: 0, // MVP: asset model has no monthly flow yet
    note: a.notes,
  };
}

export function buildPlanInputFromRepoData(args: {
  incomes: Income[];
  expenses: Expense[];
  goals: FinancialGoal[];
  assets: Asset[];
}): PlanInput {
  // Recurring incomes as before
  const recurringIncomes = args.incomes
    .filter(i => i.isRecurring)
    .map(mapIncomeToDomain)
    .filter((x): x is RecurringIncome => Boolean(x));

  // One-time incomes: only for their month
  const oneTimeIncomes = args.incomes
    .filter(i => !i.isRecurring)
    .map(mapOneTimeIncomeToDomain);

  const incomes = [...recurringIncomes, ...oneTimeIncomes];
  const expenses = args.expenses.map(mapExpenseToDomain);
  const goals = args.goals.map(mapGoalToDomain);
  const investments = args.assets.map(mapAssetToInvestmentPlan);

  return {
    incomes,
    expenses,
    reserves: [],
    goals,
    investments,
    knownPayments: [],
  };
}
