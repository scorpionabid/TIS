import { useState, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

export type TabType = 'region' | 'sector';
export type SortField = 'deadline' | 'priority' | 'status' | 'title' | 'created_at';
export type SortDirection = 'asc' | 'desc';

export function useAssignedTasksFilters() {
  const [activeTab, setActiveTab] = useState<TabType>('region');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('deadline');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const isFiltering = useMemo(() => {
    return Boolean(debouncedSearchTerm) || statusFilter !== 'all' || priorityFilter !== 'all';
  }, [debouncedSearchTerm, statusFilter, priorityFilter]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setPage(1);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  }, [sortField]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  return {
    // Tab
    activeTab,
    setActiveTab: handleTabChange,
    // Search
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    // Filters
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    // Sorting
    sortField,
    sortDirection,
    handleSort,
    // Pagination
    page,
    setPage: handlePageChange,
    perPage,
    setPerPage: handlePerPageChange,
    // Helpers
    isFiltering,
    clearFilters,
  };
}
