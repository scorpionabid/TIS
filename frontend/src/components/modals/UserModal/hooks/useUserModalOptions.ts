/**
 * useUserModalOptions Hook
 * Loads and manages dropdown options (roles, institutions, departments, subjects)
 */

import { useState, useEffect } from 'react';
import { userService } from '@/services/users';
import { subjectService } from '@/services/subjects';

export interface UserModalOptions {
  availableRoles: any[];
  availableInstitutions: any[];
  availableDepartments: any[];
  subjects: any[];
  loadingOptions: boolean;
}

export function useUserModalOptions(open: boolean, selectedRole: string) {
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [availableInstitutions, setAvailableInstitutions] = useState<any[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Load all options when modal opens
  useEffect(() => {
    if (!open) return;

    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        // Load in parallel for better performance
        const [rolesData, institutionsData, departmentsData, subjectsData] = await Promise.all([
          userService.getAvailableRoles().catch(() => []),
          userService.getAvailableInstitutions().catch(() => []),
          userService.getAvailableDepartments().catch(() => []),
          subjectService.getAll().catch(() => [])
        ]);

        setAvailableRoles(rolesData || []);
        setAvailableInstitutions(institutionsData || []);
        setAvailableDepartments(departmentsData || []);

        // Transform subjects to options format
        const subjectOptions = (subjectsData || []).map((subject: any) => ({
          label: subject.name,
          value: subject.id.toString(),
          category: subject.code
        }));
        setSubjects(subjectOptions);

      } catch (error) {
        console.error('Error loading options:', error);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [open]);

  return {
    availableRoles,
    availableInstitutions,
    availableDepartments,
    subjects,
    loadingOptions,
  };
}
