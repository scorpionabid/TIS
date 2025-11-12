/**
 * UserModal Constants
 * Central location for all constants, default values, and field mappings
 */

// Default form values for new user
export const DEFAULT_FORM_VALUES = {
  first_name: '',
  last_name: '',
  // REMOVED: patronymic, contact_phone, birth_date, gender, national_id - database columns do not exist
  username: '',
  email: '',
  password: '',
  password_confirmation: '',
  utis_code: '',
  role_id: '',
  institution_id: '',
  department_id: '',
  is_active: 'true',
  // Teacher fields
  position_type: '',
  employment_status: '',
  workplace_type: 'primary',
  contract_start_date: '',
  contract_end_date: '',
  subjects: [],
  specialty: '',
  specialty_score: '',
  experience_years: '',
  miq_score: '',
  certification_score: '',
  last_certification_date: '',
  degree_level: '',
  graduation_university: '',
  graduation_year: '',
  university_gpa: '',
  // Emergency contact
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_email: '',
  notes: '',
};

// Field names mapping for error messages (Azerbaijani)
export const FIELD_NAME_MAP: Record<string, string> = {
  // User fields
  'username': 'İstifadəçi adı',
  'email': 'E-poçt',
  'institution_id': 'Müəssisə',
  'department_id': 'Departament',
  'role_name': 'Rol',
  'password': 'Şifrə',
  'first_name': 'Ad',
  'last_name': 'Soyad',
  'contact_phone': 'Telefon',
  // Teacher profile fields
  'subjects': 'Fənlər',
  'position_type': 'Vəzifə',
  'employment_status': 'İş statusu',
  'workplace_type': 'İş yeri növü',
  'specialty': 'İxtisas',
  'experience_years': 'İş təcrübəsi',
  'qualifications': 'Təhsil',
  // Student profile fields
  'grade_level': 'Sinif',
  'student_id_number': 'Şagird nömrəsi',
  // Common profile fields
  'birth_date': 'Doğum tarixi',
  'gender': 'Cins',
  'national_id': 'Şəxsiyyət vəsiqəsi'
};

// Error messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'məcburi sahədir',
  INVALID_EMAIL: 'Email formatı düz deyil',
  EMAIL_IN_USE: 'Bu email artıq istifadə olunur',
  PASSWORD_TOO_SHORT: 'Şifrə minimum 8 simvol olmalıdır',
  PASSWORD_MISMATCH: 'Şifrə və şifrə təkrarı uyğun gəlmir',
  PASSWORD_CONFIRMATION_REQUIRED: 'Şifrə təkrarı lazımdır',
  TEACHER_NEEDS_SUBJECTS: 'Müəllim rolü üçün ən azı bir fən seçilməlidir',
  REGION_OPERATOR_NEEDS_DEPARTMENT: 'RegionOperator üçün departament seçilməlidir',
  VALIDATION_ERROR: 'Validation Xətası',
  OPERATION_FAILED: 'Əməliyyat zamanı xəta baş verdi',
  DUPLICATE_DATA: 'Bu məlumatlarla istifadəçi artıq mövcuddur',
  SERVER_ERROR: 'Server tərəfində xəta baş verdi. Bir qədər sonra cəhd edin',
  CONNECTION_ERROR: 'İnternet bağlantınızı yoxlayın və yenidən cəhd edin',
};

// Success messages
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'Yeni istifadəçi əlavə edildi',
  USER_UPDATED: 'İstifadəçi məlumatları yeniləndi',
  TEACHER_CREATED: 'Yeni müəllim əlavə edildi',
  TEACHER_UPDATED: 'Müəllim məlumatları yeniləndi',
  STUDENT_CREATED: 'Yeni şagird əlavə edildi',
  STUDENT_UPDATED: 'Şagird məlumatları yeniləndi',
};

