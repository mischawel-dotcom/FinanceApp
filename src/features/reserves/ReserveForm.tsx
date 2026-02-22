import { useState, FormEvent } from 'react';
import { format } from 'date-fns';
import { getCurrencySymbol } from '@/shared/hooks/useCurrency';
import { centsToEuroInput, euroInputToCents } from '@/shared/utils/money';
import type { Reserve, RecurrenceInterval } from '@shared/types';
import { Button, Input, Select, Textarea } from '@shared/components';

interface ReserveFormProps {
  initialData?: Reserve;
  onSubmit: (data: Omit<Reserve, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const intervalOptions: { value: RecurrenceInterval; label: string }[] = [
  { value: 'quarterly', label: 'Vierteljährlich' },
  { value: 'yearly', label: 'Jährlich' },
];

export function ReserveForm({ initialData, onSubmit, onCancel }: ReserveFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    targetAmount: initialData?.targetAmountCents != null ? centsToEuroInput(initialData.targetAmountCents) : '',
    currentAmount: initialData?.currentAmountCents != null ? centsToEuroInput(initialData.currentAmountCents) : '',
    interval: initialData?.interval || 'yearly' as RecurrenceInterval,
    dueDate: initialData?.dueDate ? format(initialData.dueDate, 'yyyy-MM-dd') : '',
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const targetCents = euroInputToCents(formData.targetAmount);
  const currentCents = euroInputToCents(formData.currentAmount || '0');

  const monthsUntilDue = (() => {
    if (!formData.dueDate) return 0;
    const now = new Date();
    const due = new Date(formData.dueDate);
    return Math.max(1, (due.getFullYear() - now.getFullYear()) * 12 + (due.getMonth() - now.getMonth()));
  })();

  const remainingCents = Math.max(0, targetCents - currentCents);
  const suggestedMonthlyCents = monthsUntilDue > 0 ? Math.ceil(remainingCents / monthsUntilDue) : remainingCents;

  const progress = targetCents > 0 ? Math.min(100, (currentCents / targetCents) * 100) : 0;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name ist erforderlich';
    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = 'Betrag muss größer als 0 sein';
    }
    if (!formData.dueDate) newErrors.dueDate = 'Fälligkeitsdatum ist erforderlich';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: formData.name.trim(),
      targetAmountCents: targetCents,
      currentAmountCents: currentCents,
      monthlyContributionCents: suggestedMonthlyCents,
      interval: formData.interval,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      notes: formData.notes?.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Bezeichnung"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        placeholder="z.B. KFZ Versicherung, GEZ"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={`Betrag (${getCurrencySymbol()})`}
          type="number"
          step="0.01"
          required
          value={formData.targetAmount}
          onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
          error={errors.targetAmount}
          placeholder=""
        />
        <Input
          label={`Bereits angespart (${getCurrencySymbol()})`}
          type="number"
          step="0.01"
          value={formData.currentAmount}
          onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
          placeholder=""
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Fällig am"
          type="date"
          required
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          error={errors.dueDate}
        />
        <Select
          label="Intervall"
          required
          value={formData.interval}
          onChange={(e) => setFormData({ ...formData, interval: e.target.value as RecurrenceInterval })}
          options={intervalOptions}
        />
      </div>

      {targetCents > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-blue-400'
                }`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{progress.toFixed(0)}%</span>
          </div>

          {monthsUntilDue > 0 && suggestedMonthlyCents > 0 && (
            <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
              <p className="text-sm text-primary-800 dark:text-primary-200">
                Monatliche Rücklage: <strong>{centsToEuroInput(suggestedMonthlyCents)} {getCurrencySymbol()}</strong>
                {' '}über <strong>{monthsUntilDue} Monate</strong>
              </p>
            </div>
          )}
        </>
      )}

      <Textarea
        label="Notizen"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Optionale Notizen"
        rows={2}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit" variant="primary">{initialData ? 'Aktualisieren' : 'Erstellen'}</Button>
      </div>
    </form>
  );
}
