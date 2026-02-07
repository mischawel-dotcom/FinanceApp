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
  const [incomes, expenses, assets, goals] = await Promise.all([
    incomeRepository.getAll(),
    expenseRepository.getAll(),
    assetRepository.getAll(),
    goalRepository.getAll(),
  ]);

  const input = buildPlanInputFromRepoData({
    incomes,
    expenses,
    goals,
    assets,
  });

  return buildPlanProjection(input, settings);
}

export async function buildDashboardModelFromRepositories(
  settings: PlanSettings,
  options?: { goalLimit?: number }
): Promise<DashboardModel> {
  const [projection, repoGoals] = await Promise.all([
    buildProjectionFromRepositories(settings),
    goalRepository.getAll(),
  ]);

  const domainGoals: Goal[] = buildPlanInputFromRepoData({
    incomes: [],
    expenses: [],
    assets: [],
    goals: repoGoals,
  }).goals;

  return {
    heroFree: selectHeroFree(projection),
    buckets: selectCurrentBuckets(projection),
    freeTimeline: selectFreeTimeline(projection),
    shortfalls: selectShortfallEvents(projection),
    goals: selectPrioritizedGoalSummaries(projection, domainGoals, { limit: options?.goalLimit ?? 3 }),
    projection,
  };
}
