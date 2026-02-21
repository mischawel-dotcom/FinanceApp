import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/app/store/useAppStore';
import type { Asset } from '@shared/types';
import { Button, Card, Modal, Table } from '@shared/components';
import { AssetForm } from './AssetForm';
import { asCentsSafe } from '@shared/utils/money';

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

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Art', render: (asset: Asset) => getAssetTypeLabel(asset.type) },
    {
      key: 'costBasisCents',
      label: 'Kostenbasis (Eingezahlt)',
      render: (asset: Asset) => <span>{(asCentsSafe(asset.costBasisCents) / 100).toFixed(2)} €</span>,
    },
    {
      key: 'monthlyContributionCents',
      label: 'Sparrate (Monat)',
      render: (asset: Asset) =>
        asCentsSafe(asset.monthlyContributionCents) > 0
          ? <span>{(asCentsSafe(asset.monthlyContributionCents) / 100).toFixed(2)} €</span>
          : <span className="text-gray-400">—</span>,
    },
    {
      key: 'marketValueCents',
      label: 'Marktwert',
      render: (asset: Asset) =>
        typeof asset.marketValueCents === 'number' && Number.isFinite(asset.marketValueCents) ? (
          <span>
            {(asCentsSafe(asset.marketValueCents) / 100).toFixed(2)} €
            <span className="ml-1 text-xs text-gray-500">(manuell gepflegt)</span>
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'gain',
      label: 'Gewinn/Verlust',
      render: (asset: Asset) => {
        const costBasisCentsSafe = asCentsSafe(asset.costBasisCents);
        const marketValueCentsSafe = (typeof asset.marketValueCents === 'number' && Number.isFinite(asset.marketValueCents))
          ? asCentsSafe(asset.marketValueCents)
          : undefined;
        let gainCents = 0;
        let gainPercent = 0;
        if (typeof marketValueCentsSafe === 'number') {
          gainCents = marketValueCentsSafe - costBasisCentsSafe;
          if (costBasisCentsSafe > 0) {
            gainPercent = (gainCents / costBasisCentsSafe) * 100;
          }
        }
        return (
          <div className="text-sm">
            <div className={`font-semibold ${gainCents >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {gainCents >= 0 ? '+' : ''}{(asCentsSafe(gainCents) / 100).toFixed(2)} €
            </div>
            <div className="text-gray-500 text-xs">
              {gainCents >= 0 ? '+' : ''}{Number.isFinite(gainPercent) ? gainPercent.toFixed(2) : '0'}%
            </div>
          </div>
        );
      },
    },
    {
      key: 'purchaseDate',
      label: 'Datum',
      render: (asset: Asset) => asset.purchaseDate ? format(asset.purchaseDate, 'dd.MM.yyyy') : '-',
    },
    {
      key: 'actions',
      label: 'Aktionen',
      render: (asset: Asset) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEditModal(asset)}>
            Bearbeiten
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(asset.id)}>
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
          <h1 className="text-3xl font-bold text-gray-900">Anlagen</h1>
          <p className="text-gray-600 mt-1">Verwaltung von Vermögenswerten und Investitionen</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-gray-600 mb-1">Gesamtwert Portfolio</div>
          <div className="text-2xl font-bold text-gray-900">{(totalValue / 100).toFixed(2)} €</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Gesamte Kostenbasis</div>
          <div className="text-2xl font-bold text-gray-900">{(totalCostBasis / 100).toFixed(2)} €</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Gesamt Gewinn/Verlust</div>
          <div className={`text-2xl font-bold ${totalGain >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {totalGain >= 0 ? '+' : ''}{(totalGain / 100).toFixed(2)} €
            <span className="text-sm ml-2">({totalGain >= 0 ? '+' : ''}{totalGainPercent}%)</span>
          </div>
        </Card>
      </div>

      {/* Assets */}
      <Card
        title={`Vermögenswerte (${assets.length})`}
        actions={
          <Button onClick={openCreateModal}>
            + Neue Anlage
          </Button>
        }
      >
        {/* Desktop: Table */}
        <div className="hidden lg:block">
          <Table
            data={assets.slice().sort((a, b) => {
              const va = typeof a.marketValueCents === 'number' ? a.marketValueCents : a.costBasisCents;
              const vb = typeof b.marketValueCents === 'number' ? b.marketValueCents : b.costBasisCents;
              return vb - va;
            })}
            columns={columns}
            emptyMessage="Noch keine Anlagen vorhanden"
          />
        </div>
        {/* Mobile: Card List */}
        <div className="lg:hidden">
          {assets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Noch keine Anlagen vorhanden</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {assets.slice().sort((a, b) => {
                const va = typeof a.marketValueCents === 'number' ? a.marketValueCents : a.costBasisCents;
                const vb = typeof b.marketValueCents === 'number' ? b.marketValueCents : b.costBasisCents;
                return vb - va;
              }).map((asset) => {
                const costBasis = asCentsSafe(asset.costBasisCents);
                const marketValue = (typeof asset.marketValueCents === 'number' && Number.isFinite(asset.marketValueCents))
                  ? asCentsSafe(asset.marketValueCents) : undefined;
                const gainCents = typeof marketValue === 'number' ? marketValue - costBasis : 0;
                const gainPct = typeof marketValue === 'number' && costBasis > 0
                  ? ((gainCents / costBasis) * 100).toFixed(1) : null;
                const displayValue = typeof marketValue === 'number' ? marketValue : costBasis;

                return (
                  <div key={asset.id} className="py-3 px-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{asset.name}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{getAssetTypeLabel(asset.type)}</span>
                          {asset.purchaseDate && (
                            <>
                              <span>·</span>
                              <span>{format(asset.purchaseDate, 'dd.MM.yyyy')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-gray-900">
                          {(displayValue / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                        </div>
                        {gainPct !== null && (
                          <div className={`text-xs font-medium ${gainCents >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            {gainCents >= 0 ? '+' : ''}{(gainCents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 })} € ({gainCents >= 0 ? '+' : ''}{gainPct}%)
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>Basis: {(costBasis / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                        {asCentsSafe(asset.monthlyContributionCents) > 0 && (
                          <span>Sparrate: {(asCentsSafe(asset.monthlyContributionCents) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €/M</span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openEditModal(asset)} className="text-xs text-primary-600 font-medium py-1">Bearbeiten</button>
                        <button onClick={() => handleDelete(asset.id)} className="text-xs text-danger-600 font-medium py-1">Löschen</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

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
