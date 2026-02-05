/**
 * UNIT TESTS - Recommendation Service
 * Tests für den Empfehlungs-Algorithmus
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RecommendationService } from '@shared/services/recommendationService';
import type { Expense, ExpenseCategory } from '@shared/types';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let categories: ExpenseCategory[];
  let expenses: Expense[];

  beforeEach(() => {
    service = new RecommendationService();
    
    // Setup test categories
    categories = [
      {
        id: 'cat1',
        name: 'Unnötige Subscriptions',
        importance: 1,
        color: '#ef4444',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cat2',
        name: 'Lebensmittel',
        importance: 6,
        color: '#10b981',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cat3',
        name: 'Entertainment',
        importance: 3,
        color: '#f59e0b',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    expenses = [];
  });

  describe('Low Importance + High Cost Detection', () => {
    it('should recommend elimination for low importance categories with high costs', () => {
      // Create expenses: 250€/month for 3 months in low importance category
      for (let i = 0; i < 3; i++) {
        expenses.push({
          id: `exp${i}`,
          title: `Subscription ${i}`,
          amount: 250,
          date: new Date(2026, 1 - i, 15), // Jan, Dec, Nov
          categoryId: 'cat1',
          importance: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const recommendations = service.generateRecommendations(expenses, categories);
      
      expect(recommendations.length).toBeGreaterThan(0);
      const eliminationRec = recommendations.find(r => r.type === 'eliminate-expense');
      expect(eliminationRec).toBeDefined();
      expect(eliminationRec?.potentialSavings).toBeGreaterThan(500); // 750 * 0.8 = 600
    });

    it('should not recommend for low importance categories with low costs', () => {
      // Create small expenses: 30€/month
      expenses.push({
        id: 'exp1',
        title: 'Small expense',
        amount: 90,
        date: new Date(2026, 0, 15),
        categoryId: 'cat1',
        importance: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const recommendations = service.generateRecommendations(expenses, categories);
      
      const eliminationRec = recommendations.find(
        r => r.type === 'eliminate-expense' && r.title.includes('Unnötige Subscriptions')
      );
      expect(eliminationRec).toBeUndefined();
    });
  });

  describe('Medium Importance + Excessive Cost Detection', () => {
    it('should recommend optimization for medium importance with high costs', () => {
      // Create 600€/month for 3 months in medium importance
      for (let i = 0; i < 3; i++) {
        expenses.push({
          id: `exp${i}`,
          title: `Entertainment ${i}`,
          amount: 600,
          date: new Date(2026, 1 - i, 10),
          categoryId: 'cat3',
          importance: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const recommendations = service.generateRecommendations(expenses, categories);
      
      const reduceRec = recommendations.find(
        r => r.type === 'reduce-expense' && r.title.includes('Entertainment')
      );
      expect(reduceRec).toBeDefined();
      expect(reduceRec?.potentialSavings).toBeCloseTo(1800 * 0.3, 1); // 540€
    });
  });

  describe('Expensive Single Expenses Detection', () => {
    it('should detect expensive single expenses in low importance categories', () => {
      expenses.push({
        id: 'exp1',
        title: 'Expensive impulse buy',
        amount: 250,
        date: new Date(2026, 0, 15),
        categoryId: 'cat1',
        importance: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const recommendations = service.generateRecommendations(expenses, categories);
      
      const singleExpenseRec = recommendations.find(
        r => r.title.includes('Einzelausgaben') || r.title.includes('Teure')
      );
      expect(singleExpenseRec).toBeDefined();
    });

    it('should not flag expensive purchases in high importance categories', () => {
      expenses.push({
        id: 'exp1',
        title: 'Expensive groceries',
        amount: 200,
        date: new Date(2026, 0, 15),
        categoryId: 'cat2', // Importance 6
        importance: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const recommendations = service.generateRecommendations(expenses, categories);
      
      // Should not generate recommendations for high importance
      const groceryRec = recommendations.find(r => r.title.includes('Lebensmittel'));
      expect(groceryRec).toBeUndefined();
    });
  });

  describe('Frequent Small Expenses Detection', () => {
    it('should detect many small expenses that add up', () => {
      // Create 40 small expenses (>10/month) averaging 15€ each
      for (let i = 0; i < 40; i++) {
        expenses.push({
          id: `exp${i}`,
          title: `Coffee ${i}`,
          amount: 15,
          date: new Date(2026, Math.floor(i / 13), (i % 28) + 1),
          categoryId: 'cat3',
          importance: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const recommendations = service.generateRecommendations(expenses, categories);
      
      const frequentRec = recommendations.find(r => r.title.includes('Häufige Kleinausgaben'));
      expect(frequentRec).toBeDefined();
      expect(frequentRec?.potentialSavings).toBeGreaterThan(200); // 600 * 0.5 = 300
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array when no expenses exist', () => {
      const recommendations = service.generateRecommendations([], categories);
      expect(recommendations).toEqual([]);
    });

    it('should handle expenses older than 3 months', () => {
      expenses.push({
        id: 'exp1',
        title: 'Old expense',
        amount: 1000,
        date: new Date(2025, 6, 1), // 7 months ago
        categoryId: 'cat1',
        importance: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const recommendations = service.generateRecommendations(expenses, categories);
      
      // Should ignore old expenses
      expect(recommendations.length).toBe(0);
    });

    it('should handle missing categories gracefully', () => {
      expenses.push({
        id: 'exp1',
        title: 'Orphan expense',
        amount: 100,
        date: new Date(2026, 0, 15),
        categoryId: 'nonexistent',
        importance: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const recommendations = service.generateRecommendations(expenses, categories);
      
      // Should not crash
      expect(recommendations).toBeDefined();
    });
  });

  describe('Impact Calculation', () => {
    it('should mark high savings (>1000€) as high impact', () => {
      // 400€/month × 3 months = 1200€ total → 960€ savings (80%)
      for (let i = 0; i < 3; i++) {
        expenses.push({
          id: `exp${i}`,
          title: `Expensive ${i}`,
          amount: 400,
          date: new Date(2026, 1 - i, 15),
          categoryId: 'cat1',
          importance: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const recommendations = service.generateRecommendations(expenses, categories);
      const highImpact = recommendations.find(r => r.impact === 'high');
      
      expect(highImpact).toBeDefined();
    });

    it('should mark medium savings (300-1000€) as medium impact', () => {
      // 200€/month × 3 = 600€ → 480€ savings
      for (let i = 0; i < 3; i++) {
        expenses.push({
          id: `exp${i}`,
          title: `Medium ${i}`,
          amount: 200,
          date: new Date(2026, 1 - i, 15),
          categoryId: 'cat1',
          importance: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const recommendations = service.generateRecommendations(expenses, categories);
      const mediumImpact = recommendations.find(r => r.impact === 'medium');
      
      expect(mediumImpact).toBeDefined();
    });
  });

  describe('Explanation Transparency', () => {
    it('should provide detailed calculation explanations', () => {
      for (let i = 0; i < 3; i++) {
        expenses.push({
          id: `exp${i}`,
          title: `Test ${i}`,
          amount: 250,
          date: new Date(2026, 1 - i, 15),
          categoryId: 'cat1',
          importance: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const recommendations = service.generateRecommendations(expenses, categories);
      
      recommendations.forEach(rec => {
        expect(rec.explanation).toBeDefined();
        expect(rec.explanation.length).toBeGreaterThan(50); // Meaningful explanation
        expect(rec.explanation).toMatch(/Berechnung:/); // Contains calculation details
      });
    });
  });
});
