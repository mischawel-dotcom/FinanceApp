import { euroInputToCents, centsToEuroInput } from '@/shared/utils/money';
import { getCurrencySymbol } from '@/shared/hooks/useCurrency';
import { useState, FormEvent } from 'react';
import { z, ZodIssue } from 'zod';
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
  const amountStr =
    typeof initialData?.amount === 'number' && Number.isFinite(initialData.amount)
      ? centsToEuroInput(initialData.amount)
      : '';
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    amount: amountStr,
    date: initialData?.date ? format(initialData.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    categoryId: initialData?.categoryId || (categories[0]?.id || ''),
    isRecurring: initialData?.isRecurring || false,
    recurrenceInterval: initialData?.recurrenceInterval || 'monthly' as RecurrenceInterval,
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const schema = z.object({
    title: z.string().min(1, 'Titel ist erforderlich'),
    amount: z.string().refine((val) => !!val && parseFloat(val) > 0, {
      message: 'Betrag muss größer als 0 sein',
    }),
    date: z.string().min(1, 'Datum ist erforderlich'),
    categoryId: z.string().min(1, 'Kategorie ist erforderlich'),
    isRecurring: z.boolean(),
    recurrenceInterval: z.string().optional(),
    notes: z.string().optional(),
  });

  const validate = () => {
    const categoryExists = categories.some((cat) => cat.id === formData.categoryId);
    const result = schema.safeParse(formData);
    let fieldErrors: Record<string, string> = {};
    if (!categoryExists) {
      fieldErrors.categoryId = 'Kategorie existiert nicht mehr';
    }
    if (!result.success) {
      result.error.issues.forEach((err: ZodIssue) => {
        if (typeof err.path[0] === 'string' || typeof err.path[0] === 'number') {
          fieldErrors[String(err.path[0])] = err.message;
        }
      });
    }
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    if (!validate()) return;
    try {
      const amountCents = euroInputToCents(formData.amount);
      onSubmit({
        title: formData.title,
        amount: amountCents,
        date: new Date(formData.date),
        categoryId: formData.categoryId,
        isRecurring: formData.isRecurring,
        recurrenceInterval: formData.isRecurring ? formData.recurrenceInterval : undefined,
        notes: formData.notes || undefined,
      });
    } catch (err: any) {
      setGeneralError(err?.message || 'Unbekannter Fehler beim Speichern');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="income-form">
      {generalError && (
        <div className="bg-danger-100 text-danger-700 px-4 py-2 rounded text-sm">{generalError}</div>
      )}

      <Input
        label="Titel"
        required
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        error={errors.title}
        placeholder="z.B. Gehalt Januar"
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

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 w-5 h-5 dark:bg-gray-700"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Wiederkehrend</span>
        </label>
        {formData.isRecurring && (
          <div className="flex-1">
            <Select
              value={formData.recurrenceInterval}
              onChange={(e) => setFormData({ ...formData, recurrenceInterval: e.target.value as RecurrenceInterval })}
              options={recurrenceOptions}
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
