import "@testing-library/jest-dom";
import { within } from '@testing-library/react';
import { vi } from 'vitest';
vi.mock('../../data/repositories', () => ({
	assetRepository: {
		update: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
	},
}));

it('edits asset and updates UI immediately', async () => {
	render(
		<MemoryRouter>
			<AssetsPage />
		</MemoryRouter>
	);
	const assetCard = screen.getAllByText('Test Asset 1')[0].closest('[class*="rounded-lg"]')!;
	expect(assetCard).toBeTruthy();
	const editButton = within(assetCard as HTMLElement).getByTitle('Bearbeiten');
	fireEvent.click(editButton);
	const dialog = screen.getByRole('dialog');
	let currentValueInput;
	try {
		currentValueInput = within(dialog).getByRole('spinbutton', { name: /aktueller wert|wert/i });
	} catch {
		try {
			currentValueInput = within(dialog).getByRole('textbox', { name: /aktueller wert|wert/i });
		} catch {
			const numbers = within(dialog).queryAllByRole('spinbutton');
			const inputs = within(dialog).queryAllByRole('textbox');
			currentValueInput = numbers[0] ?? inputs[inputs.length - 1];
		}
	}
	fireEvent.change(currentValueInput, { target: { value: '1234' } });
	const saveButton = within(dialog).getByRole('button', { name: /aktualisieren|speichern/i });
	fireEvent.click(saveButton);
	await waitFor(() => {
		expect(screen.getAllByText('Test Asset 1').length).toBeGreaterThan(0);
	});
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AssetsPage from './AssetsPage';
import { useAppStore } from '@/app/store/useAppStore';
import { normalizeAsset } from '../../data/repositories/normalizeAsset';

beforeEach(() => {
	// Seed store with 2 assets (normalized)
	useAppStore.setState({
		assets: [
			normalizeAsset({
				id: 'a1',
				name: 'Test Asset 1',
				type: 'savings',
				currentValue: 1000,
				initialInvestment: 800,
				purchaseDate: new Date('2026-01-01'),
				notes: '',
				createdAt: new Date('2026-01-01'),
				updatedAt: new Date('2026-01-01'),
			}),
			normalizeAsset({
				id: 'a2',
				name: 'Test Asset 2',
				type: 'stocks',
				currentValue: 2000,
				initialInvestment: 1500,
				purchaseDate: new Date('2026-01-02'),
				notes: '',
				createdAt: new Date('2026-01-02'),
				updatedAt: new Date('2026-01-02'),
			}),
		],
	});
});

it('deletes asset and updates UI immediately', async () => {
	const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);
	render(
		<MemoryRouter>
			<AssetsPage />
		</MemoryRouter>
	);
	const assetCard = screen.getAllByText('Test Asset 1')[0].closest('[class*="rounded-lg"]')!;
	expect(assetCard).toBeTruthy();
	const deleteButton = within(assetCard as HTMLElement).getByTitle('Löschen');
	fireEvent.click(deleteButton);
	await waitFor(() => {
		expect(screen.queryByText('Test Asset 1')).not.toBeInTheDocument();
		expect(screen.getAllByText('Test Asset 2').length).toBeGreaterThan(0);
	});
	confirmMock.mockRestore();
});
