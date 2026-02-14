import { mapExpenseToDomain } from './fromRepositories';

describe('Expense units mapping (cents-only)', () => {
  const now = new Date();

  it('maps seed expenses to integer cents', () => {
    const seed = [
      {
        id: 'exp1',
        title: 'Test1',
        amount: 1578.48, // legacy euro-style float
        categoryId: 'test',
        date: now,
        importance: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'exp2',
        title: 'Test2',
        amountCents: 157848, // cents-style int
        categoryId: 'test',
        date: now,
        importance: 1,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const mapped = seed.map((e) => mapExpenseToDomain(e as any));

    expect(mapped[0].amount).toBe(157848);
    expect(mapped[1].amount).toBe(157848);
    expect(Number.isInteger(mapped[0].amount)).toBe(true);
    expect(Number.isInteger(mapped[1].amount)).toBe(true);
  });

  it('calculates monthly saldo correctly', () => {
    const incomes = [
      { id: 'inc1', title: 'Job', amount: 602500, date: now, categoryId: 'job', isRecurring: true },
    ];

    const expenses = [
      {
        id: 'exp1',
        title: 'Test1',
        amount: 1578.48, // legacy euro-style float
        categoryId: 'test',
        date: now,
        importance: 1,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const mappedExpenses = expenses.map((e) => mapExpenseToDomain(e as any));
    const expensesMonth = mappedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const saldo = incomes[0].amount - expensesMonth;

    expect(expensesMonth).toBe(157848);
    expect(saldo).toBe(444652);
  });
});
