/**
 * REPOSITORY INTERFACES
 * Abstraction Layer für Datenpersistenz - ermöglicht späteren Austausch
 * (localStorage → IndexedDB → Backend API)
 */

import type {
  Income,
  IncomeCategory,
  Expense,
  ExpenseCategory,
  Asset,
  FinancialGoal,
  Recommendation,
  ExpenseFilter,
  IncomeFilter,
} from '@shared/types';

// ==================== BASE REPOSITORY ====================

export interface BaseRepository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// ==================== SPECIFIC REPOSITORIES ====================

export interface IncomeRepository extends BaseRepository<Income> {
  getByCategory(categoryId: string): Promise<Income[]>;
  getByDateRange(start: Date, end: Date): Promise<Income[]>;
  filter(filter: IncomeFilter): Promise<Income[]>;
}

export interface IncomeCategoryRepository extends BaseRepository<IncomeCategory> {
  // Zusätzliche Methoden falls benötigt
}

export interface ExpenseRepository extends BaseRepository<Expense> {
  getByCategory(categoryId: string): Promise<Expense[]>;
  getByDateRange(start: Date, end: Date): Promise<Expense[]>;
  getByImportance(importance: number): Promise<Expense[]>;
  filter(filter: ExpenseFilter): Promise<Expense[]>;
}

export interface ExpenseCategoryRepository extends BaseRepository<ExpenseCategory> {
  getByImportance(importance: number): Promise<ExpenseCategory[]>;
}

export interface AssetRepository extends BaseRepository<Asset> {
  getTotalValue(): Promise<number>;
}

export interface GoalRepository extends BaseRepository<FinancialGoal> {
  getByPriority(priority: string): Promise<FinancialGoal[]>;
}

export interface RecommendationRepository extends BaseRepository<Recommendation> {
  getByImpact(impact: 'low' | 'medium' | 'high'): Promise<Recommendation[]>;
  refresh(): Promise<Recommendation[]>; // Neu berechnen
}

// ==================== STORAGE SERVICE ====================

export interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}
