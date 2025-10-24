/**
 * useUserModalValidation Hook
 * Handles form validation and email uniqueness checking
 */

import { useCallback, useMemo } from 'react';
import { validateFormData } from '../utils/validators';
import type { EmailValidation } from './useUserModalState';
import { userService } from '@/services/users';

// Debounce helper
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export function useUserModalValidation(
  user: any | null,
  emailValidation: EmailValidation,
  setEmailValidation: (validation: EmailValidation) => void,
  selectedRole: string,
  isTeacherRole: (roleId: string) => boolean
) {
  // Check email uniqueness
  const checkEmailUniqueness = useCallback(async (email: string) => {
    if (!email || email === user?.email) {
      setEmailValidation({ isChecking: false, isUnique: null, message: '' });
      return;
    }

    setEmailValidation({ isChecking: true, isUnique: null, message: 'Yoxlanılır...' });

    try {
      const result = await userService.checkEmailUnique(email, user?.id);
      const isUnique = result?.isUnique ?? true;

      setEmailValidation({
        isChecking: false,
        isUnique,
        message: isUnique ? 'Email mövcuddur' : 'Bu email artıq istifadə olunur'
      });
    } catch (error) {
      console.error('Email uniqueness check failed:', error);
      setEmailValidation({
        isChecking: false,
        isUnique: null,
        message: 'Yoxlanıla bilmədi'
      });
    }
  }, [user?.email, user?.id, setEmailValidation]);

  // Debounced email check (500ms delay)
  const debouncedEmailCheck = useMemo(
    () => debounce(checkEmailUniqueness, 500),
    [checkEmailUniqueness]
  );

  // Main validation function
  const validate = useCallback((data: any) => {
    const result = validateFormData(data, {
      isNewUser: !user,
      emailIsUnique: emailValidation.isUnique,
      isTeacherRole,
    });

    return result;
  }, [user, emailValidation.isUnique, isTeacherRole]);

  return {
    validate,
    debouncedEmailCheck,
    emailValidation,
  };
}
