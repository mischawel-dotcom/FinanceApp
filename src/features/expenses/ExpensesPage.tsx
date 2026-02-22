import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/app/store/useAppStore';
import type { Expense, ExpenseCategory, RecurrenceInterval } from '@shared/types';
import { Button, Card, Modal, Table } from '@shared/components';
import { formatCents } from '@/ui/formatMoney';
import { ExpenseCategoryForm } from './ExpenseCategoryForm';
import { ExpenseForm } from './ExpenseForm';

interface SavingSuggestion {
  expenseId: string;
  title: string;
  amountCents: number;
  dueDate: Date;
  monthsUntilDue: number;
  suggestedRateCents: number;
}

interface ReserveSuggestion {
  expenseId: string;
  title: string;
  amountCents: number;
  interval: RecurrenceInterval;
  dueDate: Date;
  monthsUntilDue: number;
  suggestedRateCents: number;
}

export default function ExpensesPage() {
  const { 
    expenseCategories, 
    expenses, 
    goals,
    reserves,
    createExpenseCategory, 
    updateExpenseCategory, 
    deleteExpenseCategory,
    createExpense,
    updateExpense,
    deleteExpense,
    createGoal,
    linkExpenseToGoal,
    createReserve,
    linkExpenseToReserve,
    loadData
  } = useAppStore();

  useEffect(() => {
    if (expenseCategories.length === 0 || expenses.length === 0) {
      loadData();
    }
  }, [expenseCategories.length, expenses.length, loadData]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState<'entries' | 'categories'>('entries');
  const [savingSuggestion, setSavingSuggestion] = useState<SavingSuggestion | null>(null);
  const [reserveSuggestion, setReserveSuggestion] = useState<ReserveSuggestion | null>(null);

  // Category Handlers
  const handleCreateCategory = async (data: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createExpenseCategory(data);
    setIsCategoryModalOpen(false);
  };

  const handleUpdateCategory = async (data: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingCategory) {
      await updateExpenseCategory({ ...data, id: editingCategory.id });
      setEditingCategory(null);
      setIsCategoryModalOpen(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Kategorie wirklich löschen?')) {
      await deleteExpenseCategory(id);
    }
  };

  const openEditCategoryModal = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const NON_MONTHLY_INTERVALS: RecurrenceInterval[] = ['quarterly', 'yearly'];

  // Expense Handlers
  const handleCreateExpense = async (payload: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const expenseId = await createExpense(payload);
    setIsExpenseModalOpen(false);
    setEditingExpense(null);

    const id = expenseId || useAppStore.getState().expenses.slice(-1)[0]?.id;
    if (!id) return;
    const expenseDate = payload.date instanceof Date ? payload.date : new Date(payload.date);
    const now = new Date();
    const monthsDiff =
      (expenseDate.getFullYear() - now.getFullYear()) * 12 +
      (expenseDate.getMonth() - now.getMonth());

    // Recurring non-monthly → suggest Reserve (Sinking Fund)
    if (
      payload.isRecurring &&
      payload.recurrenceInterval &&
      NON_MONTHLY_INTERVALS.includes(payload.recurrenceInterval) &&
      payload.amount >= 5000 // >= 50 EUR
    ) {
      const intervalMonths = payload.recurrenceInterval === 'yearly' ? 12 : 3;
      setReserveSuggestion({
        expenseId: id,
        title: (payload as any).title ?? 'Ausgabe',
        amountCents: payload.amount,
        interval: payload.recurrenceInterval,
        dueDate: expenseDate,
        monthsUntilDue: intervalMonths,
        suggestedRateCents: Math.ceil(payload.amount / intervalMonths),
      });
      return;
    }

    // One-time, high-amount, future → suggest savings Goal
    if (payload.isRecurring) return;
    if (payload.amount < 20000) return;
    if (monthsDiff < 2) return;

    setSavingSuggestion({
      expenseId: id,
      title: (payload as any).title ?? 'Ausgabe',
      amountCents: payload.amount,
      dueDate: expenseDate,
      monthsUntilDue: monthsDiff,
      suggestedRateCents: Math.ceil(payload.amount / monthsDiff),
    });
  };

  const handleAcceptSuggestion = async () => {
    if (!savingSuggestion) return;
    const { expenseId, title, amountCents, dueDate, suggestedRateCents } = savingSuggestion;
    await createGoal({
      name: `Sparen: ${title}`,
      targetAmount: amountCents / 100,
      currentAmount: 0,
      targetDate: dueDate,
      priority: 'high',
      monthlyContributionCents: suggestedRateCents,
      linkedExpenseId: expenseId,
    });
    const createdGoal = useAppStore.getState().goals.find(
      (g) => (g as any).linkedExpenseId === expenseId
    );
    if (createdGoal) {
      linkExpenseToGoal(expenseId, createdGoal.id);
    }
    setSavingSuggestion(null);
  };

  const handleAcceptReserveSuggestion = async () => {
    if (!reserveSuggestion) return;
    const { expenseId, title, amountCents, interval, dueDate, suggestedRateCents } = reserveSuggestion;
    const reserveId = await createReserve({
      name: `Rücklage: ${title}`,
      targetAmountCents: amountCents,
      currentAmountCents: 0,
      monthlyContributionCents: suggestedRateCents,
      interval,
      dueDate,
      linkedExpenseId: expenseId,
    });
    if (reserveId) {
      linkExpenseToReserve(expenseId, reserveId);
    }
    setReserveSuggestion(null);
  };

  const handleUpdateExpense = async (payload: Expense) => {
    await updateExpense(payload);
    setEditingExpense(null);
    setIsExpenseModalOpen(false);
  };

  const handleDeleteExpense = async (id: string) => {
    const expense = expenses.find((e) => e.id === id);
    const linkedGoal = (expense as any)?.linkedGoalId
      ? goals.find((g) => g.id === (expense as any).linkedGoalId)
      : null;
    const linkedReserve = (expense as any)?.linkedReserveId
      ? reserves.find((r) => r.id === (expense as any).linkedReserveId)
      : null;

    let message = 'Ausgabe wirklich löschen?';
    if (linkedGoal) {
      message = `Diese Ausgabe hat ein verknüpftes Sparziel „${linkedGoal.name}". Beides wird gelöscht.\n\nTrotzdem löschen?`;
    } else if (linkedReserve) {
      message = `Diese Ausgabe hat eine verknüpfte Rücklage „${linkedReserve.name}". Beides wird gelöscht.\n\nTrotzdem löschen?`;
    }

    if (!confirm(message)) return;
    await deleteExpense(id);
  };

  const openEditExpenseModal = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const openCreateExpenseModal = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  // Get category name for expense
  const getCategoryName = (categoryId: string) => {
    return expenseCategories.find((cat) => cat.id === categoryId)?.name || 'Unbekannt';
  };

  const getImportanceBadge = (importance: number) => {
    const colors: Record<number, string> = {
      1: 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100',
      2: 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      3: 'bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      4: 'bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      5: 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200',
      6: 'bg-red-600 text-white',
    };
    return colors[importance] || colors[3];
  };

  // Table Columns
  const categoryColumns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Beschreibung', render: (cat: ExpenseCategory) => cat.description || '-' },
    {
      key: 'color',
      label: 'Farbe',
      render: (cat: ExpenseCategory) => (
        <div className="flex items-center gap-2">
          {cat.color && <div className="w-6 h-6 rounded" style={{ backgroundColor: cat.color }} />}
          {cat.color || '-'}
        </div>
      ),
    },
    {
      key: 'importance',
      label: 'Wichtigkeit',
      render: (cat: ExpenseCategory) => (
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getImportanceBadge(cat.importance ?? 3)}`}>
          {cat.importance}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Aktionen',
      render: (cat: ExpenseCategory) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEditCategoryModal(cat)}>
            Bearbeiten
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteCategory(cat.id)}>
            Löschen
          </Button>
        </div>
      ),
    },
  ];

  const expenseColumns = [
    { key: 'date', label: 'Datum', render: (exp: Expense) => format(exp.date, 'dd.MM.yyyy') },
    {
      key: 'title',
      label: 'Titel',
      render: (exp: Expense) => (
        <span className="flex items-center gap-1.5">
          {exp.title}
          {(exp as any).linkedGoalId && (
            <span title={`Verknüpft mit Ziel: ${goals.find((g) => g.id === (exp as any).linkedGoalId)?.name ?? ''}`}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
              Sparziel
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Betrag',
      render: (exp: Expense) => (
        <span className="font-semibold text-danger-600">
          {formatCents(exp.amount)}
        </span>
      )
    },
    { key: 'category', label: 'Kategorie', render: (exp: Expense) => getCategoryName(exp.categoryId) },
    {
      key: 'recurring',
      label: 'Wiederkehrend',
      render: (exp: Expense) => (
        exp.isRecurring ? <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Ja</span> : <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">Nein</span>
      )
    },
    { 
      key: 'importance', 
      label: 'Wichtigkeit', 
      render: (exp: Expense) => (
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getImportanceBadge(exp.importance)}`}>
          {exp.importance}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aktionen',
      render: (exp: Expense) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEditExpenseModal(exp)}>
            Bearbeiten
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteExpense(exp.id)}>
            Löschen
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ausgaben</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Verwaltung von Ausgaben und Kategorien mit Wichtigkeitsskala</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" role="tablist" aria-label="Ausgaben Tabs">
          <button
            onClick={() => setActiveTab('entries')}
            id="expense-tab-entries"
            role="tab"
            aria-selected={activeTab === 'entries'}
            aria-controls="expense-panel-entries"
            tabIndex={activeTab === 'entries' ? 0 : -1}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'entries'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Ausgaben ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            id="expense-tab-categories"
            role="tab"
            aria-selected={activeTab === 'categories'}
            aria-controls="expense-panel-categories"
            tabIndex={activeTab === 'categories' ? 0 : -1}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Kategorien ({expenseCategories.length})
          </button>
        </nav>
      </div>

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <Card 
          title="Ausgaben" 
          actions={
            <Button onClick={openCreateExpenseModal}>
              + Neue Ausgabe
            </Button>
          }
        >
          {/* Desktop: Table */}
          <div className="hidden lg:block">
            <Table
              data={expenses.sort((a, b) => b.date.getTime() - a.date.getTime())}
              columns={expenseColumns}
              emptyMessage="Noch keine Ausgaben vorhanden"
            />
          </div>
          {/* Mobile: Card List */}
          <div className="lg:hidden">
            {expenses.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">Noch keine Ausgaben vorhanden</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {expenses.sort((a, b) => b.date.getTime() - a.date.getTime()).map((exp) => (
                  <div key={exp.id} className="py-3 px-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{exp.title}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                          <span>{format(exp.date, 'dd.MM.yyyy')}</span>
                          <span>·</span>
                          <span>{getCategoryName(exp.categoryId)}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getImportanceBadge(exp.importance)}`}>
                            W{exp.importance}
                          </span>
                          {exp.isRecurring && (
                            <span className="px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-[10px] font-medium">Wdh.</span>
                          )}
                          {(exp as any).linkedGoalId && (
                            <span className="px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-[10px] font-medium">Sparziel</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-danger-600">
                          {formatCents(exp.amount)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => openEditExpenseModal(exp)} className="text-xs text-primary-600 font-medium py-1">Bearbeiten</button>
                      <button onClick={() => handleDeleteExpense(exp.id)} className="text-xs text-danger-600 font-medium py-1">Löschen</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <Card
          title="Ausgaben-Kategorien"
          actions={
            <Button onClick={openCreateCategoryModal}>
              + Neue Kategorie
            </Button>
          }
        >
          {/* Desktop: Table */}
          <div className="hidden lg:block">
            <Table
              data={expenseCategories.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))}
              columns={categoryColumns}
              emptyMessage="Noch keine Kategorien vorhanden"
            />
          </div>
          {/* Mobile: Card List */}
          <div className="lg:hidden">
            {expenseCategories.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">Noch keine Kategorien vorhanden</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {expenseCategories.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0)).map((cat) => (
                  <div key={cat.id} className="py-3 px-1 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {cat.color && <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{cat.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {cat.description && <span className="text-xs text-gray-500 dark:text-gray-400">{cat.description}</span>}
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getImportanceBadge(cat.importance ?? 3)}`}>
                            W{cat.importance ?? 3}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEditCategoryModal(cat)} className="text-xs text-primary-600 font-medium py-1">Bearbeiten</button>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="text-xs text-danger-600 font-medium py-1">Löschen</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        title={editingExpense ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}
      >
        <ExpenseForm
          initialData={editingExpense || undefined}
          categories={expenseCategories}
          onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense}
          onCancel={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
          }}
        />
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
      >
        <ExpenseCategoryForm
          initialData={editingCategory || undefined}
          onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
          onCancel={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
          }}
        />
      </Modal>

      {/* Savings Goal Suggestion Dialog */}
      <Modal
        isOpen={!!savingSuggestion}
        onClose={() => setSavingSuggestion(null)}
        title="Für diese Ausgabe ansparen?"
        size="sm"
      >
        {savingSuggestion && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>„{savingSuggestion.title}"</strong> kostet{' '}
              <strong>{formatCents(savingSuggestion.amountCents)}</strong> und ist am{' '}
              <strong>{format(savingSuggestion.dueDate, 'dd.MM.yyyy')}</strong> fällig.
            </p>
            <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
              <p className="text-sm text-primary-800 dark:text-primary-200">
                Mit einer monatlichen Sparrate von{' '}
                <strong>{formatCents(savingSuggestion.suggestedRateCents)}</strong>{' '}
                kannst du den Betrag in{' '}
                <strong>{savingSuggestion.monthsUntilDue} Monaten</strong> zusammensparen.
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Es wird ein Sparziel erstellt, das mit dieser Ausgabe verknüpft ist.
              Wird die Ausgabe gelöscht, wird auch das Sparziel entfernt.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setSavingSuggestion(null)}>
                Nein danke
              </Button>
              <Button variant="primary" onClick={handleAcceptSuggestion}>
                Sparziel erstellen
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reserve Suggestion Modal */}
      <Modal
        isOpen={!!reserveSuggestion}
        onClose={() => setReserveSuggestion(null)}
        title="Rücklage anlegen?"
      >
        {reserveSuggestion && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>„{reserveSuggestion.title}"</strong> kostet{' '}
              <strong>{formatCents(reserveSuggestion.amountCents)}</strong> und wird{' '}
              <strong>{reserveSuggestion.interval === 'yearly' ? 'jährlich' : 'vierteljährlich'}</strong> fällig.
            </p>
            <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
              <p className="text-sm text-primary-800 dark:text-primary-200">
                Monatliche Rücklage:{' '}
                <strong>{formatCents(reserveSuggestion.suggestedRateCents)}</strong>{' '}
                über <strong>{reserveSuggestion.monthsUntilDue} Monate</strong>
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Die Rücklage wird als monatlicher Pflichtbetrag (Bound) in der Finanzplanung berücksichtigt.
              Die wiederkehrende Ausgabe wird dann nicht mehr separat berechnet — keine Doppelzählung.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setReserveSuggestion(null)}>
                Nein danke
              </Button>
              <Button variant="primary" onClick={handleAcceptReserveSuggestion}>
                Rücklage erstellen
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
