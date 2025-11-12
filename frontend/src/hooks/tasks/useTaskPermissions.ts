import { useCallback, useEffect, useMemo, useState } from "react";
import { Task } from "@/services/tasks";
import { User } from "@/types/user";
import { getTaskOrigin } from "@/utils/taskActions";
import { useModuleAccess } from "@/hooks/useModuleAccess";

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

export function useTaskPermissions(currentUser: User | null): UseTaskPermissionsResult {
  const moduleAccess = useModuleAccess('tasks');
  const normalizedRole = useMemo(() => {
    if (!currentUser?.role) return null;
    return currentUser.role.toString().toLowerCase();
  }, [currentUser?.role]);

  const hasAccess = moduleAccess.canView;
  const regionOperatorView = normalizedRole === 'regionoperator' && moduleAccess.canView;

  const canSeeRegionTab = Boolean(
    normalizedRole &&
      (["superadmin", "regionadmin"].includes(normalizedRole) || regionOperatorView)
  );
  const canSeeSectorTab = Boolean(
    normalizedRole &&
      (["superadmin", "regionadmin", "sektoradmin"].includes(normalizedRole) || regionOperatorView)
  );

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

  const regionOperatorCanCreate =
    normalizedRole === 'regionoperator' && moduleAccess.canCreate;

  const canCreateRegionTask = Boolean(
    normalizedRole &&
      (["superadmin", "regionadmin"].includes(normalizedRole) || regionOperatorCanCreate)
  );

  const canCreateSectorTask = Boolean(
    normalizedRole &&
      (["superadmin", "regionadmin", "sektoradmin"].includes(normalizedRole) || regionOperatorCanCreate)
  );

  const canManageRegionTasks =
    canCreateRegionTask || (normalizedRole === 'regionoperator' && moduleAccess.canEdit);
  const canManageSectorTasks = Boolean(
    normalizedRole &&
      (["superadmin", "regionadmin", "sektoradmin"].includes(normalizedRole) ||
        (normalizedRole === 'regionoperator' && moduleAccess.canEdit))
  );

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
        return canManageRegionTasks || moduleAccess.canEdit;
      }

      if (origin === "sector") {
        return canManageSectorTasks || moduleAccess.canEdit;
      }

      return moduleAccess.canEdit;
    },
    [canManageRegionTasks, canManageSectorTasks, currentUser?.id, normalizedRole, moduleAccess.canEdit]
  );

  const canDeleteTaskItem = useCallback(
    (task: Task): boolean => {
      if (normalizedRole === "superadmin") {
        return true;
      }
      if (task.created_by === currentUser?.id) {
        return true;
      }
      return moduleAccess.canDelete;
    },
    [currentUser?.id, normalizedRole, moduleAccess.canDelete]
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
