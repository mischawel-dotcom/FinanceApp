/**
 * RECOMMENDATION SERVICE
 * Algorithmus zur Generierung von Spar-Empfehlungen basierend auf Ausgaben
 */

import type { 
  Expense, 
  ExpenseCategory, 
  Income,
  Recommendation
} from '@shared/types';
import { subMonths } from 'date-fns';
import { formatCentsEUR } from '@/ui/formatMoney';

interface ExpenseAnalysis {
  categoryId: string;
  categoryName: string;
  importance: number;
  totalAmount: number;
  expenseCount: number;
  averageAmount: number;
}

export class RecommendationService {
  /**
   * Generiert Empfehlungen basierend auf Ausgaben der letzten 3 Monate
   */
  generateRecommendations(
    expenses: Expense[],
    categories: ExpenseCategory[],
    incomes: Income[] = []
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const threeMonthsAgo = subMonths(new Date(), 3);

    const recentExpenses = expenses.filter((exp) => exp.date >= threeMonthsAgo);
    const recentIncomes = incomes.filter((inc) => inc.date >= threeMonthsAgo);

    // Regel 5: Budget-Defizit (Ausgaben > Einnahmen) – prüft auch ohne Ausgaben
    recommendations.push(...this.findBudgetDeficit(recentExpenses, recentIncomes));

    if (recentExpenses.length === 0) {
      return recommendations;
    }

    const expensesByCategory = this.groupExpensesByCategory(recentExpenses, categories);

    // Regel 1: Niedrige Wichtigkeit (1-2) mit hohen Ausgaben
    recommendations.push(...this.findLowImportanceHighCost(expensesByCategory));

    // Regel 2: Mittlere Wichtigkeit (3-4) mit sehr hohen Ausgaben
    recommendations.push(...this.findMediumImportanceExcessiveCost(expensesByCategory));

    // Regel 3: Einzelne teure Ausgaben in niedrig-wichtigen Kategorien
    recommendations.push(...this.findExpensiveSingleExpenses(recentExpenses, categories));

    // Regel 4: Viele kleine Ausgaben summieren sich
    recommendations.push(...this.findFrequentSmallExpenses(expensesByCategory));

    // Regel 6: Hohe Wichtigkeit (5-6) mit sehr hohen Kosten – Optimierungshinweis
    recommendations.push(...this.findHighImportanceHighCost(expensesByCategory));

    return recommendations;
  }

  private groupExpensesByCategory(
    expenses: Expense[],
    categories: ExpenseCategory[]
  ): ExpenseAnalysis[] {
    const categoryMap = new Map<string, ExpenseAnalysis>();

    expenses.forEach((expense) => {
      const category = categories.find((c) => c.id === expense.categoryId);
      if (!category) return;

      const expImportance = typeof expense.importance === 'number' ? expense.importance : (category.importance ?? 3);

      if (!categoryMap.has(category.id)) {
        categoryMap.set(category.id, {
          categoryId: category.id,
          categoryName: category.name,
          importance: expImportance,
          totalAmount: 0,
          expenseCount: 0,
          averageAmount: 0,
        });
      }

      const analysis = categoryMap.get(category.id)!;
      analysis.totalAmount += expense.amount;
      analysis.expenseCount += 1;
      if (expImportance > analysis.importance) {
        analysis.importance = expImportance;
      }
    });

    categoryMap.forEach((analysis) => {
      analysis.averageAmount = analysis.totalAmount / analysis.expenseCount;
    });

    return Array.from(categoryMap.values());
  }

