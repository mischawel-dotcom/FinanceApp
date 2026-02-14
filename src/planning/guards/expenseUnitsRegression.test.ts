import { buildDashboardModelFromRepositories } from '../planFacade';

// Vitest mock for ESM
vi.mock('@/planning/adapters/fromPersistedStore', () => ({
  buildPlanInputFromPersistedStore: () => ({
    incomes: [],
    expenses: [
      {
        id: 'exp1',
        title: 'Test Expense',
        amount: 100, // 100 cents
        date: new Date(2026, 1, 1),
        categoryId: 'cat1',
        importance: 1,
        createdAt: new Date(2026, 1, 1),
        updatedAt: new Date(2026, 1, 1),
        interval: 'monthly',
      },
    ],
    goals: [
      { id: 'g1', name: 'Goal', targetAmount: 10000, currentAmount: 0, targetDate: new Date(2026, 1, 1), priority: 'medium', description: '' },
    ],
    assets: [
      { id: 'a1', name: 'Asset', currentValue: 0, notes: '' },
    ],
    incomeCategories: [],
    expenseCategories: [
      { id: 'cat1', name: 'Test', description: '', color: '#000', importance: 1, createdAt: new Date(2026, 1, 1), updatedAt: new Date(2026, 1, 1) },
    ],
    reserves: [],
    investments: [],
  }),
}));

describe('Expense units regression (cents-only)', () => {
  it('does not multiply expense by 100 in planning core', async () => {
    const planSettings = { forecastMonths: 1 };
    const model = await buildDashboardModelFromRepositories(planSettings);
    const month = model.projection.timeline[0];
    expect(month.buckets.bound).toBe(100);
    expect(model.heroFree).toBe(-100);
    expect(model.heroFree).not.toBe(-10000);
  });
});
