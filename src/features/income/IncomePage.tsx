import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/app/store/useAppStore';
import type { Income, IncomeCategory } from '@shared/types';
import { Button, Card, Modal } from '@shared/components';
import { IncomeCategoryForm } from './IncomeCategoryForm';
import { IncomeForm } from './IncomeForm';
import { formatCents } from '@/ui/formatMoney';

export default function IncomePage() {
  const { 
    incomeCategories, 
    incomes, 
    createIncomeCategory, 
    updateIncomeCategory, 
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

  const getCategoryName = (categoryId: string) => {
    return incomeCategories.find((cat) => cat.id === categoryId)?.name || 'Unbekannt';
  };

  const sortedIncomes = useMemo(() =>
    [...incomes].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [incomes]
  );

  const totalMonthlyCents = useMemo(() =>
    incomes.filter((i) => i.isRecurring).reduce((sum, i) => sum + i.amount, 0),
    [incomes]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Einkommen</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verwaltung von Einnahmen und Kategorien</p>
        </div>
        <Button variant="primary" onClick={openCreateIncomeModal}>
          + Einnahme
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
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
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
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
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Kategorien ({incomeCategories.length})
          </button>
        </nav>
      </div>

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <>
          {totalMonthlyCents > 0 && (
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Wiederkehrende Einnahmen gesamt</span>
                <span className="text-lg font-bold text-success-600">{formatCents(totalMonthlyCents)}</span>
              </div>
            </Card>
          )}

          {sortedIncomes.length === 0 ? (
            <Card>
              <div className="text-center py-12 space-y-4">
                <div className="text-5xl">💰</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Noch keine Einnahmen</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Erfasse deine Einnahmen — z.B. Gehalt, Nebeneinkünfte, Mieteinnahmen.
                  </p>
                </div>
                <Button variant="primary" onClick={openCreateIncomeModal}>Erste Einnahme anlegen</Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedIncomes.map((inc) => (
                <Card key={inc.id} className="flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{inc.title}</h3>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => openEditIncomeModal(inc)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded transition-colors"
                        title="Bearbeiten"
                      >✏️</button>
                      <button
                        onClick={() => handleDeleteIncome(inc.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                        title="Löschen"
                      >🗑️</button>
                    </div>
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Betrag</span>
                      <span className="font-semibold text-success-600">{formatCents(inc.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Kategorie</span>
                      <span className="font-medium text-gray-900 dark:text-white">{getCategoryName(inc.categoryId)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Datum</span>
                      <span className="font-medium text-gray-900 dark:text-white">{format(inc.date, 'dd.MM.yyyy')}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                      <span className="text-gray-500 dark:text-gray-400">Wiederkehrend</span>
                      {inc.isRecurring ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">Ja</span>
                      ) : (
                        <span className="font-medium text-gray-400 dark:text-gray-500">Nein</span>
                      )}
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
          {incomeCategories.length === 0 ? (
            <Card>
              <div className="text-center py-12 space-y-4">
                <div className="text-5xl">📂</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Noch keine Kategorien</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Erstelle Kategorien für deine Einnahmen.</p>
                </div>
                <Button variant="primary" onClick={openCreateCategoryModal}>Erste Kategorie anlegen</Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {incomeCategories.map((cat) => (
                <Card key={cat.id} className="flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {cat.color && <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{cat.name}</h3>
                    </div>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{cat.description}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
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
