/**
 * TeacherModal Validators
 * Teacher-specific validation logic
 */

import { ERROR_MESSAGES } from './constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate required teacher fields
 */
export function validateRequiredFields(data: any, isNewTeacher: boolean): string[] {
  const errors: string[] = [];

  // Basic required fields
  if (!data.first_name?.trim()) errors.push(`Ad ${ERROR_MESSAGES.REQUIRED_FIELD}`);
  if (!data.last_name?.trim()) errors.push(`Soyad ${ERROR_MESSAGES.REQUIRED_FIELD}`);
  if (!data.patronymic?.trim()) errors.push(`Ata adı ${ERROR_MESSAGES.REQUIRED_FIELD}`);
  if (!data.email?.trim()) errors.push(`Email ${ERROR_MESSAGES.REQUIRED_FIELD}`);
  if (!data.username?.trim()) errors.push(`İstifadəçi adı ${ERROR_MESSAGES.REQUIRED_FIELD}`);

  // Professional required fields
  if (!data.specialty?.trim()) errors.push(`İxtisas ${ERROR_MESSAGES.REQUIRED_FIELD}`);
  if (!data.position_type) errors.push(`Vəzifə ${ERROR_MESSAGES.REQUIRED_FIELD}`);
  if (!data.workplace_type) errors.push(`İş yeri növü ${ERROR_MESSAGES.REQUIRED_FIELD}`);

  // Assessment required fields (NEW)
  if (!data.assessment_type) errors.push(`Qiymətləndirmə növü ${ERROR_MESSAGES.REQUIRED_FIELD}`);

  // Password required only for new teachers
  if (isNewTeacher) {
    if (!data.password || data.password.length < 8) {
      errors.push(ERROR_MESSAGES.PASSWORD_TOO_SHORT);
    }
    if (data.password !== data.password_confirmation) {
      errors.push(ERROR_MESSAGES.PASSWORD_MISMATCH);
    }
  }

  return errors;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  return /\S+@\S+\.\S+/.test(email);
}

/**
 * Validate teacher-specific fields
 */
export function validateTeacherFields(data: any): string[] {
  const errors: string[] = [];

  // Subjects NOT required anymore - will be managed in curriculum tab
  // if (!data.subjects || data.subjects.length === 0) {
  //   errors.push(ERROR_MESSAGES.SUBJECTS_REQUIRED);
  // }

  // Assessment score validation (NEW)
  if (data.assessment_type && !data.assessment_score) {
    errors.push(ERROR_MESSAGES.ASSESSMENT_SCORE_REQUIRED);
  }

  if (data.assessment_score) {
    const score = parseFloat(data.assessment_score);
    if (isNaN(score) || score < 0 || score > 100) {
      errors.push(ERROR_MESSAGES.ASSESSMENT_SCORE_INVALID);
    }
  }

  // Email format
  if (data.email && !validateEmail(data.email)) {
    errors.push(ERROR_MESSAGES.INVALID_EMAIL);
  }

  return errors;
}

/**
 * Main validation function for teachers
 */
export function validateTeacherData(
  data: any,
  options: {
    isNewTeacher: boolean;
    emailIsUnique: boolean | null;
  }
): ValidationResult {
  const allErrors: string[] = [];

  // Required fields
  allErrors.push(...validateRequiredFields(data, options.isNewTeacher));

  // Teacher-specific fields
  allErrors.push(...validateTeacherFields(data));

  // Email uniqueness
  if (data.email && options.emailIsUnique === false) {
    allErrors.push(ERROR_MESSAGES.EMAIL_IN_USE);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}