// Tab configuration
export const TAB_CONFIG = {
  basic: {
    id: 'basic',
    label: 'Əsas məlumatlar',
    icon: 'Users',
  },
  teacher: {
    id: 'teacher',
    label: 'Müəllim',
    icon: 'GraduationCap',
    description: 'Müəllim üçün peşə məlumatları',
    helperText: 'Bu bölmə yalnız müəllim rolunda olan istifadəçilər üçün doldurulmalıdır.',
  },
  student: {
    id: 'student',
    label: 'Şagird',
    icon: 'BookOpen',
    description: 'Şagird üçün akademik məlumatlar',
    helperText: 'Bu bölmə yalnız şagird rolunda olan istifadəçilər üçün doldurulmalıdır.',
  },
  additional: {
    id: 'additional',
    label: 'Əlavə məlumatlar',
    icon: 'FileText',
    description: 'Əlavə və təcili əlaqə məlumatları',
    helperText: 'Təcili hallarda əlaqə və digər əlavə məlumatlar.',
  },
};

// Role types
export const ROLE_TYPES = {
  TEACHER: 'müəllim',
  STUDENT: 'şagird',
  REGIONAL_OPERATOR: 'regionoperator',
};

// RegionOperator Permission Modules (Minimalist - DEPRECATED)
// These are kept for backward compatibility only
export const REGION_OPERATOR_PERMISSIONS = [
  { key: 'can_manage_surveys', label: 'Sorğular', icon: '📊' },
  { key: 'can_manage_tasks', label: 'Tapşırıqlar', icon: '✓' },
  { key: 'can_manage_documents', label: 'Sənədlər', icon: '📄' },
  { key: 'can_manage_folders', label: 'Qovluqlar', icon: '📁' },
  { key: 'can_manage_links', label: 'Bağlantılar', icon: '🔗' },
] as const;

// NEW: Granular CRUD-based Permissions (25 permissions)
export const CRUD_PERMISSIONS = {
  surveys: {
    label: 'Sorğular',
    icon: '📊',
    description: 'Sorğu yaratma, redaktə və dərc etmə',
    actions: [
      { key: 'can_view_surveys', label: 'Görüntüləmə', icon: '👁️', description: 'Sorğuları görə bilər' },
      { key: 'can_create_surveys', label: 'Yaratma', icon: '➕', description: 'Yeni sorğu yarada bilər' },
      { key: 'can_edit_surveys', label: 'Redaktə', icon: '✏️', description: 'Sorğuları redaktə edə bilər' },
      { key: 'can_delete_surveys', label: 'Silmə', icon: '🗑️', description: 'Sorğuları silə bilər' },
      { key: 'can_publish_surveys', label: 'Dərc etmə', icon: '🚀', description: 'Sorğuları dərc edə bilər' },
    ],
  },
  tasks: {
    label: 'Tapşırıqlar',
    icon: '✓',
    description: 'Tapşırıq yaratma və təyin etmə',
    actions: [
      { key: 'can_view_tasks', label: 'Görüntüləmə', icon: '👁️', description: 'Tapşırıqları görə bilər' },
      { key: 'can_create_tasks', label: 'Yaratma', icon: '➕', description: 'Yeni tapşırıq yarada bilər' },
      { key: 'can_edit_tasks', label: 'Redaktə', icon: '✏️', description: 'Tapşırıqları redaktə edə bilər' },
      { key: 'can_delete_tasks', label: 'Silmə', icon: '🗑️', description: 'Tapşırıqları silə bilər' },
      { key: 'can_assign_tasks', label: 'Təyin etmə', icon: '👤', description: 'Tapşırıqları təyin edə bilər' },
    ],
  },
  documents: {
    label: 'Sənədlər',
    icon: '📄',
    description: 'Sənəd yükləmə və paylaşma',
    actions: [
      { key: 'can_view_documents', label: 'Görüntüləmə', icon: '👁️', description: 'Sənədləri görə bilər' },
      { key: 'can_upload_documents', label: 'Yükləmə', icon: '⬆️', description: 'Sənəd yükləyə bilər' },
      { key: 'can_edit_documents', label: 'Redaktə', icon: '✏️', description: 'Sənədləri redaktə edə bilər' },
      { key: 'can_delete_documents', label: 'Silmə', icon: '🗑️', description: 'Sənədləri silə bilər' },
      { key: 'can_share_documents', label: 'Paylaşma', icon: '🔗', description: 'Sənədləri paylaşa bilər' },
    ],
  },
  folders: {
    label: 'Qovluqlar',
    icon: '📁',
    description: 'Qovluq strukturu idarəetməsi',
    actions: [
      { key: 'can_view_folders', label: 'Görüntüləmə', icon: '👁️', description: 'Qovluqları görə bilər' },
      { key: 'can_create_folders', label: 'Yaratma', icon: '➕', description: 'Yeni qovluq yarada bilər' },
      { key: 'can_edit_folders', label: 'Redaktə', icon: '✏️', description: 'Qovluqları redaktə edə bilər' },
      { key: 'can_delete_folders', label: 'Silmə', icon: '🗑️', description: 'Qovluqları silə bilər' },
      { key: 'can_manage_folder_access', label: 'İcazə idarəsi', icon: '🔐', description: 'Qovluq icazələrini idarə edə bilər' },
    ],
  },
  links: {
    label: 'Bağlantılar',
    icon: '🔗',
    description: 'Link paylaşımı və idarəetmə',
    actions: [
      { key: 'can_view_links', label: 'Görüntüləmə', icon: '👁️', description: 'Linkləri görə bilər' },
      { key: 'can_create_links', label: 'Yaratma', icon: '➕', description: 'Yeni link yarada bilər' },
      { key: 'can_edit_links', label: 'Redaktə', icon: '✏️', description: 'Linkləri redaktə edə bilər' },
      { key: 'can_delete_links', label: 'Silmə', icon: '🗑️', description: 'Linkləri silə bilər' },
      { key: 'can_share_links', label: 'Paylaşma', icon: '🔗', description: 'Linkləri paylaşa bilər' },
    ],
  },
} as const;

