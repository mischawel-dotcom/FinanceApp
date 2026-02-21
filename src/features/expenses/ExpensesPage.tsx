import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/app/store/useAppStore';
import type { Expense, ExpenseCategory } from '@shared/types';
import { Button, Card, Modal, Table } from '@shared/components';
import { formatCents } from '@/ui/formatMoney';
import { ExpenseCategoryForm } from './ExpenseCategoryForm';
import { ExpenseForm } from './ExpenseForm';
// Patch: ExpenseForm now accepts onSubmit: (data: any) => void

export default function ExpensesPage() {
  const { 
    expenseCategories, 
    expenses, 
    createExpenseCategory, 
    updateExpenseCategory, 
    deleteExpenseCategory,
    createExpense,
    updateExpense,
    deleteExpense,
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

  // Category Handlers
  const handleCreateCategory = async () => {
    await createExpenseCategory();
    setIsCategoryModalOpen(false);
  };

  const handleUpdateCategory = async () => {
    if (editingCategory) {
      await updateExpenseCategory();
      setEditingCategory(null);
      setIsCategoryModalOpen(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (confirm('Kategorie wirklich löschen?')) {
      await deleteExpenseCategory();
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

  // Expense Handlers
  const handleCreateExpense = async (payload: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createExpense(payload);
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const handleUpdateExpense = async (payload: Expense) => {
    await updateExpense(payload);
    setEditingExpense(null);
    setIsExpenseModalOpen(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Ausgabe wirklich löschen?')) return;
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
          <Button size="sm" variant="danger" onClick={handleDeleteCategory}>
            Löschen
          </Button>
        </div>
      ),
    },
  ];

  const expenseColumns = [
    { key: 'date', label: 'Datum', render: (exp: Expense) => format(exp.date, 'dd.MM.yyyy') },
    { key: 'title', label: 'Titel' },
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
              data={expenseCategories.sort((a, b) => b.importance - a.importance)}
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
                {expenseCategories.sort((a, b) => b.importance - a.importance).map((cat) => (
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
                      <button onClick={handleDeleteCategory} className="text-xs text-danger-600 font-medium py-1">Löschen</button>
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
    </div>
  );
}
