import { useState, FormEvent } from 'react';
// Minimal euro to cents util
function euroToCents(euro: string | number): number {
  const n = typeof euro === 'string' ? parseFloat(euro) : euro;
  if (!isNaN(n) && isFinite(n)) return Math.round(n * 100);
  return 0;
}
import { format } from 'date-fns';
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
  if (process.env.NODE_ENV !== "production" && initialData) {
    // Dev-only: log incoming goal object and relevant fields
    // eslint-disable-next-line no-console
    console.log("[GoalForm] initialData (edit mode):", initialData);
    // eslint-disable-next-line no-console
    console.log("[GoalForm] initialData.targetAmountCents:", initialData.targetAmountCents);
    // eslint-disable-next-line no-console
    console.log("[GoalForm] initialData.targetAmount:", initialData.targetAmount);
  }

  // Prefer cents field if present, fallback to euro field
  const initialTargetAmount = initialData?.targetAmountCents !== undefined
    ? (initialData.targetAmountCents / 100).toString()
    : (initialData?.targetAmount?.toString() || '');

  if (process.env.NODE_ENV !== "production" && initialData) {
    // eslint-disable-next-line no-console
    console.log("[GoalForm] Derived initialTargetAmount for form:", initialTargetAmount);
  }

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    targetAmount: initialTargetAmount,
    currentAmount: initialData?.currentAmount?.toString() || '0',
    targetDate: initialData?.targetDate ? format(initialData.targetDate, 'yyyy-MM-dd') : '',
    priority: initialData?.priority || 'medium' as GoalPriority,
    description: initialData?.description || '',
    monthlyContributionEuro: initialData?.monthlyContributionCents !== undefined && initialData?.monthlyContributionCents >= 0
      ? (initialData.monthlyContributionCents / 100).toFixed(2)
      : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitHit, setSubmitHit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }
    
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
    setSubmitHit(true);
    console.log("GoalForm submit handler HIT");
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      // Parse monthlyContributionEuro to cents
      let monthlyContributionCents: number | undefined = undefined;
      if (formData.monthlyContributionEuro !== undefined && formData.monthlyContributionEuro !== "") {
        const euro = parseFloat(formData.monthlyContributionEuro);
        if (!isNaN(euro) && isFinite(euro) && euro > 0) {
          monthlyContributionCents = Math.round(euro * 100);
        }
      }
      // Cents-only contract for target amount
      const targetAmountCents = euroToCents(formData.targetAmount);
      const payload = {
        name: formData.name,
        targetAmountCents,
        currentAmount: parseFloat(formData.currentAmount), // keep as-is unless domain requires currentAmountCents
        targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
        priority: formData.priority,
        description: formData.description || undefined,
        monthlyContributionCents,
      };
      console.log("GoalForm calling onSubmit with payload:", payload);
      if (initialData?.id) {
        await onSubmit({ ...payload, id: initialData.id });
      } else {
        await onSubmit(payload);
      }
    } catch (err) {
      console.error("Goal create failed:", err);
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = formData.targetAmount && parseFloat(formData.targetAmount) > 0
    ? Math.min(100, (parseFloat(formData.currentAmount) / parseFloat(formData.targetAmount)) * 100)
    : 0;

  const remaining = parseFloat(formData.targetAmount || '0') - parseFloat(formData.currentAmount || '0');

  const getPriorityColor = (priority: GoalPriority) => {
    const colors: Record<GoalPriority, string> = {
      low: 'bg-gray-200 text-gray-800',
      medium: 'bg-blue-200 text-blue-800',
      high: 'bg-orange-200 text-orange-800',
      critical: 'bg-red-200 text-red-800',
    };
    return colors[priority];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name des Ziels"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        placeholder="z.B. Notgroschen, Urlaub, Neues Auto"
      />

      <Textarea
        label="Beschreibung"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Was möchtest du erreichen?"
        rows={2}
      />

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Zielbetrag (€)"
          type="number"
          step="0.01"
          required
          value={formData.targetAmount}
          onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
          error={errors.targetAmount}
          placeholder="0.00"
        />

        <Input
          label="Aktueller Stand (€)"
          type="number"
          step="0.01"
          required
          value={formData.currentAmount}
          onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
          error={errors.currentAmount}
          placeholder="0.00"
        />

        <Input
          label="Monatliche Sparrate (EUR)"
          type="number"
          step="0.01"
          value={formData.monthlyContributionEuro}
          onChange={(e) => setFormData({ ...formData, monthlyContributionEuro: e.target.value })}
          placeholder="Optional"
        />
      </div>

      {formData.targetAmount && formData.currentAmount && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Fortschritt:</span>
            <span className="font-semibold">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress >= 100 ? 'bg-success-600' : progress >= 75 ? 'bg-primary-600' : 'bg-primary-400'
              }`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="text-sm text-gray-600">
            Noch {remaining.toFixed(2)} € bis zum Ziel
          </div>
        </div>
      )}

      <Input
        label="Zieldatum"
        type="date"
        value={formData.targetDate}
        onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
        helperText="Optional - Bis wann möchtest du das Ziel erreichen?"
      />

      <div>
        <Select
          label="Priorität"
          required
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as GoalPriority })}
          options={priorityOptions}
        />
        <div className="mt-2">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(formData.priority)}`}>
            {priorityOptions.find((p) => p.value === formData.priority)?.label}
          </span>
        </div>
      </div>

      {submitError && (
        <p role="alert" className="text-red-600 text-sm mb-2">{submitError}</p>
      )}
      {process.env.NODE_ENV !== "production" && (
        <div className="text-xs text-gray-500 mt-2">
          <div>Submit triggered: {submitHit ? "yes" : "no"}</div>
          {Object.keys(errors).length > 0 && (
            <pre className="text-xs text-red-500">{JSON.stringify(errors, null, 2)}</pre>
          )}
        </div>
      )}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Bitte warten...' : (initialData ? 'Aktualisieren' : 'Erstellen')}
        </Button>
      </div>
    </form>
  );
}
