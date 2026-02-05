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
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }
    
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
    <form onSubmit={handleSubmit} className="space-y-4">
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
        rows={3}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Farbe
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-sm text-gray-600">{formData.color}</span>
        </div>
      </div>

      <div>
        <Select
          label="Wichtigkeit"
          required
          value={formData.importance}
          onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
          options={importanceOptions}
          helperText="Wichtigkeit von 1 (unwichtig) bis 6 (extrem wichtig)"
        />
        <div className="mt-2">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getImportanceColor(formData.importance)}`}>
            Wichtigkeit: {formData.importance}
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
