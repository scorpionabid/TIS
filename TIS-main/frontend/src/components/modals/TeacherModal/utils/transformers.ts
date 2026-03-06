/**
 * TeacherModal Data Transformers
 * Transform data between form and backend formats
 */

import { DEFAULT_TEACHER_VALUES } from './constants';

/**
 * Transform form data to backend structure for teacher creation/update
 */
export function transformTeacherDataToBackend(formData: any) {
  // Top-level user fields
  const userData: any = {
    name: `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || formData.email,
    username: formData.username,
    email: formData.email,
    password: formData.password,
    password_confirmation: formData.password_confirmation,
    role: 'müəllim', // Always teacher role
    is_active: formData.is_active !== false,
    // institution_id will be auto-assigned by backend from schooladmin context
  };

  // Build profile object with teacher-specific fields
  const profile: any = {
    // Basic profile
    first_name: formData.first_name || '',
    last_name: formData.last_name || '',
    patronymic: formData.patronymic || '',
    birth_date: formData.birth_date || null,
    gender: formData.gender || '',
    national_id: formData.national_id || '',
    contact_phone: formData.contact_phone || '',

    // Position & Employment
    position_type: formData.position_type || null,
    employment_status: formData.employment_status || null,
    workplace_type: formData.workplace_type || 'primary',
    contract_start_date: formData.contract_start_date || null,
    contract_end_date: formData.contract_end_date || null,

    // Professional
    subjects: formData.subjects || [], // Optional - managed in curriculum tab
    specialty: formData.specialty || '',
    specialty_score: formData.specialty_score ? parseFloat(formData.specialty_score) : null,
    specialty_level: formData.specialty_level || null,
    experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,

    // Assessment fields (NEW - REQUIRED)
    assessment_type: formData.assessment_type || null,
    assessment_score: formData.assessment_score ? parseFloat(formData.assessment_score) : null,

    // Certification (old - optional)
    miq_score: formData.miq_score ? parseFloat(formData.miq_score) : null,
    certification_score: formData.certification_score ? parseFloat(formData.certification_score) : null,
    last_certification_date: formData.last_certification_date || null,

    // Education
    degree_level: formData.degree_level || '',
    graduation_university: formData.graduation_university || '',
    graduation_year: formData.graduation_year || null,
    university_gpa: formData.university_gpa ? parseFloat(formData.university_gpa) : null,

    // Emergency Contact
    emergency_contact_name: formData.emergency_contact_name || '',
    emergency_contact_phone: formData.emergency_contact_phone || '',
    emergency_contact_email: formData.emergency_contact_email || '',
    notes: formData.notes || '',
  };

  // Remove empty/null values
  Object.keys(profile).forEach(key => {
    if (profile[key] === '' || profile[key] === null || profile[key] === undefined) {
      delete profile[key];
    }
  });

  userData.profile = profile;

  return userData;
}

/**
 * Transform backend teacher data to form format
 */
export function transformBackendDataToForm(teacher: any | null): Record<string, any> {
  if (!teacher) {
    return { ...DEFAULT_TEACHER_VALUES };
  }

  const formValues: any = {
    // User fields
    username: teacher.username || '',
    email: teacher.email || '',
    first_name: teacher.profile?.first_name || teacher.first_name || '',
    last_name: teacher.profile?.last_name || teacher.last_name || '',
    patronymic: teacher.profile?.patronymic || '',
    is_active: teacher.is_active !== undefined ? teacher.is_active.toString() : 'true',
    contact_phone: teacher.profile?.contact_phone || teacher.contact_phone || '',
    birth_date: teacher.profile?.birth_date || teacher.birth_date || '',
    gender: teacher.profile?.gender || '',
    national_id: teacher.profile?.national_id || '',
  };

  // Teacher profile fields
  if (teacher.profile) {
    const p = teacher.profile;

    // Position & Employment
    if (p.position_type) formValues.position_type = p.position_type;
    if (p.employment_status) formValues.employment_status = p.employment_status;
    if (p.workplace_type) formValues.workplace_type = p.workplace_type;
    if (p.contract_start_date) formValues.contract_start_date = p.contract_start_date;
    if (p.contract_end_date) formValues.contract_end_date = p.contract_end_date;

    // Professional
    if (p.subjects) formValues.subjects = p.subjects;
    if (p.specialty) formValues.specialty = p.specialty;
    if (p.specialty_score) formValues.specialty_score = p.specialty_score;
    if (p.specialty_level) formValues.specialty_level = p.specialty_level;
    if (p.experience_years) formValues.experience_years = p.experience_years;

    // Assessment fields (NEW)
    if (p.assessment_type) formValues.assessment_type = p.assessment_type;
    if (p.assessment_score) formValues.assessment_score = p.assessment_score;

    // Certification (old)
    if (p.miq_score) formValues.miq_score = p.miq_score;
    if (p.certification_score) formValues.certification_score = p.certification_score;
    if (p.last_certification_date) formValues.last_certification_date = p.last_certification_date;

    // Education
    if (p.degree_level) formValues.degree_level = p.degree_level;
    if (p.graduation_university) formValues.graduation_university = p.graduation_university;
    if (p.graduation_year) formValues.graduation_year = p.graduation_year;
    if (p.university_gpa) formValues.university_gpa = p.university_gpa;

    // Emergency Contact
    if (p.emergency_contact_name) formValues.emergency_contact_name = p.emergency_contact_name;
    if (p.emergency_contact_phone) formValues.emergency_contact_phone = p.emergency_contact_phone;
    if (p.emergency_contact_email) formValues.emergency_contact_email = p.emergency_contact_email;
    if (p.notes) formValues.notes = p.notes;
  }

  return formValues;
}

/**
 * Process subjects field - convert IDs to integers
 */
export function processSubjectsField(subjects: any): number[] {
  if (!subjects || !Array.isArray(subjects)) return [];
  return subjects.map((id: any) => typeof id === 'string' ? parseInt(id) : id);
}
