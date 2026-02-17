import type { PlanProjection, PlanSettings } from './types';
import { buildPlanProjection } from './forecast';
import {
  selectHeroFree,
  selectCurrentBuckets,
  selectFreeTimeline,
  selectShortfallEvents,
  selectPrioritizedGoalSummaries,
} from './selectors';

// import { buildPlanInputFromRepoData } from './adapters/fromRepositories';
import { buildPlanInputFromPersistedStore } from '@/planning/adapters/fromPersistedStore';

// import {
//   incomeRepository,
//   expenseRepository,
//   assetRepository,
//   goalRepository,
// } from '@data/repositories';

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
  // Normalize expenses: treat amount as integer cents already
  const normalizedExpenses = (planInputRaw.expenses || []).map(e => {
    const anyE = e as any;
    let amountCents = 0;
    if (typeof anyE.amount === 'number' && Number.isFinite(anyE.amount)) {
      amountCents = Math.round(anyE.amount);
    } else if (typeof anyE.amountCents === 'number' && Number.isFinite(anyE.amountCents)) {
      amountCents = Math.round(anyE.amountCents);
    }
    return { ...e, amountCents, amount: amountCents };
  });
  const planInput = { ...planInputRaw, expenses: normalizedExpenses };
  // Debug log incomes and expenses for integer check
  // DEBUG entfernt, nicht genutzt
  // Debug log incomes and expenses for integer check
  // Removed unused debug block
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
