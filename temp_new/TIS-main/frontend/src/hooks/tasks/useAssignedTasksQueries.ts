import { useQuery } from "@tanstack/react-query";
import { taskService, Task } from "@/services/tasks";

interface AssignedTasksFilters {
  search?: string;
  status?: string;
  priority?: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  page: number;
  perPage: number;
}

interface AssignedTasksMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

interface AssignedTasksStatistics {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

interface AssignedTasksResponse {
  data?: Task[];
  meta?: AssignedTasksMeta;
  statistics?: AssignedTasksStatistics;
}

interface UseAssignedTasksQueriesParams {
  hasAccess: boolean;
  activeTab: "region" | "sector";
  currentUserId?: number;
  filters: AssignedTasksFilters;
}

export function useAssignedTasksQueries({
  hasAccess,
  activeTab,
  currentUserId,
  filters,
}: UseAssignedTasksQueriesParams) {
  const queryParams = {
    search: filters.search || undefined,
    status: filters.status !== "all" ? (filters.status as Task["status"]) : undefined,
    priority: filters.priority !== "all" ? (filters.priority as Task["priority"]) : undefined,
    sort_by: filters.sortField,
    sort_direction: filters.sortDirection,
    page: filters.page,
    per_page: filters.perPage,
  };

  const regionQuery = useQuery({
    queryKey: ["assigned-tasks", "region", currentUserId, filters],
    queryFn: () => taskService.getAssignedToMe({ ...queryParams, origin_scope: "region" }),
    enabled: hasAccess && activeTab === "region",
  });

  const sectorQuery = useQuery({
    queryKey: ["assigned-tasks", "sector", currentUserId, filters],
    queryFn: () => taskService.getAssignedToMe({ ...queryParams, origin_scope: "sector" }),
    enabled: hasAccess && activeTab === "sector",
  });

  const activeQuery = activeTab === "region" ? regionQuery : sectorQuery;
  const responseData = activeQuery.data as AssignedTasksResponse | undefined;

  return {
    tasks: Array.isArray(responseData?.data) ? responseData.data : [],
    meta: responseData?.meta,
    statistics: responseData?.statistics,
    isLoading: activeQuery.isLoading || activeQuery.isFetching,
    error: activeQuery.error as Error | null | undefined,
  };
}
