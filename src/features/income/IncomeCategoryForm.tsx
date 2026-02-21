import { useState, FormEvent } from 'react';
import type { IncomeCategory } from '@shared/types';
import { Button, Input, Textarea } from '@shared/components';

interface IncomeCategoryFormProps {
  initialData?: Omit<IncomeCategory, 'id' | 'createdAt' | 'updatedAt'>;
  onSubmit: (data: Omit<IncomeCategory, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function IncomeCategoryForm({ initialData, onSubmit, onCancel }: IncomeCategoryFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    color: initialData?.color || '#10b981',
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
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Name"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        placeholder="z.B. Gehalt, Freelancing"
      />

      <Textarea
        label="Beschreibung"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Optionale Beschreibung"
        rows={2}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Farbe</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="h-10 w-14 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
          />
          <div className="w-full h-3 rounded-full" style={{ backgroundColor: formData.color }} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit" variant="primary">{initialData ? 'Aktualisieren' : 'Erstellen'}</Button>
      </div>
    </form>
  );
}
