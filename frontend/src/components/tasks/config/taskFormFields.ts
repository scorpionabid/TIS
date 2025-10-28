/**
 * Task Form Configuration
 *
 * Bu faylda tapşırıq forması üçün bütün konfiqurasiyalar saxlanılır:
 * - Kateqoriya seçimləri
 * - Prioritet seçimləri
 * - Status seçimləri
 * - Label və göstəricilər
 */

// ============================================
// Category Configuration
// ============================================

export const categoryOptions = [
  { label: 'Hesabat Hazırlanması', value: 'report' },
  { label: 'Təmir və İnfrastruktur', value: 'maintenance' },
  { label: 'Tədbir Təşkili', value: 'event' },
  { label: 'Audit və Nəzarət', value: 'audit' },
  { label: 'Təlimatlar və Metodiki', value: 'instruction' },
  { label: 'Digər', value: 'other' },
] as const;

export const categoryLabels: Record<string, string> = {
  report: 'Hesabat',
  maintenance: 'Təmir',
  event: 'Tədbir',
  audit: 'Audit',
  instruction: 'Təlimat',
  other: 'Digər',
};

// ============================================
// Priority Configuration
// ============================================

export const priorityOptions = [
  { label: 'Aşağı', value: 'low' },
  { label: 'Orta', value: 'medium' },
  { label: 'Yüksək', value: 'high' },
  { label: 'Təcili', value: 'urgent' },
] as const;

export const priorityLabels: Record<string, string> = {
  low: 'Aşağı',
  medium: 'Orta',
  high: 'Yüksək',
  urgent: 'Təcili',
};

export const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  urgent: 'bg-red-100 text-red-800 border-red-300',
};

// ============================================
// Status Configuration
// ============================================

export const statusLabels: Record<string, string> = {
  pending: 'Gözləyir',
  in_progress: 'İcradadır',
  review: 'Yoxlanılır',
  completed: 'Tamamlandı',
  cancelled: 'Ləğv edildi',
};

export const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800 border-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  review: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

// ============================================
// Role Configuration (for task assignment filtering)
// ============================================

/**
 * Tapşırıq təyin edilə biləcək rollar
 */
export const ASSIGNABLE_ROLES = [
  'regionadmin',
  'regionoperator',
  'sektoradmin'
] as const;

export type AssignableRole = typeof ASSIGNABLE_ROLES[number];

/**
 * Role display names
 */
export const roleDisplayNames: Record<string, string> = {
  superadmin: 'Super Admin',
  regionadmin: 'Regional Admin',
  regionoperator: 'Regional Operator',
  sektoradmin: 'Sektor Admin',
  sektoroperator: 'Sektor Operator',
  schooladmin: 'Məktəb Admini',
  deputy: 'Məktəb Müdir Müavini',
  teacher: 'Müəllim',
};

// ============================================
// Form Field Placeholders
// ============================================

export const taskFormPlaceholders = {
  title: 'Tapşırıq başlığını daxil edin',
  description: 'Tapşırığın ətraflı təsvirini daxil edin...',
  category: 'Kateqoriya seçin',
  priority: 'Prioritet seçin',
  deadline: 'Tarix seçin',
  assignedUsers: 'Məsul şəxsləri seçin',
  assignedUsersLoading: 'İstifadəçilər yüklənir...',
  institutions: 'Müəssisə adı ilə axtar...',
  institutionsLoading: 'Yüklənir...',
  departments: 'Departament seçin (isteğe bağlı)',
  departmentsLoading: 'Yüklənir...',
  notes: 'Əlavə qeydlər və ya təlimatlar...',
  assignmentNotes: 'Tapşırığı təhkim olunanlara xüsusi tapşırıq və ya qeydlər əlavə edin...',
  requiresApproval: 'Bu tapşırıq tamamlandıqdan sonra təsdiq tələb olunur',
};

// ============================================
// Form Field Descriptions
// ============================================

export const taskFormDescriptions = {
  assignedUsers: 'Region admin, region operator və ya sektor adminlərindən birini və ya bir neçəsini seçə bilərsiniz.',
  targetInstitutions: 'Tapşırığın həyata keçiriləcəyi müəssisələri seçin. Axtarış və filter funksiyalarından istifadə edə bilərsiniz.',
  departments: 'Müəssisə əvəzinə departament seçsəniz, tapşırıq yalnız həmin departamentlərə yönələcək.',
};

// ============================================
// Validation Messages
// ============================================

export const taskValidationMessages = {
  titleRequired: 'Tapşırıq başlığı mütləqdir',
  descriptionRequired: 'Tapşırıq təsviri mütləqdir',
  categoryRequired: 'Kateqoriya seçilməlidir',
  priorityRequired: 'Prioritet seçilməlidir',
  assignedUsersRequired: 'Ən azı bir məsul şəxs seçin',
  targetInstitutionsRequired: 'Ən azı bir müəssisə seçilməlidir',
  deadlineInvalid: 'Düzgün tarix formatı daxil edin',
};

// ============================================
// Default Values
// ============================================

export const taskDefaultValues = {
  title: '',
  description: '',
  category: 'other' as const,
  priority: 'medium' as const,
  target_scope: 'specific',
  assigned_to: '',
  requires_approval: false,
  target_departments: [] as string[],
  target_institutions: [] as string[],
  target_roles: [] as string[],
  target_institution_id: null as number | null,
  deadline: undefined as string | undefined,
  notes: '',
  assigned_institution_id: null as number | null,
  assignment_notes: '',
  assigned_user_ids: [] as string[],
};

export type TaskFormValues = typeof taskDefaultValues;

// ============================================
// Helper Functions
// ============================================

/**
 * Get category label by value
 */
export function getCategoryLabel(value: string): string {
  return categoryLabels[value] || value;
}

/**
 * Get priority label by value
 */
export function getPriorityLabel(value: string): string {
  return priorityLabels[value] || value;
}

/**
 * Get status label by value
 */
export function getStatusLabel(value: string): string {
  return statusLabels[value] || value;
}

/**
 * Get priority color classes
 */
export function getPriorityColor(value: string): string {
  return priorityColors[value] || priorityColors.medium;
}

/**
 * Get status color classes
 */
export function getStatusColor(value: string): string {
  return statusColors[value] || statusColors.pending;
}

/**
 * Check if a role can be assigned tasks
 */
export function isAssignableRole(role: string): boolean {
  return ASSIGNABLE_ROLES.includes(role as AssignableRole);
}
