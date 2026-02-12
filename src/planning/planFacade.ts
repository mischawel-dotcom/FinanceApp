import type { PlanProjection, PlanSettings } from './types';
import { buildPlanProjection } from './forecast';
import {
  selectHeroFree,
  selectCurrentBuckets,
  selectFreeTimeline,
  selectShortfallEvents,
  selectPrioritizedGoalSummaries,
} from './selectors';

import { buildPlanInputFromRepoData } from './adapters/fromRepositories';
import { buildPlanInputFromPersistedStore } from '@/planning/adapters/fromPersistedStore';

import {
  incomeRepository,
  expenseRepository,
  assetRepository,
  goalRepository,
} from '@data/repositories';

import type { Goal } from '../domain/types';

export type DashboardModel = {
  heroFree: number;
  buckets: ReturnType<typeof selectCurrentBuckets>;
  freeTimeline: ReturnType<typeof selectFreeTimeline>;
  shortfalls: ReturnType<typeof selectShortfallEvents>;
  goals: ReturnType<typeof selectPrioritizedGoalSummaries>;
  projection: PlanProjection;
  domainGoals: Goal[]; // neu: echte Domain Goals
};

export async function buildProjectionFromRepositories(
  settings: PlanSettings
): Promise<PlanProjection> {
  const input = buildPlanInputFromPersistedStore();
  return buildPlanProjection(input, settings);
}

export async function buildDashboardModelFromRepositories(
  settings: PlanSettings,
  options?: { goalLimit?: number }
): Promise<DashboardModel> {
  const planInputRaw = buildPlanInputFromPersistedStore();
  // Normalize expenses to integer cents (amountCents)
  const normalizedExpenses = (planInputRaw.expenses || []).map(e => {
    const anyE = e as any;
    const amountCents =
      Number.isInteger(anyE.amountCents) ? anyE.amountCents :
      typeof anyE.amount === "number" ? Math.round(anyE.amount * 100) :
      0;
    // forecast expects integer cents in .amount
    return { ...e, amountCents, amount: amountCents };
  });
  const planInput = { ...planInputRaw, expenses: normalizedExpenses };
  // Debug log incomes and expenses for integer check
  const DEBUG = import.meta.env.DEV && import.meta.env.VITE_DEBUG === "1";
  if (DEBUG && typeof window !== 'undefined' && window.console) {
    const debugIncomes = (planInput.incomes || []).map(i => ({
      id: i.id,
      name: i.name,
      amount: i.amount,
      typeofAmount: typeof i.amount,
      isInt: Number.isInteger(i.amount)
    }));
    // Expanded debug for expenses: log all relevant fields per item
    const debugExpenses = (planInput.expenses || []).map(e => ({
      id: e.id,
      name: (e.name ?? e.title ?? ""),
      amountCents: (e as any).amountCents,
      amount: (e as any).amount,
      monthlyAmountCents: (e as any).monthlyAmountCents,
      monthlyAmount: (e as any).monthlyAmount,
      typeof_amountCents: typeof (e as any).amountCents,
      typeof_amount: typeof (e as any).amount,
      typeof_monthlyAmountCents: typeof (e as any).monthlyAmountCents,
      typeof_monthlyAmount: typeof (e as any).monthlyAmount,
      isInt_amountCents: Number.isInteger((e as any).amountCents),
      isInt_amount: Number.isInteger((e as any).amount),
      isInt_monthlyAmountCents: Number.isInteger((e as any).monthlyAmountCents),
      isInt_monthlyAmount: Number.isInteger((e as any).monthlyAmount),
    }));
    // eslint-disable-next-line no-console
    console.error('[DEBUG_CENTS_INPUT] incomes', debugIncomes);
    // eslint-disable-next-line no-console
    console.error('[DEBUG_CENTS_INPUT] expenses', debugExpenses);
  }
  const projection = buildPlanProjection(planInput, settings);
  const domainGoals: Goal[] = planInput.goals;

  return {
    heroFree: selectHeroFree(projection),
    buckets: selectCurrentBuckets(projection),
    freeTimeline: selectFreeTimeline(projection),
    shortfalls: selectShortfallEvents(projection),
    goals: selectPrioritizedGoalSummaries(projection, domainGoals, { limit: options?.goalLimit ?? 3 }),
    projection,
    domainGoals, // neu
  };
}
