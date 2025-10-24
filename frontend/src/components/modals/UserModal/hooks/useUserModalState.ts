/**
 * useUserModalState Hook
 * Manages all local state for UserModal
 */

import { useState, useEffect, useRef } from 'react';
import { transformBackendDataToForm } from '../utils/fieldTransformers';

export interface EmailValidation {
  isChecking: boolean;
  isUnique: boolean | null;
  message: string;
}

export function useUserModalState(user: any | null, open: boolean) {
  // Modal state
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Form data state (persists across tabs)
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Role and selection state
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedBirthDate, setSelectedBirthDate] = useState<string>('');

  // Email validation state
  const [emailValidation, setEmailValidation] = useState<EmailValidation>({
    isChecking: false,
    isUnique: null,
    message: ''
  });

  // Ref to track current role (prevents unnecessary re-renders)
  const currentRoleRef = useRef<string>('');

  // Initialize form data when user changes or modal opens
  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setActiveTab('basic');
      setFormData({});
      setSelectedRole('');
      setSelectedBirthDate('');
      setEmailValidation({ isChecking: false, isUnique: null, message: '' });
      currentRoleRef.current = '';
      return;
    }

    if (!user) {
      // Clear form data for new user
      setFormData({});
      setSelectedRole('');
      setSelectedBirthDate('');
      return;
    }

    // Set selected role from user data
    if (user.role_id && user.role_id.toString() !== currentRoleRef.current) {
      setSelectedRole(user.role_id.toString());
      currentRoleRef.current = user.role_id.toString();
    }

    // Set birth date
    const birthDate = user.profile?.birth_date || user.birth_date || '';
    if (birthDate && birthDate !== selectedBirthDate) {
      setSelectedBirthDate(birthDate);
    }

    // Initialize form data with user data
    const initialFormData = transformBackendDataToForm(user);
    setFormData(initialFormData);

  }, [user, open, selectedBirthDate]);

  return {
    // State
    loading,
    activeTab,
    formData,
    selectedRole,
    selectedBirthDate,
    emailValidation,

    // State setters
    setLoading,
    setActiveTab,
    setFormData,
    setSelectedRole,
    setSelectedBirthDate,
    setEmailValidation,

    // Ref
    currentRoleRef,
  };
}
