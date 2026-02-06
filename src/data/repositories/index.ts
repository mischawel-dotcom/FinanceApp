/**
 * CONCRETE REPOSITORY IMPLEMENTATIONS
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
import type {
  IncomeRepository,
  IncomeCategoryRepository,
  ExpenseRepository,
  ExpenseCategoryRepository,
  AssetRepository,
  GoalRepository,
  RecommendationRepository,
} from './interfaces';
import { BaseRepositoryImpl } from './BaseRepository';

// ==================== INCOME ====================

class IncomeRepositoryImpl extends BaseRepositoryImpl<Income> implements IncomeRepository {
  constructor() {
    super('finance-app:incomes');
  }

  async getByCategory(categoryId: string): Promise<Income[]> {
    const items = await this.getAll();
    return items.filter((item) => item.categoryId === categoryId);
  }

  async getByDateRange(start: Date, end: Date): Promise<Income[]> {
    const items = await this.getAll();
    return items.filter((item) => item.date >= start && item.date <= end);
  }

  async filter(filter: IncomeFilter): Promise<Income[]> {
    let items = await this.getAll();
    if (filter.categoryId) {
      items = items.filter((item) => item.categoryId === filter.categoryId);
    }
    if (filter.minAmount !== undefined) {
      items = items.filter((item) => item.amount >= filter.minAmount!);
    }
    if (filter.maxAmount !== undefined) {
      items = items.filter((item) => item.amount <= filter.maxAmount!);
    }
    if (filter.startDate) {
      items = items.filter((item) => item.date >= filter.startDate!);
    }
    if (filter.endDate) {
      items = items.filter((item) => item.date <= filter.endDate!);
    }
    if (filter.isRecurring !== undefined) {
      items = items.filter((item) => item.isRecurring === filter.isRecurring);
    }
    return items;
  }
}

class IncomeCategoryRepositoryImpl
  extends BaseRepositoryImpl<IncomeCategory>
  implements IncomeCategoryRepository
{
  constructor() {
    super('finance-app:income-categories');
  }
}

// ==================== EXPENSE ====================

class ExpenseRepositoryImpl extends BaseRepositoryImpl<Expense> implements ExpenseRepository {
  constructor() {
    super('finance-app:expenses');
  }

  async getByCategory(categoryId: string): Promise<Expense[]> {
    const items = await this.getAll();
    return items.filter((item) => item.categoryId === categoryId);
  }

  async getByDateRange(start: Date, end: Date): Promise<Expense[]> {
    const items = await this.getAll();
    return items.filter((item) => item.date >= start && item.date <= end);
  }

  async getByImportance(importance: number): Promise<Expense[]> {
    const items = await this.getAll();
    return items.filter((item) => item.importance === importance);
  }

  async filter(filter: ExpenseFilter): Promise<Expense[]> {
    let items = await this.getAll();
    if (filter.categoryId) {
      items = items.filter((item) => item.categoryId === filter.categoryId);
    }
    if (filter.minAmount !== undefined) {
      items = items.filter((item) => item.amount >= filter.minAmount!);
    }
    if (filter.maxAmount !== undefined) {
      items = items.filter((item) => item.amount <= filter.maxAmount!);
    }
    if (filter.startDate) {
      items = items.filter((item) => item.date >= filter.startDate!);
    }
    if (filter.endDate) {
      items = items.filter((item) => item.date <= filter.endDate!);
    }
    if (filter.importance !== undefined) {
      items = items.filter((item) => item.importance === filter.importance);
    }
    return items;
  }
}

class ExpenseCategoryRepositoryImpl
  extends BaseRepositoryImpl<ExpenseCategory>
  implements ExpenseCategoryRepository
{
  constructor() {
    super('finance-app:expense-categories');
  }

  async getByImportance(importance: number): Promise<ExpenseCategory[]> {
    const items = await this.getAll();
    return items.filter((item) => item.importance === importance);
  }
}

// ==================== ASSETS ====================

class AssetRepositoryImpl extends BaseRepositoryImpl<Asset> implements AssetRepository {
  constructor() {
    super('finance-app:assets');
  }

  async getTotalValue(): Promise<number> {
    const items = await this.getAll();
    return items.reduce((sum, asset) => sum + asset.currentValue, 0);
  }
}

// ==================== GOALS ====================

class GoalRepositoryImpl extends BaseRepositoryImpl<FinancialGoal> implements GoalRepository {
  constructor() {
    super('finance-app:goals');
  }

  async getByPriority(priority: string): Promise<FinancialGoal[]> {
    const items = await this.getAll();
    return items.filter((item) => item.priority === priority);
  }
}

// ==================== RECOMMENDATIONS ====================

class RecommendationRepositoryImpl
  extends BaseRepositoryImpl<Recommendation>
  implements RecommendationRepository
{
  constructor() {
    super('finance-app:recommendations');
  }

  async getByImpact(impact: 'low' | 'medium' | 'high'): Promise<Recommendation[]> {
    const items = await this.getAll();
    return items.filter((item) => item.impact === impact);
  }

  async refresh(): Promise<Recommendation[]> {
    // Wird in Phase 4 implementiert
    return [];
  }
}

// ==================== EXPORTS ====================

export const incomeRepository = new IncomeRepositoryImpl();
export const incomeCategoryRepository = new IncomeCategoryRepositoryImpl();
export const expenseRepository = new ExpenseRepositoryImpl();
export const expenseCategoryRepository = new ExpenseCategoryRepositoryImpl();
export const assetRepository = new AssetRepositoryImpl();
export const goalRepository = new GoalRepositoryImpl();
export const recommendationRepository = new RecommendationRepositoryImpl();
