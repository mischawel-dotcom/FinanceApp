import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/app/store/useAppStore';
import type { Expense, ExpenseCategory } from '@shared/types';
import { Button, Card, Modal, Table } from '@shared/components';
import { ExpenseCategoryForm } from './ExpenseCategoryForm';
import { ExpenseForm } from './ExpenseForm';

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
  const handleCreateExpense = async () => {
    await createExpense();
    setIsExpenseModalOpen(false);
  };

  const handleUpdateExpense = async () => {
    if (editingExpense) {
      await updateExpense();
      setEditingExpense(null);
      setIsExpenseModalOpen(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (confirm('Ausgabe wirklich löschen?')) {
      await deleteExpense();
    }
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
      1: 'bg-gray-200 text-gray-800',
      2: 'bg-blue-200 text-blue-800',
      3: 'bg-yellow-200 text-yellow-800',
      4: 'bg-orange-200 text-orange-800',
      5: 'bg-red-200 text-red-800',
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
          {exp.amount.toFixed(2)} €
        </span>
      )
    },
    { key: 'category', label: 'Kategorie', render: (exp: Expense) => getCategoryName(exp.categoryId) },
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
          <Button size="sm" variant="danger" onClick={handleDeleteExpense}>
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
          <h1 className="text-3xl font-bold text-gray-900">Ausgaben</h1>
          <p className="text-gray-600 mt-1">Verwaltung von Ausgaben und Kategorien mit Wichtigkeitsskala</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
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
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          <Table
            data={expenses.sort((a, b) => b.date.getTime() - a.date.getTime())}
            columns={expenseColumns}
            emptyMessage="Noch keine Ausgaben vorhanden"
          />
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
          <Table
            data={expenseCategories.sort((a, b) => b.importance - a.importance)}
            columns={categoryColumns}
            emptyMessage="Noch keine Kategorien vorhanden"
          />
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
