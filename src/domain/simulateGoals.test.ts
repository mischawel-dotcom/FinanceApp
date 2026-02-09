import { describe, it, expect } from 'vitest';
import { simulateGoalsByMonth, SimGoal } from './simulateGoals';

describe('simulateGoalsByMonth', () => {
  it('caps contribution at remaining to target', () => {
    const months = ['2026-01', '2026-02', '2026-03'];
    const goals: SimGoal[] = [
      {
        id: 'g1',
        targetAmountCents: 300,
        currentAmountCents: 250,
        monthlyContributionCents: 100,
      },
    ];
    const result = simulateGoalsByMonth(months, goals);
    expect(result[0].contributionsByGoalId.g1).toBe(50); // Only 50 needed
    expect(result[0].goalBalanceAfterById.g1).toBe(300);
    expect(result[1].contributionsByGoalId.g1).toBe(0); // Already reached
    expect(result[1].goalBalanceAfterById.g1).toBe(300);
  });

  it('ignores goals with undefined or zero monthlyContributionCents', () => {
    const months = ['2026-01', '2026-02'];
    const goals: SimGoal[] = [
      {
        id: 'g2',
        targetAmountCents: 1000,
        currentAmountCents: 100,
        // monthlyContributionCents undefined
      },
      {
        id: 'g3',
        targetAmountCents: 1000,
        currentAmountCents: 100,
        monthlyContributionCents: 0,
      },
    ];
    const result = simulateGoalsByMonth(months, goals);
    expect(result[0].contributionsByGoalId.g2).toBe(0);
    expect(result[0].contributionsByGoalId.g3).toBe(0);
    expect(result[1].contributionsByGoalId.g2).toBe(0);
    expect(result[1].contributionsByGoalId.g3).toBe(0);
  });

  it('respects startMonth and endMonth', () => {
    const months = ['2026-01', '2026-02', '2026-03', '2026-04'];
    const goals: SimGoal[] = [
      {
        id: 'g4',
        targetAmountCents: 500,
        currentAmountCents: 100,
        monthlyContributionCents: 200,
        startMonth: '2026-02',
        endMonth: '2026-03',
      },
    ];
    const result = simulateGoalsByMonth(months, goals);
    expect(result[0].contributionsByGoalId.g4).toBe(0); // Before start
    expect(result[1].contributionsByGoalId.g4).toBe(200); // In range
    expect(result[2].contributionsByGoalId.g4).toBe(200); // In range
    expect(result[3].contributionsByGoalId.g4).toBe(0); // After end
  });
});
