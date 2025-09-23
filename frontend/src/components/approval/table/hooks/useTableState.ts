import React, { useState, useCallback } from 'react';
import { ResponseFilters } from '../../../../services/surveyResponseApproval';

interface PaginationData {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface UseTableStateProps {
  onFiltersChange: (key: keyof ResponseFilters, value: any) => void;
  onBulkSelect: (responseIds: number[]) => void;
  selectedResponses: number[];
  responses: any[];
  pagination?: PaginationData;
}

export const useTableState = ({
  onFiltersChange,
  onBulkSelect,
  selectedResponses,
  responses,
  pagination
}: UseTableStateProps) => {
  // Local state
  const [selectAll, setSelectAll] = useState(false);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Handle individual checkbox selection
  const handleResponseCheckbox = useCallback((responseId: number, checked: boolean) => {
    console.log('☑️ [CHECKBOX] Individual checkbox changed:', {
      responseId,
      checked,
      currentSelected: selectedResponses
    });

    if (checked) {
      // Add to selection if not already selected
      if (!selectedResponses.includes(responseId)) {
        const newSelection = [...selectedResponses, responseId];
        onBulkSelect(newSelection);
        console.log('✅ [CHECKBOX] Added to selection:', newSelection);
      }
    } else {
      // Remove from selection
      const newSelection = selectedResponses.filter(id => id !== responseId);
      onBulkSelect(newSelection);
      console.log('❌ [CHECKBOX] Removed from selection:', newSelection);
    }
  }, [selectedResponses, onBulkSelect]);

  // Handle select all/none
  const handleSelectAll = useCallback((checked: boolean) => {
    console.log('☑️ [SELECT ALL] Select all changed:', { checked, responsesCount: responses.length });

    if (checked) {
      const allIds = responses.map(r => r.id);
      onBulkSelect(allIds);
      setSelectAll(true);
    } else {
      onBulkSelect([]);
      setSelectAll(false);
    }
  }, [responses, onBulkSelect]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    console.log('📄 [PAGINATION] Page changed:', { page });
    onFiltersChange('page', page);
  }, [onFiltersChange]);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    onFiltersChange('per_page', pageSize);
    onFiltersChange('page', 1); // Reset to first page when changing page size
  }, [onFiltersChange]);

  // Handle sorting
  const handleSort = useCallback((field: string) => {
    console.log('🔄 [SORT] Sort changed:', { field, currentDirection: sortDirection });

    let newDirection: 'asc' | 'desc' = 'asc';

    if (sortField === field) {
      // Toggle direction if same field
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }

    setSortField(field);
    setSortDirection(newDirection);
    onFiltersChange('sort_by', field);
    onFiltersChange('sort_direction', newDirection);
  }, [sortField, sortDirection, onFiltersChange]);

  // Update selectAll state when selectedResponses changes
  React.useEffect(() => {
    const isAllSelected = responses.length > 0 && selectedResponses.length === responses.length;
    setSelectAll(isAllSelected);
  }, [selectedResponses.length, responses.length]);

  return {
    // State
    selectAll,
    setSelectAll,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,

    // Handlers
    handleResponseCheckbox,
    handleSelectAll,
    handlePageChange,
    handlePageSizeChange,
    handleSort,

    // Computed values
    isAllSelected: selectAll,
    hasSelection: selectedResponses.length > 0,
    selectedCount: selectedResponses.length,
    totalCount: responses.length,

    // Pagination helpers
    currentPage: pagination?.current_page || 1,
    totalPages: pagination?.last_page || 1,
    pageSize: pagination?.per_page || 10,
    totalItems: pagination?.total || 0
  };
};