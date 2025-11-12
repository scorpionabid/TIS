import { useCallback, useEffect, useMemo, useState } from "react";
import { Task } from "@/services/tasks";
import { User } from "@/types/user";
import { getTaskOrigin } from "@/utils/taskActions";

export type TaskTabValue = "region" | "sector";
export type TaskTab = { value: TaskTabValue; label: string };

type UseTaskPermissionsResult = {
  hasAccess: boolean;
  canSeeRegionTab: boolean;
  canSeeSectorTab: boolean;
  availableTabs: TaskTab[];
  activeTab: TaskTabValue;
  setActiveTab: (tab: TaskTabValue) => void;
  currentTabLabel: string;
  showCreateButton: boolean;
  canManageRegionTasks: boolean;
  canManageSectorTasks: boolean;
  canEditTaskItem: (task: Task) => boolean;
  canDeleteTaskItem: (task: Task) => boolean;
  currentUserRole: string | null;
};

const ADMIN_ROLES = ["superadmin", "regionadmin", "sektoradmin"];

export function useTaskPermissions(currentUser: User | null): UseTaskPermissionsResult {
  const normalizedRole = useMemo(() => {
    if (!currentUser?.role) return null;
    return currentUser.role.toString().toLowerCase();
  }, [currentUser?.role]);

  const hasAccess = Boolean(normalizedRole && ADMIN_ROLES.includes(normalizedRole));

  const canSeeRegionTab = Boolean(normalizedRole && ["superadmin", "regionadmin"].includes(normalizedRole));
  const canSeeSectorTab = Boolean(normalizedRole && ["superadmin", "regionadmin", "sektoradmin"].includes(normalizedRole));

  const availableTabs = useMemo(
    () =>
      (
        [
          canSeeRegionTab && { value: "region" as const, label: "Regional Tapşırıqlar" },
          canSeeSectorTab && { value: "sector" as const, label: "Sektor Tapşırıqları" },
        ].filter(Boolean) as TaskTab[]
      ),
    [canSeeRegionTab, canSeeSectorTab]
  );

  const [activeTab, setActiveTab] = useState<TaskTabValue>("region");

  useEffect(() => {
    if (availableTabs.length === 0) return;
    setActiveTab((prev) => {
      if (availableTabs.some((tab) => tab.value === prev)) {
        return prev;
      }
      return availableTabs[0]?.value ?? "region";
    });
  }, [availableTabs]);

  const canCreateRegionTask = Boolean(normalizedRole && ["superadmin", "regionadmin"].includes(normalizedRole));
  const canCreateSectorTask = Boolean(normalizedRole && ["superadmin", "sektoradmin"].includes(normalizedRole));

  const canManageRegionTasks = canCreateRegionTask;
  const canManageSectorTasks = Boolean(normalizedRole && ["superadmin", "regionadmin", "sektoradmin"].includes(normalizedRole));

  const showCreateButton =
    (activeTab === "region" && canCreateRegionTask) ||
    (activeTab === "sector" && canCreateSectorTask);

  const currentTabLabel = availableTabs.find((tab) => tab.value === activeTab)?.label ?? "";

  const canEditTaskItem = useCallback(
    (task: Task): boolean => {
      if (normalizedRole === "superadmin") {
        return true;
      }

      if (task.created_by === currentUser?.id) {
        return true;
      }

      const origin = getTaskOrigin(task);

      if (origin === "region") {
        return canManageRegionTasks;
      }

      if (origin === "sector") {
        return canManageSectorTasks;
      }

      return false;
    },
    [canManageRegionTasks, canManageSectorTasks, currentUser?.id, normalizedRole]
  );

  const canDeleteTaskItem = useCallback(
    (task: Task): boolean => {
      if (normalizedRole === "superadmin") {
        return true;
      }
      return task.created_by === currentUser?.id;
    },
    [currentUser?.id, normalizedRole]
  );

  return {
    hasAccess,
    canSeeRegionTab,
    canSeeSectorTab,
    availableTabs,
    activeTab,
    setActiveTab,
    currentTabLabel,
    showCreateButton,
    canManageRegionTasks,
    canManageSectorTasks,
    canEditTaskItem,
    canDeleteTaskItem,
    currentUserRole: normalizedRole,
  };
}
