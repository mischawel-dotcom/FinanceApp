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
  const planInput = buildPlanInputFromPersistedStore();
  const projection = buildPlanProjection(planInput, settings);
  const domainGoals: Goal[] = planInput.goals;

  return {
    heroFree: selectHeroFree(projection),
    buckets: selectCurrentBuckets(projection),
    freeTimeline: selectFreeTimeline(projection),
    shortfalls: selectShortfallEvents(projection),
    goals: selectPrioritizedGoalSummaries(projection, domainGoals, { limit: options?.goalLimit ?? 3 }),
    projection,
  };
}
