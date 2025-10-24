/**
 * TeacherModal Constants
 * Teacher-specific constants and options
 */

// Default teacher form values
export const DEFAULT_TEACHER_VALUES = {
  // Basic info
  first_name: '',
  last_name: '',
  patronymic: '',
  email: '',
  username: '',
  password: '',
  password_confirmation: '',
  contact_phone: '',
  birth_date: '',
  gender: '',
  national_id: '',

  // Position & Employment
  position_type: '',
  employment_status: '',
  workplace_type: 'primary',
  contract_start_date: '',
  contract_end_date: '',

  // Professional
  subjects: [],
  specialty: '',
  specialty_score: '',
  specialty_level: '',
  experience_years: '',

  // Certification & Evaluation
  miq_score: '',
  certification_score: '',
  last_certification_date: '',

  // Education
  degree_level: '',
  graduation_university: '',
  graduation_year: '',
  university_gpa: '',

  // Emergency Contact
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_email: '',
  notes: '',

  is_active: 'true',
};

// Position types (Vəzifələr)
export const POSITION_TYPES = [
  { label: 'Direktor', value: 'direktor' },
  { label: 'Direktor müavini (tədris)', value: 'direktor_muavini_tedris' },
  { label: 'Direktor müavini (inzibati)', value: 'direktor_muavini_inzibati' },
  { label: 'Tərbiyə işi üzrə direktor müavini', value: 'terbiye_isi_uzre_direktor_muavini' },
  { label: 'Metodiki birləşmə rəhbəri', value: 'metodik_birlesme_rəhbəri' },
  { label: 'Müəllim (sinif rəhbəri)', value: 'muəllim_sinif_rəhbəri' },
  { label: 'Müəllim', value: 'muəllim' },
  { label: 'Psixoloq', value: 'psixoloq' },
  { label: 'Kitabxanaçı', value: 'kitabxanaçı' },
  { label: 'Laborant', value: 'laborant' },
  { label: 'Tibb işçisi', value: 'tibb_işçisi' },
  { label: 'Təsərrüfat işçisi', value: 'təsərrüfat_işçisi' },
];

// Employment status (İş statusu)
export const EMPLOYMENT_STATUS = [
  { label: 'Tam ştat', value: 'full_time' },
  { label: 'Yarım ştat', value: 'part_time' },
  { label: 'Müqavilə əsasında', value: 'contract' },
  { label: 'Müvəqqəti', value: 'temporary' },
  { label: 'Əvəzedici', value: 'substitute' },
];

// Workplace type
export const WORKPLACE_TYPES = [
  { label: 'Əsas iş yeri (bu məktəbdə)', value: 'primary' },
  { label: 'Əlavə (ikinci) iş yeri', value: 'secondary' },
];

// Specialty levels
export const SPECIALTY_LEVELS = [
  { label: 'Bakalavr', value: 'bakalavr' },
  { label: 'Magistr', value: 'magistr' },
  { label: 'Doktorantura', value: 'doktorantura' },
  { label: 'Elmi işçi', value: 'elmi_ishci' },
];

// Gender options
export const GENDER_OPTIONS = [
  { label: 'Kişi', value: 'male' },
  { label: 'Qadın', value: 'female' },
];

// Active status
export const IS_ACTIVE_OPTIONS = [
  { label: 'Aktiv', value: 'true' },
  { label: 'Deaktiv', value: 'false' }
];

// Error messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'məcburi sahədir',
  INVALID_EMAIL: 'Email formatı düz deyil',
  EMAIL_IN_USE: 'Bu email artıq istifadə olunur',
  PASSWORD_TOO_SHORT: 'Şifrə minimum 8 simvol olmalıdır',
  PASSWORD_MISMATCH: 'Şifrə və şifrə təkrarı uyğun gəlmir',
  SUBJECTS_REQUIRED: 'Ən azı bir fən seçilməlidir',
  VALIDATION_ERROR: 'Məlumat Xətası',
  OPERATION_FAILED: 'Əməliyyat zamanı xəta baş verdi',
};

// Success messages
export const SUCCESS_MESSAGES = {
  TEACHER_CREATED: 'Müəllim uğurla əlavə edildi',
  TEACHER_UPDATED: 'Müəllim məlumatları yeniləndi',
};

// Field names mapping (for error messages)
export const FIELD_NAME_MAP: Record<string, string> = {
  'first_name': 'Ad',
  'last_name': 'Soyad',
  'patronymic': 'Ata adı',
  'email': 'Email',
  'username': 'İstifadəçi adı',
  'password': 'Şifrə',
  'contact_phone': 'Telefon',
  'subjects': 'Fənlər',
  'position_type': 'Vəzifə',
  'employment_status': 'İş statusu',
  'workplace_type': 'İş yeri növü',
  'specialty': 'İxtisas',
  'experience_years': 'İş təcrübəsi',
  'birth_date': 'Doğum tarixi',
  'gender': 'Cins',
  'national_id': 'Şəxsiyyət vəsiqəsi',
};

// Section titles
export const SECTIONS = {
  BASIC: {
    title: 'Əsas Məlumatlar',
    description: 'Müəllimin şəxsi məlumatları',
  },
  POSITION: {
    title: 'Vəzifə və İş Məlumatları',
    description: 'Vəzifə, iş statusu və müqavilə məlumatları',
  },
  PROFESSIONAL: {
    title: 'Peşəkar Məlumatlar',
    description: 'Fənlər, təhsil və təcrübə məlumatları',
  },
  EMERGENCY: {
    title: 'Təcili Əlaqə',
    description: 'Təcili hallarda əlaqə məlumatları',
  },
};
