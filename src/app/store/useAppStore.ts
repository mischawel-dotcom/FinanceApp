import { create } from 'zustand';
import type {
  Income,
  IncomeCategory,
  Expense,
  ExpenseCategory,
  Asset,
  FinancialGoal,
  Recommendation,
  Reserve,
} from '@shared/types';
import { persist } from 'zustand/middleware';
import { assetRepository, goalRepository } from '../../data/repositories';
import { normalizeAsset } from '../../data/repositories/normalizeAsset';
import {
  seedIncomeCategories,
  seedExpenseCategories
} from '../../data/seedData';
import { recommendationService } from '@shared/services/recommendationService';


// Hilfsfunktion: Date-Felder rehydrieren
function rehydrateDates(state: any) {
  if (!state) return state;
  const fixDate = (obj: any, keys: string[]) => {
    keys.forEach((key) => {
      if (obj[key] && typeof obj[key] === 'string') {
        obj[key] = new Date(obj[key]);
      }
    });
    return obj;
  };
  return {
    ...state,
    incomes: Array.isArray(state.incomes)
      ? state.incomes.map((i: any) => fixDate(i, ['date', 'createdAt', 'updatedAt']))
      : [],
    expenses: Array.isArray(state.expenses)
      ? state.expenses.map((e: any) => fixDate(e, ['date', 'createdAt', 'updatedAt']))
      : [],
      assets: Array.isArray(state.assets)
        ? state.assets.map((a: any) => normalizeAsset(fixDate(a, ['purchaseDate', 'createdAt', 'updatedAt'])))
        : [],
    goals: Array.isArray(state.goals)
      ? state.goals.map((g: any) => fixDate(g, ['createdAt', 'updatedAt']))
      : [],
    reserves: Array.isArray(state.reserves)
      ? state.reserves.map((r: any) => fixDate(r, ['dueDate', 'createdAt', 'updatedAt']))
      : [],
  };
}

