import { useState, FormEvent } from 'react';
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
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    targetAmount: initialData?.targetAmount?.toString() || '',
    currentAmount: initialData?.currentAmount?.toString() || '0',
    targetDate: initialData?.targetDate ? format(initialData.targetDate, 'yyyy-MM-dd') : '',
    priority: initialData?.priority || 'medium' as GoalPriority,
    description: initialData?.description || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    onSubmit({
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount),
      targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
      priority: formData.priority,
      description: formData.description || undefined,
    });
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

      <div className="grid grid-cols-2 gap-4">
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
