/**
 * UserModal Validation Functions
 * All validation logic centralized here
 */

import { ERROR_MESSAGES } from './constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate required fields
 */
export function validateRequiredFields(data: any): string[] {
  const errors: string[] = [];

  if (!data.first_name?.trim()) errors.push(`Ad ${ERROR_MESSAGES.REQUIRED_FIELD}`);
  if (!data.last_name?.trim()) errors.push(`Soyad ${ERROR_MESSAGES.REQUIRED_FIELD}`);
  if (!data.username?.trim()) errors.push(`İstifadəçi adı ${ERROR_MESSAGES.REQUIRED_FIELD}`);
  if (!data.email?.trim()) errors.push(`Email ${ERROR_MESSAGES.REQUIRED_FIELD}`);
  if (!data.role_id) errors.push(`Rol seçilməlidir`);

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
 * Validate email with detailed error
 */
export function validateEmailField(email: string): string[] {
  const errors: string[] = [];

  if (!email?.trim()) {
    errors.push(`Email ${ERROR_MESSAGES.REQUIRED_FIELD}`);
  } else if (!validateEmail(email)) {
    errors.push(ERROR_MESSAGES.INVALID_EMAIL);
  }

  return errors;
}

/**
 * Validate password for new users
 */
export function validatePassword(password: string, isNewUser: boolean): string[] {
  const errors: string[] = [];

  if (!isNewUser) return errors; // Skip for editing existing users

  if (!password || password.length < 8) {
    errors.push(ERROR_MESSAGES.PASSWORD_TOO_SHORT);
  }

  return errors;
}

/**
 * Validate password confirmation
 */
export function validatePasswordConfirmation(
  password: string,
  passwordConfirmation: string
): string[] {
  const errors: string[] = [];

  if (password && !passwordConfirmation) {
    errors.push(ERROR_MESSAGES.PASSWORD_CONFIRMATION_REQUIRED);
  }

  if (password && passwordConfirmation && password !== passwordConfirmation) {
    errors.push(ERROR_MESSAGES.PASSWORD_MISMATCH);
  }

  return errors;
}

/**
 * Validate teacher-specific fields
 */
export function validateTeacherFields(
  data: any,
  isTeacherRole: (roleId: string) => boolean
): string[] {
  const errors: string[] = [];

  if (!data.role_id) return errors;

  if (isTeacherRole(data.role_id)) {
    if (data.subjects && data.subjects.length === 0) {
      errors.push(ERROR_MESSAGES.TEACHER_NEEDS_SUBJECTS);
    }
  }

  return errors;
}

/**
 * Validate regional-operator-specific fields
 */
export function validateRegionalOperatorFields(
  data: any,
  isRegionalOperatorRole: (roleId: string) => boolean
): string[] {
  const errors: string[] = [];

  if (!data.role_id) return errors;

  if (isRegionalOperatorRole(data.role_id) && !data.department_id) {
    errors.push(ERROR_MESSAGES.REGION_OPERATOR_NEEDS_DEPARTMENT);
  }

  return errors;
}

/**
 * Check if email is unique (external validation)
 */
export function checkEmailUniqueness(
  email: string,
  isUnique: boolean | null
): string[] {
  const errors: string[] = [];

  if (email && isUnique === false) {
    errors.push(ERROR_MESSAGES.EMAIL_IN_USE);
  }

  return errors;
}

/**
 * Main validation function - validates all form data
 */
export function validateFormData(
  data: any,
  options: {
    isNewUser: boolean;
    emailIsUnique: boolean | null;
    isTeacherRole: (roleId: string) => boolean;
    isRegionalOperatorRole: (roleId: string) => boolean;
  }
): ValidationResult {
  const allErrors: string[] = [];

  // Required fields
  allErrors.push(...validateRequiredFields(data));

  // Email validation
  allErrors.push(...validateEmailField(data.email));
  allErrors.push(...checkEmailUniqueness(data.email, options.emailIsUnique));

  // Password validation
  allErrors.push(...validatePassword(data.password, options.isNewUser));
  allErrors.push(...validatePasswordConfirmation(data.password, data.password_confirmation));

  // Role-based validation
  allErrors.push(...validateTeacherFields(data, options.isTeacherRole));
  allErrors.push(...validateRegionalOperatorFields(data, options.isRegionalOperatorRole));

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Get user-friendly field name for error messages
 */
export function getFieldNameForError(field: string, fieldNameMap: Record<string, string>): string {
  // Remove "profile." prefix for better UX
  const cleanField = field.replace('profile.', '');
  return fieldNameMap[cleanField] || cleanField;
}
