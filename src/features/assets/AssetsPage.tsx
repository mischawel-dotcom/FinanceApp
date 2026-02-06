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

  const handleCreate = async () => {
    await createAsset();
    setIsModalOpen(false);
  };

  const handleUpdate = async () => {
    if (editingAsset) {
      await updateAsset();
      setEditingAsset(null);
      setIsModalOpen(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Anlage wirklich löschen?')) {
      await deleteAsset();
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

  const totalValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalInvestment = assets.reduce((sum, asset) => sum + asset.initialInvestment, 0);
  const totalGain = totalValue - totalInvestment;
  const totalGainPercent = totalInvestment > 0 ? ((totalGain / totalInvestment) * 100).toFixed(2) : '0';

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Art', render: (asset: Asset) => getAssetTypeLabel(asset.type) },
    { 
      key: 'currentValue', 
      label: 'Aktueller Wert', 
      render: (asset: Asset) => (
        <span className="font-semibold">{asset.currentValue.toFixed(2)} €</span>
      )
    },
    { 
      key: 'initialInvestment', 
      label: 'Investition', 
      render: (asset: Asset) => `${asset.initialInvestment.toFixed(2)} €`
    },
    {
      key: 'gain',
      label: 'Gewinn/Verlust',
      render: (asset: Asset) => {
        const gain = asset.currentValue - asset.initialInvestment;
        const percent = asset.initialInvestment > 0 
          ? ((gain / asset.initialInvestment) * 100).toFixed(2)
          : '0';
        return (
          <div className="text-sm">
            <div className={`font-semibold ${gain >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {gain >= 0 ? '+' : ''}{gain.toFixed(2)} €
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
          <Button size="sm" variant="danger" onClick={handleDelete}>
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
          <div className="text-2xl font-bold text-gray-900">{totalValue.toFixed(2)} €</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Gesamtinvestition</div>
          <div className="text-2xl font-bold text-gray-900">{totalInvestment.toFixed(2)} €</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Gesamt Gewinn/Verlust</div>
          <div className={`text-2xl font-bold ${totalGain >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {totalGain >= 0 ? '+' : ''}{totalGain.toFixed(2)} €
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
          data={assets.sort((a, b) => b.currentValue - a.currentValue)}
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
