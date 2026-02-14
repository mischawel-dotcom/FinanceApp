import { useState, useEffect } from 'react';
import { euroInputToCents, centsToEuroInput } from '@/shared/utils/money';
import { format } from 'date-fns';
import type { Expense, ExpenseCategory, ImportanceLevel } from '../../shared/types';
import { Button, Input, Select, Textarea } from '@shared/components';

interface ExpenseFormProps {
  initialData?: Expense;
  categories: ExpenseCategory[];
  onSubmit: (data: any) => void; // Accepts both create and update payloads
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

  // Update formData.amount if initialData changes (for edit modal)
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
    // Kategorie-Existenz prüfen
    const categoryExists = categories.some((cat) => cat.id === formData.categoryId);
    if (!categoryExists) {
      newErrors.categoryId = 'Kategorie existiert nicht mehr';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Betrag muss größer als 0 sein';
    }
    if (!formData.categoryId) {
      newErrors.categoryId = 'Kategorie ist erforderlich';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onValid = async (data: typeof formData) => {
    setGeneralError(null);
    // Convert amount to integer cents using shared util
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

  const getImportanceColor = (level: string) => {
    const colors: Record<string, string> = {
      '1': 'bg-gray-200 text-gray-800',
      '2': 'bg-blue-200 text-blue-800',
      '3': 'bg-yellow-200 text-yellow-800',
      '4': 'bg-orange-200 text-orange-800',
      '5': 'bg-red-200 text-red-800',
      '6': 'bg-red-600 text-white',
    };
    return colors[level] || colors['3'];
  };

  return (
    <form onSubmit={event => { event.preventDefault(); if (validate()) onValid(formData); }} className="space-y-4">
      {generalError && (
        <div className="bg-danger-100 text-danger-700 px-4 py-2 rounded mb-2">
          {generalError}
        </div>
      )}
      <Input
        label="Titel"
        required
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        error={errors.title}
        placeholder="z.B. Lebensmitteleinkauf"
      />

      <Input
        label="Betrag (€)"
        type="number"
        step="0.01"
        required
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        error={errors.amount}
        placeholder="0.00"
      />

      <Input
        label="Datum"
        type="date"
        required
        value={formData.date}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
      />

      <Select
        label="Kategorie"
        required
        value={formData.categoryId}
        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
        error={errors.categoryId}
        options={[
          { value: '', label: '-- Kategorie wählen --' },
          ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
        ]}
      />

      <div>
        <Select
          label="Wichtigkeit"
          required
          value={formData.importance}
          onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
          options={importanceOptions}
          helperText="Wie wichtig ist diese Ausgabe für dich?"
        />
        <div className="mt-2">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getImportanceColor(formData.importance)}`}>
            Wichtigkeit: {formData.importance}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <input
          type="checkbox"
          id="isRecurring"
          checked={formData.isRecurring}
          onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
        />
        <label htmlFor="isRecurring">Wiederkehrend</label>
        {formData.isRecurring && (
          <Select
            label="Intervall"
            value={formData.recurrenceInterval}
            onChange={e => setFormData({ ...formData, recurrenceInterval: e.target.value })}
            options={[
              { value: 'monthly', label: 'Monatlich' },
              { value: 'yearly', label: 'Jährlich' },
            ]}
          />
        )}
      </div>

      <Textarea
        label="Notizen"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Optionale Notizen"
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
