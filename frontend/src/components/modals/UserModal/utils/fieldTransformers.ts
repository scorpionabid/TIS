/**
 * UserModal Data Transformers
 * Handle data transformation between form and backend formats
 */

import { PROFILE_FIELDS, DEFAULT_FORM_VALUES, CRUD_PERMISSIONS } from './constants';
import type { UserModalMode } from './constants';

const REGION_OPERATOR_PERMISSION_KEYS = Object.values(CRUD_PERMISSIONS).flatMap((module) =>
  module.actions.map((action) => action.key)
);

/**
 * Transform form data to backend structure
 */
export function transformFormDataToBackend(
  data: any,
  mode: UserModalMode | undefined,
  institutionIdFromForm: number | null,
  isTeacherRole: (roleId: string) => boolean,
  isStudentRole: (roleId: string) => boolean
) {
  // Top-level user fields (match backend validation)
  const parsedRoleId = data.role_id ? parseInt(data.role_id, 10) : null;

  const userData: any = {
    name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email,
    username: data.username,
    email: data.email,
    password: data.password,
    password_confirmation: data.password_confirmation,
    role: data.role_name, // Keep for backward compatibility with older APIs
    role_id: Number.isNaN(parsedRoleId) ? null : parsedRoleId,
    role_name: data.role_name || null,
    role_display_name: data.role_display_name || null,
    institution_id: institutionIdFromForm,
    department_id: data.department_id ? parseInt(data.department_id) : null,
    is_active: data.is_active !== false, // default to true
  };

  // Build profile object with all user-specific fields
  const profile: any = {
    // Basic profile fields
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    patronymic: data.patronymic || '',
    birth_date: data.birth_date || null,
    gender: data.gender || '',
    national_id: data.national_id || '',
    contact_phone: data.contact_phone || '',
    utis_code: data.utis_code || '',
    emergency_contact_name: data.emergency_contact_name || '',
    emergency_contact_phone: data.emergency_contact_phone || '',
    emergency_contact_email: data.emergency_contact_email || '',
    notes: data.notes || '',
  };

  // Add teacher-specific fields if in teacher mode
  if (mode === 'teacher' || (data.role_id && isTeacherRole(data.role_id))) {
    Object.assign(profile, {
      position_type: data.position_type || null,
      employment_status: data.employment_status || null,
      workplace_type: data.workplace_type || 'primary',
      contract_start_date: data.contract_start_date || null,
      contract_end_date: data.contract_end_date || null,
      subjects: data.subjects || [],
      specialty: data.specialty || '',
      specialty_score: data.specialty_score ? parseFloat(data.specialty_score) : null,
      specialty_level: data.specialty_level || null,
      experience_years: data.experience_years ? parseInt(data.experience_years) : null,
      miq_score: data.miq_score ? parseFloat(data.miq_score) : null,
      certification_score: data.certification_score ? parseFloat(data.certification_score) : null,
      last_certification_date: data.last_certification_date || null,
      degree_level: data.degree_level || '',
      graduation_university: data.graduation_university || '',
      graduation_year: data.graduation_year || null,
      university_gpa: data.university_gpa ? parseFloat(data.university_gpa) : null,
      qualifications: data.qualifications || [],
      salary: data.salary ? parseFloat(data.salary) : null,
    });
  }

  // Add student-specific fields if in student mode
  if (mode === 'student' || (data.role_id && isStudentRole(data.role_id))) {
    Object.assign(profile, {
      grade_level: data.grade_level || null,
      class_id: data.class_id ? parseInt(data.class_id) : null,
      student_id_number: data.student_id_number || '',
      enrollment_date: data.enrollment_date || null,
      parent_name: data.parent_name || '',
      parent_phone: data.parent_phone || '',
      parent_email: data.parent_email || '',
    });
  }

  // Remove empty/null values from profile
  Object.keys(profile).forEach(key => {
    if (profile[key] === '' || profile[key] === null || profile[key] === undefined) {
      delete profile[key];
    }
  });

  // Add profile to userData
  userData.profile = profile;

  // Attach RegionOperator CRUD permissions if provided
  const permissionPayload: Record<string, boolean> = {};
  REGION_OPERATOR_PERMISSION_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      permissionPayload[key] = data[key] === true || data[key] === 'true' || data[key] === 1;
    }
  });

  if (Object.keys(permissionPayload).length > 0) {
    userData.region_operator_permissions = permissionPayload;
  }

  return userData;
}

/**
 * Transform backend user data to form default values
 */
export function transformBackendDataToForm(user: any | null): Record<string, any> {
  if (!user) {
    // Return default values for new user
    return { ...DEFAULT_FORM_VALUES };
  }

  // For existing user, extract data from user and profile
  const formValues: any = {
    // User fields
    username: user.username || '',
    email: user.email || '',
    first_name: user.profile?.first_name || user.first_name || '',
    last_name: user.profile?.last_name || user.last_name || '',
    patronymic: user.profile?.patronymic || '',
    role_id: user.role_id ? user.role_id.toString() : '',
    role_name: user.role_name || user.roles?.[0]?.name || '',
    institution_id: user.institution_id ? user.institution_id.toString() : '',
    department_id: user.department_id ? user.department_id.toString() : '',
    is_active: user.is_active !== undefined ? user.is_active.toString() : 'true',
    contact_phone: user.profile?.contact_phone || user.contact_phone || '',
    birth_date: user.profile?.birth_date || user.birth_date || '',
    gender: user.profile?.gender || '',
    national_id: user.profile?.national_id || '',
    utis_code: user.profile?.utis_code || user.utis_code || '',
  };

  // Add profile fields if they exist
  if (user.profile) {
    // Teacher fields
    PROFILE_FIELDS.TEACHER.forEach(field => {
      if (user.profile[field] !== undefined && user.profile[field] !== null) {
        formValues[field] = user.profile[field];
      }
    });

    // Student fields
    PROFILE_FIELDS.STUDENT.forEach(field => {
      if (user.profile[field] !== undefined && user.profile[field] !== null) {
        formValues[field] = user.profile[field];
      }
    });

    // Additional fields
    if (user.profile.emergency_contact_name) formValues.emergency_contact_name = user.profile.emergency_contact_name;
    if (user.profile.emergency_contact_phone) formValues.emergency_contact_phone = user.profile.emergency_contact_phone;
    if (user.profile.emergency_contact_email) formValues.emergency_contact_email = user.profile.emergency_contact_email;
    if (user.profile.notes) formValues.notes = user.profile.notes;
  }

  if (user.region_operator_permissions) {
    REGION_OPERATOR_PERMISSION_KEYS.forEach((key) => {
      if (key in user.region_operator_permissions) {
        formValues[key] = Boolean(user.region_operator_permissions[key]);
      }
    });
  }

  return formValues;
}

/**
 * Process subjects field - convert array of IDs to integers
 */
export function processSubjectsField(subjects: any): number[] {
  if (!subjects || !Array.isArray(subjects)) return [];
  return subjects.map((id: any) => typeof id === 'string' ? parseInt(id) : id);
}

/**
 * Convert is_active string to boolean
 */
export function convertIsActiveToBoolean(isActive: any): boolean {
  if (typeof isActive === 'boolean') return isActive;
  if (typeof isActive === 'string') return isActive === 'true';
  return true; // default
}

/**
 * Ensure birth_date is null if empty
 */
export function normalizeBirthDate(birthDate: any): string | null {
  if (!birthDate || (typeof birthDate === 'string' && birthDate.trim() === '')) {
    return null;
  }
  return birthDate;
}
