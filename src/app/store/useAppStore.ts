import { create } from 'zustand';
import type { Income, Asset, FinancialGoal } from '@shared/types';
import { persist } from 'zustand/middleware';
import { assetRepository, goalRepository } from '../../data/repositories';
import { normalizeAsset } from '../../data/repositories/normalizeAsset';
import {
  seedIncomeCategories,
  seedExpenseCategories
} from '../../data/seedData';


// Typen für bessere Lesbarkeit (optional)


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
  };
}

interface AppStore {
  incomeCategories: any[];
  expenseCategories: any[];
  incomes: any[];
  expenses: any[];
  assets: any[];
  goals: any[];
  recommendations: any[];
  isLoading: boolean;
  error: string | null;

  // Actions (nur Stubs)
  // Actions (nur Signaturen)
  ensureReferenceData: () => void;
  loadData: () => Promise<void>;
  initializeSeedData: () => Promise<void>;
  createIncomeCategory: () => Promise<void>;
  updateIncomeCategory: () => Promise<void>;
  deleteIncomeCategory: () => Promise<void>;
  createIncome: (payload: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIncome: (payload: any) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  createExpenseCategory: () => Promise<void>;
  updateExpenseCategory: () => Promise<void>;
  deleteExpenseCategory: () => Promise<void>;
  createExpense: (payload: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (payload: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  createAsset: (payload: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAsset: (payload: Partial<Asset> & { id: string }) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  createGoal: (payload: Omit<FinancialGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoal: (id: string, updatedFields: Partial<FinancialGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  generateRecommendations: () => Promise<void>;
  deleteRecommendation: () => Promise<void>;
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
      loadData: async () => {
        get().ensureReferenceData();
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
      createExpenseCategory: async () => {},
      updateExpenseCategory: async () => {},
      deleteExpenseCategory: async () => {},
      createExpense: async (payload: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) => {
        const now = new Date();
        const date = payload.date instanceof Date ? payload.date : new Date(payload.date);
        const amount = Number.isFinite(payload.amount) ? Math.round(payload.amount) : 0;
        const newExpense = {
          ...payload,
          id: `exp${Date.now()}`,
          date,
          amount,
          amountCents: amount, // legacy mirror
          isRecurring: !!payload.isRecurring,
          recurrenceInterval: payload.isRecurring ? payload.recurrenceInterval : undefined,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          expenses: [...state.expenses, newExpense],
        }));
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
        set((state) => ({ expenses: state.expenses.filter((e: any) => e.id !== id) }));
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
        try {
          const goals = get().goals ?? [];
          const goal = goals.find((g: any) => g.id === id);
          if (!goal) return;
          if (goalRepository && typeof goalRepository.delete === 'function') {
            await goalRepository.delete(id);
          }
        } catch (err) {
          console.error('deleteGoal failed:', err);
        }
        set((state) => ({ goals: (state.goals ?? []).filter((g: any) => g.id !== id) }));
      },
      generateRecommendations: async () => {},
      deleteRecommendation: async () => {},
    }),
    {
      name: 'finance-app-store',
      partialize: (state) => ({
        incomeCategories: state.incomeCategories,
        expenseCategories: state.expenseCategories,
        incomes: state.incomes,
        expenses: state.expenses,
        assets: state.assets,
        goals: state.goals,
        recommendations: state.recommendations
      }),
      // Nach dem Laden aus dem Storage: Date-Felder rehydrieren
      onRehydrateStorage: () => (state) => {
        if (state) {
          const hydrated = rehydrateDates(state);
          Object.assign(state, hydrated);
        }
      },
    }
  )
);

