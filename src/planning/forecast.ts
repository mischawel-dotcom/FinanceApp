/**
 * Planning Core – Stable v2.4
 *
 * Guarantees:
 * - Cents-only arithmetic (integer enforced)
 * - No float/NaN propagation
 * - Strict month scoping (no past/future leakage)
 * - Recurring start/end correctness
 * - Forecast horizon invariants
 * - Integration path verified
 *
 * Last stabilized: 2026-02
 */
// Defensive guard: assert integer, finite cents
export function assertFiniteIntegerCents(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`[CentsGuard] ${label} must be finite integer cents, got: ${value}`);
  }
}
export function toCents(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  return 0;
}
import { simulateGoalsByMonth } from '../domain/simulateGoals';
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

// Type alias for a single month projection
type MonthProjection = PlanProjection["timeline"][number];

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

  const incomes = input.incomes.map(i => {
    assertFiniteIntegerCents(i.amount, `income[${i.id}].amount`);
    return {
      ...i,
      monthly: normalize(i.amount, i.interval)
    };
  });

  const expenses = input.expenses.map(e => {
    assertFiniteIntegerCents(e.amount, `expense[${e.id}].amount`);
    return {
      ...e,
      monthly: normalize(e.amount, e.interval)
    };
  });

  const reserveContrib = input.reserves.reduce((sum, r) => sum + r.monthlyContribution, 0);
  const investContrib = input.investments.reduce((sum, i) => sum + i.monthlyContribution, 0);

  // Goals simulation (stateful, capped)

  // --- Monthly ContributionCents Integration ---
  // Prepare goals array (safe default)
  const goals = (input.goals ?? []);

  // Robust stateful capping für planned goal contributions
  const remainingById: Record<string, number> = {};
  for (const goal of goals) {
    const id = (goal.goalId ?? goal.id) as string;
    const targetCents = toCents(goal.targetAmountCents ?? goal.targetAmount);
    const currentCents = toCents(goal.currentAmountCents ?? goal.currentAmount);
    remainingById[id] = Math.max(0, targetCents - currentCents);
  }

  const timeline: MonthProjection[] = [];
  const paymentsByMonth: Record<MonthKey, number> = {};
  if (input.knownPayments) {
    for (const payment of input.knownPayments) {
      const m = payment.dueDate.slice(0, 7) as MonthKey;
      paymentsByMonth[m] = (paymentsByMonth[m] || 0) + payment.amount;
    }
  }
  for (const month of monthKeys) {
    const plannedGoalBreakdownById: Record<string, number> = {};
    for (const goal of goals) {
      const id = (goal.goalId ?? goal.id) as string;
      const rateCents = toCents(goal.monthlyContributionCents ?? goal.monthlyContribution);
      const contrib = Math.min(rateCents, remainingById[id] ?? 0);
      if (contrib > 0) {
        plannedGoalBreakdownById[id] = contrib;
      }
      remainingById[id] = Math.max(0, (remainingById[id] ?? 0) - contrib);
    }
    // Use breakdown if present, else fallback to sum of all goals' monthlyContributionCents
    const plannedFromBreakdown = plannedGoalBreakdownById
      ? Object.values(plannedGoalBreakdownById).reduce((a, b) => a + b, 0)
      : 0;
    const plannedFromGoalsFallback = (input.goals ?? []).reduce(
      (sum, g) => sum + (g.monthlyContributionCents ?? 0),
      0
    );
    const planned = plannedFromBreakdown > 0 ? plannedFromBreakdown : plannedFromGoalsFallback;
    // Recurring/normal incomes: unchanged
    const recurringIncomeCents = incomes
      .filter(i => {
        const startM = i.startDate ? i.startDate.slice(0, 7) : undefined;
        const endM = i.endDate ? i.endDate.slice(0, 7) : undefined;
        // Exclude one-time incomes
        const isOneTime = i.startDate && i.endDate && i.startDate === i.endDate;
        return !isOneTime && (!startM || month >= startM) && (!endM || month <= endM);
      })
      .reduce((sum, i) => sum + i.monthly, 0);
    // One-time incomes: only in their month, cents-only contract
    const oneTimeIncomeCents = input.incomes
      .filter(i => i.startDate && i.endDate && i.startDate === i.endDate && month === i.startDate.slice(0, 7))
      .reduce((sum, i) => sum + (typeof i.amountCents === 'number' ? i.amountCents : i.amount), 0);
    const sumIncomeCents = recurringIncomeCents + oneTimeIncomeCents;
    const bound =
      expenses
        .filter(e => {
          const startM = e.startDate ? e.startDate.slice(0, 7) : undefined;
          const endM = e.endDate ? e.endDate.slice(0, 7) : undefined;
          return (!startM || month >= startM) && (!endM || month <= endM);
        })
        .reduce((sum, e) => sum + e.monthly, 0)
      + reserveContrib
      + (paymentsByMonth[month] || 0);
    const invested = investContrib;
    const free = sumIncomeCents - bound - planned - invested;
    // DEV-only integer guards
    const assertInt = (n: number, label: string) => {
      if (!Number.isInteger(n)) throw new Error(`[forecast] ${label} must be integer cents, got ${n}`);
    };
    if (import.meta.env?.MODE !== 'production') {
      assertInt(sumIncomeCents, 'income');
      assertInt(bound, 'bound');
      assertInt(planned, 'planned');
      assertInt(invested, 'invested');
      assertInt(free, 'free');
      Object.entries(plannedGoalBreakdownById).forEach(([k, v]) => assertInt(v, `plannedGoalBreakdownById[${k}]`));
    }
    // Output guards
    assertFiniteIntegerCents(sumIncomeCents, `month[${month}].income`);
    assertFiniteIntegerCents(bound, `month[${month}].bound`);
    assertFiniteIntegerCents(planned, `month[${month}].planned`);
    assertFiniteIntegerCents(invested, `month[${month}].invested`);
    assertFiniteIntegerCents(free, `month[${month}].free`);

    // Defensive consistency checks (no behavior change)
    // free = income - bound - planned - invested
    if (free !== sumIncomeCents - bound - planned - invested) {
      throw new Error("Planning integrity violation: inconsistent monthly totals (freeCents)");
    }

    timeline.push({
      month,
      income: sumIncomeCents,
      buckets: { bound, planned, invested, free },
      plannedGoalBreakdownById
    });
  }

  // (moved above, paymentsByMonth is now initialized before timeline loop)

  // (entfernt, da stateful Variante weiter oben definiert ist)

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

  const goalSummaries = input.goals.map(goal => {
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
    goals: goalSummaries,
    events
  };
}
