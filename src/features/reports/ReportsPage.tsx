import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '@/app/store/useAppStore';
import { Card, Button, Table, Select } from '@shared/components';
import { formatCents } from '@/ui/formatMoney';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
} from 'date-fns';

type MonthlySeries = {
  key: string;
  label: string;
  income: number;
  expense: number;
  reserves: number;
  goals: number;
  investments: number;
  free: number;
  savingsRate: number;
};

export default function ReportsPage() {
  const { incomes, expenses, goals, reserves, assets, incomeCategories, expenseCategories, loadData } = useAppStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [selectedMonthKey, setSelectedMonthKey] = useState(
    format(new Date(), 'yyyy-MM')
  );

  const months = useMemo(() => {
    return Array.from({ length: 6 }).map((_, index) => {
      const date = subMonths(new Date(), index);
      return {
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM yyyy'),
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    }).reverse();
  }, []);

  const reservesMonthlyCents = useMemo(() =>
    reserves.reduce((sum, r) => sum + (r.monthlyContributionCents || 0), 0),
    [reserves]
  );

  const goalsMonthlyCents = useMemo(() =>
    goals.reduce((sum, g) => sum + ((g as any).monthlyContributionCents || 0), 0),
    [goals]
  );

  const investmentsMonthlyCents = useMemo(() =>
    assets.reduce((sum, a) => sum + (a.monthlyContributionCents || 0), 0),
    [assets]
  );

  const monthlySeries: MonthlySeries[] = useMemo(() => {
    return months.map((month) => {
      const monthIncomes = incomes.filter((inc) =>
        isWithinInterval(inc.date, { start: month.start, end: month.end })
      );
      const monthExpenses = expenses.filter((exp) =>
        isWithinInterval(exp.date, { start: month.start, end: month.end })
      );
      const incomeTotal = monthIncomes.reduce((sum, inc) => sum + inc.amount, 0);
      const expenseTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const bound = expenseTotal + reservesMonthlyCents;
      const free = incomeTotal - bound - goalsMonthlyCents - investmentsMonthlyCents;
      const savingsRate = incomeTotal > 0
        ? Math.round(((goalsMonthlyCents + investmentsMonthlyCents + reservesMonthlyCents) / incomeTotal) * 100)
        : 0;
      return {
        key: month.key,
        label: month.label,
        income: incomeTotal,
        expense: expenseTotal,
        reserves: reservesMonthlyCents,
        goals: goalsMonthlyCents,
        investments: investmentsMonthlyCents,
        free,
        savingsRate,
      };
    });
  }, [months, incomes, expenses, reservesMonthlyCents, goalsMonthlyCents, investmentsMonthlyCents]);

  const selectedMonth = useMemo(() => {
    return months.find((m) => m.key === selectedMonthKey) ?? months[months.length - 1];
  }, [months, selectedMonthKey]);

  const selectedMonthExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    return expenses.filter((exp) =>
      isWithinInterval(exp.date, { start: selectedMonth.start, end: selectedMonth.end })
    );
  }, [expenses, selectedMonth]);

  const selectedMonthIncomes = useMemo(() => {
    if (!selectedMonth) return [];
    return incomes.filter((inc) =>
      isWithinInterval(inc.date, { start: selectedMonth.start, end: selectedMonth.end })
    );
  }, [incomes, selectedMonth]);

  const expenseByCategory = useMemo(() => {
    const totals = expenseCategories.map((cat) => {
      const total = selectedMonthExpenses
        .filter((exp) => exp.categoryId === cat.id)
        .reduce((sum, exp) => sum + exp.amount, 0);
      return {
        id: cat.id,
        name: cat.name,
        total,
        color: cat.color || '#94a3b8',
      };
    }).filter((c) => c.total > 0);

    return totals.sort((a, b) => b.total - a.total);
  }, [selectedMonthExpenses, expenseCategories]);

  const selectedMonthTransactions = useMemo(() => {
    const incomeTx = selectedMonthIncomes.map((inc) => ({
      id: inc.id,
      date: inc.date,
      title: inc.title,
      category: incomeCategories.find((c) => c.id === inc.categoryId)?.name ?? 'Unbekannt',
      type: 'income' as const,
      amount: inc.amount,
    }));
    const expenseTx = selectedMonthExpenses.map((exp) => ({
      id: exp.id,
      date: exp.date,
      title: exp.title,
      category: expenseCategories.find((c) => c.id === exp.categoryId)?.name ?? 'Unbekannt',
      type: 'expense' as const,
      amount: exp.amount,
    }));
    return [...incomeTx, ...expenseTx]
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [selectedMonthIncomes, selectedMonthExpenses, incomeCategories, expenseCategories]);

  const selectedMonthTotals = useMemo(() => {
    const incomeTotal = selectedMonthIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const expenseTotal = selectedMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const free = incomeTotal - expenseTotal - reservesMonthlyCents - goalsMonthlyCents - investmentsMonthlyCents;
    return {
      income: incomeTotal,
      expense: expenseTotal,
      reserves: reservesMonthlyCents,
      goals: goalsMonthlyCents,
      investments: investmentsMonthlyCents,
      free,
    };
  }, [selectedMonthIncomes, selectedMonthExpenses, reservesMonthlyCents, goalsMonthlyCents, investmentsMonthlyCents]);

  const exportCSV = (filename: string, rows: (string | number)[][]) => {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMonthlyReport = () => {
    const rows: (string | number)[][] = [
      ['Monat', 'Einnahmen', 'Ausgaben', 'Rücklagen', 'Ziele', 'Anlagen', 'Frei', 'Sparquote %'],
      ...monthlySeries.map((m) => [
        m.label,
        (m.income / 100).toFixed(2),
        (m.expense / 100).toFixed(2),
        (m.reserves / 100).toFixed(2),
        (m.goals / 100).toFixed(2),
        (m.investments / 100).toFixed(2),
        (m.free / 100).toFixed(2),
        m.savingsRate,
      ]),
    ];
    exportCSV('finance-report-monate.csv', rows);
  };

  const handleExportTransactions = () => {
    const rows: (string | number)[][] = [
      ['Datum', 'Typ', 'Titel', 'Kategorie', 'Betrag'],
      ...selectedMonthTransactions.map((t) => [
        format(t.date, 'dd.MM.yyyy'),
        t.type === 'income' ? 'Einnahme' : 'Ausgabe',
        t.title,
        t.category,
        (t.amount / 100).toFixed(2),
      ]),
    ];
    exportCSV(`transactions-${selectedMonth?.key}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Auswertungen, Trends und Export-Funktionen.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportMonthlyReport}>
            CSV: Monatsreport
          </Button>
          <Button onClick={handleExportTransactions}>
            CSV: Transaktionen
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Monat auswählen</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Für Kategorie- und Transaktionsauswertung</div>
          </div>
          <div className="w-60">
            <Select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              options={months.map((m) => ({ value: m.key, label: m.label }))}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <div className="text-xs text-gray-500 dark:text-gray-400">Einnahmen</div>
          <div className="text-lg font-bold text-success-600 mt-1">+{formatCents(selectedMonthTotals.income)}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 dark:text-gray-400">Ausgaben</div>
          <div className="text-lg font-bold text-danger-600 mt-1">-{formatCents(selectedMonthTotals.expense)}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 dark:text-gray-400">Rücklagen</div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">-{formatCents(selectedMonthTotals.reserves)}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 dark:text-gray-400">Ziele</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">-{formatCents(selectedMonthTotals.goals)}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 dark:text-gray-400">Anlagen</div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">-{formatCents(selectedMonthTotals.investments)}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 dark:text-gray-400">Frei</div>
          <div className={`text-lg font-bold mt-1 ${selectedMonthTotals.free >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {formatCents(selectedMonthTotals.free)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Einnahmen vs. Verwendung (6 Monate)">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries}>
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v: number) => `${(v / 100).toFixed(0)}`} />
                <Tooltip formatter={(value: number) => formatCents(value)} />
                <Legend />
                <Bar dataKey="income" name="Einnahmen" fill="#10b981" />
                <Bar dataKey="expense" name="Ausgaben" fill="#ef4444" stackId="usage" />
                <Bar dataKey="reserves" name="Rücklagen" fill="#f59e0b" stackId="usage" />
                <Bar dataKey="goals" name="Ziele" fill="#3b82f6" stackId="usage" />
                <Bar dataKey="investments" name="Anlagen" fill="#8b5cf6" stackId="usage" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Frei & Sparquote (6 Monate)">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries}>
                <XAxis dataKey="label" fontSize={12} />
                <YAxis yAxisId="left" fontSize={12} tickFormatter={(v: number) => `${(v / 100).toFixed(0)}`} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(value: number, name: string) =>
                  name === 'Sparquote' ? `${value}%` : formatCents(value)
                } />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="free" name="Frei" stroke="#10b981" strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="savingsRate" name="Sparquote" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={`Ausgaben nach Kategorie (${selectedMonth?.label})`}>
          {expenseByCategory.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">Keine Ausgaben im gewählten Monat</div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {expenseByCategory.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCents(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Top Kategorien (Monat)">
          <Table
            data={expenseByCategory}
            emptyMessage="Keine Kategorien mit Ausgaben"
            columns={[
              {
                key: 'name',
                label: 'Kategorie',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.name}
                  </div>
                ),
              },
              {
                key: 'total',
                label: 'Betrag',
                render: (row) => formatCents(row.total),
              },
            ]}
          />
        </Card>
      </div>

      <Card title={`Transaktionen (${selectedMonth?.label})`}>
        <Table
          data={selectedMonthTransactions}
          emptyMessage="Keine Transaktionen im gewählten Monat"
          columns={[
            {
              key: 'date',
              label: 'Datum',
              render: (row) => format(row.date, 'dd.MM.yyyy'),
            },
            { key: 'title', label: 'Titel' },
            { key: 'category', label: 'Kategorie' },
            {
              key: 'amount',
              label: 'Betrag',
              render: (row) => (
                <span className={row.type === 'income' ? 'text-success-600' : 'text-danger-600'}>
                  {row.type === 'income' ? '+' : '-'}{formatCents(row.amount)}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
