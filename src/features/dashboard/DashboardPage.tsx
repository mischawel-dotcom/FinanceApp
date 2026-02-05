import { useAppStore } from '@/app/store/useAppStore';
import { Card } from '@shared/components';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function DashboardPage() {
  const { incomes, expenses, assets, goals, incomeCategories, expenseCategories } = useAppStore();

  // Calculate current month data
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const currentMonthIncomes = incomes.filter(
    (inc) => inc.date >= monthStart && inc.date <= monthEnd
  );
  const currentMonthExpenses = expenses.filter(
    (exp) => exp.date >= monthStart && exp.date <= monthEnd
  );

  const totalIncome = currentMonthIncomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0';

  // Assets
  const totalAssetValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalAssetInvestment = assets.reduce((sum, asset) => sum + asset.initialInvestment, 0);
  const assetGain = totalAssetValue - totalAssetInvestment;

  // Goals
  const totalGoalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalGoalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const overallGoalProgress = totalGoalTarget > 0 
    ? ((totalGoalCurrent / totalGoalTarget) * 100).toFixed(1)
    : '0';

  // Expenses by category (current month)
  const expensesByCategory = expenseCategories.map((cat) => {
    const categoryExpenses = currentMonthExpenses.filter((exp) => exp.categoryId === cat.id);
    const total = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    return {
      category: cat.name,
      total,
      color: cat.color,
      importance: cat.importance,
    };
  }).filter((cat) => cat.total > 0).sort((a, b) => b.total - a.total);

  // Recent transactions (last 5)
  const recentTransactions = [
    ...incomes.map((inc) => ({
      ...inc,
      type: 'income' as const,
      categoryName: incomeCategories.find((c) => c.id === inc.categoryId)?.name || 'Unbekannt',
    })),
    ...expenses.map((exp) => ({
      ...exp,
      type: 'expense' as const,
      categoryName: expenseCategories.find((c) => c.id === exp.categoryId)?.name || 'Unbekannt',
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  // Top 3 Goals by priority
  const priorityGoals = [...goals]
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {format(now, 'MMMM yyyy')} - Dein finanzieller Überblick
        </p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-gray-600 mb-1">Einnahmen (Monat)</div>
          <div className="text-2xl font-bold text-success-600">+{totalIncome.toFixed(2)} €</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Ausgaben (Monat)</div>
          <div className="text-2xl font-bold text-danger-600">-{totalExpenses.toFixed(2)} €</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Saldo (Monat)</div>
          <div className={`text-2xl font-bold ${balance >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {balance >= 0 ? '+' : ''}{balance.toFixed(2)} €
          </div>
          <div className="text-xs text-gray-500 mt-1">Sparquote: {savingsRate}%</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Vermögen</div>
          <div className="text-2xl font-bold text-gray-900">{totalAssetValue.toFixed(2)} €</div>
          {assetGain !== 0 && (
            <div className={`text-xs mt-1 ${assetGain >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {assetGain >= 0 ? '+' : ''}{assetGain.toFixed(2)} € Gewinn
            </div>
          )}
        </Card>
      </div>

      {/* Two Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card title="Letzte Buchungen">
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Noch keine Buchungen vorhanden</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((txn, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{txn.title}</div>
                    <div className="text-sm text-gray-500">
                      {txn.categoryName} • {format(txn.date, 'dd.MM.yyyy')}
                    </div>
                  </div>
                  <div className={`font-semibold ${txn.type === 'income' ? 'text-success-600' : 'text-danger-600'}`}>
                    {txn.type === 'income' ? '+' : '-'}{txn.amount.toFixed(2)} €
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Expenses by Category */}
        <Card title="Ausgaben nach Kategorie (Monat)">
          {expensesByCategory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Noch keine Ausgaben diesen Monat</p>
          ) : (
            <div className="space-y-3">
              {expensesByCategory.slice(0, 5).map((cat, index) => {
                const percentage = totalExpenses > 0 ? ((cat.total / totalExpenses) * 100).toFixed(1) : '0';
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-medium text-gray-900">{cat.category}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{cat.total.toFixed(2)} €</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: cat.color 
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">{percentage}% der Ausgaben</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Financial Goals */}
      {priorityGoals.length > 0 && (
        <Card title="Wichtigste Ziele">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {priorityGoals.map((goal) => {
              const progress = goal.targetAmount > 0
                ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
                : 0;
              return (
                <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-semibold text-gray-900 mb-2">{goal.name}</div>
                  <div className="text-sm text-gray-600 mb-2">
                    {goal.currentAmount.toFixed(2)} € / {goal.targetAmount.toFixed(2)} €
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full ${
                        progress >= 100 ? 'bg-success-600' : progress >= 75 ? 'bg-primary-600' : 'bg-primary-400'
                      }`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">{progress.toFixed(1)}% erreicht</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Overall Goal Progress */}
      {goals.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Gesamt-Zielfortschritt</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {totalGoalCurrent.toFixed(2)} € / {totalGoalTarget.toFixed(2)} €
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary-600">{overallGoalProgress}%</div>
              <div className="text-sm text-gray-500">erreicht</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mt-4">
            <div
              className="h-full rounded-full bg-primary-600"
              style={{ width: `${overallGoalProgress}%` }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
