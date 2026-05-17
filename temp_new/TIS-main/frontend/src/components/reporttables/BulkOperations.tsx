/**
 * BulkOperations Component
 * Provides checkbox selection and bulk actions for report table rows
 */

import React, { useState, useCallback } from 'react';
import { CheckSquare, Square, Trash2, CheckCircle2, XCircle, RotateCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BulkOperationsProps {
  rowIds: (string | number)[];
  selectedIds: Set<string | number>;
  onSelectionChange: (selectedIds: Set<string | number>) => void;
  onBulkApprove?: (ids: (string | number)[]) => Promise<void>;
  onBulkReject?: (ids: (string | number)[]) => Promise<void>;
  onBulkReturn?: (ids: (string | number)[]) => Promise<void>;
  onBulkDelete?: (ids: (string | number)[]) => Promise<void>;
  onBulkExport?: (ids: (string | number)[]) => Promise<void>;
  disabled?: boolean;
  showApprove?: boolean;
  showReject?: boolean;
  showReturn?: boolean;
  showDelete?: boolean;
  showExport?: boolean;
}

export function BulkOperationsToolbar({
  rowIds,
  selectedIds,
  onSelectionChange,
  onBulkApprove,
  onBulkReject,
  onBulkReturn,
  onBulkDelete,
  onBulkExport,
  disabled = false,
  showApprove = true,
  showReject = true,
  showReturn = true,
  showDelete = false,
  showExport = true,
}: BulkOperationsProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const allSelected = selectedIds.size === rowIds.length && rowIds.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < rowIds.length;
  const hasSelection = selectedIds.size > 0;

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(rowIds));
    }
  }, [allSelected, rowIds, onSelectionChange]);

  const handleBulkAction = useCallback(async (
    action: 'approve' | 'reject' | 'return' | 'delete' | 'export',
    handler?: (ids: (string | number)[]) => Promise<void>
  ) => {
    if (!handler || selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      const idsArray = Array.from(selectedIds);
      await handler(idsArray);
      onSelectionChange(new Set()); // Clear selection after success
    } catch (error) {
      toast.error(`Toplu əməliyyat zamanı xəta baş verdi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, onSelectionChange]);

  if (rowIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex-wrap">
      {/* Select All Checkbox */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSelectAll}
        disabled={disabled || isProcessing}
        className="gap-2"
      >
        {allSelected ? (
          <CheckSquare className="h-4 w-4 text-emerald-600" />
        ) : someSelected ? (
          <div className="relative">
            <Square className="h-4 w-4 text-emerald-600" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-emerald-600 rounded-sm" />
            </div>
          </div>
        ) : (
          <Square className="h-4 w-4 text-gray-400" />
        )}
        <span className="text-sm">
          {allSelected ? 'Hamısını ləğv et' : 'Hamısını seç'}
        </span>
        {hasSelection && (
          <Badge variant="secondary" className="ml-1 text-xs">
            {selectedIds.size}
          </Badge>
        )}
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Bulk Action Buttons */}
      {showApprove && hasSelection && onBulkApprove && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkAction('approve', onBulkApprove)}
          disabled={disabled || isProcessing}
          className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Təsdiqlə
        </Button>
      )}

      {showReject && hasSelection && onBulkReject && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkAction('reject', onBulkReject)}
          disabled={disabled || isProcessing}
          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <XCircle className="h-4 w-4" />
          Rədd et
        </Button>
      )}

      {showReturn && hasSelection && onBulkReturn && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkAction('return', onBulkReturn)}
          disabled={disabled || isProcessing}
          className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        >
          <RotateCcw className="h-4 w-4" />
          Qaytar
        </Button>
      )}

      {showDelete && hasSelection && onBulkDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkAction('delete', onBulkDelete)}
          disabled={disabled || isProcessing}
          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Sil
        </Button>
      )}

      {showExport && hasSelection && onBulkExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkAction('export', onBulkExport)}
          disabled={disabled || isProcessing}
          className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      )}

      {hasSelection && (
        <span className="text-sm text-gray-500 ml-auto">
          {selectedIds.size} / {rowIds.length} seçilib
        </span>
      )}
    </div>
  );
}

interface RowCheckboxProps {
  rowId: string | number;
  selectedIds: Set<string | number>;
  onToggle: (id: string | number) => void;
  disabled?: boolean;
}

export function RowCheckbox({ rowId, selectedIds, onToggle, disabled }: RowCheckboxProps) {
  const isSelected = selectedIds.has(rowId);

  return (
    <button
      onClick={() => onToggle(rowId)}
      disabled={disabled}
      className="p-1 rounded hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
      type="button"
    >
      {isSelected ? (
        <CheckSquare className="h-5 w-5 text-emerald-600" />
      ) : (
        <Square className="h-5 w-5 text-gray-300" />
      )}
    </button>
  );
}

// Hook for managing bulk selection
export function useBulkSelection(rowIds: (string | number)[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const toggleSelection = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(rowIds));
  }, [rowIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectRange = useCallback((startId: string | number, endId: string | number) => {
    const startIndex = rowIds.indexOf(startId);
    const endIndex = rowIds.indexOf(endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    const rangeIds = rowIds.slice(minIndex, maxIndex + 1);
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      rangeIds.forEach((id) => newSet.add(id));
      return newSet;
    });
  }, [rowIds]);

  return {
    selectedIds,
    setSelectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    selectRange,
    hasSelection: selectedIds.size > 0,
    selectionCount: selectedIds.size,
  };
}
