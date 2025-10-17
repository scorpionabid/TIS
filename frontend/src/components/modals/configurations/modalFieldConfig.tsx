import { FormField } from '@/components/forms/FormBuilder';
import { createField, commonValidations } from '@/components/forms/FormBuilder.helpers';
import { BaseModalTab } from '@/components/common/BaseModal';
import { 
  User, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Users, 
  Building, 
  MapPin,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react';

/**
 * Common field configurations for modals
 * Reduces duplication and ensures consistency across modals
 */

// User-related fields
export const userFields = {
  firstName: createField('first_name', 'Ad', 'text', {
    required: true,
    placeholder: 'İstifadəçinin adı',
    validation: commonValidations.required,
  }),
  
  lastName: createField('last_name', 'Soyad', 'text', {
    required: true,
    placeholder: 'İstifadəçinin soyadı',
    validation: commonValidations.required,
  }),
  
  patronymic: createField('patronymic', 'Ata adı', 'text', {
    placeholder: 'Ata adı (məcburi deyil)',
  }),
  
  username: createField('username', 'İstifadəçi adı', 'text', {
    required: true,
    placeholder: 'istifadeci_adi',
    validation: commonValidations.required,
  }),
  
  email: createField('email', 'Email', 'email', {
    required: false,
    placeholder: 'ornek@edu.gov.az (məcburi deyil)',
    validation: commonValidations.email.optional(),
  }),
  
  password: createField('password', 'Şifrə', 'password', {
    placeholder: 'Minimum 8 simvol',
  }),
  
  contactPhone: createField('contact_phone', 'Telefon', 'text', {
    placeholder: '+994 XX XXX XX XX',
    validation: commonValidations.phone.optional(),
  }),
  
  birthDate: createField('birth_date', 'Doğum tarixi', 'date', {
    placeholder: 'Tarix seçin',
  }),
  
  gender: createField('gender', 'Cins', 'select', {
    options: [
      { label: 'Kişi', value: 'male' },
      { label: 'Qadın', value: 'female' }
    ],
    placeholder: 'Cinsi seçin',
  }),
  
  nationalId: createField('national_id', 'Şəxsiyyət vəsiqəsi', 'text', {
    placeholder: 'AZE1234567',
  }),
  
  utisCode: createField('utis_code', 'UTIS Kodu', 'text', {
    placeholder: '12 rəqəmə qədər',
    description: 'Yalnız rəqəmlər daxil edin (maksimum 12 rəqəm, məcburi deyil)',
    validation: (value: string) => {
      if (!value) return true;
      if (!/^\d{1,12}$/.test(value)) {
        return '1-12 arası yalnız rəqəmlər daxil edin';
      }
      return true;
    },
  }),
};

// Institution-related fields
export const institutionFields = {
  name: createField('name', 'Ad', 'text', {
    required: true,
    placeholder: 'Müəssisənin adı',
    validation: commonValidations.required,
  }),
  
  code: createField('code', 'Kod', 'text', {
    placeholder: 'Müəssisə kodu',
  }),
  
  address: createField('address', 'Ünvan', 'textarea', {
    placeholder: 'Tam ünvan',
    rows: 3,
  }),
  
  phone: createField('phone', 'Telefon', 'text', {
    placeholder: '+994 XX XXX XX XX',
    validation: commonValidations.phone.optional(),
  }),
  
  email: createField('email', 'Email', 'email', {
    placeholder: 'email@example.com',
    validation: commonValidations.email.optional(),
  }),
  
  managerName: createField('manager_name', 'Rəhbərin adı', 'text', {
    placeholder: 'Rəhbərin tam adı',
  }),
  
  managerPhone: createField('manager_phone', 'Rəhbərin telefonu', 'text', {
    placeholder: '+994 XX XXX XX XX',
    validation: commonValidations.phone.optional(),
  }),
  
  utisCode: createField('utis_code', 'UTIS Kodu', 'text', {
    placeholder: '8 rəqəmli UTIS kodu',
    description: 'UTIS kodu 8 rəqəmdən ibarət olmalıdır (məsələn: 12345678). Könüllü sahədir.',
    validation: (value: string) => {
      if (!value) return true;
      if (!/^\d{8}$/.test(value)) {
        return 'UTIS kodu 8 rəqəmdən ibarət olmalıdır';
      }
      return true;
    },
  }),
  
  type: createField('type', 'Növ', 'select', {
    required: true,
    placeholder: 'Müəssisə növünü seçin',
    validation: commonValidations.required,
  }),
};

// Task-related fields
export const taskFields = {
  title: createField('title', 'Tapşırıq başlığı', 'text', {
    required: true,
    placeholder: 'Tapşırıq başlığını daxil edin',
    validation: commonValidations.required,
  }),
  
  description: createField('description', 'Tapşırıq təsviri', 'textarea', {
    required: true,
    placeholder: 'Tapşırığın ətraflı təsvirini daxil edin...',
    rows: 4,
    validation: commonValidations.required,
  }),
  
  deadline: createField('deadline', 'Son tarix', 'date', {
    placeholder: 'Tarix seçin',
  }),
  
  notes: createField('notes', 'Əlavə qeydlər', 'textarea', {
    placeholder: 'Əlavə qeydlər və ya təlimatlar...',
    rows: 3,
  }),
  
  requiresApproval: createField('requires_approval', 'Təsdiq tələb olunur', 'checkbox', {
    placeholder: 'Bu tapşırıq tamamlandıqdan sonra təsdiq tələb olunur',
    defaultValue: false,
  }),
};

// Department-related fields
export const departmentFields = {
  name: createField('name', 'Ad', 'text', {
    required: true,
    placeholder: 'Departamentin adı',
    validation: commonValidations.required,
  }),
  
  shortName: createField('short_name', 'Qısa Ad', 'text', {
    placeholder: 'Qısa ad və ya abbreviasiya',
  }),
  
  description: createField('description', 'Təsvir', 'textarea', {
    placeholder: 'Departamentin təsviri',
    rows: 3,
  }),
  
  capacity: createField('capacity', 'Tutum', 'number', {
    placeholder: '0',
    min: 0,
    description: 'Departamentin maksimum tutumu',
  }),
  
  budgetAllocation: createField('budget_allocation', 'Büdcə (AZN)', 'number', {
    placeholder: '0.00',
    min: 0,
    step: 0.01,
    description: 'Departamentin büdcə ayırması',
  }),
  
  functionalScope: createField('functional_scope', 'Funksional sahə', 'textarea', {
    placeholder: 'Departamentin məsuliyyət sahəsi',
    rows: 2,
  }),
  
  isActive: createField('is_active', 'Aktiv', 'checkbox', {
    defaultValue: true,
    placeholder: 'Departament aktivdir',
  }),
};

// Profile-specific fields  
export const profileFields = {
  address: createField('address', 'Ünvan', 'textarea', {
    placeholder: 'Tam ünvan daxil edin',
    rows: 2,
  }),
  
  avatar: createField('avatar', 'Avatar', 'custom', {
    placeholder: 'Profil şəklini yükləyin',
    description: 'JPG, PNG formatında maksimum 2MB',
  }),
};

// Institution type fields
export const institutionTypeFields = {
  key: createField('key', 'Açar (Key)', 'text', {
    required: true,
    placeholder: 'school, kindergarten, etc.',
    validation: commonValidations.required,
    description: 'Unique identifier (lowercase, no spaces)',
  }),
  
  label: createField('label', 'Ad', 'text', {
    required: true,
    placeholder: 'Məktəb',
    validation: commonValidations.required,
  }),
  
  labelAz: createField('label_az', 'Azərbaycan dilində ad', 'text', {
    placeholder: 'Məktəb',
  }),
  
  labelEn: createField('label_en', 'İngilis dilində ad', 'text', {
    placeholder: 'School',
  }),
  
  defaultLevel: createField('default_level', 'Standart səviyyə', 'select', {
    required: true,
    options: [
      { label: 'Səviyyə 1 (Nazirlik)', value: '1' },
      { label: 'Səviyyə 2 (Regional)', value: '2' },
      { label: 'Səviyyə 3 (Sektor)', value: '3' },
      { label: 'Səviyyə 4 (Müəssisə)', value: '4' },
    ],
    placeholder: 'Səviyyə seçin',
    validation: commonValidations.required,
  }),
  
  description: createField('description', 'Təsvir', 'textarea', {
    placeholder: 'Müəssisə növünün təsviri',
    rows: 3,
  }),
  
  icon: createField('icon', 'İkon', 'select', {
    options: [
      { label: '🏢 Building', value: 'Building' },
      { label: '📍 MapPin', value: 'MapPin' },
      { label: '👥 Users', value: 'Users' },
      { label: '🏫 School', value: 'School' },
      { label: '👶 Baby', value: 'Baby' },
      { label: '🎓 GraduationCap', value: 'GraduationCap' },
      { label: '💚 Heart', value: 'Heart' },
      { label: '🔧 Wrench', value: 'Wrench' },
      { label: '✅ UserCheck', value: 'UserCheck' },
      { label: '📖 BookOpen', value: 'BookOpen' },
      { label: '🏠 Home', value: 'Home' },
      { label: '⭐ Star', value: 'Star' },
    ],
    placeholder: 'İkon seçin',
  }),
  
  color: createField('color', 'Rəng', 'select', {
    options: [
      { label: '🔵 Blue', value: '#3B82F6' },
      { label: '🟢 Green', value: '#10B981' },
      { label: '🟡 Yellow', value: '#F59E0B' },
      { label: '🔴 Red', value: '#EF4444' },
      { label: '🟣 Purple', value: '#8B5CF6' },
      { label: '🟠 Orange', value: '#F97316' },
      { label: '🩷 Pink', value: '#EC4899' },
      { label: '🤎 Brown', value: '#A3A3A3' },
    ],
    placeholder: 'Rəng seçin',
  }),
  
  isActive: createField('is_active', 'Aktiv', 'checkbox', {
    defaultValue: true,
    placeholder: 'Müəssisə növü aktivdir',
  }),
};

// Emergency contact fields
export const emergencyContactFields = {
  name: createField('emergency_contact_name', 'Təcili əlaqə şəxsi', 'text', {
    placeholder: 'Təcili hallarda əlaqə saxlanılacaq şəxsin adı',
  }),
  
  phone: createField('emergency_contact_phone', 'Təcili əlaqə telefonu', 'text', {
    placeholder: '+994 XX XXX XX XX',
    validation: commonValidations.phone.optional(),
  }),
  
  email: createField('emergency_contact_email', 'Təcili əlaqə e-poçtu', 'email', {
    placeholder: 'emergency@example.com',
    validation: commonValidations.email.optional(),
  }),
};

// Teacher professional fields
export const teacherFields = {
  specialty: createField('specialty', 'İxtisas', 'text', {
    placeholder: 'Məsələn: Riyaziyyat müəllimi',
    description: 'Müəllimin peşə ixtisası',
  }),
  
  experienceYears: createField('experience_years', 'İş təcrübəsi (il)', 'number', {
    placeholder: '0',
    min: 0,
    max: 50,
    description: 'Təhsil sahəsindəki iş təcrübəsi',
  }),
  
  miqScore: createField('miq_score', 'MİQ balı', 'number', {
    placeholder: '0.00',
    min: 0,
    max: 999.99,
    step: 0.01,
    description: 'Müəllimin peşə inkişafı üzrə MİQ balı',
  }),
  
  certificationScore: createField('certification_score', 'Sertifikasiya balı', 'number', {
    placeholder: '0.00',
    min: 0,
    max: 999.99,
    step: 0.01,
    description: 'Müəllimin sertifikasiya balı',
  }),
  
  lastCertificationDate: createField('last_certification_date', 'Son sertifikasiya tarixi', 'date', {
    description: 'Ən son sertifikasiya alınma tarixi',
  }),
  
  degreeLevel: createField('degree_level', 'Təhsil səviyyəsi', 'select', {
    options: [
      { label: 'Orta təhsil', value: 'secondary' },
      { label: 'Orta peşə təhsili', value: 'vocational' },
      { label: 'Bakalavr', value: 'bachelor' },
      { label: 'Magistr', value: 'master' },
      { label: 'Doktorantura', value: 'phd' }
    ],
    placeholder: 'Təhsil səviyyəsini seçin',
  }),
  
  graduationUniversity: createField('graduation_university', 'Bitirdiyi universitet', 'text', {
    placeholder: 'Universitet adı',
  }),
  
  graduationYear: createField('graduation_year', 'Bitirmə ili', 'number', {
    placeholder: '2020',
    min: 1950,
    max: new Date().getFullYear(),
  }),
  
  universityGpa: createField('university_gpa', 'Universitet GPA', 'number', {
    placeholder: '3.50',
    min: 0,
    max: 4.00,
    step: 0.01,
    description: '4.0 şkalası üzrə orta bal',
  }),
};

// Student academic fields
export const studentFields = {
  miqScore: createField('student_miq_score', 'Şagird MİQ balı', 'number', {
    placeholder: '0.00',
    min: 0,
    max: 999.99,
    step: 0.01,
    description: 'Şagirdin akademik uğur göstəricisi',
  }),
  
  previousSchool: createField('previous_school', 'Əvvəlki məktəb', 'text', {
    placeholder: 'Əvvəl oxuduğu təhsil müəssisəsi',
  }),
  
  familyIncome: createField('family_income', 'Ailə gəliri (AZN)', 'number', {
    placeholder: '500.00',
    min: 0,
    step: 0.01,
    description: 'Ailənin aylıq gəliri',
  }),
};

// Common tab configurations
export const commonTabs = {
  userBasic: (fields: FormField[]): BaseModalTab => ({
    id: 'basic',
    label: 'Əsas məlumatlar',
    icon: <Users className="h-4 w-4" />,
    fields,
    description: 'İstifadəçinin əsas şəxsi məlumatları',
    color: 'blue',
  }),
  
  userTeacher: (fields: FormField[]): BaseModalTab => ({
    id: 'teacher',
    label: 'Müəllim sahəsi',
    icon: <GraduationCap className="h-4 w-4" />,
    fields,
    description: 'Bu bölmə yalnız müəllim rolunda olan istifadəçilər üçün doldurulmalıdır.',
    color: 'green',
  }),
  
  userStudent: (fields: FormField[]): BaseModalTab => ({
    id: 'student',
    label: 'Şagird sahəsi',
    icon: <BookOpen className="h-4 w-4" />,
    fields,
    description: 'Bu bölmə yalnız şagird rolunda olan istifadəçilər üçün doldurulmalıdır.',
    color: 'green',
  }),
  
  userAdditional: (fields: FormField[]): BaseModalTab => ({
    id: 'additional',
    label: 'Əlavə məlumatlar',
    icon: <FileText className="h-4 w-4" />,
    fields,
    description: 'Təcili hallarda əlaqə və digər əlavə məlumatlar.',
    color: 'purple',
  }),
  
  institutionBasic: (fields: FormField[]): BaseModalTab => ({
    id: 'basic',
    label: 'Əsas məlumatlar',
    icon: <Building className="h-4 w-4" />,
    fields,
    description: 'Müəssisənin əsas məlumatları və növü',
    color: 'blue',
  }),
  
  institutionContact: (fields: FormField[]): BaseModalTab => ({
    id: 'contact',
    label: 'Əlaqə məlumatları',
    icon: <MapPin className="h-4 w-4" />,
    fields,
    description: 'Müəssisənin əlaqə məlumatları və ünvanı',
    color: 'green',
  }),
  
  taskBasic: (fields: FormField[]): BaseModalTab => ({
    id: 'basic',
    label: 'Əsas məlumatlar',
    icon: <Users className="h-4 w-4" />,
    fields,
    description: 'Tapşırığın əsas məlumatlarını və məsul şəxsi təyin edin',
    color: 'blue',
  }),
  
  taskTarget: (fields: FormField[]): BaseModalTab => ({
    id: 'target',
    label: 'Hədəf və Təyinat',
    icon: <Building className="h-4 w-4" />,
    fields,
    description: 'Tapşırığın hədəf sahəsini və müəssisələrini müəyyən edin',
    color: 'green',
  }),
};

// Option configurations
export const commonOptions = {
  priority: [
    { label: 'Aşağı', value: 'low' },
    { label: 'Orta', value: 'medium' },
    { label: 'Yüksək', value: 'high' },
    { label: 'Təcili', value: 'urgent' },
  ],
  
  category: [
    { label: 'Hesabat Hazırlanması', value: 'report' },
    { label: 'Təmir və İnfrastruktur', value: 'maintenance' },
    { label: 'Tədbir Təşkili', value: 'event' },
    { label: 'Audit və Nəzarət', value: 'audit' },
    { label: 'Təlimatlar və Metodiki', value: 'instruction' },
    { label: 'Digər', value: 'other' },
  ],
  
  targetScope: [
    { label: 'Xüsusi Seçim', value: 'specific' },
    { label: 'Regional', value: 'regional' },
    { label: 'Sektor', value: 'sector' },
    { label: 'Müəssisə', value: 'institutional' },
    { label: 'Bütün Sistem', value: 'all' },
  ],
  
  gender: [
    { label: 'Kişi', value: 'male' },
    { label: 'Qadın', value: 'female' }
  ],
  
  degreeLevel: [
    { label: 'Orta təhsil', value: 'secondary' },
    { label: 'Orta peşə təhsili', value: 'vocational' },
    { label: 'Bakalavr', value: 'bachelor' },
    { label: 'Magistr', value: 'master' },
    { label: 'Doktorantura', value: 'phd' }
  ],
  
  isActive: [
    { label: 'Aktiv', value: 'true' },
    { label: 'Deaktiv', value: 'false' }
  ],
};

// Priority icons helper
export const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'high': return <AlertCircle className="h-4 w-4 text-orange-600" />;
    case 'urgent': return <AlertCircle className="h-4 w-4 text-red-600" />;
    default: return <Clock className="h-4 w-4" />;
  }
};
