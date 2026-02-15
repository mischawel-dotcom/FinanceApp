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
  const amountCents = typeof i.amount === 'number' ? Math.round(i.amount) : 0;
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
  const amountCents = typeof i.amount === 'number' ? Math.round(i.amount) : 0;
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


export function mapExpenseToDomain(e: Expense): RecurringExpense | null {
  // If the expense is recurring, map as RecurringExpense; else, return null.
  if (e.isRecurring) {
    const interval: Interval = mapRecurrenceIntervalToInterval((e as any).recurrenceInterval);
    let amountCents = 0;
    if (typeof e.amountCents === 'number' && Number.isFinite(e.amountCents)) {
      amountCents = Math.round(e.amountCents);
    } else if (typeof e.amount === 'number' && Number.isFinite(e.amount)) {
      if (e.amount < 10000 && e.amount % 1 !== 0) {
        amountCents = Math.round(e.amount * 100);
      } else {
        amountCents = Math.round(e.amount);
      }
    }
    return {
      id: e.id,
      name: e.title,
      amount: amountCents,
      interval,
      startDate: toIsoDate(e.date),
      note: e.notes,
    };
  }
  // Non-recurring: handled as knownPayment, not RecurringExpense
  return null;
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
    monthlyContributionCents: g.monthlyContributionCents ?? undefined,
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
  // Recurring expenses only
  const expenses = args.expenses.map(mapExpenseToDomain).filter((x): x is RecurringExpense => Boolean(x));

  // One-time (non-recurring) expenses as KnownFuturePayment
  const knownPayments = [
    ...((args.knownPayments ?? []) as any),
    ...args.expenses
      .filter(e => !e.isRecurring)
      .map(e => ({
        id: e.id,
        name: e.title,
        amount: typeof e.amountCents === 'number' && Number.isFinite(e.amountCents)
          ? Math.round(e.amountCents)
          : (typeof e.amount === 'number' && Number.isFinite(e.amount)
            ? (e.amount < 10000 && e.amount % 1 !== 0 ? Math.round(e.amount * 100) : Math.round(e.amount))
            : 0),
        dueDate: toIsoDate(e.date),
        note: e.notes,
      })),
  ];
  const goals = args.goals.map(mapGoalToDomain);
  const investments = args.assets.map(mapAssetToInvestmentPlan);

  return {
    incomes,
    expenses,
    reserves: [],
    goals,
    investments,
    knownPayments,
  };
}
