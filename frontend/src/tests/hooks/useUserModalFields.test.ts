import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

import { useUserModalFields } from '@/components/modals/UserModal/hooks/useUserModalFields';
import { REGION_OPERATOR_PERMISSIONS } from '@/components/modals/UserModal/utils/constants';

const baseRoles = [
  { id: 1, name: 'superadmin', display_name: 'SuperAdmin' },
  { id: 2, name: 'müəllim', display_name: 'Müəllim' },
  { id: 3, name: 'regionoperator', display_name: 'Region Operator' },
];

const baseInstitutions = [
  { id: 10, name: 'Bakı Regional İdarə', type: 'region' },
];

const baseDepartments = [
  { id: 20, name: 'Nəsimi Departamenti', institution: { name: 'Bakı Regional İdarə' } },
];

const baseSubjects = [
  { label: 'Riyaziyyat', value: 'math' },
  { label: 'Kimya', value: 'chemistry' },
];

const createProps = (overrides: Record<string, unknown> = {}) => ({
  mode: undefined,
  availableRoles: baseRoles,
  availableInstitutions: baseInstitutions,
  availableDepartments: baseDepartments,
  subjects: baseSubjects,
  loadingOptions: false,
  selectedRole: '1',
  selectedBirthDate: '',
  emailValidation: null,
  setSelectedRole: vi.fn(),
  setActiveTab: vi.fn(),
  setSelectedBirthDate: vi.fn(),
  debouncedEmailCheck: vi.fn(),
  user: null,
  ...overrides,
});

describe('useUserModalFields', () => {
  it('includes institution selector in default mode', () => {
    const { result } = renderHook((props) => useUserModalFields(props), {
      initialProps: createProps(),
    });

    const basicFields = result.current.getBasicFields();
    const institutionField = basicFields.find(field => field.name === 'institution_id');

    expect(institutionField).toBeDefined();
    expect(institutionField?.required).toBe(true);
  });

  it('omits institution selector when modal is teacher-specific', () => {
    const { result } = renderHook((props) => useUserModalFields(props), {
      initialProps: createProps({ mode: 'teacher' }),
    });

    const basicFields = result.current.getBasicFields();
    const institutionField = basicFields.find(field => field.name === 'institution_id');

    expect(institutionField).toBeUndefined();
  });

  it('adds regional operator specific fields and permissions', () => {
    const { result } = renderHook((props) => useUserModalFields(props), {
      initialProps: createProps({ selectedRole: '3' }), // regionoperator role
    });

    const basicFields = result.current.getBasicFields();

    const departmentField = basicFields.find(field => field.name === 'department_id');
    expect(departmentField).toBeDefined();
    expect(departmentField?.required).toBe(true);

    REGION_OPERATOR_PERMISSIONS.forEach(permission => {
      const permissionField = basicFields.find(field => field.name === permission.key);
      expect(permissionField?.type).toBe('checkbox');
    });
  });

  it('returns enrichment fields for teacher tab', () => {
    const { result } = renderHook((props) => useUserModalFields(props), {
      initialProps: createProps(),
    });

    const teacherFields = result.current.getTeacherFields();
    const subjectsField = teacherFields.find(field => field.name === 'subjects');

    expect(subjectsField?.type).toBe('multiselect');
    expect(Array.isArray(subjectsField?.options)).toBe(true);
  });
});
