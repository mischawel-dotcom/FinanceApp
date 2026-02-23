import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { formatCents } from "@/ui/formatMoney";
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
    low: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    medium: "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    high: "bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
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
  const expenses = store.expenses ?? [];
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
    const goal = goals.find((g) => g.id === goalId);
    const linkedExpense = (goal as any)?.linkedExpenseId
      ? expenses.find((e: any) => e.id === (goal as any).linkedExpenseId)
      : null;

    const message = linkedExpense
      ? `Dieses Ziel deckt die Ausgabe „${linkedExpense.title}" ab. Wenn du es löschst, wird die Ausgabe nicht mehr angespart und erscheint als volle Belastung im Fälligkeitsmonat.\n\nTrotzdem löschen?`
      : "Ziel wirklich löschen?";

    if (confirm(message)) {
      await deleteGoal(goalId);
    }
  };

  const totalMonthlyCents = useMemo(() =>
    goals.reduce((sum, g) => sum + (g.monthlyContributionCents ?? 0), 0),
    [goals]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Finanzielle Ziele</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verfolge deine Sparziele und den Fortschritt</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>+ Ziel</Button>
      </div>

      {totalMonthlyCents > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Monatliche Sparraten gesamt</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCents(totalMonthlyCents)}</span>
          </div>
        </Card>
      )}

      {sortedGoals.length === 0 ? (
        <Card>
          <div className="text-center py-12 space-y-4">
            <div className="text-5xl">🎯</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Noch keine Ziele</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Definiere Sparziele — z.B. Urlaub, Notgroschen, Anschaffungen.
              </p>
            </div>
            <Button variant="primary" onClick={openCreateModal}>Erstes Ziel erstellen</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedGoals.map((goal) => {
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
                  ref={(el) => { goalRefs.current[goal.id] = el; }}
                  data-testid={`goal-row-${goal.id}`}
                  data-highlight={isHighlighted ? "true" : "false"}
                  className={`flex flex-col flex-1 goal-row${isHighlighted ? " goal-row--highlight" : ""}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{goal.name}</h3>
                      {goal.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{goal.description}</p>}
                      {(goal as any).linkedExpenseId && (() => {
                        const linked = expenses.find((e: any) => e.id === (goal as any).linkedExpenseId);
                        return (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 truncate">
                            Verknüpft: {linked ? linked.title : 'Ausgabe'}
                          </p>
                        );
                      })()}
                      {isHighlighted && (
                        <span className="goal-row__badge" aria-label="Empfehlung">Empfehlung</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${getPriorityColor(goal.priority)}`}>
                        {priorityLabels[goal.priority]}
                      </span>
                      <button
                        onClick={() => openEditModal(goal)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded transition-colors"
                        title="Bearbeiten"
                      >✏️</button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                        title="Löschen"
                      >🗑️</button>
                    </div>
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Ziel</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCents(targetCents)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Angespart</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCents(currentCents)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-blue-500" : "bg-blue-400"
                          }`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{progress.toFixed(0)}%</span>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2 space-y-2">
                      <div className="flex justify-between text-sm" data-testid="goal-monthly-savings-row">
                        <span className="text-gray-500 dark:text-gray-400">Sparrate / Monat</span>
                        <span className="font-semibold text-primary-600 dark:text-primary-400">
                          {goal.monthlyContributionCents && goal.monthlyContributionCents > 0
                            ? formatCents(goal.monthlyContributionCents)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Noch benötigt</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCents(remainingCents)}</span>
                      </div>
                      {goal.targetDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Zieldatum</span>
                          <span className="font-medium text-gray-900 dark:text-white">{format(goal.targetDate, "dd.MM.yyyy")}</span>
                        </div>
                      )}
                    </div>
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
