import { useState, useEffect } from 'react';
import { euroInputToCents, centsToEuroInput } from '@/shared/utils/money';
import { getCurrencySymbol } from '@/shared/hooks/useCurrency';
import { format } from 'date-fns';
import type { Expense, ExpenseCategory, ImportanceLevel, RecurrenceInterval } from '@shared/types';
import { Button, Input, Select, Textarea } from '@shared/components';

interface ExpenseFormProps {
  initialData?: Expense;
  categories: ExpenseCategory[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const importanceOptions = [
  { value: '1', label: '1 - Unwichtig' },
  { value: '2', label: '2 - Wenig wichtig' },
  { value: '3', label: '3 - Mäßig wichtig' },
  { value: '4', label: '4 - Wichtig' },
  { value: '5', label: '5 - Sehr wichtig' },
  { value: '6', label: '6 - Extrem wichtig' },
];

export function ExpenseForm({ initialData, categories, onSubmit, onCancel }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    amount: initialData?.amount != null ? centsToEuroInput(initialData.amount) : '',
    date: initialData?.date ? format(initialData.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    categoryId: initialData?.categoryId || (categories[0]?.id || ''),
    importance: (initialData?.importance?.toString() || '3') as string,
    notes: initialData?.notes || '',
    isRecurring: initialData?.isRecurring ?? false,
    recurrenceInterval: initialData?.recurrenceInterval ?? 'monthly',
  });

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        amount: initialData.amount != null ? centsToEuroInput(initialData.amount) : '',
      }));
    }
  }, [initialData]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const categoryExists = categories.some((cat) => cat.id === formData.categoryId);
    if (!categoryExists) newErrors.categoryId = 'Kategorie existiert nicht mehr';
    if (!formData.title.trim()) newErrors.title = 'Titel ist erforderlich';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Betrag muss größer als 0 sein';
    if (!formData.categoryId) newErrors.categoryId = 'Kategorie ist erforderlich';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onValid = async (data: typeof formData) => {
    setGeneralError(null);
    const amountCents = euroInputToCents(data.amount);
    const payload: any = {
      ...(initialData ? { id: initialData.id } : {}),
      title: data.title.trim(),
      amount: Number.isFinite(amountCents) ? amountCents : 0,
      date: new Date(data.date),
      categoryId: data.categoryId,
      importance: parseInt(data.importance) as ImportanceLevel,
      notes: data.notes?.trim() || undefined,
      isRecurring: !!data.isRecurring,
      recurrenceInterval: data.isRecurring ? data.recurrenceInterval : undefined,
    };
    if (!payload.categoryId) {
      setGeneralError('Kategorie ist erforderlich');
      return;
    }
    await onSubmit(payload);
  };

  return (
    <form onSubmit={event => { event.preventDefault(); if (validate()) onValid(formData); }} className="space-y-3">
      {generalError && (
        <div className="bg-danger-100 text-danger-700 px-4 py-2 rounded text-sm">{generalError}</div>
      )}

      <Input
        label="Titel"
        required
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        error={errors.title}
        placeholder="z.B. Lebensmitteleinkauf"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={`Betrag (${getCurrencySymbol()})`}
          type="number"
          step="0.01"
          required
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          error={errors.amount}
          placeholder=""
        />
        <Input
          label="Datum"
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Kategorie"
          required
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          error={errors.categoryId}
          options={[
            { value: '', label: '-- Kategorie --' },
            ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
          ]}
        />
        <Select
          label="Wichtigkeit"
          required
          value={formData.importance}
          onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
          options={importanceOptions}
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            id="isRecurring"
            checked={formData.isRecurring}
            onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 w-5 h-5 dark:bg-gray-700"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Wiederkehrend</span>
        </label>
        {formData.isRecurring && (
          <div className="flex-1">
            <Select
              value={formData.recurrenceInterval}
              onChange={e => setFormData({ ...formData, recurrenceInterval: e.target.value as RecurrenceInterval })}
              options={[
                { value: 'monthly', label: 'Monatlich' },
                { value: 'yearly', label: 'Jährlich' },
              ]}
            />
          </div>
        )}
      </div>

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
