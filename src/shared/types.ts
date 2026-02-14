// Add recurring fields to Expense type
export type RecurrenceInterval = 'monthly' | 'yearly';

export interface Expense {
  id: string;
  title: string;
  amount: number; // integer cents
  date: Date;
  categoryId: string;
  importance: number;
  notes?: string;
  isRecurring?: boolean;
  recurrenceInterval?: RecurrenceInterval;
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
