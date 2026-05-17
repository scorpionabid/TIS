import { useCallback, useEffect, useMemo, useState } from "react";
import { Task } from "@/services/tasks";
import { User } from "@/types/user";
import { getTaskOrigin } from "@/utils/taskActions";
import { useModuleAccess } from "@/hooks/useModuleAccess";

export type TaskTabValue = "assigned" | "created" | "statistics";
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
    const roleVal = currentUser.role;
    if (Array.isArray(roleVal)) return roleVal[0]?.toString().toLowerCase() || null;
    if (typeof roleVal === 'object' && roleVal !== null) return (roleVal as any).name?.toString().toLowerCase() || null;
    return roleVal.toString().toLowerCase();
  }, [currentUser?.role]);

  const hasAccess = moduleAccess.canView;

  const canSeeRegionTab = Boolean(
    normalizedRole && ["superadmin", "regionadmin"].includes(normalizedRole)
  );
  const canSeeSectorTab = Boolean(
    normalizedRole && ["superadmin", "regionadmin"].includes(normalizedRole)
  );

  const availableTabs = useMemo(
    () =>
      (
        [
          hasAccess && { value: "assigned" as const, label: "Təyin edilənlər" },
          hasAccess && { value: "created" as const, label: "Mənim Tapşırıqlarım" },
          hasAccess && { value: "statistics" as const, label: "Statistika" },
        ].filter(Boolean) as TaskTab[]
      ),
    [hasAccess]
  );

  const initialTab = useMemo(() => {
    if (normalizedRole === "regionadmin") return "created";
    return "assigned";
  }, [normalizedRole]);

  const [activeTab, setActiveTab] = useState<TaskTabValue>(initialTab);

  useEffect(() => {
    if (availableTabs.length === 0) return;
    setActiveTab((prev) => {
      // Keep current tab if it's still available
      if (availableTabs.some((tab) => tab.value === prev)) {
        return prev;
      }
      // Otherwise fallback to initial role-based default or first available
      if (availableTabs.some((tab) => tab.value === initialTab)) {
        return initialTab;
      }
      return availableTabs[0]?.value ?? "assigned";
    });
  }, [availableTabs, initialTab]);

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
      (["superadmin", "regionadmin"].includes(normalizedRole) ||
        (normalizedRole === 'regionoperator' && moduleAccess.canEdit))
  );

  const showCreateButton = moduleAccess.canCreate;

  const currentTabLabel = availableTabs.find((tab) => tab.value === activeTab)?.label ?? "";

  const canEditTaskItem = useCallback(
    (task: Task): boolean => {
      if (normalizedRole === "superadmin") {
        return true;
      }

      if (task.created_by === currentUser?.id) {
        return true;
      }

      // Operators cannot edit any tasks except their own (created by them)
      if (normalizedRole === "regionoperator" || normalizedRole === "sektoroperator") {
        return false;
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
      
      // Operators cannot delete any tasks except their own (created by them)
      if (normalizedRole === "regionoperator" || normalizedRole === "sektoroperator") {
        return false;
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
