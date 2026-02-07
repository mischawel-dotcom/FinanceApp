import { describe, it, expect } from 'vitest';
import type { PlanProjection, MonthKey } from './types';
import type { Goal } from '../domain/types';
import {
  selectHeroFree,
  selectShortfallEvents,
  selectPrioritizedGoalSummaries,
} from './selectors';

function mkProjection(partial?: Partial<PlanProjection>): PlanProjection {
  return {
    settings: { forecastMonths: 2, startMonth: '2026-02' as MonthKey },
    timeline: [
      { month: '2026-02' as MonthKey, income: 2000, buckets: { bound: 500, planned: 200, invested: 0, free: 1300 } },
      { month: '2026-03' as MonthKey, income: 2000, buckets: { bound: 2600, planned: 200, invested: 0, free: -800 } },
    ],
    goals: [],
    events: [],
    ...partial,
  };
}

describe('planning/selectors', () => {
  it('selectHeroFree returns free money for current month', () => {
    const proj = mkProjection();
    expect(selectHeroFree(proj)).toBe(1300);
  });

  it('selectShortfallEvents returns only shortfall events (month + amount)', () => {
    const proj = mkProjection({
      events: [
        { month: '2026-02' as MonthKey, type: 'payment_due', amount: 500, refId: 'p1' },
        { month: '2026-03' as MonthKey, type: 'shortfall', amount: -800 },
      ],
    });

    const res = selectShortfallEvents(proj);
    expect(res).toEqual([{ month: '2026-03', amount: -800 }]);
  });

  it('selectPrioritizedGoalSummaries sorts by priority, then reachable, then ETA', () => {
    const domainGoals: Goal[] = [
      { id: 'g1', name: 'Car', targetAmount: 10000, priority: 1 },
      { id: 'g2', name: 'Vacation', targetAmount: 3000, priority: 2 },
      { id: 'g3', name: 'Laptop', targetAmount: 2000, priority: 1 },
    ];

    const proj = mkProjection({
      goals: [
        { goalId: 'g2', reachable: true, etaMonth: '2026-04' as MonthKey },
        { goalId: 'g1', reachable: false, etaMonth: undefined },
        { goalId: 'g3', reachable: true, etaMonth: '2026-03' as MonthKey },
      ],
    });

    const res = selectPrioritizedGoalSummaries(proj, domainGoals, { limit: 3 });

    // Priority 1 goals first: g3 (reachable + earlier ETA), then g1 (not reachable), then priority 2 g2
    expect(res.map(r => r.goalId)).toEqual(['g3', 'g1', 'g2']);
    expect(res[0].priority).toBe(1);
    expect(res[0].reachable).toBe(true);
    expect(res[0].etaMonth).toBe('2026-03');
  });

  it('selectPrioritizedGoalSummaries respects limit', () => {
    const domainGoals: Goal[] = [
      { id: 'g1', name: 'Car', targetAmount: 10000, priority: 1 },
      { id: 'g2', name: 'Vacation', targetAmount: 3000, priority: 2 },
    ];

    const proj = mkProjection({
      goals: [
        { goalId: 'g2', reachable: true, etaMonth: '2026-04' as MonthKey },
        { goalId: 'g1', reachable: true, etaMonth: '2026-03' as MonthKey },
      ],
    });

    const res = selectPrioritizedGoalSummaries(proj, domainGoals, { limit: 1 });
    expect(res).toHaveLength(1);
    expect(res[0].goalId).toBe('g1');
  });
});
