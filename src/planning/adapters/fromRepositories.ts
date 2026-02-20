// --- Explicit conversion helpers (no heuristic, no guessing) ---

/** Value is already stored as cents → ensure rounded integer. */
function asIntegerCents(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.round(value);
}

/** Value is stored as Euro (float) → convert to integer cents. */
function euroToCents(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}
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
import type {
  Income,
  Expense,
  Asset,
  FinancialGoal,
  RecurrenceInterval,
  GoalPriority as RepoGoalPriority
} from '../../shared/types/index';

function toIsoDate(d?: Date): IsoDate | undefined {
  if (!d) return undefined;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function mapRecurrenceIntervalToInterval(i?: RecurrenceInterval): Interval {
  switch (i) {
    case 'monthly': return 'monthly';
    case 'quarterly': return 'quarterly';
    case 'yearly': return 'yearly';
    // daily/weekly/biweekly have no domain Interval equivalent → approximate as monthly
    default: return 'monthly';
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


// Income.amount: new data = cents (store writes amountCents mirror).
// Legacy data without amountCents: amount is Euro.
export function mapIncomeToDomain(i: Income): RecurringIncome | undefined {
  if (!('isRecurring' in i ? Boolean((i as any).isRecurring) : Boolean((i as any).recurrenceInterval))) return undefined;
  const interval = mapRecurrenceIntervalToInterval((i as any).recurrenceInterval);
  const confidence: Confidence = 'fixed';
  const amountCents = ('amountCents' in i && typeof (i as any).amountCents === 'number' && Number.isFinite((i as any).amountCents))
    ? asIntegerCents((i as any).amountCents)
    : euroToCents((i as any).amount);
  return {
    id: i.id,
    name: i.title,
    amount: amountCents,
    interval,
    confidence,
    startDate: toIsoDate((i as any).date),
    note: i.notes,
  };
}

function mapOneTimeIncomeToDomain(i: Income): RecurringIncome {
  const amountCents = ('amountCents' in i && typeof (i as any).amountCents === 'number' && Number.isFinite((i as any).amountCents))
    ? asIntegerCents((i as any).amountCents)
    : euroToCents((i as any).amount);
  return {
    id: i.id,
    name: i.title,
    amount: amountCents,
    interval: 'monthly',
    confidence: 'fixed',
    startDate: toIsoDate((i as any).date),
    endDate: toIsoDate((i as any).date),
    note: i.notes,
  };
}


export function mapExpenseToDomain(e: Expense): RecurringExpense | null {
  // Robust recurring detection
  const isRecurring = ('isRecurring' in e) ? Boolean((e as any).isRecurring) : Boolean((e as any).recurrenceInterval);
  if (isRecurring) {
    const interval: Interval = mapRecurrenceIntervalToInterval((e as any).recurrenceInterval);
    let amountCents = 0;
    if ('amountCents' in (e as any) && typeof (e as any).amountCents === 'number' && Number.isFinite((e as any).amountCents)) {
      amountCents = Math.round((e as any).amountCents);
    } else if (typeof (e as any).amount === 'number' && Number.isFinite((e as any).amount)) {
      // IMPORTANT: treat amount as EURO when amountCents is not present
      amountCents = Math.round((e as any).amount * 100);
    } else {
      amountCents = 0;
    }
    if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) amountCents = 0;
    return {
      id: e.id,
      name: e.title,
      amount: amountCents,
      interval,
      startDate: toIsoDate((e as any).date),
      note: e.notes,
    };
  }
  // Non-recurring: handled as knownPayment, not RecurringExpense
  return null;
}

// Goal: *Cents fields are cents. Fallback fields (targetAmount, currentAmount,
// monthlyContribution) are Euro from GoalForm → explicit euroToCents.
export function mapGoalToDomain(g: FinancialGoal): DomainGoal {
  const targetAmountCents = ('targetAmountCents' in g && typeof (g as any).targetAmountCents === 'number')
    ? asIntegerCents((g as any).targetAmountCents)
    : euroToCents((g as any).targetAmount);
  const currentAmountCents = ('currentAmountCents' in g && typeof (g as any).currentAmountCents === 'number')
    ? asIntegerCents((g as any).currentAmountCents)
    : euroToCents((g as any).currentAmount);
  const monthlyContributionCents = ('monthlyContributionCents' in g && typeof (g as any).monthlyContributionCents === 'number')
    ? asIntegerCents((g as any).monthlyContributionCents)
    : euroToCents((g as any).monthlyContribution);
  const mappedGoal: DomainGoal = {
    id: g.id,
    name: g.name,
    targetAmount: (g as any).targetAmount,
    currentAmount: (g as any).currentAmount,
    wishDate: toIsoDate((g as any).targetDate),
    priority: mapRepoGoalPriorityToDomain((g as any).priority),
    note: (g as any).description,
    monthlyContributionCents,
    targetAmountCents,
    currentAmountCents,
    targetDate: (g as any).targetDate ?? undefined,
  };
  return mappedGoal;
}

export function mapAssetToInvestmentPlan(a: Asset): InvestmentPlan {
  // Map monthlyContributionCents (Cents-only, default 0)
  const monthlyContributionCents = typeof a.monthlyContributionCents === 'number' && Number.isFinite(a.monthlyContributionCents)
    ? Math.round(a.monthlyContributionCents)
    : 0;
  return {
    id: a.id,
    name: a.name,
    monthlyContribution: monthlyContributionCents,
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
  const knownPayments = args.expenses
    .flatMap(e => {
      // Robust recurring detection
      const isRecurring = ('isRecurring' in e) ? Boolean((e as any).isRecurring) : Boolean((e as any).recurrenceInterval);
      if (isRecurring) return [];
      const amountCents = ('amountCents' in e && typeof (e as any).amountCents === 'number' && Number.isFinite((e as any).amountCents))
        ? asIntegerCents((e as any).amountCents)
        : euroToCents((e as any).amount);
      const dueDate = toIsoDate((e as any).date);
      if (!dueDate) return [];
      return [{
        id: e.id,
        name: e.title,
        amount: amountCents,
        dueDate,
        note: e.notes,
      }];
    });
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
