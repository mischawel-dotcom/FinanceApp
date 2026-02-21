import { useState, FormEvent } from 'react';
import type { ExpenseCategory, ImportanceLevel } from '@shared/types';
import { Button, Input, Select, Textarea } from '@shared/components';

interface ExpenseCategoryFormProps {
  initialData?: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>;
  onSubmit: (data: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>) => void;
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

export function ExpenseCategoryForm({ initialData, onSubmit, onCancel }: ExpenseCategoryFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    color: initialData?.color || '#ef4444',
    importance: (initialData?.importance?.toString() || '3') as string,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name ist erforderlich';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: formData.name,
      description: formData.description || undefined,
      color: formData.color,
      importance: parseInt(formData.importance) as ImportanceLevel,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Name"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        placeholder="z.B. Miete, Lebensmittel"
      />

      <Textarea
        label="Beschreibung"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Optionale Beschreibung"
        rows={2}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Farbe</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="h-10 w-14 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <div className="flex-1 h-3 rounded-full" style={{ backgroundColor: formData.color }} />
          </div>
        </div>
        <Select
          label="Wichtigkeit"
          required
          value={formData.importance}
          onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
          options={importanceOptions}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit" variant="primary">{initialData ? 'Aktualisieren' : 'Erstellen'}</Button>
      </div>
    </form>
  );
}
