import { useState, FormEvent } from 'react';
import type { IncomeCategory } from '@shared/types';


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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="z.B. Gehalt, Freelancing"
          className="w-full border rounded px-3 py-2"
        />
        {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optionale Beschreibung"
          rows={3}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={formData.color}
            onChange={e => setFormData({ ...formData, color: e.target.value })}
            className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-sm text-gray-600">{formData.color}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button type="button" className="px-4 py-2 rounded border" onClick={onCancel}>
          Abbrechen
        </button>
        <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white">
          {initialData ? 'Aktualisieren' : 'Erstellen'}
        </button>
      </div>
    </form>
  );
}
