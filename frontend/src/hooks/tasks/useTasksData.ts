import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService, Task } from "@/services/tasks";
import { User } from "@/types/user";
import { TaskFilterState } from "./useTaskFilters";
import { TaskTabValue } from "./useTaskPermissions";
import { categoryLabels } from "@/components/tasks/config/taskFormFields";

export type SortField = "title" | "category" | "priority" | "status" | "deadline" | "assignee";
export type SortDirection = "asc" | "desc";

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
  const queryClient = useQueryClient();

  const regionTasksQuery = useQuery({
    queryKey: ["tasks", "region", currentUser?.institution?.id],
    queryFn: () => taskService.getAll({ origin_scope: "region" }),
    enabled: hasAccess && canSeeRegionTab,
  });

  const sectorTasksQuery = useQuery({
    queryKey: ["tasks", "sector", currentUser?.institution?.id],
    queryFn: () => taskService.getAll({ origin_scope: "sector" }),
    enabled: hasAccess && canSeeSectorTab,
  });

  const activeTasksQuery = activeTab === "region" ? regionTasksQuery : sectorTasksQuery;

  const tasksResponse = activeTasksQuery.data;
  const rawTasks: Task[] = Array.isArray(tasksResponse?.data) ? tasksResponse.data : [];
  const isLoading = activeTasksQuery.isLoading || activeTasksQuery.isFetching;
  const error = activeTasksQuery.error as Error | null | undefined;

  const stats = useMemo(() => {
    const total = rawTasks.length;
    const pending = rawTasks.filter((task) => task.status === "pending").length;
    const inProgress = rawTasks.filter((task) => task.status === "in_progress").length;
    const completed = rawTasks.filter((task) => task.status === "completed").length;
    const overdue = rawTasks.filter((task) => {
      if (!task.deadline) return false;
      const deadlineDate = new Date(task.deadline);
      return deadlineDate < new Date() && task.status !== "completed";
    }).length;

    return { total, pending, in_progress: inProgress, completed, overdue };
  }, [rawTasks]);

  const tasks = useMemo(() => {
    if (!hasAccess) return [];
    const { searchTerm, statusFilter, priorityFilter, categoryFilter } = filters;
    let filtered = [...rawTasks];

    if (searchTerm) {
      const lowered = searchTerm.toLowerCase();
      filtered = filtered.filter((task) => {
        const titleMatch = task.title.toLowerCase().includes(lowered);
        const descriptionMatch =
          task.description && task.description.toLowerCase().includes(lowered);
        const assigneeMatch =
          task.assignee?.name && task.assignee.name.toLowerCase().includes(lowered);
        return titleMatch || Boolean(descriptionMatch) || Boolean(assigneeMatch);
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((task) => task.priority === priorityFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((task) => task.category === categoryFilter);
    }

    const sorted = filtered.sort((a, b) => {
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
        case "priority": {
          const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 } as Record<string, number>;
          aValue = priorityOrder[a.priority] ?? 0;
          bValue = priorityOrder[b.priority] ?? 0;
          break;
        }
        case "status": {
          const statusOrder = { pending: 1, in_progress: 2, review: 3, completed: 4, cancelled: 5 } as Record<string, number>;
          aValue = statusOrder[a.status] ?? 0;
          bValue = statusOrder[b.status] ?? 0;
          break;
        }
        case "deadline":
          aValue = a.deadline ? new Date(a.deadline).getTime() : 0;
          bValue = b.deadline ? new Date(b.deadline).getTime() : 0;
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
  }, [filters, hasAccess, rawTasks, sortDirection, sortField]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField]
  );

  const refreshTasks = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false });
    await queryClient.refetchQueries({ queryKey: ["tasks"], exact: false });
  }, [queryClient]);

  return {
    tasks,
    stats,
    isLoading,
    error,
    sortField,
    sortDirection,
    handleSort,
    refreshTasks,
    rawTasks,
  };
}
