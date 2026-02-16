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
	// Find the row for 'Test Asset 1'
	const assetRow = screen.getByText('Test Asset 1').closest('tr');
	expect(assetRow).toBeTruthy();
	// Find the Bearbeiten button within that row
	const editButton = within(assetRow!).getByRole('button', { name: 'Bearbeiten' });
	fireEvent.click(editButton);
	// Find the dialog and robustly select the input for current value
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
	// Ensure we are not editing the name field
	expect(screen.getByText('Test Asset 1')).toBeInTheDocument();
	fireEvent.change(currentValueInput, { target: { value: '1234' } });
	// Submit form
	const saveButton = within(dialog).getByRole('button', { name: /aktualisieren|speichern/i });
	fireEvent.click(saveButton);
	// Wait for UI update
	await waitFor(() => {
		// Name should remain
		expect(screen.getByText('Test Asset 1')).toBeInTheDocument();
		// Value cell should update
		const updatedRow = screen.getByText('Test Asset 1').closest('tr');
		expect(updatedRow).toBeTruthy();
		expect(within(updatedRow!).getByText(/1234(\.00)?\s*€/)).toBeInTheDocument();
	});
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AssetsPage from './AssetsPage';
import { useAppStore } from '@/app/store/useAppStore';

beforeEach(() => {
	// Seed store with 2 assets
	useAppStore.setState({
		assets: [
			{
						id: 'a1',
						name: 'Test Asset 1',
						type: 'savings',
						currentValue: 1000,
						initialInvestment: 800,
						purchaseDate: new Date('2026-01-01'),
				notes: '',
				createdAt: new Date('2026-01-01'),
				updatedAt: new Date('2026-01-01'),
			},
			{
				id: 'a2',
				name: 'Test Asset 2',
				type: 'stocks',
				currentValue: 2000,
				initialInvestment: 1500,
				purchaseDate: new Date('2026-01-02'),
				notes: '',
				createdAt: new Date('2026-01-02'),
				updatedAt: new Date('2026-01-02'),
			},
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
	// Find the row for 'Test Asset 1'
	const row = screen.getByText('Test Asset 1').closest('tr');
	expect(row).toBeTruthy();
	// Find the Löschen button within that row
	const deleteButton = within(row!).getByRole('button', { name: /löschen/i });
	fireEvent.click(deleteButton);
	// Wait for UI update
	await waitFor(() => {
		expect(screen.queryByText('Test Asset 1')).not.toBeInTheDocument();
		expect(screen.getByText('Test Asset 2')).toBeInTheDocument();
	});
	confirmMock.mockRestore();
});
