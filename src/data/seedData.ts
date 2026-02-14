
/**
 * SEED DATA
 * Demo-Daten für den ersten Start der App
 * Versionierung für Migrationen und Updates
 */

export const SEED_DATA_VERSION = 1;

import type {
  IncomeCategory,
  ExpenseCategory,
  Income,
  Expense,
  Asset,
  FinancialGoal,
} from '@shared/types';

// ==================== KATEGORIEN ====================

export const seedIncomeCategories: Omit<IncomeCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: "Gehalt", description: "Monatliches Haupteinkommen", color: "#2563eb" },
  { name: "Nebeneinkommen", description: "Nebenjob oder zusätzliche Tätigkeit", color: "#16a34a" },
  { name: "Freelance / Selbständig", description: "Projektbasierte oder selbständige Tätigkeit", color: "#0ea5e9" },
  { name: "Bonus / Prämie", description: "Einmalige Bonuszahlungen", color: "#f59e0b" },
  { name: "Kapitalerträge", description: "Zinsen oder Dividenden", color: "#7c3aed" },
  { name: "Mieteinnahmen", description: "Einnahmen aus Vermietung", color: "#0891b2" },
  { name: "Erstattung / Rückzahlung", description: "Rückerstattungen oder Gutschriften", color: "#059669" },
  { name: "Geschenk / Unterstützung", description: "Erhaltene finanzielle Unterstützung", color: "#db2777" },
  { name: "Sonstiges", description: "Sonstige externe Einnahmen", color: "#6b7280" }
];

export const seedExpenseCategories: Omit<ExpenseCategory, 'createdAt' | 'updatedAt'>[] = [
  { id: 'wohnen', name: 'Wohnen', description: 'Miete, Nebenkosten', color: '#ef4444', importance: 6 },
  { id: 'lebensmittel', name: 'Lebensmittel', description: 'Essen & Trinken', color: '#f59e0b', importance: 6 },
  { id: 'transport', name: 'Transport', description: 'Auto, ÖPNV', color: '#3b82f6', importance: 5 },
  { id: 'versicherungen', name: 'Versicherungen', description: 'KV, Haftpflicht, etc.', color: '#8b5cf6', importance: 6 },
  { id: 'unterhaltung', name: 'Unterhaltung', description: 'Streaming, Hobbys', color: '#ec4899', importance: 3 },
  { id: 'kleidung', name: 'Kleidung', description: 'Bekleidung & Schuhe', color: '#14b8a6', importance: 3 },
  { id: 'fitness', name: 'Fitness', description: 'Fitnessstudio, Sport', color: '#10b981', importance: 4 },
  { id: 'sonstiges', name: 'Sonstiges', description: 'Andere Ausgaben', color: '#6b7280', importance: 2 },
];

// ==================== EINKOMMEN ====================

const now = new Date();
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

export const seedIncomes: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Gehalt Januar',
    amount: 3200,
    date: firstDayOfMonth,
    categoryId: '', // Wird dynamisch gesetzt
    isRecurring: true,
    recurrenceInterval: 'monthly',
    notes: 'Netto-Gehalt',
  },
  {
    title: 'Freelance-Projekt',
    amount: 800,
    date: new Date(now.getFullYear(), now.getMonth(), 15),
    categoryId: '', // Freelancing
    isRecurring: false,
    notes: 'Webdesign-Projekt',
  },
];

// ==================== AUSGABEN ====================

export const seedExpenses: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Miete',
    amount: 900,
    date: new Date(now.getFullYear(), now.getMonth(), 1),
    categoryId: 'wohnen',
    importance: 6,
    notes: 'Monatliche Miete',
  },
  {
    title: 'Nebenkosten',
    amount: 150,
    date: new Date(now.getFullYear(), now.getMonth(), 1),
    categoryId: 'wohnen',
    importance: 6,
  },
  {
    title: 'Lebensmitteleinkauf',
    amount: 85.50,
    date: new Date(now.getFullYear(), now.getMonth(), 5),
    categoryId: 'lebensmittel',
    importance: 6,
  },
  {
    title: 'Krankenversicherung',
    amount: 320,
    date: new Date(now.getFullYear(), now.getMonth(), 1),
    categoryId: 'versicherungen',
    importance: 6,
  },
  {
    title: 'Fitnessstudio',
    amount: 35,
    date: new Date(now.getFullYear(), now.getMonth(), 1),
    categoryId: 'fitness',
    importance: 4,
  },
  {
    title: 'Netflix',
    amount: 12.99,
    date: new Date(now.getFullYear(), now.getMonth(), 10),
    categoryId: 'unterhaltung',
    importance: 2,
  },
  {
    title: 'Spotify',
    amount: 9.99,
    date: new Date(now.getFullYear(), now.getMonth(), 12),
    categoryId: 'unterhaltung',
    importance: 2,
  },
  {
    title: 'Tankfüllung',
    amount: 65,
    date: new Date(now.getFullYear(), now.getMonth(), 8),
    categoryId: 'transport',
    importance: 5,
  },
];

// ==================== ANLAGEN ====================

export const seedAssets: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Sparkonto',
    type: 'savings',
    currentValue: 5000,
    initialInvestment: 4000,
    purchaseDate: new Date(2025, 0, 1),
    notes: 'Notgroschen',
  },
  {
    name: 'ETF-Sparplan (MSCI World)',
    type: 'stocks',
    currentValue: 2400,
    initialInvestment: 2000,
    purchaseDate: new Date(2024, 6, 1),
    notes: 'Monatliche Sparrate: 100€',
  },
];

// ==================== ZIELE ====================

export const seedGoals: Omit<FinancialGoal, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Notgroschen aufbauen',
    targetAmount: 10000,
    currentAmount: 5000,
    targetDate: new Date(2026, 11, 31),
    priority: 'critical',
    description: '3-6 Monatsgehälter als Notreserve',
  },
  {
    name: 'Urlaub 2026',
    targetAmount: 2000,
    currentAmount: 450,
    targetDate: new Date(2026, 7, 1),
    priority: 'medium',
    description: 'Sommerurlaub',
  },
  {
    name: 'Neues Laptop',
    targetAmount: 1500,
    currentAmount: 300,
    targetDate: new Date(2026, 5, 1),
    priority: 'low',
    description: 'Upgrade für Homeoffice',
  },
];