// NEW: CRUD-based Permission Templates (Quick Selection)
export const PERMISSION_TEMPLATES_CRUD = {
  viewer: {
    label: '👁️ Görüntüləyici',
    description: 'Yalnız görüntüləmə',
    permissions: {
      // Surveys
      can_view_surveys: true,
      can_create_surveys: false,
      can_edit_surveys: false,
      can_delete_surveys: false,
      can_publish_surveys: false,
      // Tasks
      can_view_tasks: true,
      can_create_tasks: false,
      can_edit_tasks: false,
      can_delete_tasks: false,
      can_assign_tasks: false,
      // Documents
      can_view_documents: true,
      can_upload_documents: false,
      can_edit_documents: false,
      can_delete_documents: false,
      can_share_documents: false,
      // Folders
      can_view_folders: true,
      can_create_folders: false,
      can_edit_folders: false,
      can_delete_folders: false,
      can_manage_folder_access: false,
      // Links
      can_view_links: true,
      can_create_links: false,
      can_edit_links: false,
      can_delete_links: false,
      can_share_links: false,
    },
  },
  editor: {
    label: '✏️ Redaktor',
    description: 'Görüntüləmə + Redaktə',
    permissions: {
      // Surveys
      can_view_surveys: true,
      can_create_surveys: false,
      can_edit_surveys: true,
      can_delete_surveys: false,
      can_publish_surveys: false,
      // Tasks
      can_view_tasks: true,
      can_create_tasks: false,
      can_edit_tasks: true,
      can_delete_tasks: false,
      can_assign_tasks: false,
      // Documents
      can_view_documents: true,
      can_upload_documents: false,
      can_edit_documents: true,
      can_delete_documents: false,
      can_share_documents: true,
      // Folders
      can_view_folders: true,
      can_create_folders: false,
      can_edit_folders: true,
      can_delete_folders: false,
      can_manage_folder_access: false,
      // Links
      can_view_links: true,
      can_create_links: false,
      can_edit_links: true,
      can_delete_links: false,
      can_share_links: true,
    },
  },
  manager: {
    label: '⚙️ Menecer',
    description: 'Görüntüləmə + Yaratma + Redaktə',
    permissions: {
      // Surveys
      can_view_surveys: true,
      can_create_surveys: true,
      can_edit_surveys: true,
      can_delete_surveys: false,
      can_publish_surveys: true,
      // Tasks
      can_view_tasks: true,
      can_create_tasks: true,
      can_edit_tasks: true,
      can_delete_tasks: false,
      can_assign_tasks: true,
      // Documents
      can_view_documents: true,
      can_upload_documents: true,
      can_edit_documents: true,
      can_delete_documents: false,
      can_share_documents: true,
      // Folders
      can_view_folders: true,
      can_create_folders: true,
      can_edit_folders: true,
      can_delete_folders: false,
      can_manage_folder_access: true,
      // Links
      can_view_links: true,
      can_create_links: true,
      can_edit_links: true,
      can_delete_links: false,
      can_share_links: true,
    },
  },
  full: {
    label: '🔓 Tam səlahiyyət',
    description: 'Bütün səlahiyyətlər',
    permissions: {
      // Surveys
      can_view_surveys: true,
      can_create_surveys: true,
      can_edit_surveys: true,
      can_delete_surveys: true,
      can_publish_surveys: true,
      // Tasks
      can_view_tasks: true,
      can_create_tasks: true,
      can_edit_tasks: true,
      can_delete_tasks: true,
      can_assign_tasks: true,
      // Documents
      can_view_documents: true,
      can_upload_documents: true,
      can_edit_documents: true,
      can_delete_documents: true,
      can_share_documents: true,
      // Folders
      can_view_folders: true,
      can_create_folders: true,
      can_edit_folders: true,
      can_delete_folders: true,
      can_manage_folder_access: true,
      // Links
      can_view_links: true,
      can_create_links: true,
      can_edit_links: true,
      can_delete_links: true,
      can_share_links: true,
    },
  },
} as const;

