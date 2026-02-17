import DashboardPlanningPreview from "@/features/dashboard/DashboardPlanningPreview";
const SHOW_DEBUG = import.meta.env.DEV;
import { useAppStore } from '@/app/store/useAppStore';
import { Card } from '@shared/components';
import { format } from 'date-fns';
import { useEffect, useState, useCallback } from 'react';
import { formatCentsEUR } from '@/ui/formatMoney';

const normalizeCents = (amountCents: unknown, amount: unknown) => {
  if (typeof amountCents === 'number' && Number.isFinite(amountCents)) return Math.round(amountCents);
  if (typeof amount === 'number' && Number.isFinite(amount)) return Math.round(amount); // amount ist bei uns bereits cents im Store
  return 0;
};

export default function DashboardPage() {
  const now = new Date();
  const { incomes, expenses, assets, goals, incomeCategories, expenseCategories, loadData } = useAppStore();

  useEffect(() => {
    if (
      incomes.length === 0 ||
      expenses.length === 0 ||
      assets.length === 0 ||
      goals.length === 0 ||
      incomeCategories.length === 0 ||
      expenseCategories.length === 0
    ) {
      loadData();
    }
  }, [incomes.length, expenses.length, assets.length, goals.length, incomeCategories.length, expenseCategories.length, loadData]);


  // --- Use planning projection for flow-only dashboard KPIs ---
  // We'll use a React state to store the latest projection values from the child
  type FlowKpis = {
    incomeCents: number;
    boundCents: number;
    plannedCents: number;
    investedCents: number;
    freeCents: number;
    expensesCents?: number;
    savingRate?: number;
  };
  const [flowKpis, setFlowKpis] = useState<FlowKpis | null>(null);

  // Stable handler for DashboardPlanningPreview
  const handleFlowKpis = useCallback((kpis: FlowKpis) => {
    setFlowKpis(kpis);
  }, []);

  // Assets
  // Convert euro values to integer cents for dashboard display
  const totalAssetValueCents = Math.round(assets.reduce((sum, asset) => sum + asset.currentValue, 0) * 100);
  const totalAssetInvestmentCents = Math.round(assets.reduce((sum, asset) => sum + asset.initialInvestment, 0) * 100);
  const assetGainCents = totalAssetValueCents - totalAssetInvestmentCents;

  // Goals (robust, wie im Block 'Wichtigste Ziele')
  const safeGoals = goals ?? [];
  const resolvedCurrentCents = (g: any) =>
    typeof g.currentAmountCents === "number"
      ? g.currentAmountCents
      : typeof g.currentAmount === "number"
        ? Math.round(g.currentAmount * 100)
        : 0;
  const resolvedTargetCents = (g: any) =>
    typeof g.targetAmountCents === "number"
      ? g.targetAmountCents
      : typeof g.targetAmount === "number"
        ? Math.round(g.targetAmount * 100)
        : 0;
  const totalGoalCurrentCents = safeGoals.reduce((sum, g) => sum + resolvedCurrentCents(g), 0);
  const totalGoalTargetCents = safeGoals.reduce((sum, g) => sum + resolvedTargetCents(g), 0);
  const totalGoalPercent = totalGoalTargetCents > 0 ? (totalGoalCurrentCents / totalGoalTargetCents) * 100 : 0;

  // Expenses by category (fallback: use all expenses, or adapt to flowKpis if needed)
  // If you want to use only current month, filter expenses by date here
  const expensesByCategory = expenseCategories.map((cat) => {
    const categoryExpenses = expenses.filter((exp) => exp.categoryId === cat.id);
    const total = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    return {
      category: cat.name,
      total,
      color: cat.color,
      importance: cat.importance,
    };
  }).filter((cat) => cat.total > 0).sort((a, b) => b.total - a.total);

  const totalExpenses = expensesByCategory.reduce(
    (sum, cat) => sum + cat.total,
    0
  );

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
      const priorityOrder: Record<'critical' | 'high' | 'medium' | 'low', number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority as 'critical' | 'high' | 'medium' | 'low'] - priorityOrder[b.priority as 'critical' | 'high' | 'medium' | 'low'];
    })
    .slice(0, 3);

  return (
    <>
      <div style={{position:"fixed", top:8, right:8, padding:"4px 8px", background:"#000", color:"#fff", fontSize:12, zIndex:9999}}>
        DASHBOARD: DashboardPage
      </div>
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {format(now, 'MMMM yyyy')} - Dein finanzieller Überblick
        </p>
      </div>

      {/* Planning Preview with KPI callback */}
      <DashboardPlanningPreview onFlowKpis={handleFlowKpis} />

      {/* Main KPIs (Flow-only, from planning projection) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-gray-600 mb-1">Einnahmen (Monat)</div>
          <div className="text-2xl font-bold text-success-600">
            +{formatCentsEUR(flowKpis?.incomeCents ?? 0)}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Ausgaben (Monat)</div>
          <div className="text-2xl font-bold text-danger-600">
            -{formatCentsEUR(
              (flowKpis?.boundCents ?? 0) + (flowKpis?.plannedCents ?? 0) + (flowKpis?.investedCents ?? 0)
            )}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Saldo (Monat)</div>
          <div className={`text-2xl font-bold ${(flowKpis?.freeCents ?? 0) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {(flowKpis?.freeCents ?? 0) >= 0 ? '+' : ''}{formatCentsEUR(flowKpis?.freeCents ?? 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Sparquote: {
              flowKpis && flowKpis.incomeCents > 0
                ? (((flowKpis.plannedCents + flowKpis.investedCents) / flowKpis.incomeCents) * 100).toFixed(1)
                : '0'
            }%
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Vermögen</div>
          <div className="text-2xl font-bold text-gray-900">{formatCentsEUR(totalAssetValueCents)}</div>
          {assetGainCents !== 0 && (
            <div className={`text-xs mt-1 ${assetGainCents >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {assetGainCents >= 0 ? '+' : ''}{formatCentsEUR(assetGainCents)} Gewinn
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
                    {txn.type === 'income' ? '+' : '-'}{formatCentsEUR(normalizeCents(txn.amountCents, txn.amount))}
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
                      <span className="text-sm font-semibold text-gray-900">{formatCentsEUR(cat.total)}</span>
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
              const targetCents = goal.targetAmountCents ?? 0;
              const currentCents =
                typeof (goal as any).currentAmountCents === "number"
                  ? (goal as any).currentAmountCents
                  : typeof (goal as any).currentAmount === "number"
                    ? Math.round((goal as any).currentAmount * 100)
                    : 0;
              const percent = targetCents > 0 ? (currentCents / targetCents) * 100 : 0;
              return (
                <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-semibold text-gray-900 mb-2">{goal.name}</div>
                  <div className="text-sm text-gray-600 mb-2">
                    {formatCentsEUR(currentCents)} / {formatCentsEUR(targetCents)}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full ${
                        percent >= 100 ? 'bg-success-600' : percent >= 75 ? 'bg-primary-600' : 'bg-primary-400'
                      }`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">{percent.toFixed(1)}% erreicht</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Overall Goal Progress */}
      {safeGoals.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Gesamt-Zielfortschritt</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {formatCentsEUR(totalGoalCurrentCents)} / {formatCentsEUR(totalGoalTargetCents)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary-600">{totalGoalPercent.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">erreicht</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mt-4">
            <div
              className="h-full rounded-full bg-primary-600"
              style={{ width: `${totalGoalPercent}%` }}
            />
          </div>
        </Card>
      )}
    </div>
    </>
  );
}
