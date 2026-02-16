import { describe, it, expect } from "vitest";
/*
 * DashboardPage asset net worth test
 * To run: npx vitest run src/features/dashboard/DashboardPage.cents.test.tsx
 */
import "@testing-library/jest-dom";
import DashboardPage from './DashboardPage';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAppStore } from '../../app/store/useAppStore';

describe('Dashboard assets net worth', () => {
  it('renders net worth and gain matching asset list euros (no /100 bug)', async () => {
    // Seed store with one asset, same shape as Assets list
    useAppStore.setState({
      assets: [
        {
          id: 'a1',
          name: 'Test Asset',
          type: 'savings',
          currentValue: 13981.00,
          initialInvestment: 10000.00,
          purchaseDate: new Date('2026-01-01'),
          notes: '',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        }
      ],
    });
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    // Expect Vermögen section to show 13.981,00 €
    expect(screen.getByText(/13\.981,00\s*€/)).toBeInTheDocument();
    // Expect Gewinn section to show +3.981,00 €
    expect(screen.getByText(/\+3\.981,00\s*€/)).toBeInTheDocument();
  });
});
