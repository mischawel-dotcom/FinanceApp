import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/app/store/useAppStore';
import type { Asset } from '@shared/types';
import { Button, Card, Modal } from '@shared/components';
import { AssetForm } from './AssetForm';
import { asCentsSafe } from '@shared/utils/money';
import { formatCents } from '@/ui/formatMoney';

export default function AssetsPage() {
  const { assets, createAsset, updateAsset, deleteAsset, loadData } = useAppStore();
  
  useEffect(() => {
    if (assets.length === 0) {
      loadData();
    }
  }, [assets.length, loadData]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const handleCreate = async (data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createAsset(data);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("AssetsPage: assets after create", assets);
    }
    setIsModalOpen(false);
  };

  const handleUpdate = async (data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingAsset) return;
    // Merge form data with existing asset metadata
    const payload: Asset = {
      ...editingAsset,
      ...data,
    };
    await updateAsset(payload);
    setEditingAsset(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Anlage wirklich löschen?')) {
      await deleteAsset(id);
    }
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingAsset(null);
    setIsModalOpen(true);
  };

  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      savings: 'Sparkonto',
      stocks: 'Aktien/ETFs',
      crypto: 'Krypto',
      'real-estate': 'Immobilien',
      bonds: 'Anleihen',
      other: 'Sonstiges',
    };
    return labels[type] || type;
  };

  // Portfolio-Wert: Summe der marketValueCents (falls vorhanden), sonst costBasisCents
  const totalValue = assets.reduce(
    (sum, asset) => sum + (typeof asset.marketValueCents === 'number' && Number.isFinite(asset.marketValueCents)
      ? asCentsSafe(asset.marketValueCents)
      : asCentsSafe(asset.costBasisCents)),
    0
  );
  const totalCostBasis = assets.reduce((sum, asset) => sum + asCentsSafe(asset.costBasisCents), 0);
  const totalGain = asCentsSafe(totalValue) - asCentsSafe(totalCostBasis);
  const totalGainPercent = totalCostBasis > 0 ? ((totalGain / totalCostBasis) * 100).toFixed(2) : '0';

  const sortedAssets = useMemo(() =>
    [...assets].sort((a, b) => {
      const va = typeof a.marketValueCents === 'number' ? a.marketValueCents : a.costBasisCents;
      const vb = typeof b.marketValueCents === 'number' ? b.marketValueCents : b.costBasisCents;
      return vb - va;
    }),
    [assets]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Anlagen</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verwaltung von Vermögenswerten und Investitionen</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          + Anlage
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gesamtwert Portfolio</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCents(totalValue)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gesamte Kostenbasis</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCents(totalCostBasis)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gesamt Gewinn/Verlust</div>
          <div className={`text-2xl font-bold ${totalGain >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {totalGain >= 0 ? '+' : ''}{formatCents(totalGain)}
            <span className="text-sm ml-2">({totalGain >= 0 ? '+' : ''}{totalGainPercent}%)</span>
          </div>
        </Card>
      </div>

      {/* Assets Grid */}
      {sortedAssets.length === 0 ? (
        <Card>
          <div className="text-center py-12 space-y-4">
            <div className="text-5xl">📈</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Noch keine Anlagen</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Erfasse deine Vermögenswerte — z.B. ETFs, Aktien, Sparkonten.
              </p>
            </div>
            <Button variant="primary" onClick={openCreateModal}>Erste Anlage anlegen</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedAssets.map((asset) => {
            const costBasis = asCentsSafe(asset.costBasisCents);
            const marketValue = (typeof asset.marketValueCents === 'number' && Number.isFinite(asset.marketValueCents))
              ? asCentsSafe(asset.marketValueCents) : undefined;
            const gainCents = typeof marketValue === 'number' ? marketValue - costBasis : 0;
            const gainPct = typeof marketValue === 'number' && costBasis > 0
              ? ((gainCents / costBasis) * 100).toFixed(1) : null;
            const displayValue = typeof marketValue === 'number' ? marketValue : costBasis;

            return (
              <Card key={asset.id} className="flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{asset.name}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{getAssetTypeLabel(asset.type)}</span>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => openEditModal(asset)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded transition-colors"
                      title="Bearbeiten"
                    >✏️</button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                      title="Löschen"
                    >🗑️</button>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Wert</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCents(displayValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Kostenbasis</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCents(costBasis)}</span>
                  </div>

                  {gainPct !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Gewinn/Verlust</span>
                      <span className={`font-semibold ${gainCents >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {gainCents >= 0 ? '+' : ''}{formatCents(gainCents)}
                        <span className="text-xs ml-1">({gainCents >= 0 ? '+' : ''}{gainPct}%)</span>
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2 space-y-2">
                    {asCentsSafe(asset.monthlyContributionCents) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Sparrate / Monat</span>
                        <span className="font-semibold text-primary-600 dark:text-primary-400">{formatCents(asCentsSafe(asset.monthlyContributionCents))}</span>
                      </div>
                    )}
                    {asset.purchaseDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Kaufdatum</span>
                        <span className="font-medium text-gray-900 dark:text-white">{format(asset.purchaseDate, 'dd.MM.yyyy')}</span>
                      </div>
                    )}
                  </div>
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
          setEditingAsset(null);
        }}
        title={editingAsset ? 'Anlage bearbeiten' : 'Neue Anlage'}
      >
        <AssetForm
          initialData={editingAsset || undefined}
          onSubmit={editingAsset ? handleUpdate : handleCreate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingAsset(null);
          }}
        />
      </Modal>
    </div>
  );
}
