// Typdefinitionen für FinanceApp

export type RecurrenceInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface IncomeCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Income {
  id: string;
  title: string;
  amount: number;
  date: Date;
  categoryId: string;
  isRecurring: boolean;
  recurrenceInterval?: RecurrenceInterval;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  importance?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ImportanceLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: Date;
  categoryId: string;
  importance: ImportanceLevel;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AssetType = 'savings' | 'stocks' | 'crypto' | 'real-estate' | 'bonds' | 'other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  currentValue: number;
  initialInvestment: number;
  purchaseDate?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  priority: GoalPriority;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
