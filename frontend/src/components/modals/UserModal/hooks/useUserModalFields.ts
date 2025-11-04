/**
 * useUserModalFields Hook
 * Manages field configurations for all tabs
 */

import { useCallback } from 'react';
import { z } from 'zod';
import {
  WORKPLACE_TYPES,
  GENDER_OPTIONS,
  IS_ACTIVE_OPTIONS,
  ROLE_TYPES,
  REGION_OPERATOR_PERMISSIONS
} from '../utils/constants';
import type { UserModalMode } from '../utils/constants';

// Field creation helper
function createField(
  name: string,
  label: string,
  type: string,
  options?: any
) {
  return {
    name,
    label,
    type,
    ...options
  };
}

export function useUserModalFields(params: {
  mode?: UserModalMode;
  availableRoles: any[];
  availableInstitutions: any[];
  availableDepartments: any[];
  subjects: any[];
  loadingOptions: boolean;
  selectedRole: string;
  selectedBirthDate: string;
  emailValidation: any;
  setSelectedRole: (role: string) => void;
  setActiveTab: (tab: string) => void;
  setSelectedBirthDate: (date: string) => void;
  debouncedEmailCheck: (email: string) => void;
  user: any | null;
}) {
  const {
    mode,
    availableRoles,
    availableInstitutions,
    availableDepartments,
    subjects,
    loadingOptions,
    selectedRole,
    selectedBirthDate,
    emailValidation,
    setSelectedRole,
    setActiveTab,
    setSelectedBirthDate,
    debouncedEmailCheck,
    user
  } = params;

  // Role checking functions
  const isTeacherRole = useCallback((roleId: string) => {
    if (!roleId) return false;
    const role = availableRoles.find(r => r.id.toString() === roleId.toString());
    return role?.name?.toLowerCase() === ROLE_TYPES.TEACHER ||
           role?.display_name?.toLowerCase().includes('müəllim');
  }, [availableRoles]);

  const isStudentRole = useCallback((roleId: string) => {
    if (!roleId) return false;
    const role = availableRoles.find(r => r.id.toString() === roleId.toString());
    return role?.name?.toLowerCase() === ROLE_TYPES.STUDENT ||
           role?.display_name?.toLowerCase().includes('şagird');
  }, [availableRoles]);

  const isRegionalOperatorRole = useCallback((roleId: string) => {
    if (!roleId) return false;
    const role = availableRoles.find(r => r.id.toString() === roleId.toString());
    return role?.name?.toLowerCase() === ROLE_TYPES.REGIONAL_OPERATOR;
  }, [availableRoles]);

  // Get basic fields (tab 1)
  const getBasicFields = useCallback(() => {
    return [
      createField('first_name', 'Ad', 'text', { required: true }),
      createField('last_name', 'Soyad', 'text', { required: true }),
      createField('patronymic', 'Ata adı', 'text'),
      createField('username', 'İstifadəçi adı', 'text', { required: true }),
      createField('email', 'Email', 'email', {
        required: true,
        placeholder: 'ornek@edu.gov.az',
        onChange: (value: string) => {
          debouncedEmailCheck(value);
        },
      }),
      createField('password', 'Şifrə', 'password', {
        required: !user,
        placeholder: 'Minimum 8 simvol',
      }),
      createField('password_confirmation', 'Şifrə təkrarı', 'password', {
        required: !user,
      }),
      createField('contact_phone', 'Telefon', 'text'),
      createField('birth_date', 'Doğum tarixi', 'date', {
        required: false, // Könüllü seçim
        value: selectedBirthDate,
        onChange: (value: string) => setSelectedBirthDate(value),
        validation: z.union([
          z.string().refine((date) => !date || !isNaN(Date.parse(date)), 'Düzgün tarix formatı'),
          z.literal(''),
          z.undefined(),
          z.null()
        ]).optional(),
      }),
      createField('gender', 'Cins', 'select', {
        options: GENDER_OPTIONS,
      }),
      createField('national_id', 'Şəxsiyyət vəsiqəsi', 'text'),
      createField('utis_code', 'UTIS Kodu', 'text', {
        placeholder: '12 rəqəmə qədər',
      }),
      createField('role_id', 'Rol', 'select', {
        required: true,
        options: availableRoles.map(role => ({
          label: role.display_name || role.name,
          value: role.id.toString()
        })),
        placeholder: loadingOptions ? 'Rollar yüklənir...' : 'Rol seçin',
        disabled: loadingOptions,
        onChange: (value: string) => {
          console.log('🔄 Role changed to:', value);
          setSelectedRole(value);
          if (isTeacherRole(value)) {
            setTimeout(() => setActiveTab('teacher'), 100);
          } else if (isStudentRole(value)) {
            setTimeout(() => setActiveTab('student'), 100);
          }
        },
      }),
      // Müəssisə field - RegionOperator və digər rollar üçün
      ...(mode === 'teacher'
        ? [] // Müəllimlər üçün müəssisə field göstərilmir
        : [createField('institution_id', 'Müəssisə (Region/Sektor)', 'select', {
            required: !isRegionalOperatorRole(selectedRole), // RegionOperator üçün könüllü (çünki departament məcburidir)
            options: availableInstitutions.map(inst => ({
              label: `${inst.name} (${inst.type})`,
              value: inst.id.toString()
            })),
            placeholder: loadingOptions ? 'Müəssisələr yüklənir...' : 'Müəssisə seçin',
            disabled: loadingOptions,
          })]
      ),
      // RegionOperator üçün ƏLAVƏ departament field (MƏCBURI)
      ...(isRegionalOperatorRole(selectedRole)
        ? [createField('department_id', 'Departament', 'select', {
            required: true,
            options: availableDepartments.map(dept => ({
              label: `${dept.name} (${dept.institution?.name ?? 'Müəssisə'})`,
              value: dept.id.toString()
            })),
            placeholder: loadingOptions ? 'Departamentlər yüklənir...' : 'Departament seçin',
            disabled: loadingOptions || availableDepartments.length === 0,
            helperText: availableDepartments.length === 0
              ? '⚠️ Region üzrə aktiv departament tapılmadı'
              : '✓ RegionOperator üçün departament məcburidir',
          })]
        : []
      ),
      createField('is_active', 'Status', 'select', {
        required: true,
        options: IS_ACTIVE_OPTIONS,
        defaultValue: 'true',
      }),
      // RegionOperator səlahiyyətləri - Minimalist inline checkboxlar
      ...(isRegionalOperatorRole(selectedRole)
        ? REGION_OPERATOR_PERMISSIONS.map(perm =>
            createField(perm.key, `${perm.icon} ${perm.label}`, 'checkbox', {
              required: false,
              defaultValue: user?.permissions?.[perm.key] ?? false, // ✅ Edit mode pre-fill
            })
          )
        : []
      ),
    ];
  }, [
    availableRoles, availableInstitutions, availableDepartments, loadingOptions,
    selectedRole, selectedBirthDate, emailValidation, debouncedEmailCheck,
    user, mode, isTeacherRole, isStudentRole, isRegionalOperatorRole,
    setSelectedRole, setActiveTab, setSelectedBirthDate
  ]);

  // Get teacher fields (tab 2)
  const getTeacherFields = useCallback(() => {
    return [
      createField('position_type', 'Vəzifə', 'select', {
        options: [
          { label: 'Direktor', value: 'direktor' },
          { label: 'Direktor müavini (tədris)', value: 'direktor_muavini_tedris' },
          { label: 'Müəllim', value: 'muəllim' },
          { label: 'Psixoloq', value: 'psixoloq' },
        ],
      }),
      createField('employment_status', 'İş statusu', 'select', {
        options: [
          { label: 'Tam ştat', value: 'full_time' },
          { label: 'Yarım ştat', value: 'part_time' },
          { label: 'Müqavilə', value: 'contract' },
        ],
      }),
      createField('workplace_type', 'İş yeri növü', 'select', {
        options: WORKPLACE_TYPES,
        defaultValue: 'primary',
        description: 'Müəllimin bu məktəbdə əsas və ya əlavə işçi olduğunu göstərir',
      }),
      createField('contract_start_date', 'Müqavilə başlanğıc tarixi', 'date'),
      createField('contract_end_date', 'Müqavilə bitmə tarixi', 'date'),
      createField('subjects', 'Dərs verdiyi fənlər', 'multiselect', {
        options: subjects || [],
        placeholder: 'Fənləri seçin',
        description: 'Müəllimin dərs verə biləcəyi fənlər',
        defaultValue: [],
      }),
      createField('specialty', 'İxtisas', 'text'),
      createField('specialty_score', 'İxtisas balı', 'number'),
      createField('experience_years', 'İş təcrübəsi (il)', 'number'),
      createField('miq_score', 'MİQ balı', 'number'),
      createField('certification_score', 'Sertifikat balı', 'number'),
      createField('last_certification_date', 'Son sertifikat tarixi', 'date'),
      createField('degree_level', 'Təhsil dərəcəsi', 'text'),
      createField('graduation_university', 'Məzun olduğu universitet', 'text'),
      createField('graduation_year', 'Məzun olma ili', 'number'),
      createField('university_gpa', 'GPA', 'number'),
    ];
  }, [subjects]);

  // Get student fields (tab 3)
  const getStudentFields = useCallback(() => {
    return [
      createField('grade_level', 'Sinif', 'number'),
      createField('student_id_number', 'Şagird nömrəsi', 'text'),
      createField('enrollment_date', 'Qeydiyyat tarixi', 'date'),
      createField('parent_name', 'Valideyn adı', 'text'),
      createField('parent_phone', 'Valideyn telefonu', 'text'),
      createField('parent_email', 'Valideyn emaili', 'email'),
    ];
  }, []);

  // Get additional fields (tab 4)
  const getAdditionalFields = useCallback(() => {
    return [
      createField('emergency_contact_name', 'Təcili əlaqə (ad)', 'text'),
      createField('emergency_contact_phone', 'Təcili əlaqə (telefon)', 'text'),
      createField('emergency_contact_email', 'Təcili əlaqə (email)', 'email'),
      createField('notes', 'Qeydlər', 'textarea', {
        placeholder: 'Əlavə qeydlər...',
      }),
    ];
  }, []);

  return {
    getBasicFields,
    getTeacherFields,
    getStudentFields,
    getAdditionalFields,
    isTeacherRole,
    isStudentRole,
    isRegionalOperatorRole,
  };
}
