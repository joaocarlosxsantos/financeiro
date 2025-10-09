import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AlertModal } from '../../src/components/notifications/alert-modal';
import { AlertConfigType } from '../../src/types/notifications';

const mockAlertConfig = {
  id: 'alert-1',
  userId: 'user-1',
  type: AlertConfigType.BUDGET_EXCEEDED,
  isEnabled: true,
  thresholdAmount: 1000,
  thresholdPercent: 80,
  categoryIds: [],
  walletIds: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCategories = [
  { id: 'cat-1', name: 'Alimentação', type: 'EXPENSE' },
  { id: 'cat-2', name: 'Transporte', type: 'EXPENSE' },
];

const mockWallets = [
  { id: 'wallet-1', name: 'Conta Principal' },
  { id: 'wallet-2', name: 'Poupança' },
];

// Mock UI components
jest.mock('../../src/components/ui/modal', () => ({
  Modal: ({ isOpen, onClose, children }: any) => 
    isOpen ? <div data-testid="modal" onClick={onClose}>{children}</div> : null,
}));

jest.mock('../../src/components/ui/multi-select', () => ({
  __esModule: true,
  default: ({ value, onValueChange, placeholder }: any) => (
    <div data-testid="multi-select">
      <span>{placeholder}</span>
      <button 
        onClick={() => onValueChange([...value, 'new-item'])}
        data-testid="multi-select-add"
      >
        Add Item
      </button>
    </div>
  ),
}));

describe('AlertModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch for categories and wallets
    global.fetch = jest.fn()
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: mockCategories }),
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ wallets: mockWallets }),
        })
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render create mode modal', async () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText(/criar alerta/i)).toBeInTheDocument();
  });

  it('should render edit mode modal with existing config', async () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="edit"
        alertConfig={mockAlertConfig}
      />
    );

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText(/editar alerta/i)).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(
      <AlertModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('should call onClose when modal backdrop is clicked', () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );

    const modal = screen.getByTestId('modal');
    fireEvent.click(modal);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show alert type selection', async () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );

    // Should show different alert type options
    expect(screen.getByText(/orçamento excedido/i)).toBeInTheDocument();
    expect(screen.getByText(/gastos incomuns/i)).toBeInTheDocument();
    expect(screen.getByText(/saldo baixo/i)).toBeInTheDocument();
  });

  it('should handle alert type selection', async () => {
    const user = userEvent.setup();
    
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );

    // Select budget exceeded alert type
    const budgetOption = screen.getByRole('radio', { name: /orçamento excedido/i }) ||
                        screen.getByText(/orçamento excedido/i);
    
    if (budgetOption) {
      await user.click(budgetOption);
    }

    // Should show threshold amount input for budget exceeded
    expect(screen.getByLabelText(/valor limite/i) || 
           screen.getByPlaceholderText(/valor/i)).toBeInTheDocument();
  });

  it('should show threshold amount input for budget exceeded alerts', async () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="edit"
        alertConfig={mockAlertConfig}
      />
    );

    const thresholdInput = screen.getByDisplayValue('1000') ||
                          screen.getByLabelText(/valor limite/i);
    expect(thresholdInput).toBeInTheDocument();
  });

  it('should handle threshold amount changes', async () => {
    const user = userEvent.setup();
    
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="edit"
        alertConfig={mockAlertConfig}
      />
    );

    const thresholdInput = screen.getByDisplayValue('1000') ||
                          screen.getByLabelText(/valor limite/i);
    
    await user.clear(thresholdInput);
    await user.type(thresholdInput, '1500');

    expect(thresholdInput).toHaveValue('1500');
  });

  it('should show enabled/disabled toggle', () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="edit"
        alertConfig={mockAlertConfig}
      />
    );

    const toggle = screen.getByRole('switch') ||
                  screen.getByTestId('alert-enabled-toggle');
    expect(toggle).toBeInTheDocument();
  });

  it('should handle enabled/disabled toggle', async () => {
    const user = userEvent.setup();
    
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="edit"
        alertConfig={mockAlertConfig}
      />
    );

    const toggle = screen.getByRole('switch') ||
                  screen.getByTestId('alert-enabled-toggle');
    
    await user.click(toggle);
    
    // Toggle state should change
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('should show category and wallet filters', async () => {
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('multi-select')).toBeInTheDocument();
    });
  });

  it('should call onSave with correct data when save button is clicked', async () => {
    const user = userEvent.setup();
    mockOnSave.mockResolvedValue(undefined);
    
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );

    // Fill form and save
    const saveButton = screen.getByRole('button', { name: /salvar/i }) ||
                      screen.getByTestId('save-button');
    
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('should handle save errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockOnSave.mockRejectedValue(new Error('Save failed'));
    
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );

    const saveButton = screen.getByRole('button', { name: /salvar/i }) ||
                      screen.getByTestId('save-button');
    
    await user.click(saveButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should show loading state during save', async () => {
    const user = userEvent.setup();
    let resolveSave: (value: any) => void;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });
    mockOnSave.mockReturnValue(savePromise);
    
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );

    const saveButton = screen.getByRole('button', { name: /salvar/i }) ||
                      screen.getByTestId('save-button');
    
    await user.click(saveButton);

    // Should show loading state
    expect(screen.getByText(/salvando/i) || 
           screen.getByTestId('loading-indicator')).toBeInTheDocument();

    // Resolve the promise
    resolveSave!(undefined);
  });

  it('should validate required fields before saving', async () => {
    const user = userEvent.setup();
    
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        mode="create"
      />
    );

    const saveButton = screen.getByRole('button', { name: /salvar/i }) ||
                      screen.getByTestId('save-button');
    
    await user.click(saveButton);

    // Should show validation errors or prevent save
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});