  /**
   * Regel 1: Niedrige Wichtigkeit (1-2) mit hohen Ausgaben (>200€/Monat = 60000 Cents/3Mo)
   * → Empfehlung: Komplett eliminieren oder stark reduzieren
   */
  private findLowImportanceHighCost(analyses: ExpenseAnalysis[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const lowImportance = analyses.filter(
      (a) => a.importance <= 2 && a.totalAmount >= 60000 // ≥200€/Monat über 3 Monate (in Cents)
    );

    lowImportance.forEach((analysis) => {
      const monthlyCostCents = Math.round(analysis.totalAmount / 3);
      const potentialSavings = Math.round(analysis.totalAmount * 0.8);

      recommendations.push({
        id: this.generateId(),
        type: 'eliminate-expense',
        title: `${analysis.categoryName} stark reduzieren`,
        description: `Diese Kategorie hat niedrige Wichtigkeit (${analysis.importance}/6), verursacht aber hohe Kosten von ${formatCentsEUR(monthlyCostCents)} pro Monat.`,
        potentialSavings,
        impact: potentialSavings > 100000 ? 'high' : 'medium',
        explanation: `Berechnung: Durchschnitt der letzten 3 Monate (${formatCentsEUR(analysis.totalAmount)}) × 80% Reduktionspotenzial = ${formatCentsEUR(potentialSavings)} Ersparnis. Wichtigkeit ${analysis.importance}/6 deutet darauf hin, dass diese Ausgaben verzichtbar sind.`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    return recommendations;
  }

  /**
   * Regel 2: Mittlere Wichtigkeit (3-4) mit sehr hohen Ausgaben (>500€/Monat = 150000 Cents/3Mo)
   * → Empfehlung: Alternativen prüfen, 30% Reduktion anstreben
   */
  private findMediumImportanceExcessiveCost(analyses: ExpenseAnalysis[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const mediumImportanceHigh = analyses.filter(
      (a) => a.importance >= 3 && a.importance <= 4 && a.totalAmount > 150000 // >500€/Monat (in Cents)
    );

    mediumImportanceHigh.forEach((analysis) => {
      const monthlyCostCents = Math.round(analysis.totalAmount / 3);
      const potentialSavings = Math.round(analysis.totalAmount * 0.3);

      recommendations.push({
        id: this.generateId(),
        type: 'reduce-expense',
        title: `${analysis.categoryName} optimieren`,
        description: `Bei mittlerer Wichtigkeit (${analysis.importance}/6) sind die Kosten von ${formatCentsEUR(monthlyCostCents)}/Monat sehr hoch. Prüfe günstigere Alternativen.`,
        potentialSavings,
        impact: potentialSavings > 80000 ? 'high' : potentialSavings > 30000 ? 'medium' : 'low',
        explanation: `Berechnung: Aktuelle Kosten ${formatCentsEUR(analysis.totalAmount)} (3 Monate) × 30% Optimierungspotenzial = ${formatCentsEUR(potentialSavings)}. Bei mittlerer Wichtigkeit gibt es oft günstigere Alternativen ohne Qualitätsverlust.`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    return recommendations;
  }

  /**
   * Regel 3: Einzelne teure Ausgaben (>150€ = 15000 Cents) in niedrig-wichtigen Kategorien
   * → Empfehlung: Beim nächsten Mal vermeiden
   */
  private findExpensiveSingleExpenses(
    expenses: Expense[],
    categories: ExpenseCategory[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const expensiveInLowImportance = expenses.filter((exp) => {
      const category = categories.find((c) => c.id === exp.categoryId);
      if (!category) return false;
      const importance = typeof exp.importance === 'number' ? exp.importance : (category.importance ?? 3);
      return importance <= 2 && exp.amount > 15000; // >150€ (in Cents)
    });

    if (expensiveInLowImportance.length === 0) return recommendations;

    const grouped = new Map<string, Expense[]>();
    expensiveInLowImportance.forEach((exp) => {
      if (!grouped.has(exp.categoryId)) {
        grouped.set(exp.categoryId, []);
      }
      grouped.get(exp.categoryId)!.push(exp);
    });

    grouped.forEach((exps, categoryId) => {
      const category = categories.find((c) => c.id === categoryId)!;
      const totalAmountCents = exps.reduce((sum, e) => sum + e.amount, 0);
      const savingsCents = totalAmountCents * 0.9;
      const maxImportance = Math.max(...exps.map((e) => typeof e.importance === 'number' ? e.importance : (category.importance ?? 3)));

      recommendations.push({
        id: this.generateId(),
        type: 'eliminate-expense',
        title: `Teure Einzelausgaben in "${category.name}" vermeiden`,
        description: `${exps.length} teure Ausgabe(n) (insgesamt ${formatCentsEUR(totalAmountCents)}) in einer Kategorie mit niedriger Wichtigkeit (${maxImportance}/6).`,
        potentialSavings: savingsCents,
        impact: totalAmountCents > 50000 ? 'high' : totalAmountCents > 20000 ? 'medium' : 'low',
        explanation: `Berechnung: Summe der Einzelausgaben über 150€ = ${formatCentsEUR(totalAmountCents)}. Bei Wichtigkeit ${maxImportance}/6 sind diese Ausgaben vermeidbar. Potenzielle Ersparnis: ${formatCentsEUR(savingsCents)}.`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    return recommendations;
  }

  /**
   * Regel 4: Viele kleine Ausgaben (>10 pro Monat) unter 20€ (2000 Cents) summieren sich
   * → Empfehlung: Bewusster konsumieren
   */
  private findFrequentSmallExpenses(analyses: ExpenseAnalysis[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const frequentSmall = analyses.filter(
      (a) => 
        a.expenseCount > 30 && // >10 pro Monat
        a.averageAmount < 2000 && // <20€ Durchschnitt (in Cents)
        a.totalAmount > 30000 && // >300€ gesamt (in Cents)
        a.importance <= 3
    );

    frequentSmall.forEach((analysis) => {
      const monthlyCount = analysis.expenseCount / 3;
      const monthlyCostCents = Math.round(analysis.totalAmount / 3);
      const potentialSavings = Math.round(analysis.totalAmount * 0.5);

      recommendations.push({
        id: this.generateId(),
        type: 'reduce-expense',
        title: `Häufige Kleinausgaben in "${analysis.categoryName}" reduzieren`,
        description: `Durchschnittlich ${monthlyCount.toFixed(0)} Ausgaben pro Monat (je ${formatCentsEUR(Math.round(analysis.averageAmount))}) summieren sich zu ${formatCentsEUR(monthlyCostCents)}/Monat.`,
        potentialSavings,
        impact: potentialSavings > 50000 ? 'medium' : 'low',
        explanation: `Berechnung: ${analysis.expenseCount} Ausgaben × ${formatCentsEUR(Math.round(analysis.averageAmount))} = ${formatCentsEUR(analysis.totalAmount)} (3 Monate). Bei bewussterem Konsum sind 50% Einsparung realistisch = ${formatCentsEUR(potentialSavings)}.`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    return recommendations;
  }

  /**
   * Regel 5: Budget-Defizit – monatliche Ausgaben übersteigen Einnahmen
   */
  private findBudgetDeficit(
    recentExpenses: Expense[],
    recentIncomes: Income[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const totalExpenseCents = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncomeCents = recentIncomes.reduce((sum, i) => sum + i.amount, 0);

    if (totalExpenseCents <= totalIncomeCents || totalIncomeCents === 0) {
      return recommendations;
    }

    const deficitCents = totalExpenseCents - totalIncomeCents;
    const months = Math.max(1, new Set(recentExpenses.map((e) => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })).size);
    const monthlyDeficitCents = Math.round(deficitCents / months);

    recommendations.push({
      id: this.generateId(),
      type: 'general',
      title: 'Budget-Defizit: Ausgaben übersteigen Einnahmen',
      description: `Deine Ausgaben (${formatCentsEUR(totalExpenseCents)}) liegen über deinen Einnahmen (${formatCentsEUR(totalIncomeCents)}). Monatliche Lücke: ca. ${formatCentsEUR(monthlyDeficitCents)}.`,
      potentialSavings: deficitCents,
      impact: monthlyDeficitCents > 50000 ? 'high' : monthlyDeficitCents > 20000 ? 'medium' : 'low',
      explanation: `Berechnung: Gesamtausgaben ${formatCentsEUR(totalExpenseCents)} − Gesamteinnahmen ${formatCentsEUR(totalIncomeCents)} = ${formatCentsEUR(deficitCents)} Defizit über ${months} Monat(e). Prüfe, ob Ausgaben reduziert oder Einnahmen erhöht werden können.`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return recommendations;
  }

  /**
   * Regel 6: Hohe Wichtigkeit (5-6) mit sehr hohen Kosten (>1000€/Monat)
   * → Auch wichtige Ausgaben können optimiert werden (10-15% Potenzial)
   */
  private findHighImportanceHighCost(analyses: ExpenseAnalysis[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const highImportanceExpensive = analyses.filter(
      (a) => a.importance >= 5 && a.totalAmount > 300000 // >1000€/Monat über 3 Monate (in Cents)
    );

    highImportanceExpensive.forEach((analysis) => {
      const monthlyCostCents = Math.round(analysis.totalAmount / 3);
      const potentialSavings = Math.round(analysis.totalAmount * 0.1);

      recommendations.push({
        id: this.generateId(),
        type: 'reduce-expense',
        title: `${analysis.categoryName}: Hohe Kosten trotz hoher Wichtigkeit`,
        description: `"${analysis.categoryName}" ist dir wichtig (${analysis.importance}/6), kostet aber ${formatCentsEUR(monthlyCostCents)}/Monat. Auch bei wichtigen Ausgaben lohnt ein Vergleich.`,
        potentialSavings,
        impact: potentialSavings > 50000 ? 'medium' : 'low',
        explanation: `Berechnung: Kosten ${formatCentsEUR(analysis.totalAmount)} (letzte 3 Monate) × 10% Optimierungspotenzial = ${formatCentsEUR(potentialSavings)}. Auch bei hoher Wichtigkeit (${analysis.importance}/6) gibt es oft günstigere Tarife, Anbieter oder Verhandlungsspielraum.`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    return recommendations;
  }

  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const recommendationService = new RecommendationService();
