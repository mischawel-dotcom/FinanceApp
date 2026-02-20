import { buildPlanInputFromRepoData } from './fromRepositories';
import type { PlanInput } from '../types';

/**
 * Loads persisted app data from localStorage and returns a PlanInput for planning.
 * Defensive: returns empty PlanInput if missing or invalid.
 */

function parseDateField(val: any): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Legacy normalizer: older store versions wrote amount as cents but
 * without the amountCents mirror field. Backfill it so the adapter
 * can rely on the explicit "amountCents present → cents" contract.
 */
function ensureAmountCentsMirror(entry: any): any {
  if (
    typeof entry.amount === 'number' &&
    Number.isFinite(entry.amount) &&
    (entry.amountCents === undefined || entry.amountCents === null)
  ) {
    return { ...entry, amountCents: Math.round(entry.amount) };
  }
  return entry;
}

export function buildPlanInputFromPersistedStore(): PlanInput {
  try {
    const raw = localStorage.getItem('finance-app-store');
    if (!raw) {
      return buildPlanInputFromRepoData({ incomes: [], expenses: [], assets: [], goals: [] });
    }
    const parsed = JSON.parse(raw);
    const state = parsed?.state;
    if (!state) {
      return buildPlanInputFromRepoData({ incomes: [], expenses: [], assets: [], goals: [] });
    }
    const incomes = Array.isArray(state.incomes)
      ? state.incomes.map((i: any) => ensureAmountCentsMirror({
          ...i,
          date: parseDateField(i.date),
          createdAt: parseDateField(i.createdAt),
          updatedAt: parseDateField(i.updatedAt),
        }))
      : [];
    const expenses = Array.isArray(state.expenses)
      ? state.expenses.map((e: any) => ensureAmountCentsMirror({
          ...e,
          date: parseDateField(e.date),
          createdAt: parseDateField(e.createdAt),
          updatedAt: parseDateField(e.updatedAt),
        }))
      : [];
    const assets = Array.isArray(state.assets)
      ? state.assets.map((a: any) => ({
          ...a,
          purchaseDate: parseDateField(a.purchaseDate),
          createdAt: parseDateField(a.createdAt),
          updatedAt: parseDateField(a.updatedAt),
        }))
      : [];
    const goals = Array.isArray(state.goals)
      ? state.goals.map((g: any) => ({
          ...g,
          targetDate: parseDateField(g.targetDate),
          createdAt: parseDateField(g.createdAt),
          updatedAt: parseDateField(g.updatedAt),
          monthlyContributionCents:
            typeof g.monthlyContributionCents === 'number' && Number.isFinite(g.monthlyContributionCents)
              ? g.monthlyContributionCents
              : undefined,
        }))
      : [];
    return buildPlanInputFromRepoData({ incomes, expenses, assets, goals });
  } catch {
    return buildPlanInputFromRepoData({ incomes: [], expenses: [], assets: [], goals: [] });
  }
}