// OLD: Simple Permission Templates (DEPRECATED - kept for backward compatibility)
export const PERMISSION_TEMPLATES = {
  minimal: {
    label: '📋 Minimal',
    description: 'Yalnız sorğular',
    permissions: {
      can_manage_surveys: true,
      can_manage_tasks: false,
      can_manage_documents: false,
      can_manage_folders: false,
      can_manage_links: false,
    },
  },
  standard: {
    label: '⚙️ Standart',
    description: 'Sorğu + Tapşırıq',
    permissions: {
      can_manage_surveys: true,
      can_manage_tasks: true,
      can_manage_documents: false,
      can_manage_folders: false,
      can_manage_links: false,
    },
  },
  full: {
    label: '🔓 Tam',
    description: 'Bütün səlahiyyətlər',
    permissions: {
      can_manage_surveys: true,
      can_manage_tasks: true,
      can_manage_documents: true,
      can_manage_folders: true,
      can_manage_links: true,
    },
  },
} as const;

// Workplace types
export const WORKPLACE_TYPES = [
  { label: 'Əsas iş yeri (bu məktəbdə)', value: 'primary' },
  { label: 'Əlavə (ikinci) iş yeri', value: 'secondary' },
];

// Gender options
export const GENDER_OPTIONS = [
  { label: 'Kişi', value: 'male' },
  { label: 'Qadın', value: 'female' },
];

// Is Active options
export const IS_ACTIVE_OPTIONS = [
  { label: 'Aktiv', value: 'true' },
  { label: 'Deaktiv', value: 'false' }
];

// Modal modes
export type UserModalMode = 'teacher' | 'student' | 'general';

// Profile field lists (for data transformation)
export const PROFILE_FIELDS = {
  BASIC: [
    'first_name', 'last_name', 'utis_code'
    // REMOVED: patronymic, birth_date, gender, national_id, contact_phone - database columns do not exist
  ],
  TEACHER: [
    'position_type', 'employment_status', 'workplace_type', 'contract_start_date',
    'contract_end_date', 'subjects', 'specialty', 'specialty_score', 'specialty_level',
    'experience_years', 'miq_score', 'certification_score', 'last_certification_date',
    'degree_level', 'graduation_university', 'graduation_year', 'university_gpa',
    'qualifications', 'salary'
  ],
  STUDENT: [
    'grade_level', 'class_id', 'student_id_number', 'enrollment_date',
    'parent_name', 'parent_phone', 'parent_email'
  ]
};
