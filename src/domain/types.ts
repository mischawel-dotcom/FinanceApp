/**
 * Domain types – FinanceApp
 *
 * This file defines the financial planning truth.
 * - No calculations
 * - No UI concerns
 * - No persistence logic
 *
 * See FinApp4CP.md
 */

export type Money = number; // Euro float, legacy
export type Cents = number; // integer cents, planning core

/**
 * ISO-8601 date string (YYYY-MM-DD).
 * Strings are used to keep JSON/localStorage simple.
 */
export type IsoDate = string;

/**
 * Supported planning intervals.
 * All normalization happens in the planning/forecast layer.
 */
export type Interval =
  | 'monthly'
  | 'quarterly'
  | 'semi_yearly'
  | 'yearly';

/**
 * Confidence level for planned income.
 * Used later for scoring / recommendations.
 */
export type Confidence = 'fixed' | 'likely' | 'uncertain';

/**
 * Regular, planned income.
 */
export interface RecurringIncome {
  id: string;
  name: string;
  amount: Money;
  interval: Interval;
  confidence: Confidence;
  startDate?: IsoDate;
  endDate?: IsoDate;
  note?: string;
  // Optional: used by forecast logic
  amountCents?: number;
}

/**
 * Regular, mandatory expense.
 * Only planned, fixed expenses – no transactions.
 */
export interface RecurringExpense {
  id: string;
  name: string;
  amount: Money;
  interval: Interval;
  startDate?: IsoDate;
  endDate?: IsoDate;
  note?: string;
}

/**
 * Expected but irregular cost, handled via a reserve.
 */
export interface ReserveBucket {
  id: string;
  name: string;
  targetAmount: Money;
  monthlyContribution: Money; // planning value
  currentAmount?: Money;
  note?: string;
}

/**
 * One-time known future payment (e.g. tax bill, repair, planned purchase).
 */
export interface KnownFuturePayment {
  id: string;
  name: string;
  amount: Money;
  dueDate: IsoDate;
  note?: string;
}

/**
 * Financial goal (car, vacation, etc.).
 */
export type GoalPriority = 1 | 2 | 3 | 4 | 5;

export interface Goal {
  id: string;
  name: string;
  targetAmount?: Money;
  currentAmount?: Money;
  wishDate?: IsoDate; // desired date, not a hard deadline
  priority: GoalPriority;
  flexibility?: 'flexible' | 'medium' | 'strict';
  monthlyContribution?: Money;
  note?: string;
  // Optional: used by forecast logic
  goalId?: string;
  targetAmountCents?: number;
  currentAmountCents?: number;
  monthlyContributionCents?: number;
  targetDate?: string | Date;
}

/**
 * Planned investment flow (not a trading or asset model).
 */
export interface InvestmentPlan {
  id: string;
  name: string;
  monthlyContribution: Money; // planning flow
  currentValue?: Money;       // optional, informational
  riskLevel?: 'low' | 'medium' | 'high';
  note?: string;
}
