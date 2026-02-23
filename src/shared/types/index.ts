// Filter types for repositories
export interface ExpenseFilter {
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: Date;
  endDate?: Date;
  importance?: ImportanceLevel;
}

export interface IncomeFilter {
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: Date;
  endDate?: Date;
  isRecurring?: boolean;
}
// Recommendation type for recommendations feature
export type RecommendationType =
  | 'income'
  | 'expense'
  | 'goal'
  | 'asset'
  | 'other'
  | 'eliminate-expense'
  | 'reduce-expense'
  | 'switch-category'
  | 'general';

/**
 * Expense-analysis recommendation (generated from spending patterns).
 * Not to be confused with PlanningRecommendation in @/planning/recommendations/types.
 */
export interface Recommendation {
  id: string;
  title: string;
  description?: string;
  type: RecommendationType;
  impact: 'low' | 'medium' | 'high';
  potentialSavings: number;
  explanation?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Typdefinitionen für FinanceApp

export type RecurrenceInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'once';

export interface IncomeCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Income {
  id: string;
  title: string;
  amount: number;
  amountCents?: number;
  date: Date;
  categoryId: string;
  isRecurring: boolean;
  recurrenceInterval?: RecurrenceInterval;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  importance?: number;
  createdAt: Date;
  updatedAt: Date;
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
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval;
  linkedGoalId?: string;
  linkedReserveId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sinking Fund / Rücklage (UI/persistence layer).
 * Amounts in Cents. Mapped to domain ReserveBucket via adapter.
 */
export interface Reserve {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  monthlyContributionCents: number;
  interval: RecurrenceInterval;
  dueDate?: Date;
  linkedExpenseId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AssetType = 'savings' | 'stocks' | 'crypto' | 'real-estate' | 'bonds' | 'other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  costBasisCents: number; // Summe der Einzahlungen (Pflichtfeld)
  marketValueCents?: number; // Optional: manuell gepflegter Marktwert
  lastMarketValueUpdate?: string; // ISO-String, optional
  purchaseDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  monthlyContributionCents?: number; // optional, planning flow only
}

/**
 * UI/persistence-layer goal priority (string-based).
 * Mapped to domain GoalPriority (1–5) via mapRepoGoalPriorityToDomain
 * in adapters/fromRepositories.
 */
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * UI/persistence-layer goal (stored in Zustand/localStorage).
 * targetAmount and currentAmount are in Euro (float).
 * monthlyContributionCents is in Cents (integer).
 *
 * Mapped to domain Goal via mapGoalToDomain in adapters/fromRepositories.
 */
export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  priority: GoalPriority;
  description?: string;
  monthlyContributionCents?: number;
  linkedExpenseId?: string;
  createdAt: Date;
  updatedAt: Date;
}
