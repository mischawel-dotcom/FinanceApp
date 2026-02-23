import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/app/store/useAppStore';
import type { Expense, ExpenseCategory, RecurrenceInterval } from '@shared/types';
import { Button, Card, Modal } from '@shared/components';
import { formatCents } from '@/ui/formatMoney';
import { ExpenseCategoryForm } from './ExpenseCategoryForm';
import { ExpenseForm } from './ExpenseForm';

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

  const NON_MONTHLY_INTERVALS: RecurrenceInterval[] = ['quarterly', 'half-yearly', 'yearly'];

  const unlinkedNonMonthlyExpenses = expenses.filter((e: any) =>
    e.isRecurring &&
    e.recurrenceInterval &&
    NON_MONTHLY_INTERVALS.includes(e.recurrenceInterval) &&
    !e.linkedReserveId
  );

  const unlinkedOnetimeExpenses = expenses.filter((e: any) =>
    !e.isRecurring &&
    !e.linkedReserveId &&
    !e.linkedGoalId &&
    e.date && new Date(e.date) > new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
  );

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

    // Recurring non-monthly → suggest Reserve with recurring interval
    if (
      payload.isRecurring &&
      payload.recurrenceInterval &&
      NON_MONTHLY_INTERVALS.includes(payload.recurrenceInterval) &&
      payload.amount >= 5000
    ) {
      const intervalMonths = payload.recurrenceInterval === 'yearly' ? 12 : payload.recurrenceInterval === 'half-yearly' ? 6 : 3;
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

    // One-time future expense (>= 2 months away, >= 50 EUR) → suggest Reserve with interval 'once'
    if (!payload.isRecurring && payload.amount >= 5000 && monthsDiff >= 2) {
      setReserveSuggestion({
        expenseId: id,
        title: (payload as any).title ?? 'Ausgabe',
        amountCents: payload.amount,
        interval: 'once' as RecurrenceInterval,
        dueDate: expenseDate,
        monthsUntilDue: monthsDiff,
        suggestedRateCents: Math.ceil(payload.amount / monthsDiff),
      });
      return;
    }
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

  const sortedExpenses = useMemo(() =>
    [...expenses].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [expenses]
  );

  const sortedCategories = useMemo(() =>
    [...expenseCategories].sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0)),
    [expenseCategories]
  );

  const totalMonthlyCents = useMemo(() =>
    expenses.filter((e) => e.isRecurring && (!e.recurrenceInterval || e.recurrenceInterval === 'monthly'))
      .reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const getRecurrenceLabel = (exp: Expense) => {
    if (!exp.isRecurring) return null;
    switch (exp.recurrenceInterval) {
      case 'quarterly': return 'Vierteljährlich';
      case 'half-yearly': return 'Halbjährlich';
      case 'yearly': return 'Jährlich';
      default: return 'Monatlich';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Ausgaben</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verwaltung von Ausgaben und Kategorien</p>
        </div>
        {activeTab === 'entries' ? (
          <Button variant="primary" onClick={openCreateExpenseModal}>
            + Ausgabe
          </Button>
        ) : (
          <Button variant="primary" onClick={openCreateCategoryModal}>
            + Kategorie
          </Button>
        )}
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

      {/* Warning: unlinked expenses without reserve */}
      {(unlinkedNonMonthlyExpenses.length > 0 || unlinkedOnetimeExpenses.length > 0) && activeTab === 'entries' && (
        <Card>
          <div className="flex items-start gap-3 p-1">
            <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠</span>
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Ausgaben ohne verknüpfte Rücklage
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                Ohne Verknüpfung wird der volle Betrag im Fälligkeitsmonat abgezogen.
                Verknüpfe sie auf der <a href="/reserves" className="underline text-primary-600 dark:text-primary-400 hover:text-primary-500">Rücklagen-Seite</a>.
              </p>
              <ul className="mt-2 space-y-1">
                {unlinkedNonMonthlyExpenses.map((e: any) => (
                  <li key={e.id} className="text-xs text-gray-600 dark:text-gray-400">
                    · {e.title} ({formatCents(e.amount)}, {e.recurrenceInterval === 'yearly' ? 'jährlich' : e.recurrenceInterval === 'half-yearly' ? 'halbjährlich' : 'vierteljährlich'})
                  </li>
                ))}
                {unlinkedOnetimeExpenses.map((e: any) => (
                  <li key={e.id} className="text-xs text-gray-600 dark:text-gray-400">
                    · {e.title} ({formatCents(e.amount)}, einmalig am {format(new Date(e.date), 'dd.MM.yyyy')})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <>
          {totalMonthlyCents > 0 && (
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Monatliche Fixkosten gesamt</span>
                <span className="text-lg font-bold text-danger-600">{formatCents(totalMonthlyCents)}</span>
              </div>
            </Card>
          )}

          {sortedExpenses.length === 0 ? (
            <Card>
              <div className="text-center py-12 space-y-4">
                <div className="text-5xl">📋</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Noch keine Ausgaben</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Erfasse deine Ausgaben — z.B. Miete, Versicherungen, Abonnements.
                  </p>
                </div>
                <Button variant="primary" onClick={openCreateExpenseModal}>Erste Ausgabe anlegen</Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedExpenses.map((exp) => (
                <Card key={exp.id} className="flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{exp.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {(exp as any).linkedGoalId && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                            Sparziel
                          </span>
                        )}
                        {(exp as any).linkedReserveId && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                            Rücklage
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => openEditExpenseModal(exp)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded transition-colors"
                        title="Bearbeiten"
                      >✏️</button>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                        title="Löschen"
                      >🗑️</button>
                    </div>
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Betrag</span>
                      <span className="font-semibold text-danger-600">{formatCents(exp.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Kategorie</span>
                      <span className="font-medium text-gray-900 dark:text-white">{getCategoryName(exp.categoryId)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Datum</span>
                      <span className="font-medium text-gray-900 dark:text-white">{format(exp.date, 'dd.MM.yyyy')}</span>
                    </div>

                    <div className="flex justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                      <span className="text-gray-500 dark:text-gray-400">Wiederkehrend</span>
                      {exp.isRecurring ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">
                          {getRecurrenceLabel(exp)}
                        </span>
                      ) : (
                        <span className="font-medium text-gray-400 dark:text-gray-500">Nein</span>
                      )}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Wichtigkeit</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getImportanceBadge(exp.importance)}`}>
                        {exp.importance}/6
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <>
          {sortedCategories.length === 0 ? (
            <Card>
              <div className="text-center py-12 space-y-4">
                <div className="text-5xl">📂</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Noch keine Kategorien</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Erstelle Kategorien für deine Ausgaben.</p>
                </div>
                <Button variant="primary" onClick={openCreateCategoryModal}>Erste Kategorie anlegen</Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedCategories.map((cat) => (
                <Card key={cat.id} className="flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {cat.color && <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{cat.name}</h3>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => openEditCategoryModal(cat)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded transition-colors"
                        title="Bearbeiten"
                      >✏️</button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                        title="Löschen"
                      >🗑️</button>
                    </div>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{cat.description}</p>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Wichtigkeit</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getImportanceBadge(cat.importance ?? 3)}`}>
                      {cat.importance ?? 3}/6
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
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
              <strong>{formatCents(reserveSuggestion.amountCents)}</strong>
              {reserveSuggestion.interval === 'once'
                ? <> und ist am <strong>{format(reserveSuggestion.dueDate, 'dd.MM.yyyy')}</strong> fällig.</>
                : <> und wird <strong>{reserveSuggestion.interval === 'yearly' ? 'jährlich' : reserveSuggestion.interval === 'half-yearly' ? 'halbjährlich' : 'vierteljährlich'}</strong> fällig.</>
              }
            </p>
            <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
              <p className="text-sm text-primary-800 dark:text-primary-200">
                Monatliche Rücklage:{' '}
                <strong>{formatCents(reserveSuggestion.suggestedRateCents)}</strong>{' '}
                über <strong>{reserveSuggestion.monthsUntilDue} Monate</strong>
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Die Rücklage wird als monatlicher Pflichtbetrag (Gebunden) in der Finanzplanung berücksichtigt.
              Die Ausgabe wird dann nicht mehr separat berechnet — keine Doppelzählung.
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
