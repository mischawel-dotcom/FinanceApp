/**
 * Persistierungs-Roundtrip-Test
 *
 * Stellt sicher, dass ALLE planungsrelevanten Store-Felder:
 * 1. In localStorage geschrieben werden (partialize)
 * 2. Nach Rehydrierung korrekt wiederhergestellt werden
 * 3. Vom Forecast-Adapter korrekt gelesen werden
 *
 * Verhindert Regressions wie: neues Feld im Store angelegt,
 * aber in partialize vergessen → Daten gehen bei Reload verloren.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';
import { buildPlanInputFromPersistedStore } from '@/planning/adapters/fromPersistedStore';

const STORE_KEY = 'finance-app-store';

const PLANNING_FIELDS = [
  'incomes',
  'expenses',
  'assets',
  'goals',
  'reserves',
] as const;

const REFERENCE_FIELDS = [
  'incomeCategories',
  'expenseCategories',
  'recommendations',
] as const;

const ALL_PERSISTED_FIELDS = [...PLANNING_FIELDS, ...REFERENCE_FIELDS];

function getSavedState(): Record<string, unknown> | null {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return null;
  return JSON.parse(raw)?.state ?? null;
}

describe('Store Persistierungs-Roundtrip', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      incomeCategories: [],
      expenseCategories: [],
      incomes: [],
      expenses: [],
      assets: [],
      goals: [],
      reserves: [],
      recommendations: [],
    });
  });

  it('alle planungsrelevanten Felder werden in localStorage geschrieben', () => {
    const saved = getSavedState();
    expect(saved).not.toBeNull();

    for (const field of ALL_PERSISTED_FIELDS) {
      expect(
        saved,
        `Feld "${field}" fehlt in localStorage (partialize vergessen?)`,
      ).toHaveProperty(field);
    }
  });

  it('reserves werden korrekt persistiert und wiederhergestellt', async () => {
    const reserveId = await useAppStore.getState().createReserve({
      name: 'KFZ Versicherung',
      targetAmountCents: 120000,
      currentAmountCents: 30000,
      monthlyContributionCents: 10000,
      interval: 'yearly',
      dueDate: new Date('2026-12-01'),
      linkedExpenseId: undefined,
    });

    const saved = getSavedState();
    expect(saved).not.toBeNull();

    const savedReserves = saved!.reserves as any[];
    expect(savedReserves).toHaveLength(1);
    expect(savedReserves[0].name).toBe('KFZ Versicherung');
    expect(savedReserves[0].targetAmountCents).toBe(120000);
    expect(savedReserves[0].monthlyContributionCents).toBe(10000);
    expect(savedReserves[0].id).toBe(reserveId);
  });

  it('Forecast-Adapter liest reserves aus localStorage korrekt', async () => {
    await useAppStore.getState().createReserve({
      name: 'GEZ',
      targetAmountCents: 5520,
      currentAmountCents: 0,
      monthlyContributionCents: 1840,
      interval: 'quarterly',
      dueDate: new Date('2026-04-01'),
    });

    await useAppStore.getState().createReserve({
      name: 'KFZ Steuer',
      targetAmountCents: 30000,
      currentAmountCents: 10000,
      monthlyContributionCents: 2500,
      interval: 'yearly',
      dueDate: new Date('2026-09-01'),
    });

    const planInput = buildPlanInputFromPersistedStore();

    expect(planInput.reserves).toHaveLength(2);
    expect(planInput.reserves[0].name).toBe('GEZ');
    expect(planInput.reserves[0].monthlyContribution).toBe(1840);
    expect(planInput.reserves[1].name).toBe('KFZ Steuer');
    expect(planInput.reserves[1].monthlyContribution).toBe(2500);
  });

  it('Reserve-Beitrag fließt korrekt in Forecast Bound', async () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    await useAppStore.getState().createIncome({
      title: 'Gehalt',
      amount: 400000,
      amountCents: 400000,
      date: startDate,
      categoryId: 'cat1',
      isRecurring: true,
      recurrenceInterval: 'monthly',
    } as any);

    await useAppStore.getState().createReserve({
      name: 'Versicherung',
      targetAmountCents: 120000,
      currentAmountCents: 0,
      monthlyContributionCents: 10000,
      interval: 'yearly',
      dueDate: new Date('2026-12-01'),
    });

    const planInput = buildPlanInputFromPersistedStore();
    expect(planInput.reserves).toHaveLength(1);
    expect(planInput.reserves[0].monthlyContribution).toBe(10000);

    const { buildPlanProjection } = await import('@/planning/forecast');
    const month = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const projection = buildPlanProjection(planInput, {
      forecastMonths: 1,
      startMonth: month,
    });

    expect(projection.timeline).toHaveLength(1);
    expect(projection.timeline[0].buckets.bound).toBeGreaterThanOrEqual(10000);
  });

  it('verknüpfte Expense wird NICHT doppelt gezählt', async () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const expenseId = await useAppStore.getState().createExpense({
      title: 'KFZ Versicherung',
      amount: 120000,
      date: new Date('2026-12-30'),
      categoryId: 'cat1',
      importance: 3,
      isRecurring: true,
      recurrenceInterval: 'yearly',
    } as any);

    const reserveId = await useAppStore.getState().createReserve({
      name: 'Rücklage: KFZ Versicherung',
      targetAmountCents: 120000,
      currentAmountCents: 0,
      monthlyContributionCents: 10000,
      interval: 'yearly',
      dueDate: new Date('2026-12-30'),
      linkedExpenseId: expenseId,
    });

    useAppStore.getState().linkExpenseToReserve(expenseId, reserveId);

    const planInput = buildPlanInputFromPersistedStore();

    // Verknüpfte Expense darf NICHT in expenses auftauchen (Doppelzählung)
    const expenseInPlan = planInput.expenses.find(e => e.id === expenseId);
    expect(
      expenseInPlan,
      'Verknüpfte Expense darf nicht in PlanInput.expenses sein (Doppelzählung!)',
    ).toBeUndefined();

    // Reserve MUSS in reserves sein
    expect(planInput.reserves).toHaveLength(1);
    expect(planInput.reserves[0].monthlyContribution).toBe(10000);
  });

  it('jedes PLANNING_FIELD überlebt einen Store-Roundtrip mit Daten', async () => {
    const now = new Date();

    await useAppStore.getState().createIncome({
      title: 'Gehalt',
      amount: 500000,
      date: now,
      categoryId: 'c1',
      isRecurring: true,
      recurrenceInterval: 'monthly',
    } as any);

    await useAppStore.getState().createExpense({
      title: 'Miete',
      amount: 160000,
      date: now,
      categoryId: 'c1',
      importance: 1,
      isRecurring: true,
      recurrenceInterval: 'monthly',
    } as any);

    await useAppStore.getState().createAsset({
      name: 'ETF',
      type: 'stocks',
      costBasisCents: 100000,
    } as any);

    await useAppStore.getState().createGoal({
      name: 'Urlaub',
      targetAmount: 1500,
      currentAmount: 0,
      priority: 'medium',
    } as any);

    await useAppStore.getState().createReserve({
      name: 'KFZ',
      targetAmountCents: 120000,
      currentAmountCents: 0,
      monthlyContributionCents: 10000,
      interval: 'yearly',
      dueDate: now,
    });

    const saved = getSavedState();
    expect(saved).not.toBeNull();

    for (const field of PLANNING_FIELDS) {
      const arr = saved![field] as any[];
      expect(
        arr.length,
        `${field} sollte mindestens 1 Eintrag haben, hat aber ${arr.length}`,
      ).toBeGreaterThanOrEqual(1);
    }

    const planInput = buildPlanInputFromPersistedStore();
    expect(planInput.incomes.length).toBeGreaterThanOrEqual(1);
    expect(planInput.expenses.length).toBeGreaterThanOrEqual(1);
    expect(planInput.goals.length).toBeGreaterThanOrEqual(1);
    expect(planInput.reserves.length).toBeGreaterThanOrEqual(1);
  });
});
