import { useState, FormEvent } from 'react';
import { format } from 'date-fns';
import type { Asset, AssetType } from '@shared/types';
import { Button, Input, Select, Textarea } from '@shared/components';

interface AssetFormProps {
  initialData?: Asset;
  onSubmit: (data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const assetTypeOptions: { value: AssetType; label: string }[] = [
  { value: 'savings', label: 'Sparkonto' },
  { value: 'stocks', label: 'Aktien/ETFs' },
  { value: 'crypto', label: 'Kryptowährung' },
  { value: 'real-estate', label: 'Immobilien' },
  { value: 'bonds', label: 'Anleihen' },
  { value: 'other', label: 'Sonstiges' },
];

export function AssetForm({ initialData, onSubmit, onCancel }: AssetFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'savings' as AssetType,
    currentValue: initialData?.currentValue?.toString() || '',
    initialInvestment: initialData?.initialInvestment?.toString() || '',
    purchaseDate: initialData?.purchaseDate ? format(initialData.purchaseDate, 'yyyy-MM-dd') : '',
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }
    
    if (!formData.currentValue || parseFloat(formData.currentValue) < 0) {
      newErrors.currentValue = 'Aktueller Wert muss >= 0 sein';
    }
    
    if (!formData.initialInvestment || parseFloat(formData.initialInvestment) < 0) {
      newErrors.initialInvestment = 'Ursprüngliche Investition muss >= 0 sein';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    onSubmit({
      name: formData.name,
      type: formData.type,
      currentValue: parseFloat(formData.currentValue),
      initialInvestment: parseFloat(formData.initialInvestment),
      purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : undefined,
      notes: formData.notes || undefined,
    });
  };

  const gain = parseFloat(formData.currentValue || '0') - parseFloat(formData.initialInvestment || '0');
  const gainPercent = formData.initialInvestment && parseFloat(formData.initialInvestment) > 0
    ? ((gain / parseFloat(formData.initialInvestment)) * 100).toFixed(2)
    : '0';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        placeholder="z.B. Sparkonto, ETF-Sparplan"
      />

      <Select
        label="Art der Anlage"
        required
        value={formData.type}
        onChange={(e) => setFormData({ ...formData, type: e.target.value as AssetType })}
        options={assetTypeOptions}
      />

      <Input
        label="Aktueller Wert (€)"
        type="number"
        step="0.01"
        required
        value={formData.currentValue}
        onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
        error={errors.currentValue}
        placeholder="0.00"
      />

      <Input
        label="Ursprüngliche Investition (€)"
        type="number"
        step="0.01"
        required
        value={formData.initialInvestment}
        onChange={(e) => setFormData({ ...formData, initialInvestment: e.target.value })}
        error={errors.initialInvestment}
        placeholder="0.00"
        helperText="Wie viel Geld wurde insgesamt eingezahlt?"
      />

      {formData.currentValue && formData.initialInvestment && (
        <div className="p-3 bg-gray-50 rounded-md">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Gewinn/Verlust:</span>
            <span className={`font-semibold ${gain >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {gain >= 0 ? '+' : ''}{gain.toFixed(2)} € ({gain >= 0 ? '+' : ''}{gainPercent}%)
            </span>
          </div>
        </div>
      )}

      <Input
        label="Kaufdatum"
        type="date"
        value={formData.purchaseDate}
        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
        helperText="Optional"
      />

      <Textarea
        label="Notizen"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="z.B. Monatliche Sparrate, ISIN, etc."
        rows={3}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" variant="primary">
          {initialData ? 'Aktualisieren' : 'Erstellen'}
        </Button>
      </div>
    </form>
  );
}
