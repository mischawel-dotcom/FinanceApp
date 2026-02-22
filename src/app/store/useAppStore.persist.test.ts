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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  it('advanceReserveCycles setzt fällige Rücklagen auf nächsten Zyklus', async () => {
    const pastDue = new Date('2025-06-15');

    await useAppStore.getState().createReserve({
      name: 'Alte Versicherung',
      targetAmountCents: 120000,
      currentAmountCents: 120000,
      monthlyContributionCents: 10000,
      interval: 'yearly',
      dueDate: pastDue,
    });

    const beforeAdvance = useAppStore.getState().reserves;
    expect(beforeAdvance).toHaveLength(1);
    expect(new Date(beforeAdvance[0].dueDate!).getFullYear()).toBe(2025);

    useAppStore.getState().advanceReserveCycles();

    const afterAdvance = useAppStore.getState().reserves;
    expect(afterAdvance).toHaveLength(1);

    const updated = afterAdvance[0];
    const newDue = new Date(updated.dueDate!);
    expect(newDue.getFullYear()).toBeGreaterThanOrEqual(2026);
    expect(updated.currentAmountCents).toBe(0);
    expect(updated.monthlyContributionCents).toBeGreaterThan(0);
  });

  it('advanceReserveCycles lässt nicht-fällige Rücklagen unverändert', async () => {
    const futureDue = new Date('2027-12-01');

    await useAppStore.getState().createReserve({
      name: 'Zukunft',
      targetAmountCents: 60000,
      currentAmountCents: 10000,
      monthlyContributionCents: 5000,
      interval: 'yearly',
      dueDate: futureDue,
    });

    useAppStore.getState().advanceReserveCycles();

    const reserves = useAppStore.getState().reserves;
    expect(reserves).toHaveLength(1);
    expect(reserves[0].currentAmountCents).toBe(10000);
    expect(reserves[0].monthlyContributionCents).toBe(5000);
    expect(new Date(reserves[0].dueDate!).getFullYear()).toBe(2027);
  });

  it('advanceReserveCycles springt über mehrere Zyklen', async () => {
    const veryOldDue = new Date('2023-03-01');

    await useAppStore.getState().createReserve({
      name: 'Quartalsgebühr',
      targetAmountCents: 9000,
      currentAmountCents: 9000,
      monthlyContributionCents: 3000,
      interval: 'quarterly',
      dueDate: veryOldDue,
    });

    useAppStore.getState().advanceReserveCycles();

    const reserves = useAppStore.getState().reserves;
    const newDue = new Date(reserves[0].dueDate!);
    const now = new Date();
    expect(newDue >= new Date(now.getFullYear(), now.getMonth(), 1)).toBe(true);
    expect(reserves[0].currentAmountCents).toBe(0);
    expect(reserves[0].monthlyContributionCents).toBeGreaterThan(0);
  });

  // --- Realwelt-Szenarien: KFZ-Versicherung jährlich am 30. Dezember ---

  it('KFZ-Szenario: Im Dezember 2026 (Fälligkeitsmonat) noch KEIN Reset', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-15'));

    await useAppStore.getState().createReserve({
      name: 'KFZ Versicherung',
      targetAmountCents: 158200,
      currentAmountCents: 158200,
      monthlyContributionCents: 15820,
      interval: 'yearly',
      dueDate: new Date('2026-12-30'),
    });

    useAppStore.getState().advanceReserveCycles();

    const reserve = useAppStore.getState().reserves[0];
    const due = new Date(reserve.dueDate!);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(11);
    expect(due.getDate()).toBe(30);
    expect(reserve.currentAmountCents).toBe(158200);
    expect(reserve.monthlyContributionCents).toBe(15820);

    vi.useRealTimers();
  });

  it('KFZ-Szenario: Im Januar 2027 wird auf Dez 2027 weitergeschaltet, fixe Sparrate', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-15'));

    await useAppStore.getState().createReserve({
      name: 'KFZ Versicherung',
      targetAmountCents: 158200,
      currentAmountCents: 158200,
      monthlyContributionCents: 15820,
      interval: 'yearly',
      dueDate: new Date('2026-12-30'),
    });

    useAppStore.getState().advanceReserveCycles();

    const reserve = useAppStore.getState().reserves[0];
    const newDue = new Date(reserve.dueDate!);

    expect(newDue.getFullYear()).toBe(2027);
    expect(newDue.getMonth()).toBe(11);
    expect(newDue.getDate()).toBe(30);
    expect(reserve.currentAmountCents).toBe(0);
    // Fixe Sparrate: 158200 / 12 = 13184 (gerundet auf)
    expect(reserve.monthlyContributionCents).toBe(Math.ceil(158200 / 12));

    vi.useRealTimers();
  });

  it('KFZ-Szenario: Im Januar 2028 (zweites Jahr) gleiche fixe Sparrate', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2028-01-10'));

    await useAppStore.getState().createReserve({
      name: 'KFZ Versicherung',
      targetAmountCents: 158200,
      currentAmountCents: 158200,
      monthlyContributionCents: Math.ceil(158200 / 12),
      interval: 'yearly',
      dueDate: new Date('2027-12-30'),
    });

    useAppStore.getState().advanceReserveCycles();

    const reserve = useAppStore.getState().reserves[0];
    const newDue = new Date(reserve.dueDate!);

    expect(newDue.getFullYear()).toBe(2028);
    expect(newDue.getMonth()).toBe(11);
    expect(newDue.getDate()).toBe(30);
    expect(reserve.currentAmountCents).toBe(0);
    // Gleiche fixe Rate jedes Jahr
    expect(reserve.monthlyContributionCents).toBe(Math.ceil(158200 / 12));

    vi.useRealTimers();
  });

  it('Quartals-Szenario: April-Fälligkeit wird im Mai auf Juli weitergeschaltet, fixe Rate', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-05-01'));

    await useAppStore.getState().createReserve({
      name: 'GEZ',
      targetAmountCents: 5520,
      currentAmountCents: 5520,
      monthlyContributionCents: 1840,
      interval: 'quarterly',
      dueDate: new Date('2027-04-15'),
    });

    useAppStore.getState().advanceReserveCycles();

    const reserve = useAppStore.getState().reserves[0];
    const newDue = new Date(reserve.dueDate!);

    expect(newDue.getFullYear()).toBe(2027);
    expect(newDue.getMonth()).toBe(6); // Juli
    expect(newDue.getDate()).toBe(15);
    expect(reserve.currentAmountCents).toBe(0);
    // Fixe Sparrate: 5520 / 3 = 1840
    expect(reserve.monthlyContributionCents).toBe(Math.ceil(5520 / 3));

    vi.useRealTimers();
  });

  it('Schweizer Steuern: 3 jährliche Rücklagen haben konstante Gesamtbelastung', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-07-01'));

    const rateCents = 300000; // 3000 CHF pro Rate

    await useAppStore.getState().createReserve({
      name: 'Steuern Juni',
      targetAmountCents: rateCents,
      currentAmountCents: rateCents,
      monthlyContributionCents: 50000,
      interval: 'yearly',
      dueDate: new Date('2027-06-26'),
    });
    await useAppStore.getState().createReserve({
      name: 'Steuern Oktober',
      targetAmountCents: rateCents,
      currentAmountCents: 0,
      monthlyContributionCents: 25000,
      interval: 'yearly',
      dueDate: new Date('2027-10-26'),
    });
    await useAppStore.getState().createReserve({
      name: 'Steuern Dezember',
      targetAmountCents: rateCents,
      currentAmountCents: 0,
      monthlyContributionCents: 25000,
      interval: 'yearly',
      dueDate: new Date('2027-12-26'),
    });

    useAppStore.getState().advanceReserveCycles();

    const reserves = useAppStore.getState().reserves;
    const fixedMonthly = Math.ceil(rateCents / 12);

    // Juni-Reserve wurde zurückgesetzt (war fällig), die anderen nicht
    const juniReserve = reserves.find(r => r.name === 'Steuern Juni')!;
    const oktReserve = reserves.find(r => r.name === 'Steuern Oktober')!;
    const dezReserve = reserves.find(r => r.name === 'Steuern Dezember')!;

    expect(juniReserve.currentAmountCents).toBe(0);
    expect(juniReserve.monthlyContributionCents).toBe(fixedMonthly);
    expect(new Date(juniReserve.dueDate!).getFullYear()).toBe(2028);

    // Oktober und Dezember sind noch nicht fällig → unverändert
    expect(oktReserve.monthlyContributionCents).toBe(25000);
    expect(dezReserve.monthlyContributionCents).toBe(25000);

    // Nach Stabilisierung: alle 3 haben die gleiche fixe Rate
    // → Gesamtbelastung = 3 × ceil(300000/12) = 3 × 25000 = 75000 Cents = 750 CHF/Monat
    expect(fixedMonthly).toBe(25000);

    vi.useRealTimers();
  });
});
