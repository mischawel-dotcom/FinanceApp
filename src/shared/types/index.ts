/**
 * DOMAIN MODELS
 * TypeScript Interfaces & Types für alle Entitäten der Finance App
 */

// ==================== KATEGORIEN ====================

export interface IncomeCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  importance: ImportanceLevel; // 1-6
  createdAt: Date;
  updatedAt: Date;
}

export type ImportanceLevel = 1 | 2 | 3 | 4 | 5 | 6;

// ==================== EINKOMMEN ====================

export interface Income {
  id: string;
  title: string;
  amount: number;
  date: Date;
  categoryId: string;
  category?: IncomeCategory; // Populated für UI
  isRecurring: boolean;
  recurrenceInterval?: RecurrenceInterval;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RecurrenceInterval = 
  | 'daily' 
  | 'weekly' 
  | 'biweekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'yearly';

// ==================== AUSGABEN ====================

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: Date;
  categoryId: string;
  category?: ExpenseCategory; // Populated für UI
  importance: ImportanceLevel; // 1-6
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== ANLAGEN / VERMÖGENSWERTE ====================

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  currentValue: number;
  initialInvestment: number;
  purchaseDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AssetType = 
  | 'savings' 
  | 'stocks' 
  | 'crypto' 
  | 'real-estate' 
  | 'bonds' 
  | 'other';

// ==================== FINANZIELLE ZIELE ====================

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  priority: GoalPriority;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

// ==================== EMPFEHLUNGEN ====================

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  potentialSavings: number;
  impact: 'low' | 'medium' | 'high';
  relatedExpenses: string[]; // Expense IDs
  explanation: string; // Transparente Erklärung der Berechnung
  createdAt: Date;
  updatedAt: Date;
}

export type RecommendationType = 
  | 'reduce-expense' 
  | 'eliminate-expense' 
  | 'switch-category' 
  | 'general';

// ==================== REPORTS ====================

export interface MonthlyReport {
  month: Date;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  expensesByCategory: CategorySummary[];
  incomeByCategory: CategorySummary[];
  savingsRate: number; // Prozent
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
  importance?: ImportanceLevel;
}

export interface TrendData {
  month: Date;
  income: number;
  expenses: number;
  balance: number;
}

// ==================== FILTER & QUERY ====================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ExpenseFilter {
  categoryIds?: string[];
  importanceLevels?: ImportanceLevel[];
  dateRange?: DateRange;
  minAmount?: number;
  maxAmount?: number;
}

export interface IncomeFilter {
  categoryIds?: string[];
  dateRange?: DateRange;
  isRecurring?: boolean;
}

// ==================== APP STATE ====================

export interface AppState {
  incomeCategories: IncomeCategory[];
  expenseCategories: ExpenseCategory[];
  incomes: Income[];
  expenses: Expense[];
  assets: Asset[];
  goals: FinancialGoal[];
  recommendations: Recommendation[];
  isLoading: boolean;
  error: string | null;
}
