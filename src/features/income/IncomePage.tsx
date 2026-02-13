import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/app/store/useAppStore';
import type { Income, IncomeCategory } from '@shared/types';
import { Button, Card, Modal, Table } from '@shared/components';
import { IncomeCategoryForm } from './IncomeCategoryForm';
import { IncomeForm } from './IncomeForm';

export default function IncomePage() {
    // incomeColumns: define here so it is available for Table
    const incomeColumns = [
      { key: 'date', label: 'Datum', render: (inc: Income) => format(inc.date, 'dd.MM.yyyy') },
      { key: 'title', label: 'Titel' },
      {
        key: 'amount',
        label: 'Betrag',
        render: (inc: Income) => {
          const euros = inc.amount / 100;
          return (
            <span className="font-semibold text-success-600">
              {euros.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          );
        }
      },
      { key: 'category', label: 'Kategorie', render: (inc: Income) => getCategoryName(inc.categoryId) },
      {
        key: 'recurring',
        label: 'Wiederkehrend',
        render: (inc: Income) => (
          <span className={`px-2 py-1 text-xs rounded-full ${inc.isRecurring ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
            {inc.isRecurring ? 'Ja' : 'Nein'}
          </span>
        )
      },
      {
        key: 'actions',
        label: 'Aktionen',
        render: (inc: Income) => (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => openEditIncomeModal(inc)}>
              Bearbeiten
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleDeleteIncome(inc.id)}>
              Löschen
            </Button>
          </div>
        )
      }
    ];
  const { 
    incomeCategories, 
    incomes, 
    createIncomeCategory, 
    updateIncomeCategory, 
    deleteIncomeCategory,
    createIncome,
    updateIncome,
    deleteIncome,
    loadData
  } = useAppStore();


  useEffect(() => {
    if (incomeCategories.length === 0 || incomes.length === 0) {
      loadData();
    }
  }, [incomeCategories.length, incomes.length, loadData]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<IncomeCategory | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [activeTab, setActiveTab] = useState<'entries' | 'categories'>('entries');

  // Category Handlers
  const handleCreateCategory = async () => {
    await createIncomeCategory();
    setIsCategoryModalOpen(false);
  };

  const handleUpdateCategory = async () => {
    if (editingCategory) {
      await updateIncomeCategory();
      setEditingCategory(null);
      setIsCategoryModalOpen(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (confirm('Kategorie wirklich löschen?')) {
      await deleteIncomeCategory();
    }
  };

  const openEditCategoryModal = (category: IncomeCategory) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  // Income Handlers
  const handleCreateIncome = async (payload: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createIncome(payload);
    setIsIncomeModalOpen(false);
  };

  const handleUpdateIncome = async (payload: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingIncome) return;
    await updateIncome({ ...payload, id: editingIncome.id });
    setEditingIncome(null);
    setIsIncomeModalOpen(false);
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (confirm('Einnahme wirklich löschen?')) {
      await deleteIncome(incomeId);
    }
  };

  const openEditIncomeModal = (income: Income) => {
    setEditingIncome(income);
    setIsIncomeModalOpen(true);
  };

  const openCreateIncomeModal = async () => {
    if (incomeCategories.length === 0) {
      await createIncomeCategory();
    }
    setEditingIncome(null);
    setIsIncomeModalOpen(true);
  };

  // Get category name for income
  const getCategoryName = (categoryId: string) => {
    return incomeCategories.find((cat) => cat.id === categoryId)?.name || 'Unbekannt';
  };

  // Table Columns
  const categoryColumns = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Beschreibung', render: (cat: IncomeCategory) => cat.description || '-' },
    {
      key: 'color',
      label: 'Farbe',
      render: (cat: IncomeCategory) => (
        <div className="flex items-center gap-2">
          {cat.color && <div className="w-6 h-6 rounded" style={{ backgroundColor: cat.color }} />}
          {cat.color || '-'}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Einkommen</h1>
          <p className="text-gray-600 mt-1">Verwaltung von Einnahmen und Kategorien</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" role="tablist" aria-label="Einnahmen Tabs">
          <button
            onClick={() => setActiveTab('entries')}
            id="income-tab-entries"
            role="tab"
            aria-selected={activeTab === 'entries'}
            aria-controls="income-panel-entries"
            tabIndex={activeTab === 'entries' ? 0 : -1}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'entries'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Einnahmen ({incomes.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            id="income-tab-categories"
            role="tab"
            aria-selected={activeTab === 'categories'}
            aria-controls="income-panel-categories"
            tabIndex={activeTab === 'categories' ? 0 : -1}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Kategorien ({incomeCategories.length})
          </button>
        </nav>
      </div>

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <Card 
          title="Einnahmen" 
          actions={
            <Button onClick={openCreateIncomeModal}>
              + Neue Einnahme
            </Button>
          }
        >
          <Table
            data={incomes.sort((a, b) => b.date.getTime() - a.date.getTime())}
            columns={incomeColumns}
            emptyMessage="Noch keine Einnahmen vorhanden"
          />
        </Card>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <Card
          title="Einnahme-Kategorien"
          actions={
            <Button onClick={openCreateCategoryModal}>
              + Neue Kategorie
            </Button>
          }
        >
          <Table
            data={incomeCategories}
            columns={categoryColumns}
            emptyMessage="Noch keine Kategorien vorhanden"
          />
        </Card>
      )}

      {/* Income Modal */}
      <Modal
        isOpen={isIncomeModalOpen}
        onClose={() => {
          setIsIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        title={editingIncome ? 'Einnahme bearbeiten' : 'Neue Einnahme'}
      >
        <IncomeForm
          initialData={editingIncome || undefined}
          categories={incomeCategories}
          onSubmit={editingIncome ? handleUpdateIncome : handleCreateIncome}
          onCancel={() => {
            setIsIncomeModalOpen(false);
            setEditingIncome(null);
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
        <IncomeCategoryForm
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
