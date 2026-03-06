import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkOperationsToolbar, RowCheckbox, useBulkSelection } from '../BulkOperations';
import { BulkActionConfirmDialog } from '../BulkActionConfirmDialog';
import React from 'react';

describe('BulkOperations component', () => {
  const mockRowIds = [1, 2, 3, 4, 5];
  
  describe('BulkOperationsToolbar', () => {
    it('should render select all button', () => {
      const onSelectionChange = vi.fn();
      render(
        <BulkOperationsToolbar
          rowIds={mockRowIds}
          selectedIds={new Set()}
          onSelectionChange={onSelectionChange}
        />
      );
      expect(screen.getByText('Hamısını seç')).toBeInTheDocument();
    });

    it('should select all rows when clicked', () => {
      const onSelectionChange = vi.fn();
      render(
        <BulkOperationsToolbar
          rowIds={mockRowIds}
          selectedIds={new Set()}
          onSelectionChange={onSelectionChange}
        />
      );
      
      fireEvent.click(screen.getByText('Hamısını seç'));
      expect(onSelectionChange).toHaveBeenCalledWith(new Set(mockRowIds));
    });

    it('should deselect all when all are selected', () => {
      const onSelectionChange = vi.fn();
      render(
        <BulkOperationsToolbar
          rowIds={mockRowIds}
          selectedIds={new Set(mockRowIds)}
          onSelectionChange={onSelectionChange}
        />
      );
      
      fireEvent.click(screen.getByText('Hamısını ləğv et'));
      expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    });

    it('should show bulk action buttons when rows are selected', () => {
      render(
        <BulkOperationsToolbar
          rowIds={mockRowIds}
          selectedIds={new Set([1, 2])}
          onSelectionChange={vi.fn()}
          onBulkApprove={vi.fn()}
          onBulkReject={vi.fn()}
          onBulkReturn={vi.fn()}
        />
      );
      
      expect(screen.getByText('Təsdiqlə')).toBeInTheDocument();
      expect(screen.getByText('Rədd et')).toBeInTheDocument();
      expect(screen.getByText('Qaytar')).toBeInTheDocument();
    });

    it('should show selection count badge', () => {
      render(
        <BulkOperationsToolbar
          rowIds={mockRowIds}
          selectedIds={new Set([1, 2])}
          onSelectionChange={vi.fn()}
        />
      );
      
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('RowCheckbox', () => {
    it('should show checked state when selected', () => {
      render(
        <RowCheckbox
          rowId={1}
          selectedIds={new Set([1, 2])}
          onToggle={vi.fn()}
        />
      );
      
      const checkbox = screen.getByRole('button');
      expect(checkbox).toBeInTheDocument();
    });

    it('should call onToggle when clicked', () => {
      const onToggle = vi.fn();
      render(
        <RowCheckbox
          rowId={1}
          selectedIds={new Set()}
          onToggle={onToggle}
        />
      );
      
      fireEvent.click(screen.getByRole('button'));
      expect(onToggle).toHaveBeenCalledWith(1);
    });
  });

  describe('useBulkSelection hook', () => {
    it('should toggle selection', () => {
      const TestComponent = () => {
        const { selectedIds, toggleSelection, hasSelection } = useBulkSelection([1, 2, 3]);
        return (
          <div>
            <span data-testid="count">{selectedIds.size}</span>
            <span data-testid="hasSelection">{hasSelection ? 'yes' : 'no'}</span>
            <button onClick={() => toggleSelection(1)}>Toggle</button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId('count').textContent).toBe('0');
      
      fireEvent.click(screen.getByText('Toggle'));
      expect(screen.getByTestId('count').textContent).toBe('1');
      expect(screen.getByTestId('hasSelection').textContent).toBe('yes');
    });

    it('should select all', () => {
      const TestComponent = () => {
        const { selectedIds, selectAll } = useBulkSelection([1, 2, 3]);
        return (
          <div>
            <span data-testid="count">{selectedIds.size}</span>
            <button onClick={selectAll}>Select All</button>
          </div>
        );
      };

      render(<TestComponent />);
      fireEvent.click(screen.getByText('Select All'));
      expect(screen.getByTestId('count').textContent).toBe('3');
    });

    it('should clear selection', () => {
      const TestComponent = () => {
        const { selectedIds, selectAll, clearSelection } = useBulkSelection([1, 2, 3]);
        return (
          <div>
            <span data-testid="count">{selectedIds.size}</span>
            <button onClick={selectAll}>Select All</button>
            <button onClick={clearSelection}>Clear</button>
          </div>
        );
      };

      render(<TestComponent />);
      fireEvent.click(screen.getByText('Select All'));
      fireEvent.click(screen.getByText('Clear'));
      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('should select range', () => {
      const TestComponent = () => {
        const { selectedIds, selectRange } = useBulkSelection([1, 2, 3, 4, 5]);
        return (
          <div>
            <span data-testid="count">{selectedIds.size}</span>
            <button onClick={() => selectRange(2, 4)}>Select Range</button>
          </div>
        );
      };

      render(<TestComponent />);
      fireEvent.click(screen.getByText('Select Range'));
      expect(screen.getByTestId('count').textContent).toBe('3'); // 2, 3, 4
    });
  });

  describe('BulkActionConfirmDialog', () => {
    it('should render dialog with correct action text for approve', () => {
      render(
        <BulkActionConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          action="approve"
          rowCount={5}
        />
      );
      
      expect(screen.getByText('Toplu təsdiqləmə')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render dialog with correct action text for reject', () => {
      render(
        <BulkActionConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          action="reject"
          rowCount={3}
        />
      );
      
      expect(screen.getByText('Toplu rədd etmə')).toBeInTheDocument();
    });

    it('should call onConfirm when confirm button clicked', () => {
      const onConfirm = vi.fn();
      render(
        <BulkActionConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={onConfirm}
          action="approve"
          rowCount={5}
        />
      );
      
      fireEvent.click(screen.getByText('Təsdiqlə'));
      expect(onConfirm).toHaveBeenCalled();
    });

    it('should call onClose when cancel button clicked', () => {
      const onClose = vi.fn();
      render(
        <BulkActionConfirmDialog
          isOpen={true}
          onClose={onClose}
          onConfirm={vi.fn()}
          action="approve"
          rowCount={5}
        />
      );
      
      fireEvent.click(screen.getByText('Ləğv et'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should show delete warning for delete action', () => {
      render(
        <BulkActionConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          action="delete"
          rowCount={5}
        />
      );
      
      expect(screen.getByText(/Diqqət/)).toBeInTheDocument();
      expect(screen.getByText(/geri qaytarıla bilməz/)).toBeInTheDocument();
    });
  });
});
