import type { PlanProjection, BucketBreakdown, MonthKey } from './types';
import type { Goal, GoalPriority } from '../domain/types';

export function selectCurrentMonth(proj: PlanProjection): MonthKey | undefined {
  return proj.timeline[0]?.month;
}

export function selectHeroFree(proj: PlanProjection): number {
  return proj.timeline[0]?.buckets.free ?? 0;
}

export function selectCurrentBuckets(proj: PlanProjection): BucketBreakdown {
  return proj.timeline[0]?.buckets ?? { bound: 0, planned: 0, invested: 0, free: 0 };
}

export function selectFreeTimeline(proj: PlanProjection): Array<{ month: MonthKey; free: number }> {
  return proj.timeline.map(m => ({ month: m.month, free: m.buckets.free }));
}

export function selectShortfallEvents(proj: PlanProjection): Array<{ month: MonthKey; amount: number }> {
  return proj.events
    .filter(e => e.type === 'shortfall')
    .map(e => ({ month: e.month, amount: e.amount ?? 0 }));
}

export type GoalSummary = {
  goalId: string;
  name: string;
  priority: GoalPriority;
  reachable: boolean;
  etaMonth?: MonthKey;
};

export function selectPrioritizedGoalSummaries(
  proj: PlanProjection,
  domainGoals: Goal[],
  options?: { limit?: number }
): GoalSummary[] {
  const limit = options?.limit ?? 3;

  const domainById = new Map(domainGoals.map(g => [g.id, g] as const));
  const merged = proj.goals
    .map(pg => {
      const dg = domainById.get(pg.goalId);
      if (!dg) return undefined;
      return {
        goalId: dg.id,
        name: dg.name,
        priority: dg.priority,
        reachable: pg.reachable,
        etaMonth: pg.etaMonth,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  // Sort order (dashboard friendly):
  // 1) priority ascending (1 is highest)
  // 2) reachable first
  // 3) earlier ETA first (undefined ETA last)
  merged.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;

    if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;

    if (a.etaMonth && b.etaMonth) return a.etaMonth.localeCompare(b.etaMonth);
    if (a.etaMonth && !b.etaMonth) return -1;
    if (!a.etaMonth && b.etaMonth) return 1;
    return 0;
  });

  return merged.slice(0, limit);
}
