import { useState, FormEvent } from 'react';
import { format } from 'date-fns';
import type { Asset, AssetType } from '@shared/types';
import { Button, Input, Select, Textarea } from '@shared/components';
import { centsToEuroInput } from '@shared/utils/money';

import { euroInputToCentsSafe } from '@shared/utils/money';

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
    costBasis: initialData?.costBasisCents !== undefined ? centsToEuroInput(initialData.costBasisCents) : '',
    marketValue: initialData?.marketValueCents !== undefined ? centsToEuroInput(initialData.marketValueCents) : '',
    purchaseDate: initialData?.purchaseDate ? format(initialData.purchaseDate, 'yyyy-MM-dd') : '',
    notes: initialData?.notes || '',
    monthlyContribution: initialData?.monthlyContributionCents !== undefined ? centsToEuroInput(initialData.monthlyContributionCents) : '',
  });

  // Dev-only: track submit
  const [submitHit, setSubmitHit] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }
    if (!formData.costBasis || isNaN(Number(formData.costBasis)) || parseFloat(formData.costBasis) < 0) {
      newErrors.costBasis = 'Kostenbasis muss >= 0 sein';
    }
    if (formData.marketValue && (isNaN(Number(formData.marketValue)) || parseFloat(formData.marketValue) < 0)) {
      newErrors.marketValue = 'Marktwert muss >= 0 sein';
    }
    if (formData.monthlyContribution && (isNaN(Number(formData.monthlyContribution)) || parseFloat(formData.monthlyContribution) < 0)) {
      newErrors.monthlyContribution = 'Monatlicher Sparbeitrag muss >= 0 sein';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitHit(true);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("AssetForm submit handler HIT");
    }
    if (!validate()) return;
    // Cents-only contract: parse euro fields
    const payload: any = {
      name: formData.name,
      type: formData.type,
      costBasisCents: euroInputToCentsSafe(formData.costBasis),
      purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : undefined,
      notes: formData.notes || undefined,
      monthlyContributionCents: euroInputToCentsSafe(formData.monthlyContribution),
      ...(initialData?.id ? { id: initialData.id } : {}),
      ...(initialData?.createdAt ? { createdAt: initialData.createdAt } : {}),
      ...(initialData?.updatedAt ? { updatedAt: new Date() } : {}),
    };
    if (formData.marketValue) {
      payload.marketValueCents = euroInputToCentsSafe(formData.marketValue);
      payload.lastMarketValueUpdate = new Date().toISOString();
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("AssetForm calling createAsset/updateAsset with payload:", payload);
    }
    onSubmit(payload);
  };



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
        label="Eingezahlt / Kostenbasis (€)"
        type="number"
        step="0.01"
        required
        value={formData.costBasis}
        onChange={(e) => setFormData({ ...formData, costBasis: e.target.value })}
        error={errors.costBasis}
        placeholder="0.00"
        helperText="Summe aller Einzahlungen (Pflichtfeld)"
      />

      <Input
        label="Monatlicher Sparbeitrag (€)"
        type="number"
        step="0.01"
        value={formData.monthlyContribution}
        onChange={(e) => setFormData({ ...formData, monthlyContribution: e.target.value })}
        error={errors.monthlyContribution}
        placeholder="0.00"
        helperText="Optional. Wird für die Planung verwendet."
      />

      <Input
        label="Marktwert (€) (manuell)"
        type="number"
        step="0.01"
        value={formData.marketValue}
        onChange={(e) => setFormData({ ...formData, marketValue: e.target.value })}
        error={errors.marketValue}
        placeholder="0.00"
        helperText="Optional. Nur ausfüllen, wenn ein Marktwert vorliegt."
      />

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
      {import.meta.env.DEV && (
        <div className="text-xs text-gray-500 mt-2">
          <div>Submit triggered: {submitHit ? "yes" : "no"}</div>
        </div>
      )}
    </form>
  );
}
