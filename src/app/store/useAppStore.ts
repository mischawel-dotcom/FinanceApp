
import { create } from 'zustand';
import type { Income } from '../../shared/types';
import { persist } from 'zustand/middleware';
import {
  seedIncomeCategories,
  seedExpenseCategories,
  seedIncomes,
  seedExpenses,
  seedAssets,
  seedGoals
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
      ? state.assets.map((a: any) => fixDate(a, ['purchaseDate', 'createdAt', 'updatedAt']))
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
  createExpense: () => Promise<void>;
  updateExpense: () => Promise<void>;
  deleteExpense: () => Promise<void>;
  createAsset: () => Promise<void>;
  updateAsset: () => Promise<void>;
  deleteAsset: () => Promise<void>;
  createGoal: () => Promise<void>;
  updateGoal: () => Promise<void>;

  deleteGoal: () => Promise<void>;
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

      // Actions: Nur leere async-Methoden (Stubs)
      loadData: async () => {},
      initializeSeedData: async () => {
        // Deaktiviert: keine Demo-Incomes mehr beim Start
        const state = get();
        if (
          state.incomeCategories.length === 0 &&
          state.expenseCategories.length === 0 &&
          state.incomes.length === 0 &&
          state.expenses.length === 0 &&
          state.assets.length === 0 &&
          state.goals.length === 0
        ) {
          set({
            incomeCategories: seedIncomeCategories.map((cat, i) => ({ ...cat, id: `incat${i}` })),
            expenseCategories: seedExpenseCategories.map((cat, i) => ({ ...cat, id: `excat${i}` })),
            incomes: [], // Keine Demo-Incomes mehr
            expenses: seedExpenses.map((exp, i) => ({ ...exp, id: `exp${i}` })),
            assets: seedAssets.map((asset, i) => ({ ...asset, id: `asset${i}` })),
            goals: seedGoals.map((goal, i) => ({ ...goal, id: `goal${i}` })),
          });
        }
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
      createExpense: async () => {},
      updateExpense: async () => {},
      deleteExpense: async () => {},
      createAsset: async () => {},
      updateAsset: async () => {},
      deleteAsset: async () => {},
      createGoal: async () => {},
      updateGoal: async () => {},
      deleteGoal: async () => {},
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

