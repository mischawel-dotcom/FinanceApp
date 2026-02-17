import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/app/store/useAppStore';
import type { Asset } from '@shared/types';
import { Button, Card, Modal, Table } from '@shared/components';
import { AssetForm } from './AssetForm';

export default function AssetsPage() {
  const { assets, createAsset, updateAsset, deleteAsset, loadData } = useAppStore();
  
  useEffect(() => {
    if (assets.length === 0) {
      loadData();
    }
  }, [assets.length, loadData]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const handleCreate = async (payload: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createAsset(payload);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("AssetsPage: assets after create", assets);
    }
    setIsModalOpen(false);
  };

  const handleUpdate = async (payload: Asset) => {
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
    (sum, asset) => sum + (typeof asset.marketValueCents === 'number' ? asset.marketValueCents : asset.costBasisCents),
    0
  );
  const totalCostBasis = assets.reduce((sum, asset) => sum + asset.costBasisCents, 0);
  const totalGain = totalValue - totalCostBasis;
  const totalGainPercent = totalCostBasis > 0 ? ((totalGain / totalCostBasis) * 100).toFixed(2) : '0';

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Art', render: (asset: Asset) => getAssetTypeLabel(asset.type) },
    {
      key: 'costBasisCents',
      label: 'Kostenbasis (Eingezahlt)',
      render: (asset: Asset) => <span>{(asset.costBasisCents / 100).toFixed(2)} €</span>,
    },
    {
      key: 'monthlyContributionCents',
      label: 'Sparrate (Monat)',
      render: (asset: Asset) =>
        typeof asset.monthlyContributionCents === 'number' && asset.monthlyContributionCents > 0
          ? <span>{(asset.monthlyContributionCents / 100).toFixed(2)} €</span>
          : <span className="text-gray-400">—</span>,
    },
    {
      key: 'marketValueCents',
      label: 'Marktwert',
      render: (asset: Asset) =>
        typeof asset.marketValueCents === 'number' ? (
          <span>
            {(asset.marketValueCents / 100).toFixed(2)} €
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
        const value = typeof asset.marketValueCents === 'number' ? asset.marketValueCents : asset.costBasisCents;
        const gain = value - asset.costBasisCents;
        const percent = asset.costBasisCents > 0 ? ((gain / asset.costBasisCents) * 100).toFixed(2) : '0';
        return (
          <div className="text-sm">
            <div className={`font-semibold ${gain >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {gain >= 0 ? '+' : ''}{(gain / 100).toFixed(2)} €
            </div>
            <div className="text-gray-500 text-xs">
              {gain >= 0 ? '+' : ''}{percent}%
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

      {/* Assets Table */}
      <Card
        title={`Vermögenswerte (${assets.length})`}
        actions={
          <Button onClick={openCreateModal}>
            + Neue Anlage
          </Button>
        }
      >
        <Table
          data={assets.slice().sort((a, b) => {
            const va = typeof a.marketValueCents === 'number' ? a.marketValueCents : a.costBasisCents;
            const vb = typeof b.marketValueCents === 'number' ? b.marketValueCents : b.costBasisCents;
            return vb - va;
          })}
          columns={columns}
          emptyMessage="Noch keine Anlagen vorhanden"
        />
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
