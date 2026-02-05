import { useState, FormEvent } from 'react';
import { format } from 'date-fns';
import type { Income, IncomeCategory, RecurrenceInterval } from '@shared/types';
import { Button, Input, Select, Textarea } from '@shared/components';

interface IncomeFormProps {
  initialData?: Income;
  categories: IncomeCategory[];
  onSubmit: (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const recurrenceOptions: { value: RecurrenceInterval; label: string }[] = [
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'biweekly', label: 'Zweiwöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'quarterly', label: 'Vierteljährlich' },
  { value: 'yearly', label: 'Jährlich' },
];

export function IncomeForm({ initialData, categories, onSubmit, onCancel }: IncomeFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    amount: initialData?.amount?.toString() || '',
    date: initialData?.date ? format(initialData.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    categoryId: initialData?.categoryId || (categories[0]?.id || ''),
    isRecurring: initialData?.isRecurring || false,
    recurrenceInterval: initialData?.recurrenceInterval || 'monthly' as RecurrenceInterval,
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    onSubmit({
      title: formData.title,
      amount: parseFloat(formData.amount),
      date: new Date(formData.date),
      categoryId: formData.categoryId,
      isRecurring: formData.isRecurring,
      recurrenceInterval: formData.isRecurring ? formData.recurrenceInterval : undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Titel"
        required
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        error={errors.title}
        placeholder="z.B. Gehalt Januar"
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
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-gray-700">Wiederkehrende Einnahme</span>
        </label>
      </div>

      {formData.isRecurring && (
        <Select
          label="Wiederholung"
          value={formData.recurrenceInterval}
          onChange={(e) => setFormData({ ...formData, recurrenceInterval: e.target.value as RecurrenceInterval })}
          options={recurrenceOptions}
        />
      )}

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
