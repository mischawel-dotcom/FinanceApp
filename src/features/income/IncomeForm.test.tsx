import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IncomeForm } from '@/features/income/IncomeForm';


const mockOnSubmit = vi.fn();
const mockOnCancel = vi.fn();
const mockCategories = [
  { id: 'default', name: 'Gehalt' },
  { id: 'other', name: 'Sonstiges' },
];

describe('IncomeForm UI', () => {
  it('zeigt Validierungsfehler bei leerem Submit', () => {
    render(<IncomeForm categories={mockCategories} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByText(/Erstellen/i));
    // Suche gezielt nach Fehlermeldungen in <p>-Tags mit text-danger-500
    expect(screen.getAllByText((content, element) => {
      return (
        element?.tagName.toLowerCase() === 'p' &&
        element.className.includes('text-danger-500') &&
        /Titel ist erforderlich|Betrag ist erforderlich/.test(content)
      );
    }).length).toBeGreaterThanOrEqual(1);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('übernimmt Eingaben und ruft onSubmit auf', () => {
    render(<IncomeForm categories={mockCategories} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    fireEvent.change(screen.getByLabelText(/Titel/i), { target: { value: 'Test-Einkommen' } });
    fireEvent.change(screen.getByLabelText(/Betrag/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Kategorie/i), { target: { value: 'default' } });
    fireEvent.click(screen.getByText(/Erstellen/i));
    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('onCancel funktioniert', () => {
    render(<IncomeForm categories={mockCategories} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByText(/Abbrechen/i));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
