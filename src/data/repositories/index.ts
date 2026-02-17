// Minimal euro to cents util for legacy repair
function euroToCents(euro: number | undefined): number {
  if (typeof euro !== 'number' || isNaN(euro) || !isFinite(euro)) return 0;
  return Math.round(euro * 100);
}
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

// LegacyAsset type for migration/repair
 type LegacyAsset = Asset & Partial<{
   valueCents: unknown;
   currentValue: unknown;
   initialInvestment: unknown;
   value: unknown;
   costBasis: unknown;
   monthlyContribution: unknown;
   marketValue: unknown;
 }>;

class AssetRepositoryImpl extends BaseRepositoryImpl<Asset> implements AssetRepository {
  constructor() {
    super('finance-app:assets');
  }

  // Migration: Robust gegen alte Felder (valueCents, currentValue, initialInvestment)
  async getAll(): Promise<Asset[]> {
    const items = await super.getAll();
    let repaired = false;
    for (const asset of items) {
      const a = asset as LegacyAsset;
      // costBasisCents: robust aus alten Feldern ableiten und absichern
      if (!Number.isFinite(asset.costBasisCents)) {
        if (typeof a.valueCents === 'number' && Number.isFinite(a.valueCents)) {
          asset.costBasisCents = a.valueCents as number;
          delete (a as any).valueCents;
          repaired = true;
        } else if (typeof a.currentValue === 'number' && Number.isFinite(a.currentValue)) {
          asset.costBasisCents = Math.round(a.currentValue as number * 100);
          delete (a as any).currentValue;
          repaired = true;
        } else if (typeof a.initialInvestment === 'number' && Number.isFinite(a.initialInvestment)) {
          asset.costBasisCents = Math.round(a.initialInvestment as number * 100);
          delete (a as any).initialInvestment;
          repaired = true;
        } else {
          asset.costBasisCents = 0;
          repaired = true;
        }
      }
      // monthlyContributionCents absichern
      if (!Number.isFinite(asset.monthlyContributionCents)) {
        asset.monthlyContributionCents = 0;
        repaired = true;
      }
      // marketValueCents absichern
      if (asset.marketValueCents !== undefined && !Number.isFinite(asset.marketValueCents)) {
        delete asset.marketValueCents;
        repaired = true;
      }
    }
    if (repaired) {
      await this.storage.set(this.storageKey, items);
    }
    return items;
  }

  async getTotalValue(): Promise<number> {
    const items = await this.getAll();
    // Portfolio-Wert: Summe der marketValueCents (falls vorhanden), sonst costBasisCents
    return items.reduce((sum, asset) => sum + (typeof asset.marketValueCents === 'number' ? asset.marketValueCents : asset.costBasisCents), 0);
  }
}

// ==================== GOALS ====================

// LegacyGoal type for migration/repair
 type LegacyGoal = FinancialGoal & Partial<{
   targetAmountCents: unknown;
   currentAmountCents: unknown;
   monthlyContribution: unknown;
}>;

class GoalRepositoryImpl extends BaseRepositoryImpl<FinancialGoal> implements GoalRepository {
  constructor() {
    super('finance-app:goals');
  }

  // Patch: repair legacy goals on load
  async getAll(): Promise<FinancialGoal[]> {
    const items = await super.getAll();
    let repaired = false;
    for (const goal of items) {
      const g = goal as LegacyGoal;
      // Repair targetAmountCents
      if (g.targetAmountCents === undefined && typeof g.targetAmount === 'number') {
        g.targetAmountCents = euroToCents(g.targetAmount);
        delete (g as any).targetAmount;
        repaired = true;
      }
      // Repair currentAmountCents
      if (g.currentAmountCents === undefined && typeof g.currentAmount === 'number') {
        g.currentAmountCents = euroToCents(g.currentAmount);
        delete (g as any).currentAmount;
        repaired = true;
      }
      // Repair monthlyContributionCents
      if (g.monthlyContributionCents === undefined && typeof g.monthlyContribution === 'number') {
        g.monthlyContributionCents = euroToCents(g.monthlyContribution);
        delete (g as any).monthlyContribution;
        repaired = true;
      }
    }
    // Persist repairs if needed
    if (repaired) {
      await this.storage.set(this.storageKey, items);
    }
    return items;
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

// For testing: export GoalRepositoryImpl class
export { GoalRepositoryImpl };
