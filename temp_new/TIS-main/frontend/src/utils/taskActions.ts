import { CreateTaskData, Task } from "@/services/tasks";

export type TaskOrigin = "region" | "sector";

export function getTaskOrigin(task: Task): TaskOrigin | null {
  if (task.origin_scope) {
    return task.origin_scope as TaskOrigin;
  }

  if (task.target_scope === "regional") {
    return "region";
  }

  if (task.target_scope === "sector") {
    return "sector";
  }

  return null;
}

type NormalizeTaskPayloadOptions = {
  activeTab: TaskOrigin;
};

export function normalizeCreatePayload(
  data: CreateTaskData,
  { activeTab }: NormalizeTaskPayloadOptions
): CreateTaskData {
  const assignedUserIds = Array.isArray(data.assigned_user_ids)
    ? data.assigned_user_ids
        .map((value: number | string) => Number(value))
        .filter((value) => !Number.isNaN(value))
    : [];

  const assignedInstitutionId =
    data.assigned_institution_id != null ? Number(data.assigned_institution_id) : null;

  const targetInstitutionIdFromSelection =
    Array.isArray(data.target_institutions) && data.target_institutions.length > 0
      ? Number(data.target_institutions[0])
      : null;

  const resolvedOriginScope = data.origin_scope ?? activeTab;
  const resolvedTargetScope = resolvedOriginScope === "region" ? "regional" : "sector";

  return {
    ...data,
    assigned_to:
      assignedUserIds.length > 0
        ? assignedUserIds[0]
        : data.assigned_to != null
        ? Number(data.assigned_to)
        : null,
    assigned_institution_id: assignedInstitutionId,
    target_institution_id: targetInstitutionIdFromSelection ?? assignedInstitutionId,
    target_institutions: Array.isArray(data.target_institutions)
      ? data.target_institutions
          .map((value: number | string) => Number(value))
          .filter((value) => !Number.isNaN(value))
      : [],
    target_departments: Array.isArray(data.target_departments)
      ? data.target_departments
          .map((value: number | string) => Number(value))
          .filter((value) => !Number.isNaN(value))
      : [],
    target_roles: [],
    assignment_notes: data.assignment_notes ?? undefined,
    assigned_user_ids: assignedUserIds,
    requires_approval: Boolean(data.requires_approval),
    origin_scope: resolvedOriginScope,
    target_scope: resolvedTargetScope,
  };
}
