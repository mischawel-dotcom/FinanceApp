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
  balance: number;
};

export default function ReportsPage() {
  const { incomes, expenses, incomeCategories, expenseCategories, loadData } = useAppStore();

  useEffect(() => {
    if (
      incomes.length === 0 ||
      expenses.length === 0 ||
      incomeCategories.length === 0 ||
      expenseCategories.length === 0
    ) {
      loadData();
    }
  }, [incomes.length, expenses.length, incomeCategories.length, expenseCategories.length, loadData]);

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
      return {
        key: month.key,
        label: month.label,
        income: incomeTotal,
        expense: expenseTotal,
        balance: incomeTotal - expenseTotal,
      };
    });
  }, [months, incomes, expenses]);

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
    return {
      income: incomeTotal,
      expense: expenseTotal,
      balance: incomeTotal - expenseTotal,
    };
  }, [selectedMonthIncomes, selectedMonthExpenses]);

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
      ['Monat', 'Einnahmen', 'Ausgaben', 'Saldo'],
      ...monthlySeries.map((m) => [
        m.label,
        (m.income / 100).toFixed(2),
        (m.expense / 100).toFixed(2),
        (m.balance / 100).toFixed(2),
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-gray-600 dark:text-gray-400">Einnahmen (Monat)</div>
          <div className="text-2xl font-bold text-success-600 mt-1">+{formatCents(selectedMonthTotals.income)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 dark:text-gray-400">Ausgaben (Monat)</div>
          <div className="text-2xl font-bold text-danger-600 mt-1">-{formatCents(selectedMonthTotals.expense)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 dark:text-gray-400">Saldo (Monat)</div>
          <div className={`text-2xl font-bold mt-1 ${selectedMonthTotals.balance >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {selectedMonthTotals.balance >= 0 ? '+' : ''}{formatCents(selectedMonthTotals.balance)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Einnahmen vs. Ausgaben (6 Monate)">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries}>
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number) => formatCents(value)} />
                <Legend />
                <Bar dataKey="income" name="Einnahmen" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Ausgaben" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Saldo-Trend (6 Monate)">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries}>
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number) => formatCents(value)} />
                <Line type="monotone" dataKey="balance" name="Saldo" stroke="#3b82f6" strokeWidth={3} />
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