function advanceIntervalDate(date: Date, interval: string): Date {
  const d = new Date(date);
  switch (interval) {
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    default: d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

interface AppStore {
  incomeCategories: IncomeCategory[];
  expenseCategories: ExpenseCategory[];
  incomes: Income[];
  expenses: Expense[];
  assets: Asset[];
  goals: FinancialGoal[];
  reserves: Reserve[];
  recommendations: Recommendation[];
  isLoading: boolean;
  error: string | null;

  ensureReferenceData: () => void;
  advanceReserveCycles: () => void;
  loadData: () => Promise<void>;
  initializeSeedData: () => Promise<void>;
  createIncomeCategory: () => Promise<void>;
  updateIncomeCategory: () => Promise<void>;
  deleteIncomeCategory: () => Promise<void>;
  createIncome: (payload: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIncome: (payload: Partial<Income> & { id: string }) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  createExpenseCategory: (payload: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpenseCategory: (payload: Partial<ExpenseCategory> & { id: string }) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<void>;
  createExpense: (payload: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateExpense: (payload: Partial<Expense> & { id: string }) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  linkExpenseToGoal: (expenseId: string, goalId: string) => void;
  linkExpenseToReserve: (expenseId: string, reserveId: string) => void;
  createAsset: (payload: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAsset: (payload: Partial<Asset> & { id: string }) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  createGoal: (payload: Omit<FinancialGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoal: (id: string, updatedFields: Partial<FinancialGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  createReserve: (payload: Omit<Reserve, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateReserve: (payload: Partial<Reserve> & { id: string }) => Promise<void>;
  deleteReserve: (id: string) => Promise<void>;
  generateRecommendations: () => Promise<void>;
  deleteRecommendation: (id: string) => Promise<void>;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      incomeCategories: [],
      expenseCategories: [],
      incomes: [],
      expenses: [],
      assets: [],
      goals: [],
      reserves: [],
      recommendations: [],
      isLoading: true,
      error: null,
      ensureReferenceData: () => {
        const state = get();
        const now = new Date();

        if (state.incomeCategories.length === 0) {
          set({
            incomeCategories: seedIncomeCategories.map((cat: any) => ({
              id: cat.id ?? `inc_${cat.name.toLowerCase().replace(/\s+/g, "_")}`,
              name: cat.name,
              description: cat.description,
              color: cat.color,
              createdAt: now,
              updatedAt: now,
            })),
          });
        }

        if (state.expenseCategories.length === 0) {
          set({
            expenseCategories: seedExpenseCategories.map((cat: any) => ({
              id: cat.id,
              name: cat.name,
              description: cat.description,
              color: cat.color,
              importance: cat.importance,
              createdAt: now,
              updatedAt: now,
            })),
          });
        }
      },

      // Actions: Nur leere async-Methoden (Stubs)
      advanceReserveCycles: () => {
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const state = get();
        if (!state.reserves || state.reserves.length === 0) return;

        let changed = false;
        const updatedReserves = state.reserves.map((r: any) => {
          if (!r.dueDate) return r;
          const due = new Date(r.dueDate);
          if (due >= currentMonth) return r;

          let nextDue = new Date(due);
          while (nextDue < currentMonth) {
            nextDue = advanceIntervalDate(nextDue, r.interval);
          }

          const monthsUntil = Math.max(1,
            (nextDue.getFullYear() - now.getFullYear()) * 12 +
            (nextDue.getMonth() - now.getMonth())
          );
          const newMonthly = Math.ceil(r.targetAmountCents / monthsUntil);

          changed = true;
          return {
            ...r,
            dueDate: nextDue,
            currentAmountCents: 0,
            monthlyContributionCents: newMonthly,
            updatedAt: now,
          };
        });

        if (changed) {
          set({ reserves: updatedReserves });
        }
      },
      loadData: async () => {
        get().ensureReferenceData();
        get().advanceReserveCycles();
      },
      initializeSeedData: async () => {
        get().ensureReferenceData();
      },
      createIncomeCategory: async () => {
        const state = get();
        if (state.incomeCategories.length === 0) {
          // Lege alle Default-Kategorien an
          const now = new Date();
          const categories = seedIncomeCategories.map((cat, i) => ({
            ...cat,
            id: `incat${i}_${Date.now()}`,
            createdAt: now,
            updatedAt: now,
          }));
          set({ incomeCategories: categories });
        } else {
          // Füge wie bisher eine Einzelkategorie hinzu (optional, falls gewünscht)
          const newCategory = {
            id: `incat${Date.now()}`,
            name: 'Gehalt',
            description: 'Standardkategorie',
            color: '#4F46E5',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          set({ incomeCategories: [...state.incomeCategories, newCategory] });
        }
      },
      updateIncomeCategory: async () => {},
      deleteIncomeCategory: async () => {},
      createIncome: async (payload: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => {
        // amount is always cents (integer)
        const newIncome: Income = {
          ...payload,
          amount: payload.amount,
          amountCents: payload.amount, // legacy mirror
          id: `inc${Date.now()}`,
          date: payload.date instanceof Date ? payload.date : new Date(payload.date),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => {
          const incomes = [...state.incomes, newIncome];
          return { incomes };
        });
      },
      updateIncome: async (payload: any) => {
        if (!payload?.id) return;

        set((state) => {
          const incomes = state.incomes.map((i) => {
            if (i.id !== payload.id) return i;

            const nextAmount =
              typeof payload.amount === 'number' && Number.isFinite(payload.amount)
                ? Math.round(payload.amount) // already cents
                : i.amount;

            const nextDate =
              payload.date != null
                ? payload.date instanceof Date
                  ? payload.date
                  : new Date(payload.date)
                : i.date;

            return {
              ...i,
              ...payload,
              amount: nextAmount,
              amountCents: nextAmount, // legacy mirror
              date: nextDate,
              updatedAt: new Date(),
            };
          });

          return { incomes };
        });
      },
      deleteIncome: async (id: string) => {
        set((state) => ({ incomes: state.incomes.filter((i) => i.id !== id) }));
      },
      createExpenseCategory: async (payload) => {
        const now = new Date();
        const id = `expcat${Date.now()}`;
        const newCat = { ...payload, id, createdAt: now, updatedAt: now };
        set((state) => ({
          expenseCategories: [...state.expenseCategories, newCat as any],
        }));
      },
      updateExpenseCategory: async (payload) => {
        if (!payload?.id) return;
        set((state) => ({
          expenseCategories: state.expenseCategories.map((c: any) =>
            c.id === payload.id ? { ...c, ...payload, updatedAt: new Date() } : c
          ),
        }));
      },
      deleteExpenseCategory: async (id) => {
        if (!id) return;
        set((state) => ({
          expenseCategories: state.expenseCategories.filter((c: any) => c.id !== id),
        }));
      },
      createExpense: async (payload: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) => {
        const now = new Date();
        const date = payload.date instanceof Date ? payload.date : new Date(payload.date);
        const amount = Number.isFinite(payload.amount) ? Math.round(payload.amount) : 0;
        const id = `exp${Date.now()}`;
        const newExpense = {
          ...payload,
          id,
          date,
          amount,
          amountCents: amount,
          isRecurring: !!payload.isRecurring,
          recurrenceInterval: payload.isRecurring ? payload.recurrenceInterval : undefined,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          expenses: [...state.expenses, newExpense as any],
        }));
        return id;
      },
      updateExpense: async (payload: any) => {
        if (!payload?.id) return;
        set((state) => ({
          expenses: state.expenses.map((e: any) => {
            if (e.id !== payload.id) return e;
            const nextAmount =
              typeof payload.amount === 'number' && Number.isFinite(payload.amount)
                ? Math.round(payload.amount) // already cents
                : e.amount;
            const nextDate =
              payload.date != null
                ? (payload.date instanceof Date ? payload.date : new Date(payload.date))
                : e.date;
            return {
              ...e,
              ...payload,
              amount: nextAmount,
              amountCents: nextAmount, // legacy mirror
              date: nextDate,
              isRecurring: !!payload.isRecurring,
              recurrenceInterval: payload.isRecurring ? payload.recurrenceInterval : undefined,
              updatedAt: new Date(),
            };
          }),
        }));
      },
      deleteExpense: async (id: string) => {
        const expense = get().expenses.find((e: any) => e.id === id);
        const linkedGoalId = (expense as any)?.linkedGoalId;
        const linkedReserveId = (expense as any)?.linkedReserveId;
        set((state: any) => ({
          expenses: state.expenses.filter((e: any) => e.id !== id),
          goals: linkedGoalId
            ? state.goals.filter((g: any) => g.id !== linkedGoalId)
            : state.goals,
          reserves: linkedReserveId
            ? state.reserves.filter((r: any) => r.id !== linkedReserveId)
            : state.reserves,
        }));
      },
      linkExpenseToGoal: (expenseId: string, goalId: string) => {
        set((state) => ({
          expenses: state.expenses.map((e: any) =>
            e.id === expenseId ? { ...e, linkedGoalId: goalId, updatedAt: new Date() } : e
          ),
        }));
      },
      linkExpenseToReserve: (expenseId: string, reserveId: string) => {
        set((state) => ({
          expenses: state.expenses.map((e: any) =>
            e.id === expenseId ? { ...e, linkedReserveId: reserveId, updatedAt: new Date() } : e
          ),
        }));
      },
      createAsset: async (payload: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log("createAsset START", payload);
        }
        try {
          const now = new Date();
          const newAsset = normalizeAsset({
            ...payload,
            id: `asset${Date.now()}`,
            createdAt: now,
            updatedAt: now,
          });
          set((state) => ({
            assets: [...state.assets, newAsset],
          }));
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log("createAsset SUCCESS", newAsset);
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log("createAsset FAIL", err);
          }
          throw err;
        }
      },
      updateAsset: async (payload: Partial<Asset> & { id: string }) => {
        if (!payload?.id) return;
        try {
          if (assetRepository && typeof assetRepository.update === 'function') {
            await assetRepository.update(payload.id, {
              ...payload,
              monthlyContributionCents: typeof payload.monthlyContributionCents === 'number' && Number.isFinite(payload.monthlyContributionCents)
                ? payload.monthlyContributionCents : 0,
            });
          }
        } catch (err) {
          console.error('updateAsset failed:', err);
        }
        set((state) => ({
          assets: (state.assets ?? []).map((a: any) => a.id === payload.id ? normalizeAsset({ ...a, ...payload, updatedAt: new Date() }) : a),
        }));
      },
      deleteAsset: async (id: string) => {
        if (!id) return;
        try {
          const assets = get().assets ?? [];
          const asset = assets.find((a: any) => a.id === id);
          if (!asset) return;
          if (assetRepository && typeof assetRepository.delete === 'function') {
            await assetRepository.delete(id);
          }
        } catch (err) {
          console.error('deleteAsset failed:', err);
        }
        set((state) => ({ assets: (state.assets ?? []).filter((a: any) => a.id !== id) }));
      },
      createGoal: async (payload: Omit<FinancialGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
        const now = new Date();
        const newGoal = {
          ...payload,
          id: `goal${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          goals: [...state.goals, newGoal],
        }));
      },
      updateGoal: async (id: string, updatedFields: Partial<FinancialGoal>) => {
        if (!id) return;
        try {
          // Update in repository/storage
          if (goalRepository && typeof goalRepository.update === 'function') {
            await goalRepository.update(id, updatedFields);
          }
        } catch (err) {
          console.error('updateGoal failed:', err);
        }
        // Update in state immediately
        set((state) => ({
          goals: (state.goals ?? []).map((g: any) => g.id === id ? { ...g, ...updatedFields, updatedAt: new Date() } : g),
        }));
      },
      deleteGoal: async (id: string) => {
        if (!id) return;
        const goal = (get().goals ?? []).find((g: any) => g.id === id);
        if (!goal) return;
        try {
          if (goalRepository && typeof goalRepository.delete === 'function') {
            await goalRepository.delete(id);
          }
        } catch (err) {
          console.error('deleteGoal failed:', err);
        }
        const linkedExpenseId = (goal as any).linkedExpenseId;
        set((state) => ({
          goals: (state.goals ?? []).filter((g: any) => g.id !== id),
          expenses: linkedExpenseId
            ? state.expenses.map((e: any) =>
                e.id === linkedExpenseId ? { ...e, linkedGoalId: undefined, updatedAt: new Date() } : e
              )
            : state.expenses,
        }));
      },
      createReserve: async (payload) => {
        const now = new Date();
        const id = `res${Date.now()}`;
        const newReserve = { ...payload, id, createdAt: now, updatedAt: now };
        set((state) => ({
          reserves: [...state.reserves, newReserve as any],
        }));
        return id;
      },
      updateReserve: async (payload) => {
        if (!payload?.id) return;
        set((state) => ({
          reserves: state.reserves.map((r: any) =>
            r.id === payload.id ? { ...r, ...payload, updatedAt: new Date() } : r
          ),
        }));
      },
      deleteReserve: async (id) => {
        if (!id) return;
        const reserve = (get() as any).reserves?.find((r: any) => r.id === id);
        const linkedExpenseId = reserve?.linkedExpenseId;
        set((state: any) => ({
          reserves: state.reserves.filter((r: any) => r.id !== id),
          expenses: linkedExpenseId
            ? state.expenses.map((e: any) =>
                e.id === linkedExpenseId ? { ...e, linkedReserveId: undefined, updatedAt: new Date() } : e
              )
            : state.expenses,
        }));
      },
      generateRecommendations: async () => {
        const { expenses, expenseCategories } = get();
        const newRecs = recommendationService.generateRecommendations(expenses, expenseCategories);
        set({ recommendations: newRecs });
      },
      deleteRecommendation: async (id: string) => {
        if (!id) return;
        set((state) => ({
          recommendations: state.recommendations.filter((r) => r.id !== id),
        }));
      },
    }),
    {
      name: 'finance-app-store',
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          // Pre-v2 data stored income/expense amounts as Euro (float).
          // v2+ stores them as integer Cents. Entries created after the
          // Cents-Contract already have an explicit amountCents field;
          // entries from the original MVP do not.
          const migrateEntries = (entries: any[]) =>
            entries.map((e: any) => {
              if (
                typeof e.amountCents === 'number' &&
                Number.isFinite(e.amountCents) &&
                Number.isInteger(e.amountCents) &&
                e.amountCents >= 100
              ) {
                return e; // already cents
              }
              const eurAmount =
                typeof e.amount === 'number' && Number.isFinite(e.amount)
                  ? e.amount
                  : 0;
              const cents = Math.round(eurAmount * 100);
              return { ...e, amount: cents, amountCents: cents };
            });

          if (Array.isArray(persisted.incomes)) {
            persisted.incomes = migrateEntries(persisted.incomes);
          }
          if (Array.isArray(persisted.expenses)) {
            persisted.expenses = migrateEntries(persisted.expenses);
          }
        }
        return persisted as AppStore;
      },
      partialize: (state) => ({
        incomeCategories: state.incomeCategories,
        expenseCategories: state.expenseCategories,
        incomes: state.incomes,
        expenses: state.expenses,
        assets: state.assets,
        goals: state.goals,
        reserves: state.reserves,
        recommendations: state.recommendations
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const hydrated = rehydrateDates(state);
          Object.assign(state, hydrated);
          setTimeout(() => useAppStore.getState().advanceReserveCycles(), 0);
        }
      },
    }
  )
);

