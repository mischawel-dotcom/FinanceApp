import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/app/store/useAppStore';
import type { FinancialGoal, GoalPriority } from '@shared/types';
import { Button, Card, Modal } from '@shared/components';
import { GoalForm } from './GoalForm';

export default function GoalsPage() {
  const { goals, createGoal, updateGoal, deleteGoal, loadData } = useAppStore();
  
  useEffect(() => {
    if (goals.length === 0) {
      loadData();
    }
  }, [goals.length, loadData]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  const handleCreate = async () => {
    await createGoal();
    setIsModalOpen(false);
  };

  const handleUpdate = async () => {
    if (editingGoal) {
      await updateGoal();
      setEditingGoal(null);
      setIsModalOpen(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Ziel wirklich löschen?')) {
      await deleteGoal();
    }
  };

  const openEditModal = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const getPriorityColor = (priority: GoalPriority) => {
    const colors: Record<GoalPriority, string> = {
      low: 'bg-gray-200 text-gray-800',
      medium: 'bg-blue-200 text-blue-800',
      high: 'bg-orange-200 text-orange-800',
      critical: 'bg-red-600 text-white',
    };
    return colors[priority];
  };

  const getPriorityLabel = (priority: GoalPriority) => {
    const labels: Record<GoalPriority, string> = {
      low: 'Niedrig',
      medium: 'Mittel',
      high: 'Hoch',
      critical: 'Kritisch',
    };
    return labels[priority];
  };

  const sortedGoals = [...goals].sort((a, b) => {
    // Sort by priority first
    const priorityOrder: Record<import('@shared/types').GoalPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority as import('@shared/types').GoalPriority] - priorityOrder[b.priority as import('@shared/types').GoalPriority];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finanzielle Ziele</h1>
          <p className="text-gray-600 mt-1">Verfolge deine Sparziele und den Fortschritt</p>
        </div>
        <Button onClick={openCreateModal}>
          + Neues Ziel
        </Button>
      </div>

      {/* Goals Grid */}
      {sortedGoals.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Noch keine Ziele definiert</p>
            <Button onClick={openCreateModal}>Erstes Ziel erstellen</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedGoals.map((goal) => {
            const progress = goal.targetAmount > 0
              ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
              : 0;
            const remaining = goal.targetAmount - goal.currentAmount;

            return (
              <Card key={goal.id} className="flex flex-col">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{goal.name}</h3>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(goal.priority)}`}>
                      {getPriorityLabel(goal.priority)}
                    </span>
                  </div>

                  {/* Amount Info */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Zielbetrag:</span>
                      <span className="font-semibold">{goal.targetAmount.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Aktuell:</span>
                      <span className="font-semibold text-primary-600">{goal.currentAmount.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Noch benötigt:</span>
                      <span className="font-semibold text-gray-900">{remaining.toFixed(2)} €</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Fortschritt</span>
                      <span className="font-semibold">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progress >= 100 ? 'bg-success-600' : progress >= 75 ? 'bg-primary-600' : 'bg-primary-400'
                        }`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>

                  {/* Target Date */}
                  {goal.targetDate && (
                    <div className="text-sm text-gray-600 mb-4">
                      🗓️ Zieldatum: {format(goal.targetDate, 'dd.MM.yyyy')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <Button size="sm" variant="secondary" onClick={() => openEditModal(goal)} className="flex-1">
                    Bearbeiten
                  </Button>
                  <Button size="sm" variant="danger" onClick={handleDelete} className="flex-1">
                    Löschen
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        title={editingGoal ? 'Ziel bearbeiten' : 'Neues Ziel'}
        size="lg"
      >
        <GoalForm
          initialData={editingGoal || undefined}
          onSubmit={editingGoal ? handleUpdate : handleCreate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingGoal(null);
          }}
        />
      </Modal>
    </div>
  );
}
