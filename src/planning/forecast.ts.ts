/**
 * See FinApp4CP.md
 *
 * Task:
 * Implement the planning forecast:
 * - export function buildPlanProjection(input: PlanInput, settings: PlanSettings): PlanProjection
 * - Month is the primary time unit (MonthKey "YYYY-MM")
 * - Normalize recurring values to monthly based on Interval
 * - Produce BucketBreakdown (bound/planned/invested/free) per month
 * - Create events:
 *   - payment_due for KnownFuturePayment in that month
 *   - shortfall when buckets.free < 0
 * - Compute GoalProjection ETA based on goal.currentAmount (if any) and goal.monthlyContribution (if any)
 *
 * Constraints:
 * - deterministic & explainable
 * - no UI code, no persistence, no transactions
 * - MVP only: no inflation, no investment returns
 */

import type { PlanInput, PlanSettings, PlanProjection, MonthKey } from './types';
import type { Interval } from '../domain/types';

// Helper: get current month as MonthKey ("YYYY-MM")
// For deterministic tests, pass settings.startMonth explicitly.
function getCurrentMonthKey(): MonthKey {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}` as MonthKey;
}

// Helper: generate MonthKey array for forecast horizon
function getMonthKeys(startMonth: MonthKey, count: number): MonthKey[] {
  const [startYear, startMonthNum] = startMonth.split('-').map(Number);
  const keys: MonthKey[] = [];
  let year = startYear;
  let month = startMonthNum;

  for (let i = 0; i < count; i++) {
    keys.push(`${year}-${month.toString().padStart(2, '0')}` as MonthKey);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return keys;
}

// Helper: normalize amount to monthly based on Interval type
function normalize(amount: number, interval: Interval): number {
  switch (interval) {
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'semi_yearly': return amount / 6;
    case 'yearly': return amount / 12;
    default: return 0;
  }
}

/**
 * Build the full plan projection for dashboard and recommendation engine.
 * Deterministic, explainable, MVP: no inflation, no investment returns.
 */
export function buildPlanProjection(
  input: PlanInput,
  settings: PlanSettings
): PlanProjection {
  const startMonth: MonthKey = settings.startMonth ?? getCurrentMonthKey();
  const monthKeys = getMonthKeys(startMonth, settings.forecastMonths);

  const incomes = input.incomes.map(i => ({
    ...i,
    monthly: normalize(i.amount, i.interval)
  }));

  const expenses = input.expenses.map(e => ({
    ...e,
    monthly: normalize(e.amount, e.interval)
  }));

  const reserveContrib = input.reserves.reduce((sum, r) => sum + r.monthlyContribution, 0);
  const goalContrib = input.goals.reduce((sum, g) => sum + (g.monthlyContribution || 0), 0);
  const investContrib = input.investments.reduce((sum, i) => sum + i.monthlyContribution, 0);

  const paymentsByMonth: Record<MonthKey, number> = {};
  if (input.knownPayments) {
    for (const payment of input.knownPayments) {
      const m = payment.dueDate.slice(0, 7) as MonthKey;
      paymentsByMonth[m] = (paymentsByMonth[m] || 0) + payment.amount;
    }
  }

  const timeline = monthKeys.map(month => {
    const income = incomes
      .filter(i => (!i.startDate || month >= i.startDate.slice(0,7)) && (!i.endDate || month <= i.endDate.slice(0,7)))

      .reduce((sum, i) => sum + i.monthly, 0);

    const bound =
      expenses
        .filter(i => (!i.startDate || month >= i.startDate.slice(0,7)) && (!i.endDate || month <= i.endDate.slice(0,7)))

        .reduce((sum, e) => sum + e.monthly, 0)
      + reserveContrib
      + (paymentsByMonth[month] || 0);

    const planned = goalContrib;
    const invested = investContrib;
    const free = income - bound - planned - invested;

    return {
      month,
      income,
      buckets: { bound, planned, invested, free }
    };
  });

  const events: PlanProjection['events'] = [];


  if (input.knownPayments) {
    for (const payment of input.knownPayments) {
      events.push({
        month: payment.dueDate.slice(0, 7) as MonthKey,
        type: 'payment_due',
        amount: payment.amount,
        refId: payment.id,
        note: payment.note
      });
    }
  }

  for (const proj of timeline) {
    if (proj.buckets.free < 0) {
      events.push({
        month: proj.month,
        type: 'shortfall',
        amount: proj.buckets.free
      });
    }
  }

  const goals = input.goals.map(goal => {
    let etaMonth: MonthKey | undefined;
    let reachable = false;

    const current = goal.currentAmount ?? 0;

    if (goal.monthlyContribution) {
      const remaining = goal.targetAmount - current;

      if (remaining <= 0) {
        etaMonth = monthKeys[0];
        reachable = true;
      } else {
        const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution);
        if (monthsNeeded <= settings.forecastMonths) {
          etaMonth = monthKeys[monthsNeeded - 1];
          reachable = true;
        }
      }
    }

    return { goalId: goal.id, etaMonth, reachable };
  });

  return {
    settings,
    timeline,
    goals,
    events
  };
}
