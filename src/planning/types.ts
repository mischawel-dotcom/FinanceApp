/**
 * See FinApp4CP.md
 *
 * Planning types only (no domain definitions here).
 * - Month is the primary time unit (MonthKey: "YYYY-MM")
 * - No UI logic, no persistence, no transactions
 */

import type {
  RecurringIncome,
  RecurringExpense,
  ReserveBucket,
  Goal,
  InvestmentPlan,
  KnownFuturePayment,
} from '../domain/types';

export type MonthKey = `${number}-${'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|'12'}`;

export interface PlanSettings {
  forecastMonths: number; // e.g. 12 or 24
  startMonth?: MonthKey;   // e.g. "2024-06"
}

/**
 * Domain input for planning.
 * IMPORTANT (FinApp4CP): No categories, no transactions.
 */
export interface PlanInput {
  incomes: RecurringIncome[];
  expenses: RecurringExpense[];
  reserves: ReserveBucket[];
  goals: Goal[];
  investments: InvestmentPlan[];
  knownPayments?: KnownFuturePayment[];
}

/** The four money buckets shown on the dashboard (per month). */
export interface BucketBreakdown {
  bound: number;    // fixed costs + reserve contributions
  planned: number;  // goal contributions
  invested: number; // investment contributions
  free: number;     // remaining monthly slack
}

/** Projection for a single month on the timeline. */
export interface MonthProjection {
  month: MonthKey;
  income: number;          // total monthly-normalized income
  buckets: BucketBreakdown;
}

/** Goal projection for timeline summary. */
export interface GoalProjection {
  goalId: string;
  etaMonth?: MonthKey;     // month when target is reached (if reachable in horizon)
  reachable: boolean;
}

/** Optional notable events for explanations/markers. */
export interface PlanEvent {
  month: MonthKey;
  type: 'shortfall' | 'goal_reached' | 'payment_due';
  amount?: number;
  refId?: string;          // goalId or paymentId
  note?: string;
}

/** Full projection used by dashboard and recommendation engine. */
export interface PlanProjection {
  settings: PlanSettings;
  timeline: MonthProjection[];
  goals: GoalProjection[];
  events: PlanEvent[];
}
