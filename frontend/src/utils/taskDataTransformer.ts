import { Task, CreateTaskData } from '@/services/tasks';
import { taskDefaultValues, TaskFormValues } from '@/components/tasks/config/taskFormFields';
import { logger } from '@/utils/logger';

/**
 * Task Data Transformer Utility
 *
 * Bu utility tapşırıq məlumatlarını API və form arasında çevirmək üçün istifadə olunur.
 * - API-dən gələn məlumatları form üçün uyğun formata çevirir
 * - Form məlumatlarını API üçün uyğun formata çevirir
 */

// ============================================
// API to Form Transformation
// ============================================

/**
 * API-dən gələn Task obyektini form default values-ə çevirir
 *
 * @param task - Backend-dən gələn Task obyekti (null ola bilər)
 * @returns Form üçün default values
 */
export function prepareTaskDefaultValues(task: Task | null | undefined): TaskFormValues {
  // Yeni tapşırıq yaradılırsa default values qaytar
  if (!task) {
    return { ...taskDefaultValues };
  }

  // Edit mode - mövcud task məlumatlarını form values-ə çevir
  const assignedInstitutionId = task.assigned_institution_id ?? task.target_institution_id ?? null;

  return {
    title: task.title || '',
    description: task.description || '',
    category: task.category || 'other',
    priority: task.priority || 'medium',
    deadline: task.deadline ? task.deadline.split('T')[0] : '',
    assigned_to: task.assigned_to != null ? task.assigned_to.toString() : '',
    assigned_institution_id: assignedInstitutionId,
    target_institution_id: assignedInstitutionId,
    target_institutions: normalizeArrayToStringArray(task.target_institutions),
    target_departments: normalizeArrayToStringArray(task.target_departments),
    target_roles: Array.isArray(task.target_roles) ? task.target_roles : [],
    target_scope: task.target_scope || 'specific',
    notes: task.notes || '',
    requires_approval: task.requires_approval || false,
    assignment_notes: task.assignment_notes || '',
    assigned_user_ids: extractAssignedUserIds(task),
  };
}

/**
 * Task assignments-dən user ID-ləri çıxarır
 */
function extractAssignedUserIds(task: Task): string[] {
  if (!Array.isArray(task.assignments)) {
    return [];
  }

  return task.assignments
    .map((assignment) => assignment.assigned_user_id)
    .filter((value): value is number => typeof value === 'number')
    .map((value) => value.toString());
}

/**
 * Array-i string array-ə çevirir (ID-lər üçün)
 */
function normalizeArrayToStringArray(value: any): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((id: any) => Number(id))
    .filter((id) => !Number.isNaN(id))
    .map((id) => id.toString());
}

// ============================================
// Form to API Transformation
// ============================================

/**
 * Form məlumatlarını API üçün uyğun formata çevirir
 *
 * @param formData - Form-dan gələn məlumatlar
 * @returns API-yə göndəriləcək data
 */
export function transformTaskDataForAPI(formData: any): CreateTaskData {
  logger.debug('Transforming task data for API', {
    component: 'taskDataTransformer',
    action: 'transform',
    inputKeys: Object.keys(formData)
  });

  // assigned_to field - ilk assigned user
  const assignedToNumeric = formData.assigned_to != null
    ? Number(formData.assigned_to)
    : NaN;

  // assigned_institution_id
  const assignedInstitutionNumeric = formData.assigned_institution_id != null
    ? Number(formData.assigned_institution_id)
    : null;

  // target_institutions array
  const targetInstitutions = normalizeToNumberArray(formData.target_institutions);

  // target_departments array
  const targetDepartments = normalizeToNumberArray(formData.target_departments);

  // assigned_user_ids array
  const assignedUserIds = normalizeToNumberArray(formData.assigned_user_ids);

  // Transformed data
  const transformedData: CreateTaskData = {
    title: formData.title || '',
    description: formData.description || '',
    category: formData.category || 'other',
    priority: formData.priority || 'medium',
    deadline: formData.deadline || undefined,
    assigned_to: Number.isNaN(assignedToNumeric) ? null : assignedToNumeric,
    assigned_institution_id: assignedInstitutionNumeric,
    target_institution_id: targetInstitutions.length > 0
      ? targetInstitutions[0]
      : assignedInstitutionNumeric,
    target_departments: targetDepartments,
    target_institutions: targetInstitutions,
    specific_institutions: targetInstitutions, // Backend expects this field
    target_roles: Array.isArray(formData.target_roles) ? formData.target_roles : [],
    assigned_user_ids: assignedUserIds,
    assignment_notes: formData.assignment_notes || undefined,
    requires_approval: Boolean(formData.requires_approval),
    notes: formData.notes || undefined,
  };

  // Əgər assigned_user_ids varsa, ilk user-i assigned_to kimi təyin et
  if (assignedUserIds.length > 0) {
    transformedData.assigned_to = assignedUserIds[0];
  }

  logger.debug('Task data transformed successfully', {
    component: 'taskDataTransformer',
    action: 'transform',
    result: {
      hasAssignedTo: transformedData.assigned_to !== null,
      institutionsCount: targetInstitutions.length,
      departmentsCount: targetDepartments.length,
      assignedUsersCount: assignedUserIds.length,
      requiresApproval: transformedData.requires_approval
    }
  });

  return transformedData;
}

/**
 * String və ya number array-i number array-ə çevirir
 */
function normalizeToNumberArray(value: any): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((id: string | number) => Number(id))
    .filter((id) => !Number.isNaN(id));
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Task data-nın valid olub-olmadığını yoxlayır
 */
export function validateTaskData(data: CreateTaskData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!data.title || data.title.trim() === '') {
    errors.push('Tapşırıq başlığı mütləqdir');
  }

  if (!data.description || data.description.trim() === '') {
    errors.push('Tapşırıq təsviri mütləqdir');
  }

  // Category is now optional - removed validation

  if (!data.priority) {
    errors.push('Prioritet seçilməlidir');
  }

  // At least one responsible person
  if (!Array.isArray(data.assigned_user_ids) || data.assigned_user_ids.length === 0) {
    errors.push('Ən azı bir məsul şəxs seçin');
  }

  // Target institutions/departments are now optional - validation removed

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Task məlumatlarını log üçün safe formata çevirir (hassas məlumatları gizlədir)
 */
export function sanitizeTaskDataForLogging(data: any): any {
  return {
    title: data.title ? `${data.title.substring(0, 30)}...` : '',
    category: data.category,
    priority: data.priority,
    hasDescription: Boolean(data.description),
    hasDeadline: Boolean(data.deadline),
    institutionsCount: Array.isArray(data.target_institutions) ? data.target_institutions.length : 0,
    departmentsCount: Array.isArray(data.target_departments) ? data.target_departments.length : 0,
    assignedUsersCount: Array.isArray(data.assigned_user_ids) ? data.assigned_user_ids.length : 0,
    requiresApproval: Boolean(data.requires_approval),
  };
}
