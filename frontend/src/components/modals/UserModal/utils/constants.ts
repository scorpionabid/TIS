/**
 * UserModal Constants
 * Central location for all constants, default values, and field mappings
 */

// Default form values for new user
export const DEFAULT_FORM_VALUES = {
  first_name: '',
  last_name: '',
  patronymic: '',
  username: '',
  email: '',
  password: '',
  password_confirmation: '',
  contact_phone: '',
  birth_date: '',
  gender: '',
  national_id: '',
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
    'first_name', 'last_name', 'patronymic', 'birth_date', 'gender',
    'national_id', 'contact_phone', 'utis_code', 'emergency_contact_name',
    'emergency_contact_phone', 'emergency_contact_email', 'notes'
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
