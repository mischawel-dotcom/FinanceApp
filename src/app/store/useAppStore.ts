
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  seedIncomeCategories,
  seedExpenseCategories,
  seedIncomes,
  seedExpenses,
  seedAssets,
  seedGoals
} from '../../data/seedData';

// TODO: Importiere die Typen für die State-Objekte aus shared/types/index.ts
// import { IncomeCategory, ExpenseCategory, Income, Expense, Asset, FinancialGoal, Recommendation } from '../../shared/types';

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
  createIncome: () => Promise<void>;
  updateIncome: () => Promise<void>;
  deleteIncome: () => Promise<void>;
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
        // Nur ausführen, wenn Store leer ist
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
            incomes: seedIncomes.map((inc, i) => ({ ...inc, id: `inc${i}` })),
            expenses: seedExpenses.map((exp, i) => ({ ...exp, id: `exp${i}` })),
            assets: seedAssets.map((asset, i) => ({ ...asset, id: `asset${i}` })),
            goals: seedGoals.map((goal, i) => ({ ...goal, id: `goal${i}` })),
          });
        }
      },
      createIncomeCategory: async () => {},
      updateIncomeCategory: async () => {},
      deleteIncomeCategory: async () => {},
      createIncome: async () => {},
      updateIncome: async () => {},
      deleteIncome: async () => {},
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
      })
    }
  )
);

