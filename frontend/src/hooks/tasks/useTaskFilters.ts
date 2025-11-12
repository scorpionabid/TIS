import { useCallback, useMemo, useState } from "react";

export type TaskFilterState = {
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  categoryFilter: string;
};

const DEFAULT_FILTERS: TaskFilterState = {
  searchTerm: "",
  statusFilter: "all",
  priorityFilter: "all",
  categoryFilter: "all",
};

export function useTaskFilters(initialState: Partial<TaskFilterState> = {}) {
  const mergedInitialState = { ...DEFAULT_FILTERS, ...initialState };

  const [searchTerm, setSearchTerm] = useState(mergedInitialState.searchTerm);
  const [statusFilter, setStatusFilter] = useState(mergedInitialState.statusFilter);
  const [priorityFilter, setPriorityFilter] = useState(mergedInitialState.priorityFilter);
  const [categoryFilter, setCategoryFilter] = useState(mergedInitialState.categoryFilter);

  const isFiltering = useMemo(() => {
    return (
      Boolean(searchTerm) ||
      statusFilter !== "all" ||
      priorityFilter !== "all" ||
      categoryFilter !== "all"
    );
  }, [searchTerm, statusFilter, priorityFilter, categoryFilter]);

  const clearFilters = useCallback(() => {
    setSearchTerm(DEFAULT_FILTERS.searchTerm);
    setStatusFilter(DEFAULT_FILTERS.statusFilter);
    setPriorityFilter(DEFAULT_FILTERS.priorityFilter);
    setCategoryFilter(DEFAULT_FILTERS.categoryFilter);
  }, []);

  const filters: TaskFilterState = {
    searchTerm,
    statusFilter,
    priorityFilter,
    categoryFilter,
  };

  return {
    ...filters,
    setSearchTerm,
    setStatusFilter,
    setPriorityFilter,
    setCategoryFilter,
    isFiltering,
    clearFilters,
  };
}
