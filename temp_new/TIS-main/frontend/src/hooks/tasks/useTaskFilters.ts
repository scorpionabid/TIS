import { useCallback, useMemo, useState } from "react";
import { useDebounce } from '@/hooks/useDebounce';

export type TaskFilterState = {
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  sourceFilter: string;
  deadlineFilter: string;
  institutionLevel: string;
  dateRange: string;
};

const DEFAULT_FILTERS: TaskFilterState = {
  searchTerm: "",
  statusFilter: "all",
  priorityFilter: "all",
  sourceFilter: "all",
  deadlineFilter: "all",
  institutionLevel: "all",
  dateRange: "all",
};

export function useTaskFilters(initialState: Partial<TaskFilterState> = {}) {
  const mergedInitialState = { ...DEFAULT_FILTERS, ...initialState };

  const [searchTerm, setSearchTerm] = useState(mergedInitialState.searchTerm);
  const [statusFilter, setStatusFilter] = useState(mergedInitialState.statusFilter);
  const [priorityFilter, setPriorityFilter] = useState(mergedInitialState.priorityFilter);
  const [sourceFilter, setSourceFilter] = useState(mergedInitialState.sourceFilter);
  const [deadlineFilter, setDeadlineFilter] = useState(mergedInitialState.deadlineFilter);
  const [institutionLevel, setInstitutionLevel] = useState(mergedInitialState.institutionLevel);
  const [dateRange, setDateRange] = useState(mergedInitialState.dateRange);

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const isFiltering = useMemo(() => {
    return (
      Boolean(searchTerm) ||
      statusFilter !== "all" ||
      priorityFilter !== "all" ||
      sourceFilter !== "all" ||
      deadlineFilter !== "all" ||
      institutionLevel !== "all" ||
      dateRange !== "all"
    );
  }, [searchTerm, statusFilter, priorityFilter, sourceFilter, deadlineFilter, institutionLevel, dateRange]);

  const clearFilters = useCallback(() => {
    setSearchTerm(DEFAULT_FILTERS.searchTerm);
    setStatusFilter(DEFAULT_FILTERS.statusFilter);
    setPriorityFilter(DEFAULT_FILTERS.priorityFilter);
    setSourceFilter(DEFAULT_FILTERS.sourceFilter);
    setDeadlineFilter(DEFAULT_FILTERS.deadlineFilter);
    setInstitutionLevel(DEFAULT_FILTERS.institutionLevel);
    setDateRange(DEFAULT_FILTERS.dateRange);
  }, []);

  const filters: TaskFilterState = {
    searchTerm,
    statusFilter,
    priorityFilter,
    sourceFilter,
    deadlineFilter,
    institutionLevel,
    dateRange,
  };

  return {
    ...filters,
    debouncedSearchTerm,
    setSearchTerm,
    setStatusFilter,
    setPriorityFilter,
    setSourceFilter,
    setDeadlineFilter,
    setInstitutionLevel,
    setDateRange,
    isFiltering,
    clearFilters,
  };
}
