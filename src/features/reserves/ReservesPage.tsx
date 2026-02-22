import { useState, useMemo } from 'react';
import { useAppStore } from '@/app/store/useAppStore';
import { Button, Card, Modal } from '@shared/components';
import { ReserveForm } from './ReserveForm';
import { formatCents } from '@/ui/formatMoney';
import type { Reserve } from '@shared/types';

export default function ReservesPage() {
  const reserves = useAppStore((s) => s.reserves);
  const expenses = useAppStore((s) => s.expenses);
  const createReserve = useAppStore((s) => s.createReserve);
  const updateReserve = useAppStore((s) => s.updateReserve);
  const deleteReserve = useAppStore((s) => s.deleteReserve);

  const [isCreating, setIsCreating] = useState(false);
  const [editingReserve, setEditingReserve] = useState<Reserve | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reserve | null>(null);

  const sortedReserves = useMemo(() =>
    [...reserves].sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }),
    [reserves]
  );

  const totalMonthlyCents = useMemo(() =>
    reserves.reduce((sum, r) => sum + (r.monthlyContributionCents || 0), 0),
    [reserves]
  );

  const handleCreate = async (data: Omit<Reserve, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createReserve(data);
    setIsCreating(false);
  };

  const handleUpdate = async (data: Omit<Reserve, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingReserve) return;
    await updateReserve({ ...data, id: editingReserve.id });
    setEditingReserve(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteReserve(deleteTarget.id);
    setDeleteTarget(null);
  };

  const getLinkedExpenseName = (linkedExpenseId?: string) => {
    if (!linkedExpenseId) return null;
    const expense = expenses.find((e: any) => e.id === linkedExpenseId);
    return expense ? (expense as any).title : null;
  };

  const getProgress = (r: Reserve) => {
    if (r.targetAmountCents <= 0) return 0;
    return Math.min(100, (r.currentAmountCents / r.targetAmountCents) * 100);
  };

  const getMonthsLeft = (r: Reserve) => {
    if (!r.dueDate) return null;
    const now = new Date();
    const due = new Date(r.dueDate);
    return Math.max(0, (due.getFullYear() - now.getFullYear()) * 12 + (due.getMonth() - now.getMonth()));
  };

  const getStatusColor = (r: Reserve) => {
    const months = getMonthsLeft(r);
    if (months === null) return 'text-gray-500';
    if (months <= 1) return 'text-red-600 dark:text-red-400';
    if (months <= 3) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Rücklagen</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Wiederkehrende Verpflichtungen monatlich ansparen
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreating(true)}>
          + Rücklage
        </Button>
      </div>

      {totalMonthlyCents > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Monatliche Rücklagen gesamt</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCents(totalMonthlyCents)}</span>
          </div>
        </Card>
      )}

      {sortedReserves.length === 0 && !isCreating ? (
        <Card>
          <div className="text-center py-12 space-y-4">
            <div className="text-5xl">🏦</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Noch keine Rücklagen</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Legen Sie Rücklagen für wiederkehrende Zahlungen an — z.B. Versicherungen, GEZ, Kfz-Steuer.
              </p>
            </div>
            <Button variant="primary" onClick={() => setIsCreating(true)}>Erste Rücklage anlegen</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedReserves.map((reserve) => {
            const progress = getProgress(reserve);
            const monthsLeft = getMonthsLeft(reserve);
            const linkedName = getLinkedExpenseName(reserve.linkedExpenseId);

            return (
              <Card key={reserve.id} className="flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{reserve.name}</h3>
                    {linkedName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">Verknüpft: {linkedName}</p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => setEditingReserve(reserve)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded transition-colors"
                      title="Bearbeiten"
                    >✏️</button>
                    <button
                      onClick={() => setDeleteTarget(reserve)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                      title="Löschen"
                    >🗑️</button>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Ziel</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCents(reserve.targetAmountCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Angespart</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCents(reserve.currentAmountCents)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-blue-400'
                        }`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{progress.toFixed(0)}%</span>
                  </div>

                  <div className="flex justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                    <span className="text-gray-500 dark:text-gray-400">Sparrate / Monat</span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">{formatCents(reserve.monthlyContributionCents)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Rhythmus</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {reserve.interval === 'quarterly' ? 'Vierteljährlich' : reserve.interval === 'yearly' ? 'Jährlich' : reserve.interval}
                    </span>
                  </div>

                  {monthsLeft !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Nächste Fälligkeit</span>
                      <span className={`font-medium ${getStatusColor(reserve)}`}>
                        {monthsLeft === 0
                          ? 'Diesen Monat'
                          : `in ${monthsLeft} ${monthsLeft === 1 ? 'Monat' : 'Monaten'}`}
                        {reserve.dueDate && (
                          <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">
                            ({new Date(reserve.dueDate).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {reserve.notes && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 line-clamp-2">{reserve.notes}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="Rücklage erstellen">
        <ReserveForm onSubmit={handleCreate} onCancel={() => setIsCreating(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingReserve} onClose={() => setEditingReserve(null)} title="Rücklage bearbeiten">
        {editingReserve && (
          <ReserveForm
            initialData={editingReserve}
            onSubmit={handleUpdate}
            onCancel={() => setEditingReserve(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Rücklage löschen">
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Soll die Rücklage <strong>{deleteTarget?.name}</strong> wirklich gelöscht werden?
          </p>
          {deleteTarget?.linkedExpenseId && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Die verknüpfte Ausgabe wird nicht gelöscht, aber die Verknüpfung aufgehoben.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Abbrechen</Button>
            <Button variant="danger" onClick={handleDelete}>Löschen</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
