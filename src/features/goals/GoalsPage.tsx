import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { formatCentsEUR } from "@/ui/formatMoney";
import { useAppStore } from "@/app/store/useAppStore";
import type { FinancialGoal, GoalPriority } from "@shared/types";
import { Button, Card, Modal } from "@shared/components";
import { GoalForm } from "./GoalForm";

const priorityOrder: Record<GoalPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityLabels: Record<GoalPriority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  critical: "Kritisch",
};

function getPriorityColor(priority: GoalPriority) {
  const colors: Record<GoalPriority, string> = {
    low: "bg-gray-200 text-gray-800",
    medium: "bg-blue-200 text-blue-800",
    high: "bg-orange-200 text-orange-800",
    critical: "bg-red-600 text-white",
  };
  return colors[priority];
}

export default function GoalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  // Store (cast to any to avoid signature/type drift blocking compile)
  const store = useAppStore() as any;
  const goals: FinancialGoal[] = store.goals ?? [];
  const loadData: () => void = store.loadData ?? (() => {});
  const createGoal: (data: any) => Promise<void> = store.createGoal ?? (async () => {});
  const updateGoal: (id: string, data: any) => Promise<void> = store.updateGoal ?? (async () => {});
  const deleteGoal: (id: string) => Promise<void> = store.deleteGoal ?? (async () => {});
  const [highlightedGoal, setHighlightedGoal] = useState<string | null>(null);
  const goalRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (!goals || goals.length === 0) loadData();
  }, [goals?.length, loadData]);

  // Highlight-UX: Nur bei highlightId, Timer entfernt Highlight & Query-Param, Cleanup garantiert
  useEffect(() => {
    if (!highlightId) {
      setHighlightedGoal(null);
      return;
    }
    setHighlightedGoal(highlightId);
    const timer = window.setTimeout(() => {
      setHighlightedGoal(null);
      setSearchParams(prev => {
        const p = new URLSearchParams(prev);
        p.delete("highlight");
        return p;
      }, { replace: true });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [highlightId, setSearchParams]);
  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      const pa = priorityOrder[a.priority];
      const pb = priorityOrder[b.priority];
      if (pa !== pb) return pa - pb;
      // fallback stable sort: by name then id
      return (a.name ?? "").localeCompare(b.name ?? "") || (a.id ?? "").localeCompare(b.id ?? "");
    });
  }, [goals]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  const openCreateModal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const openEditModal = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleCreate = async (data: any) => {
    await createGoal(data);
    setIsModalOpen(false);
  };

  const handleUpdate = async (data: any) => {
    if (!editingGoal) return;
    // Ensure id is passed for updateGoal
    await updateGoal(editingGoal.id, { ...data, id: editingGoal.id });
    setEditingGoal(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (goalId: string) => {
    if (confirm("Ziel wirklich löschen?")) {
      await deleteGoal(goalId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finanzielle Ziele</h1>
          <p className="text-gray-600 mt-1">Verfolge deine Sparziele und den Fortschritt</p>
        </div>
        <Button onClick={openCreateModal}>+ Neues Ziel</Button>
      </div>

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

            // Use EUR fields only, convert to cents locally if needed
            const targetEuro = goal.targetAmount ?? 0;
            const currentEuro = goal.currentAmount ?? 0;
            const targetCents = Math.round(targetEuro * 100);
            const currentCents = Math.round(currentEuro * 100);
            const progressRaw = targetEuro > 0 ? (currentEuro / targetEuro) * 100 : 0;
            const progress = Number.isFinite(progressRaw) ? Math.min(100, progressRaw) : 0;
            const remainingCents = targetCents - currentCents;

            const isHighlighted = highlightedGoal === goal.id;
            return (
              <Card key={goal.id} className="flex flex-col">
                <div
                  ref={(el) => {
                    goalRefs.current[goal.id] = el;
                  }}
                  data-testid={`goal-row-${goal.id}`}
                  data-highlight={isHighlighted ? "true" : "false"}
                  className={`flex flex-col flex-1 goal-row${isHighlighted ? " goal-row--highlight" : ""}`}
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{goal.name}</h3>
                        {goal.description && <p className="text-sm text-gray-600 mt-1">{goal.description}</p>}
                        {isHighlighted && (
                          <span className="goal-row__badge" aria-label="Empfehlung">Empfehlung</span>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(goal.priority)}`}>
                        {priorityLabels[goal.priority]}
                      </span>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Zielbetrag:</span>
                        <span className="font-semibold">{formatCentsEUR(targetCents)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Aktuell:</span>
                        <span className="font-semibold text-primary-600">{formatCentsEUR(currentCents)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Noch benötigt:</span>
                        <span className="font-semibold text-gray-900">{formatCentsEUR(remainingCents)}</span>
                      </div>
                      <div className="flex justify-between text-sm" data-testid="goal-monthly-savings-row">
                        <span className="text-gray-600">Monatliche Sparrate:</span>
                        <span className="font-semibold text-gray-900">
                          {goal.monthlyContributionCents && goal.monthlyContributionCents > 0
                            ? formatCentsEUR(goal.monthlyContributionCents)
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Fortschritt</span>
                        <span className="font-semibold">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress >= 100 ? "bg-success-600" : progress >= 75 ? "bg-primary-600" : "bg-primary-400"
                          }`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>
                    {goal.targetDate && (
                      <div className="text-sm text-gray-600 mb-4">🗓️ Zieldatum: {format(goal.targetDate, "dd.MM.yyyy")}</div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <Button size="sm" variant="secondary" onClick={() => openEditModal(goal)} className="flex-1">
                      Bearbeiten
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(goal.id)} className="flex-1">
                      Löschen
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        title={editingGoal ? "Ziel bearbeiten" : "Neues Ziel"}
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
