import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService, Task } from "@/services/tasks";
import { categoryLabels } from "@/components/tasks/config/taskFormFields";
import { User } from "@/types/user";
import { TaskFilterState } from "./useTaskFilters";
import { TaskTabValue } from "./useTaskPermissions";

export type SortField = "title" | "category" | "priority" | "status" | "deadline" | "assignee";
export type SortDirection = "asc" | "desc";

const DEFAULT_PAGE_SIZE = 25;

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
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPageState] = useState(DEFAULT_PAGE_SIZE);
  const queryClient = useQueryClient();

  const scope = activeTab === "region" ? "region" : "sector";
  const hasScopeAccess = scope === "region" ? canSeeRegionTab : canSeeSectorTab;

  const serverSortableFields: Partial<Record<SortField, "created_at" | "deadline" | "priority" | "status">> = {
    deadline: "deadline",
    priority: "priority",
    status: "status",
  };

  const queryFilters = useMemo(() => {
    const nextFilters: Record<string, unknown> = {
      origin_scope: scope,
      page,
      per_page: perPage,
    };

    const apiSortField = serverSortableFields[sortField];
    if (apiSortField) {
      nextFilters.sort_by = apiSortField;
      nextFilters.sort_direction = sortDirection;
    }

    if (filters.searchTerm) {
      nextFilters.search = filters.searchTerm;
    }
    if (filters.statusFilter !== "all") {
      nextFilters.status = filters.statusFilter;
    }
    if (filters.priorityFilter !== "all") {
      nextFilters.priority = filters.priorityFilter;
    }
    if (filters.categoryFilter !== "all") {
      nextFilters.category = filters.categoryFilter;
    }
    if (filters.deadlineFilter !== "all") {
      nextFilters.deadline_filter =
        filters.deadlineFilter === "overdue" ? "overdue" : "approaching";
    }

    return nextFilters;
  }, [
    filters.categoryFilter,
    filters.priorityFilter,
    filters.searchTerm,
    filters.statusFilter,
    page,
    perPage,
    scope,
    sortDirection,
    sortField,
  ]);

  const queryKey = useMemo(
    () => ["tasks", scope, currentUser?.institution?.id ?? "global", queryFilters],
    [currentUser?.institution?.id, queryFilters, scope]
  );

  const tasksQuery = useQuery({
    queryKey,
    queryFn: () => taskService.getAll(queryFilters, false),
    enabled: hasAccess && hasScopeAccess,
    keepPreviousData: true,
  });

  const tasksResponse = tasksQuery.data;
  const rawTasks: Task[] = Array.isArray(tasksResponse?.data) ? tasksResponse.data : [];
  const isLoading = tasksQuery.isLoading;
  const isFetching = tasksQuery.isFetching;
  const error = tasksQuery.error as Error | null | undefined;
  const pagination = tasksResponse?.pagination;

  const stats = useMemo(() => {
    const total = pagination?.total ?? rawTasks.length;
    const pending = rawTasks.filter((task) => task.status === "pending").length;
    const inProgress = rawTasks.filter((task) => task.status === "in_progress").length;
    const completed = rawTasks.filter((task) => task.status === "completed").length;
    const overdue = rawTasks.filter((task) => {
      if (!task.deadline) return false;
      const deadlineDate = new Date(task.deadline);
      return deadlineDate < new Date() && task.status !== "completed";
    }).length;

    return { total, pending, in_progress: inProgress, completed, overdue };
  }, [pagination?.total, rawTasks]);

  const tasks = useMemo(() => {
    if (serverSortableFields[sortField]) {
      return rawTasks;
    }

    const sorted = [...rawTasks];
    sorted.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortField) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "category":
          aValue = (categoryLabels[a.category] || a.category || "").toLowerCase();
          bValue = (categoryLabels[b.category] || b.category || "").toLowerCase();
          break;
        case "assignee":
          aValue = (a.assignee?.name || "").toLowerCase();
          bValue = (b.assignee?.name || "").toLowerCase();
          break;
        default:
          break;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rawTasks, sortDirection, sortField]);

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
    await queryClient.invalidateQueries({ queryKey: ["tasks", scope], exact: false });
    await queryClient.refetchQueries({ queryKey: ["tasks", scope], exact: false });
  }, [queryClient, scope]);

  const handlePerPageChange = useCallback((value: number) => {
    setPerPageState(value);
    setPage(1);
  }, []);

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
  };
}
