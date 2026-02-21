import { useState, FormEvent } from 'react';
import { format } from 'date-fns';
import { getCurrencySymbol } from '@/shared/hooks/useCurrency';
import type { FinancialGoal, GoalPriority } from '@shared/types';
import { Button, Input, Select, Textarea } from '@shared/components';

interface GoalFormProps {
  initialData?: FinancialGoal;
  onSubmit: (data: Omit<FinancialGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const priorityOptions: { value: GoalPriority; label: string }[] = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
  { value: 'critical', label: 'Kritisch' },
];

export function GoalForm({ initialData, onSubmit, onCancel }: GoalFormProps) {
  const initialTargetAmount = initialData?.targetAmount !== undefined
    ? initialData.targetAmount.toString()
    : '';

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    targetAmount: initialTargetAmount,
    currentAmount: initialData?.currentAmount?.toString() || '',
    targetDate: initialData?.targetDate ? format(initialData.targetDate, 'yyyy-MM-dd') : '',
    priority: initialData?.priority || 'medium' as GoalPriority,
    description: initialData?.description || '',
    monthlyContributionEuro: initialData?.monthlyContributionCents !== undefined && initialData?.monthlyContributionCents >= 0
      ? (initialData.monthlyContributionCents / 100).toFixed(2)
      : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name ist erforderlich';
    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = 'Zielbetrag muss größer als 0 sein';
    }
    if (parseFloat(formData.currentAmount) < 0) {
      newErrors.currentAmount = 'Aktueller Betrag kann nicht negativ sein';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      let monthlyContributionCents: number | undefined = undefined;
      if (formData.monthlyContributionEuro !== undefined && formData.monthlyContributionEuro !== "") {
        const euro = parseFloat(formData.monthlyContributionEuro);
        if (!isNaN(euro) && isFinite(euro) && euro > 0) {
          monthlyContributionCents = Math.round(euro * 100);
        }
      }
      const targetAmount = parseFloat(formData.targetAmount) || 0;
      await onSubmit({
        name: formData.name,
        targetAmount,
        currentAmount: parseFloat(formData.currentAmount) || 0,
        targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
        priority: formData.priority,
        description: formData.description || undefined,
        monthlyContributionCents,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = formData.targetAmount && parseFloat(formData.targetAmount) > 0
    ? Math.min(100, (parseFloat(formData.currentAmount) / parseFloat(formData.targetAmount)) * 100)
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Name des Ziels"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        placeholder="z.B. Notgroschen, Urlaub"
      />

      <Textarea
        label="Beschreibung"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Was möchtest du erreichen?"
        rows={2}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Input
          label={`Zielbetrag (${getCurrencySymbol()})`}
          type="number"
          step="0.01"
          required
          value={formData.targetAmount}
          onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
          error={errors.targetAmount}
          placeholder=""
        />
        <Input
          label={`Aktuell (${getCurrencySymbol()})`}
          type="number"
          step="0.01"
          required
          value={formData.currentAmount}
          onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
          error={errors.currentAmount}
          placeholder=""
        />
        <Input
          label={`Monatl. Rate (${getCurrencySymbol()})`}
          type="number"
          step="0.01"
          value={formData.monthlyContributionEuro}
          onChange={(e) => setFormData({ ...formData, monthlyContributionEuro: e.target.value })}
          placeholder="Optional"
        />
      </div>

      {formData.targetAmount && parseFloat(formData.targetAmount) > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress >= 100 ? 'bg-green-500' : progress >= 75 ? 'bg-blue-500' : 'bg-blue-400'
              }`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{progress.toFixed(0)}%</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Zieldatum"
          type="date"
          value={formData.targetDate}
          onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
        />
        <Select
          label="Priorität"
          required
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as GoalPriority })}
          options={priorityOptions}
        />
      </div>

      {submitError && (
        <p role="alert" className="text-red-600 text-sm">{submitError}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>Abbrechen</Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Bitte warten...' : (initialData ? 'Aktualisieren' : 'Erstellen')}
        </Button>
      </div>
    </form>
  );
}
