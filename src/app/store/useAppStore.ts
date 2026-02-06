/**
 * ZUSTAND STORE
 * Globaler State Management mit Zustand
 */

import { create } from 'zustand';
import type { 
  AppState, 
  IncomeCategory, 
  Income, 
  ExpenseCategory, 
  Expense, 
  Asset, 
  FinancialGoal,
  Recommendation
} from '@shared/types';
import {
  incomeRepository,
  incomeCategoryRepository,
  expenseRepository,
  expenseCategoryRepository,
  assetRepository,
  goalRepository,
  recommendationRepository,
} from '@data/repositories';
import { recommendationService } from '@shared/services/recommendationService';
import {
  seedIncomeCategories,
  seedExpenseCategories,
  seedIncomes,
  seedExpenses,
  seedAssets,
  seedGoals,
} from '@data/seedData';

interface AppStore extends AppState {
  // Actions
  loadData: () => Promise<void>;
  initializeSeedData: () => Promise<void>;
  
  // Income Category Actions
  createIncomeCategory: (data: Omit<IncomeCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIncomeCategory: (id: string, data: Partial<IncomeCategory>) => Promise<void>;
  deleteIncomeCategory: (id: string) => Promise<void>;
  
  // Income Actions
  createIncome: (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIncome: (id: string, data: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  
  // Expense Category Actions
  createExpenseCategory: (data: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpenseCategory: (id: string, data: Partial<ExpenseCategory>) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<void>;
  
  // Expense Actions
  createExpense: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  // Asset Actions
  createAsset: (data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAsset: (id: string, data: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  
  // Goal Actions
  createGoal: (data: Omit<FinancialGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoal: (id: string, data: Partial<FinancialGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  
  // Recommendation Actions
  generateRecommendations: () => Promise<void>;
  deleteRecommendation: (id: string) => Promise<void>;
}

const INIT_FLAG_KEY = 'finance-app:initialized';

export const useAppStore = create<AppStore>((set) => ({
  // Initial State
  incomeCategories: [],
  expenseCategories: [],
  incomes: [],
  expenses: [],
  assets: [],
  goals: [],
  recommendations: [],
  isLoading: true,
  error: null,

  // Load all data from repositories
  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [
        incomeCategories,
        expenseCategories,
        incomes,
        expenses,
        assets,
        goals,
      ] = await Promise.all([
        incomeCategoryRepository.getAll(),
        expenseCategoryRepository.getAll(),
        incomeRepository.getAll(),
        expenseRepository.getAll(),
        assetRepository.getAll(),
        goalRepository.getAll(),
      ]);

      set({
        incomeCategories,
        expenseCategories,
        incomes,
        expenses,
        assets,
        goals,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      set({ error: 'Fehler beim Laden der Daten', isLoading: false });
    }
  },

  // Initialize seed data on first launch
  initializeSeedData: async () => {
    const isInitialized = localStorage.getItem(INIT_FLAG_KEY);
    if (isInitialized === 'true' || isInitialized === 'pending') {
      // Daten bereits vorhanden oder Initialisierung läuft, nur laden
      return;
    }
    // Setze Flag sofort auf 'pending', um parallele Initialisierungen zu verhindern
    localStorage.setItem(INIT_FLAG_KEY, 'pending');
    console.log('Initializing seed data...');
    set({ isLoading: true });
    try {
      // 1. Kategorien erstellen
      const createdIncomeCategories = await Promise.all(
        seedIncomeCategories.map((cat) => incomeCategoryRepository.create(cat))
      );
      const createdExpenseCategories = await Promise.all(
        seedExpenseCategories.map((cat) => expenseCategoryRepository.create(cat))
      );

      // 2. Einkommen erstellen (mit Kategorie-IDs)
      const incomesWithCategories = seedIncomes.map((income, index) => ({
        ...income,
        categoryId: createdIncomeCategories[index === 0 ? 0 : 1].id, // Gehalt oder Freelancing
      }));
      await Promise.all(
        incomesWithCategories.map((income) => incomeRepository.create(income))
      );

      // 3. Ausgaben erstellen (mit Kategorie-IDs)
      const expensesWithCategories = seedExpenses.map((expense, index) => {
        const categoryIndex = [0, 0, 1, 3, 6, 4, 4, 2][index]; // Mapping zu Kategorien
        return {
          ...expense,
          categoryId: createdExpenseCategories[categoryIndex].id,
        };
      });
      await Promise.all(
        expensesWithCategories.map((expense) => expenseRepository.create(expense))
      );

      // 4. Anlagen erstellen
      await Promise.all(
        seedAssets.map((asset) => assetRepository.create(asset))
      );

      // 5. Ziele erstellen
      await Promise.all(
        seedGoals.map((goal) => goalRepository.create(goal))
      );

      // Initialisierung abgeschlossen
      localStorage.setItem(INIT_FLAG_KEY, 'true');
      console.log('Seed data initialized successfully!');
    } catch (error) {
      localStorage.removeItem(INIT_FLAG_KEY); // Bei Fehler Flag zurücksetzen
      console.error('Error initializing seed data:', error);
      set({ error: 'Fehler beim Initialisieren der Demo-Daten' });
    } finally {
      set({ isLoading: false });
    }
  },

  // ==================== INCOME CATEGORY ACTIONS ====================
  
  createIncomeCategory: async (data) => {
    try {
      const newCategory = await incomeCategoryRepository.create(data);
      set((state) => ({
        incomeCategories: [...state.incomeCategories, newCategory],
      }));
    } catch (error) {
      console.error('Error creating income category:', error);
      set({ error: 'Fehler beim Erstellen der Kategorie' });
    }
  },

  updateIncomeCategory: async (id, data) => {
    try {
      const updated = await incomeCategoryRepository.update(id, data);
      set((state) => ({
        incomeCategories: state.incomeCategories.map((cat) =>
          cat.id === id ? updated : cat
        ),
      }));
    } catch (error) {
      console.error('Error updating income category:', error);
      set({ error: 'Fehler beim Aktualisieren der Kategorie' });
    }
  },

  deleteIncomeCategory: async (id) => {
    try {
      await incomeCategoryRepository.delete(id);
      set((state) => ({
        incomeCategories: state.incomeCategories.filter((cat) => cat.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting income category:', error);
      set({ error: 'Fehler beim Löschen der Kategorie' });
    }
  },

  // ==================== INCOME ACTIONS ====================
  
  createIncome: async (data) => {
    try {
      const newIncome = await incomeRepository.create(data);
      set((state) => ({
        incomes: [...state.incomes, newIncome],
      }));
    } catch (error) {
      console.error('Error creating income:', error);
      set({ error: 'Fehler beim Erstellen des Einkommens' });
    }
  },

  updateIncome: async (id, data) => {
    try {
      const updated = await incomeRepository.update(id, data);
      set((state) => ({
        incomes: state.incomes.map((income) =>
          income.id === id ? updated : income
        ),
      }));
    } catch (error) {
      console.error('Error updating income:', error);
      set({ error: 'Fehler beim Aktualisieren des Einkommens' });
    }
  },

  deleteIncome: async (id) => {
    try {
      await incomeRepository.delete(id);
      set((state) => ({
        incomes: state.incomes.filter((income) => income.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting income:', error);
      set({ error: 'Fehler beim Löschen des Einkommens' });
    }
  },

  // ==================== EXPENSE CATEGORY ACTIONS ====================
  
  createExpenseCategory: async (data) => {
    try {
      const newCategory = await expenseCategoryRepository.create(data);
      set((state) => ({
        expenseCategories: [...state.expenseCategories, newCategory],
      }));
    } catch (error) {
      console.error('Error creating expense category:', error);
      set({ error: 'Fehler beim Erstellen der Kategorie' });
    }
  },

  updateExpenseCategory: async (id, data) => {
    try {
      const updated = await expenseCategoryRepository.update(id, data);
      set((state) => ({
        expenseCategories: state.expenseCategories.map((cat) =>
          cat.id === id ? updated : cat
        ),
      }));
    } catch (error) {
      console.error('Error updating expense category:', error);
      set({ error: 'Fehler beim Aktualisieren der Kategorie' });
    }
  },

  deleteExpenseCategory: async (id) => {
    try {
      await expenseCategoryRepository.delete(id);
      set((state) => ({
        expenseCategories: state.expenseCategories.filter((cat) => cat.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting expense category:', error);
      set({ error: 'Fehler beim Löschen der Kategorie' });
    }
  },

  // ==================== EXPENSE ACTIONS ====================
  
  createExpense: async (data) => {
    try {
      const newExpense = await expenseRepository.create(data);
      set((state) => ({
        expenses: [...state.expenses, newExpense],
      }));
    } catch (error) {
      console.error('Error creating expense:', error);
      set({ error: 'Fehler beim Erstellen der Ausgabe' });
    }
  },

  updateExpense: async (id, data) => {
    try {
      const updated = await expenseRepository.update(id, data);
      set((state) => ({
        expenses: state.expenses.map((expense) =>
          expense.id === id ? updated : expense
        ),
      }));
    } catch (error) {
      console.error('Error updating expense:', error);
      set({ error: 'Fehler beim Aktualisieren der Ausgabe' });
    }
  },

  deleteExpense: async (id) => {
    try {
      await expenseRepository.delete(id);
      set((state) => ({
        expenses: state.expenses.filter((expense) => expense.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting expense:', error);
      set({ error: 'Fehler beim Löschen der Ausgabe' });
    }
  },

  // ==================== ASSET ACTIONS ====================
  
  createAsset: async (data) => {
    try {
      const newAsset = await assetRepository.create(data);
      set((state) => ({
        assets: [...state.assets, newAsset],
      }));
    } catch (error) {
      console.error('Error creating asset:', error);
      set({ error: 'Fehler beim Erstellen der Anlage' });
    }
  },

  updateAsset: async (id, data) => {
    try {
      const updated = await assetRepository.update(id, data);
      set((state) => ({
        assets: state.assets.map((asset) =>
          asset.id === id ? updated : asset
        ),
      }));
    } catch (error) {
      console.error('Error updating asset:', error);
      set({ error: 'Fehler beim Aktualisieren der Anlage' });
    }
  },

  deleteAsset: async (id) => {
    try {
      await assetRepository.delete(id);
      set((state) => ({
        assets: state.assets.filter((asset) => asset.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting asset:', error);
      set({ error: 'Fehler beim Löschen der Anlage' });
    }
  },

  // ==================== GOAL ACTIONS ====================
  
  createGoal: async (data) => {
    try {
      const newGoal = await goalRepository.create(data);
      set((state) => ({
        goals: [...state.goals, newGoal],
      }));
    } catch (error) {
      console.error('Error creating goal:', error);
      set({ error: 'Fehler beim Erstellen des Ziels' });
    }
  },

  updateGoal: async (id, data) => {
    try {
      const updated = await goalRepository.update(id, data);
      set((state) => ({
        goals: state.goals.map((goal) =>
          goal.id === id ? updated : goal
        ),
      }));
    } catch (error) {
      console.error('Error updating goal:', error);
      set({ error: 'Fehler beim Aktualisieren des Ziels' });
    }
  },

  deleteGoal: async (id) => {
    try {
      await goalRepository.delete(id);
      set((state) => ({
        goals: state.goals.filter((goal) => goal.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting goal:', error);
      set({ error: 'Fehler beim Löschen des Ziels' });
    }
  },

  // ==================== RECOMMENDATION ACTIONS ====================
  
  generateRecommendations: async () => {
    try {
      const state = useAppStore.getState();
      const newRecommendations = recommendationService.generateRecommendations(
        state.expenses,
        state.expenseCategories
      );
      
      // Lösche alte Empfehlungen
      const oldRecommendations = await recommendationRepository.getAll();
      await Promise.all(oldRecommendations.map((rec) => recommendationRepository.delete(rec.id)));
      
      // Speichere neue Empfehlungen
      await Promise.all(newRecommendations.map((rec) => recommendationRepository.create(rec)));
      
      set({ recommendations: newRecommendations });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      set({ error: 'Fehler beim Generieren der Empfehlungen' });
    }
  },

  deleteRecommendation: async (id) => {
    try {
      await recommendationRepository.delete(id);
      set((state) => ({
        recommendations: state.recommendations.filter((rec) => rec.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting recommendation:', error);
      set({ error: 'Fehler beim Löschen der Empfehlung' });
    }
  },
}));
