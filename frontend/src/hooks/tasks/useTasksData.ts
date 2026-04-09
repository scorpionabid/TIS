import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService, Task, TasksListResponse } from "@/services/tasks";
import { User } from "@/types/user";
import { TaskFilterState } from "./useTaskFilters";
import { TaskTabValue } from "./useTaskPermissions";

export type SortField = "title" | "category" | "priority" | "status" | "deadline" | "assignee";
export type SortDirection = "asc" | "desc";

const DEFAULT_PAGE_SIZE = 25;
const TASKS_REFETCH_INTERVAL_MS = 60_000;

type UseTasksDataParams = {
  currentUser: User | null;
  activeTab: TaskTabValue;
  hasAccess: boolean;
  canSeeRegionTab: boolean;
  canSeeSectorTab: boolean;
  filters: TaskFilterState;
};

export function useTasksData({
  currentUser,
  activeTab,
  hasAccess,
  canSeeRegionTab,
  canSeeSectorTab,
  filters,
}: UseTasksDataParams) {
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPageState] = useState(DEFAULT_PAGE_SIZE);
  const queryClient = useQueryClient();

  const isAssignedTab = activeTab === "assigned";
  const isCreatedTab = activeTab === "created";
  const isStatisticsTab = activeTab === "statistics";
  const hasScopeAccess = true; // Roles are handled by backend permissions

  // All sorting is now done on the server-side
  const serverSortableFields: Partial<Record<SortField, string>> = {
    title: "title",
    category: "category",
    deadline: "deadline",
    priority: "priority",
    status: "status",
    assignee: "title", // Map assignee to title for backward compatibility
  };

  const queryFilters = useMemo(() => {
    const nextFilters: Record<string, unknown> = {
      page,
      per_page: activeTab === 'statistics' ? 1000 : perPage,
    };

    if (isCreatedTab) {
      if (filters.institutionLevel !== "all") {
        nextFilters.institution_level = filters.institutionLevel;
      }
    }

    // All fields are now server-sortable
    const apiSortField = serverSortableFields[sortField] || sortField;
    nextFilters.sort_by = apiSortField;
    nextFilters.sort_direction = sortDirection;

    if (filters.searchTerm) {
      nextFilters.search = filters.searchTerm;
    }
    if (filters.statusFilter !== "all") {
      nextFilters.status = filters.statusFilter;
    }
    if (filters.priorityFilter !== "all") {
      nextFilters.priority = filters.priorityFilter;
    }
    if (filters.sourceFilter !== "all") {
      nextFilters.source = filters.sourceFilter;
    }
    if (filters.deadlineFilter !== "all") {
      nextFilters.deadline_filter =
        filters.deadlineFilter === "overdue" ? "overdue" : "approaching";
    }
    if (filters.dateRange !== "all") {
      nextFilters.date_range = filters.dateRange;
    }

    return nextFilters;
  }, [
    filters.sourceFilter,
    filters.priorityFilter,
    filters.searchTerm,
    filters.statusFilter,
    filters.institutionLevel,
    page,
    perPage,
    activeTab,
    sortDirection,
    sortField,
  ]);

  const queryKey = useMemo(
    () => ["tasks", activeTab, currentUser?.institution?.id ?? "global", queryFilters],
    [currentUser?.institution?.id, queryFilters, activeTab]
  );

  const tasksQuery = useQuery<TasksListResponse, Error>({
    queryKey,
    queryFn: () => isAssignedTab
      ? taskService.getAssignedToMe(queryFilters)
      : taskService.getAllWithStatistics(queryFilters),
    enabled: hasAccess && hasScopeAccess,
    refetchOnWindowFocus: true,
    refetchInterval: hasAccess && hasScopeAccess ? TASKS_REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  });

  // Statistics tab üçün ayrıca assigned tasks query
  // (RegionOperator-a təyin edilmiş tapşırıqları statistikada göstərmək üçün)
  const assignedForStatsQuery = useQuery<TasksListResponse, Error>({
    queryKey: ["tasks", "assigned-for-stats", currentUser?.id],
    queryFn: () => taskService.getAssignedToMe({ page: 1, per_page: 1000 }),
    enabled: hasAccess && isStatisticsTab,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const tasksResponse = tasksQuery.data;
  const rawTasks: Task[] = Array.isArray(tasksResponse?.data) ? tasksResponse.data : [];
  const isLoading = tasksQuery.isLoading;
  const isFetching = tasksQuery.isFetching;
  const error = tasksQuery.error as Error | null | undefined;
  const pagination = tasksResponse?.pagination;

  // Use statistics from API response (server-side calculated on filtered data)
  const stats = useMemo(() => {
    // Backend now returns statistics in the response
    const apiStatistics = (tasksResponse as any)?.statistics;

    if (apiStatistics) {
      return {
        total: apiStatistics.total || 0,
        pending: apiStatistics.pending || 0,
        in_progress: apiStatistics.in_progress || 0,
        completed: apiStatistics.completed || 0,
        overdue: apiStatistics.overdue || 0,
      };
    }

    // Fallback to pagination total if statistics not available (backward compatibility)
    return {
      total: pagination?.total ?? 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
    };
  }, [tasksResponse, pagination?.total]);

  // All sorting is now server-side, no need for client-side sorting
  const tasks = rawTasks;

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
      setPage(1);
    },
    [sortField]
  );

  const refreshTasks = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tasks", activeTab], exact: false });
    await queryClient.refetchQueries({ queryKey: ["tasks", activeTab], exact: false });
  }, [queryClient, activeTab]);

  const handlePerPageChange = useCallback((value: number) => {
    setPerPageState(value);
    setPage(1);
  }, []);

  const assignedTasks: Task[] = Array.isArray(assignedForStatsQuery.data?.data)
    ? assignedForStatsQuery.data.data
    : [];

  return {
    tasks,
    stats,
    isLoading,
    isFetching,
    error,
    sortField,
    sortDirection,
    handleSort,
    refreshTasks,
    rawTasks,
    page,
    perPage,
    setPage,
    setPerPage: handlePerPageChange,
    pagination,
    assignedTasks,
  };
}
