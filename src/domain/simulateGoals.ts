// Domain-only goals simulation for FinanceApp

export interface SimGoal {
  id: string;
  targetAmountCents: number;
  currentAmountCents: number;
  monthlyContributionCents?: number;
  startMonth?: string; // YYYY-MM
  endMonth?: string;   // YYYY-MM
}

export interface GoalsSimulationResult {
  month: string;
  plannedGoalsCents: number;
  contributionsByGoalId: Record<string, number>;
  goalBalanceAfterById: Record<string, number>;
}

function isMonthInRange(month: string, start?: string, end?: string): boolean {
  if (start && month < start) return false;
  if (end && month > end) return false;
  return true;
}

export function simulateGoalsByMonth(
  months: string[],
  goals: SimGoal[]
): GoalsSimulationResult[] {
  // Track balances per goal
  const balances: Record<string, number> = {};
  goals.forEach(g => {
    balances[g.id] = g.currentAmountCents;
  });

  const results: GoalsSimulationResult[] = [];

  for (const month of months) {
    let plannedGoalsCents = 0;
    const contributionsByGoalId: Record<string, number> = {};
    const goalBalanceAfterById: Record<string, number> = {};

    for (const goal of goals) {
      // Check if goal is active this month
      if (!isMonthInRange(month, goal.startMonth, goal.endMonth)) {
        contributionsByGoalId[goal.id] = 0;
        goalBalanceAfterById[goal.id] = balances[goal.id];
        continue;
      }
      const remaining = Math.max(0, goal.targetAmountCents - balances[goal.id]);
      let contrib = 0;
      if (
        typeof goal.monthlyContributionCents === 'number' &&
        goal.monthlyContributionCents > 0 &&
        remaining > 0
      ) {
        contrib = Math.min(goal.monthlyContributionCents, remaining);
      }
      balances[goal.id] += contrib;
      plannedGoalsCents += contrib;
      contributionsByGoalId[goal.id] = contrib;
      goalBalanceAfterById[goal.id] = balances[goal.id];
    }
    results.push({
      month,
      plannedGoalsCents,
      contributionsByGoalId,
      goalBalanceAfterById,
    });
  }
  return results;
}
