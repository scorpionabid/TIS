import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { createField, commonValidations } from '@/components/forms/FormBuilder.helpers';
import { userFields, teacherFields, studentFields, emergencyContactFields } from '@/components/modals/configurations/modalFieldConfig';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, userService } from '@/services/users';
import { subjectService, subjectKeys } from '@/services/subjects';
import { 
  User as UserIcon, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Users
} from 'lucide-react';

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  onSave: (user: any) => Promise<void>;
  defaultRole?: string; // Default role name to preselect (e.g., 'müəllim', 'tələbə')
  mode?: 'teacher' | 'student' | 'general'; // Modal mode for specialized contexts
}

export function UserModal({ open, onClose, user, onSave, defaultRole, mode }: UserModalProps) {
  
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<Array<{id: number, name: string, display_name: string, level: number}>>([]);
  const [availableInstitutions, setAvailableInstitutions] = useState<Array<{id: number, name: string, type: string, level: number, parent_id: number | null}>>([]);
  const [availableDepartments, setAvailableDepartments] = useState<Array<{id: number, name: string, department_type: string, institution: {id: number, name: string, type: string}}>>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [emailValidation, setEmailValidation] = useState<{isChecking: boolean, isUnique?: boolean, message?: string}>({isChecking: false});
  const [selectedBirthDate, setSelectedBirthDate] = useState<string>('');
  
  // Use ref to track roles loading state and prevent infinite loops
  const rolesLoadedRef = useRef(false);
  const currentRoleRef = useRef<string>('');
  
  // Keep form data across tabs to maintain state
  const [formData, setFormData] = useState<any>({});

  // Load subjects for teacher professional fields
  const { data: subjects } = useQuery({
    queryKey: subjectKeys.options(),
    queryFn: () => subjectService.getSubjectOptions(),
    enabled: open,
  });

  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      // Only load roles initially
      const roles = await userService.getAvailableRoles();
      setAvailableRoles(roles);
      
      // Load all institutions initially (will be filtered when role is selected)
      const institutions = await userService.getAvailableInstitutions();
      setAvailableInstitutions(institutions);
    } catch (error) {
      console.error('Failed to load options:', error);
      toast({
        title: 'Xəta',
        description: 'Seçimlər yüklənə bilmədi',
        variant: 'destructive',
      });
    } finally {
      setLoadingOptions(false);
    }
  }, [toast]);

  // Load available roles and institutions when modal opens
  useEffect(() => {
    if (open) {
      if (!rolesLoadedRef.current) {
        loadOptions();
        rolesLoadedRef.current = true;
      }
      // Reset to first tab when modal opens to ensure proper focus management
      setActiveTab('basic');
    } else {
      // Reset form state when modal closes
      setSelectedRole('');
      setAvailableInstitutions([]);
      setAvailableDepartments([]);
      setLoadingOptions(true);
      setSelectedBirthDate('');
      setEmailValidation({isChecking: false});
      setFormData({}); // Clear cross-tab form data
      rolesLoadedRef.current = false; // Reset for next time
      currentRoleRef.current = '';
    }
  }, [open, loadOptions]);

  // Set default role when modal opens (for teacher/student specific modals)
  useEffect(() => {
    if (open && defaultRole && availableRoles.length > 0 && !user) {
      // Find the role by name
      const roleToSelect = availableRoles.find(r =>
        r.name.toLowerCase() === defaultRole.toLowerCase() ||
        r.display_name.toLowerCase().includes(defaultRole.toLowerCase())
      );

      if (roleToSelect) {
        console.log('🎯 Setting default role:', roleToSelect.name, 'for mode:', mode);
        setSelectedRole(roleToSelect.id.toString());
      }
    }
  }, [open, defaultRole, mode, availableRoles, user]);

  // Load institutions or departments when selected role changes
  useEffect(() => {
    if (!selectedRole || availableRoles.length === 0) return;
    
    // Prevent unnecessary re-runs for the same role
    if (currentRoleRef.current === selectedRole) return;
    currentRoleRef.current = selectedRole;
    
    const selectedRoleData = availableRoles.find(r => r.id.toString() === selectedRole);
    if (!selectedRoleData) return;
    
    // Reset previous state
    setAvailableInstitutions([]);
    setAvailableDepartments([]);
    
    // Load data directly without toast dependencies to prevent re-render loops
    const loadData = async () => {
      try {
        if (selectedRoleData.name === 'regionoperator') {
          console.log('🔄 Loading departments for role:', selectedRoleData.name);
          const departments = await userService.getAvailableDepartments(selectedRoleData.name);
          console.log('🏢 Filtered departments:', departments);
          setAvailableDepartments(departments);
        } else {
          console.log('🔄 Loading institutions for role:', selectedRoleData.name);
          const institutions = await userService.getAvailableInstitutions(selectedRoleData.name);
          console.log('🏢 Filtered institutions:', institutions);
          setAvailableInstitutions(institutions);
        }
      } catch (error) {
        console.error('Failed to load data for role:', selectedRoleData.name, error);
        // Avoid toast in useEffect to prevent re-render loops
      }
    };
    
    loadData();
  }, [selectedRole]); // Only depend on selectedRole


  // Calculate age from birth date
  const calculateAgeFromDate = (birthDate: string): string => {
    if (!birthDate) return '';
    
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      
      if (birth > today) return ''; // Invalid birth date
      
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age >= 0 ? ` (${age} yaş)` : '';
    } catch (error) {
      return '';
    }
  };

  // Debounced email uniqueness check
  const debouncedEmailCheck = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (email: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (!email || email.length < 3 || !/\S+@\S+\.\S+/.test(email)) {
            setEmailValidation({isChecking: false});
            return;
          }

          setEmailValidation({isChecking: true});
          
          try {
            const result = await userService.checkEmailUnique(email, user?.id);
            setEmailValidation({
              isChecking: false,
              isUnique: result.isUnique,
              message: result.message
            });
          } catch (error) {
            setEmailValidation({
              isChecking: false,
              isUnique: false,
              message: 'Email yoxlanması uğursuz oldu'
            });
          }
        }, 500); // 500ms delay
      };
    })(),
    [user?.id]
  );

  // Memoized role checking functions for performance
  const isTeacherRole = useCallback((roleId: string) => {
    const role = availableRoles.find(r => r.id.toString() === roleId);
    return role && (role.name.toLowerCase().includes('teacher') || 
                   role.name.toLowerCase().includes('müəllim') ||
                   role.display_name.toLowerCase().includes('müəllim'));
  }, [availableRoles]);

  const isStudentRole = useCallback((roleId: string) => {
    const role = availableRoles.find(r => r.id.toString() === roleId);
    return role && (role.name.toLowerCase().includes('student') || 
                   role.name.toLowerCase().includes('şagird') ||
                   role.display_name.toLowerCase().includes('şagird'));
  }, [availableRoles]);

  const isRegionalOperatorRole = useCallback((roleId: string) => {
    const role = availableRoles.find(r => r.id.toString() === roleId);
    return role && role.name === 'regionoperator';
  }, [availableRoles]);

  // Memoized Basic Information Fields - Using modalFieldConfig
  const getBasicFields = useCallback(() => [
    userFields.firstName,
    userFields.lastName,
    userFields.patronymic,
    userFields.username,
    createField('email', 'Email', 'email', {
      required: true, // Email məcburi sahədir
      placeholder: 'ornek@edu.gov.az',
      validation: commonValidations.email.required,
      onChange: (value: string) => {
        debouncedEmailCheck(value);
      },
      description: emailValidation.isChecking 
        ? 'Email yoxlanılır...' 
        : emailValidation.message || 'Unikalılıq üçün email avtomatik yoxlanacaq',
      status: emailValidation.isChecking 
        ? 'loading' 
        : emailValidation.isUnique === false 
        ? 'error' 
        : emailValidation.isUnique === true 
        ? 'success' 
        : undefined,
    }),
    createField('password', 'Şifrə', 'password', {
      required: !user,
      placeholder: 'Minimum 8 simvol, böyük və kiçik hərf, rəqəm',
      description: 'Güclü şifrə: minimum 8 simvol, ən azı 1 böyük hərf, 1 kiçik hərf və 1 rəqəm',
      validation: !user 
        ? z.string()
            .min(8, 'Şifrə minimum 8 simvol olmalıdır')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Şifrədə ən azı 1 böyük hərf, 1 kiçik hərf və 1 rəqəm olmalıdır')
        : z.string()
            .min(8, 'Şifrə minimum 8 simvol olmalıdır')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Şifrədə ən azı 1 böyük hərf, 1 kiçik hərf və 1 rəqəm olmalıdır')
            .optional().or(z.literal('')),
    }),
    createField('password_confirmation', 'Şifrə təkrarı', 'password', {
      required: !user,
      placeholder: 'Şifrəni təkrar daxil edin',
      validation: !user ? z.string().min(8, 'Şifrə təkrarı minimum 8 simvol olmalıdır') : z.string().min(8, 'Şifrə təkrarı minimum 8 simvol olmalıdır').optional().or(z.literal('')),
    }),
    userFields.contactPhone,
    createField('birth_date', 'Doğum tarixi', 'date', {
      placeholder: 'Tarix seçin (ixtiyari)',
      required: false,
      onChange: (value: string) => {
        setSelectedBirthDate(value);
      },
      description: selectedBirthDate 
        ? `Seçilmiş tarix${calculateAgeFromDate(selectedBirthDate)}`
        : 'Doğum tarixini seçin (məcburi deyil)',
    }),
    userFields.gender,
    userFields.nationalId,
    createField('utis_code', 'UTIS Kodu', 'text', {
      placeholder: '12 rəqəmə qədər',
      description: 'Yalnız rəqəmlər daxil edin (maksimum 12 rəqəm, məcburi deyil)',
      validation: z.string()
        .regex(/^\d{1,12}$/, '1-12 arası yalnız rəqəmlər daxil edin')
        .optional()
        .or(z.literal('')),
    }),
    createField('role_id', 'Rol', 'select', {
      required: true,
      options: availableRoles.map(role => ({ 
        label: role.display_name, 
        value: role.id.toString() 
      })),
      placeholder: loadingOptions ? 'Rollar yüklənir...' : 'Rol seçin',
      disabled: loadingOptions,
      validation: commonValidations.required,
      onChange: (value: string) => {
        setSelectedRole(value);
        // Automatically switch to appropriate tab when role is selected
        if (isTeacherRole(value)) {
          setActiveTab('teacher');
        } else if (isStudentRole(value)) {
          setActiveTab('student');
        }
      },
    }),
    // Conditionally show institution or department field
    ...(isRegionalOperatorRole(selectedRole) 
      ? [createField('department_id', 'Departament', 'select', {
          options: availableDepartments.map(department => ({ 
            label: `${department.name} (${department.institution.name})`, 
            value: department.id.toString() 
          })),
          placeholder: loadingOptions ? 'Departamentlər yüklənir...' : 'Departament seçin',
          disabled: loadingOptions,
        })]
      : [createField('institution_id', 'Müəssisə', 'select', {
          options: availableInstitutions.map(institution => ({ 
            label: `${institution.name} (${institution.type})`, 
            value: institution.id.toString() 
          })),
          placeholder: loadingOptions ? 'Müəssisələr yüklənir...' : 'Müəssisə seçin',
          disabled: loadingOptions,
        })]
    ),
    createField('is_active', 'Status', 'select', {
      required: true,
      options: [
        { label: 'Aktiv', value: 'true' },
        { label: 'Deaktiv', value: 'false' }
      ],
      defaultValue: 'true',
      validation: commonValidations.required,
    }),
  ], [availableRoles, availableDepartments, availableInstitutions, loadingOptions, selectedRole, selectedBirthDate, emailValidation, debouncedEmailCheck, user, isTeacherRole, isStudentRole, isRegionalOperatorRole, setSelectedRole, setActiveTab, setSelectedBirthDate]);

  // Memoized Teacher Professional Fields
  const getTeacherFields = useCallback(() => [
    // Position and Employment
    teacherFields.positionType,
    teacherFields.employmentStatus,
    createField('primary_institution_id', 'Əsas iş yeri', 'select', {
      options: availableInstitutions
        .filter((inst: any) => inst.level && inst.level >= 3)
        .map((inst: any) => ({
          label: inst.name,
          value: inst.id.toString()
        })),
      placeholder: 'Əsas iş yerini seçin',
      description: 'Müəllimin əsas işlədiyi müəssisə',
    }),
    teacherFields.contractStartDate,
    teacherFields.contractEndDate,

    // Professional Info
    createField('subjects', 'Dərs verdiyi fənlər', 'multiselect', {
      options: subjects || [],
      placeholder: 'Fənləri seçin',
      description: 'Müəllimin dərs verə biləcəyi fənlər',
    }),
    teacherFields.specialty,
    teacherFields.specialtyScore,
    teacherFields.experienceYears,

    // MIQ and Certification
    teacherFields.miqScore,
    teacherFields.certificationScore,
    teacherFields.lastCertificationDate,

    // Education
    teacherFields.degreeLevel,
    teacherFields.graduationUniversity,
    teacherFields.graduationYear,
    teacherFields.universityGpa,
  ], [subjects, availableInstitutions]);

  // Memoized Student Academic Fields - Using modalFieldConfig
  const getStudentFields = useCallback(() => [
    studentFields.miqScore,
    studentFields.previousSchool,
    studentFields.familyIncome,
  ], []);

  // Memoized Additional fields
  const getAdditionalFields = useCallback(() => [
    emergencyContactFields.name,
    emergencyContactFields.phone,
    emergencyContactFields.email,
    createField('notes', 'Əlavə qeydlər', 'textarea', {
      placeholder: 'Digər mühüm məlumatlar',
      rows: 3,
    }),
  ], []);

  // Config-driven fields configuration
  const fieldConfig = useMemo(() => ({
    basic: {
      fields: () => getBasicFields(),
      always: true,
      dependencies: [availableRoles, availableInstitutions, availableDepartments, loadingOptions, selectedRole, selectedBirthDate, emailValidation]
    },
    teacher: {
      fields: () => getTeacherFields(),
      condition: () => selectedRole && isTeacherRole(selectedRole),
      includeBasic: false, // Don't duplicate basic fields - user fills them in Basic tab
      dependencies: [subjects]
    },
    student: {
      fields: () => getStudentFields(),
      condition: () => selectedRole && isStudentRole(selectedRole),
      includeBasic: false, // Don't duplicate basic fields - user fills them in Basic tab
      dependencies: []
    },
    additional: {
      fields: () => getAdditionalFields(),
      includeBasic: false, // Don't duplicate basic fields - user fills them in Basic tab
      dependencies: []
    }
  }), [selectedRole, availableRoles, availableInstitutions, availableDepartments, subjects, loadingOptions, selectedBirthDate, emailValidation, getBasicFields, getTeacherFields, getStudentFields, getAdditionalFields, isTeacherRole, isStudentRole]);

  // Get all fields conditionally using config-driven approach
  const getAllFields = useMemo(() => {
    const config = fieldConfig[activeTab as keyof typeof fieldConfig];
    if (!config) return [];
    
    const allFields = [];
    
    // Always include basic fields if specified
    if (config.includeBasic && activeTab !== 'basic') {
      allFields.push(...getBasicFields());
    }
    
    // Add tab-specific fields if condition is met
    if (config.always || !config.condition || config.condition()) {
      allFields.push(...config.fields());
    }
    
    return allFields;
  }, [activeTab, fieldConfig, getBasicFields, getTeacherFields, getStudentFields, getAdditionalFields]);


  // Enhanced form data persistence across tabs
  const handleFormChange = useCallback((newData: any) => {
    console.log('📅 Form change:', { activeTab, newData });
    
    setFormData(prev => {
      const updated = { ...prev, ...newData };
      console.log('📋 Updated form data:', updated);
      return updated;
    });
    
    // Handle role change and automatic tab switching
    if (newData.role_id && newData.role_id !== selectedRole) {
      setSelectedRole(newData.role_id);
      
      // Auto-switch to relevant tab when role changes
      if (isTeacherRole(newData.role_id) && activeTab === 'basic') {
        setTimeout(() => setActiveTab('teacher'), 100);
      } else if (isStudentRole(newData.role_id) && activeTab === 'basic') {
        setTimeout(() => setActiveTab('student'), 100);
      }
    }
    
    // Handle email validation
    if (newData.email && newData.email !== formData.email) {
      debouncedEmailCheck(newData.email);
    }
    
    // Handle birth date change
    if (newData.birth_date && newData.birth_date !== selectedBirthDate) {
      setSelectedBirthDate(newData.birth_date);
    }
  }, [activeTab, selectedRole, formData.email, selectedBirthDate, debouncedEmailCheck]);

  // Enhanced validation before submit
  const validateFormData = useCallback((data: any) => {
    const errors: string[] = [];
    
    // Required field validation
    if (!data.first_name?.trim()) errors.push('Ad məcburi sahədir');
    if (!data.last_name?.trim()) errors.push('Soyad məcburi sahədir');
    if (!data.username?.trim()) errors.push('İstifadəçi adı məcburi sahədir');
    if (!data.email?.trim()) errors.push('Email məcburi sahədir');
    if (!data.role_id) errors.push('Rol seçilməlidir');
    
    // Email validation
    if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
      errors.push('Email formatı düz deyil');
    }
    
    if (emailValidation.isUnique === false) {
      errors.push('Bu email artıq istifadə olunur');
    }
    
    // Password validation for new users
    if (!user && (!data.password || data.password.length < 8)) {
      errors.push('Şifrə minimum 8 simvol olmalıdır');
    }
    
    if (data.password && data.password !== data.password_confirmation) {
      errors.push('Şifrə və şifrə təkrarı uyğun gəlmir');
    }
    
    // Role-based validation
    if (selectedRole) {
      if (isTeacherRole(selectedRole) && data.subjects && data.subjects.length === 0) {
        errors.push('Müəllim rolü üçün ən azı bir fən seçilməlidir');
      }
    }
    
    return errors;
  }, [user, emailValidation.isUnique, selectedRole, isTeacherRole]);
  
  const handleSubmit = async (data: any) => {
    // Merge current tab data with stored form data - ensure all tabs' data is included
    const finalData = { ...formData, ...data };
    console.log('📈 Final submit data:', finalData);
    
    // Enhanced validation
    const validationErrors = validateFormData(finalData);
    if (validationErrors.length > 0) {
      toast({
        title: 'Validation Xətası',
        description: validationErrors.join('\n'),
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      // Process subjects field if it exists
      if (data.subjects && Array.isArray(data.subjects)) {
        data.subjects = data.subjects.map((id: string) => parseInt(id));
      }

      // Convert is_active from string to boolean
      if (typeof data.is_active === 'string') {
        data.is_active = data.is_active === 'true';
      }

      // Convert role_id to role_name and keep both for backend compatibility
      if (data.role_id && availableRoles.length > 0) {
        const selectedRole = availableRoles.find(role => role.id.toString() === data.role_id.toString());
        if (selectedRole) {
          data.role_name = selectedRole.name;
          // Keep role_id as backend requires it
          data.role_id = parseInt(data.role_id);
        }
      } else if (!data.role_id) {
        console.error('❌ Role ID is missing in form data');
        toast({
          title: 'Xəta',
          description: 'Rol seçilməlidir',
          variant: 'destructive',
        });
        return;
      }

      // Check email uniqueness before submission
      if (data.email && emailValidation.isUnique === false) {
        toast({
          title: 'Email xətası',
          description: 'Bu email artıq istifadə olunur',
          variant: 'destructive',
        });
        return;
      }

      // Validate password confirmation
      if (data.password && data.password_confirmation) {
        if (data.password !== data.password_confirmation) {
          toast({
            title: 'Şifrə xətası',
            description: 'Şifrə və şifrə təkrarı uyğun gəlmir',
            variant: 'destructive',
          });
          return;
        }
      } else if (data.password && !data.password_confirmation) {
        toast({
          title: 'Şifrə təkrarı lazımdır',
          description: 'Şifrəni təkrar daxil edin',
          variant: 'destructive',
        });
        return;
      }

      // Ensure birth_date is null if empty
      if (!data.birth_date || data.birth_date.trim() === '') {
        data.birth_date = null;
      }

      // For regional operator, get institution_id from selected department
      let institutionIdToUse = data.institution_id ? parseInt(data.institution_id) : null;
      
      if (data.role_name === 'regionoperator' && data.department_id && !institutionIdToUse) {
        // Find the selected department and get its institution_id
        const selectedDepartment = availableDepartments.find(dept => dept.id.toString() === data.department_id);
        if (selectedDepartment && selectedDepartment.institution) {
          institutionIdToUse = selectedDepartment.institution.id;
        }
      }

      // Prepare data for backend - use simple structure
      const userData = {
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        password: data.password,
        password_confirmation: data.password_confirmation,
        role_name: data.role_name,
        role_id: data.role_id, // Backend requires role_id
        institution_id: institutionIdToUse,
        department_id: data.department_id ? parseInt(data.department_id) : null,
        is_active: data.is_active !== false, // default to true
        contact_phone: data.contact_phone,
        utis_code: data.utis_code
      };


      await onSave(userData);
      toast({
        title: 'Uğurlu',
        description: user 
          ? 'İstifadəçi məlumatları yeniləndi' 
          : 'Yeni istifadəçi əlavə edildi',
      });
      onClose();
    } catch (error: any) {
      console.error('User creation error:', error);
      
      // Enhanced error handling with better UX
      let errorTitle = 'Xəta';
      let errorDescription = 'Əməliyyat zamanı xəta baş verdi';
      
      if (error.message === 'Validation failed' && error.errors) {
        errorTitle = 'Məlumat Xətası';
        const errorMessages = Object.entries(error.errors)
          .map(([field, messages]: [string, any]) => {
            const fieldName = {
              'username': 'İstifadəçi adı',
              'email': 'E-poçt',
              'institution_id': 'Müəssisə',
              'department_id': 'Departament',
              'role_name': 'Rol',
              'password': 'Şifrə',
              'first_name': 'Ad',
              'last_name': 'Soyad',
              'contact_phone': 'Telefon'
            }[field] || field;
            
            const messageList = Array.isArray(messages) ? messages : [messages];
            return `${fieldName}: ${messageList.join(', ')}`;
          })
          .join('\n');
          
        errorDescription = errorMessages;
      } else if (error.status === 422) {
        errorTitle = 'Məlumat Xətası';
        errorDescription = 'Daxil edilmiş məlumatlar düz deyil. Zəhmət olmasa yoxlayın.';
      } else if (error.status === 409) {
        errorTitle = 'Dublikat Məlumat';
        errorDescription = 'Bu məlumatlarla istifadəçi artıq mövcuddur.';
      } else if (error.status === 500) {
        errorTitle = 'Server Xətası';
        errorDescription = 'Server tərəfində xəta baş verdi. Bir qədər sonra cəhd edin.';
      } else if (!error.message || error.message.includes('fetch')) {
        errorTitle = 'Əlaqə Xətası';
        errorDescription = 'İnternet bağlantınızı yoxlayın və yenidən cəhd edin.';
      } else {
        errorDescription = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Memoize default values to prevent re-calculation on each render
  const defaultValues = useMemo(() => {
    if (!user) return {};
    
    console.log('🔍 UserModal prepareDefaultValues - user data:', user);
    console.log('🔍 UserModal prepareDefaultValues - user.role_id:', user.role_id);
    
    const values: any = {
      // Basic user fields
      username: user.username || '',
      email: user.email || '',
      // Fix: Convert boolean to string for select field
      is_active: user.is_active !== undefined ? user.is_active.toString() : 'true',
      // Fix: Ensure role_id is string
      role_id: user.role_id ? user.role_id.toString() : '',
      institution_id: user.institution_id ? user.institution_id.toString() : '',
      department_id: user.department_id ? user.department_id.toString() : '',
      utis_code: user.utis_code || '',
      
      // Profile fields - flatten profile data to match form fields
      first_name: user.profile?.first_name || user.first_name || '',
      last_name: user.profile?.last_name || user.last_name || '',
      patronymic: user.profile?.patronymic || user.patronymic || '',
      birth_date: user.profile?.birth_date || user.birth_date || '',
      gender: user.profile?.gender || user.gender || '',
      national_id: user.profile?.national_id || user.national_id || '',
      contact_phone: user.profile?.contact_phone || user.contact_phone || '',
      emergency_contact_name: user.profile?.emergency_contact_name || user.emergency_contact_name || '',
      emergency_contact_phone: user.profile?.emergency_contact_phone || user.emergency_contact_phone || '',
      emergency_contact_email: user.profile?.emergency_contact_email || user.emergency_contact_email || '',
      address: user.profile?.address || user.address || '',
      
      // Teacher-specific fields
      subjects: user.profile?.subjects || user.subjects || [],
      specialty: user.profile?.specialty || user.specialty || '',
      experience_years: user.profile?.experience_years || user.experience_years || '',
      miq_score: user.profile?.miq_score || user.miq_score || '',
      certification_score: user.profile?.certification_score || user.certification_score || '',
      last_certification_date: user.profile?.last_certification_date || user.last_certification_date || '',
      qualifications: user.profile?.qualifications || user.qualifications || '',
      training_courses: user.profile?.training_courses || user.training_courses || '',
      degree_level: user.profile?.degree_level || user.degree_level || '',
      graduation_university: user.profile?.graduation_university || user.graduation_university || '',
      graduation_year: user.profile?.graduation_year || user.graduation_year || '',
      university_gpa: user.profile?.university_gpa || user.university_gpa || '',
      
      // Student-specific fields
      student_miq_score: user.profile?.student_miq_score || user.student_miq_score || '',
      academic_achievements: user.profile?.academic_achievements || user.academic_achievements || '',
      extracurricular_activities: user.profile?.extracurricular_activities || user.extracurricular_activities || '',
      health_info: user.profile?.health_info || user.health_info || '',
      previous_school: user.profile?.previous_school || user.previous_school || '',
      parent_occupation: user.profile?.parent_occupation || user.parent_occupation || '',
      family_income: user.profile?.family_income || user.family_income || '',
      special_needs: user.profile?.special_needs || user.special_needs || '',
      notes: user.profile?.notes || user.notes || '',
    };
    
    console.log('✅ UserModal prepareDefaultValues - prepared values:', values);
    console.log('✅ UserModal prepareDefaultValues - role_id in values:', values.role_id);
    console.log('✅ UserModal prepareDefaultValues - is_active in values:', values.is_active);
    
    return values;
  }, [user]);

  // Handle side effects when user data changes (separate from defaultValues calculation)
  useEffect(() => {
    if (!user) {
      // Clear form data when no user (new user mode)
      setFormData({});
      return;
    }

    // Set selected role from user data for dropdown
    if (user.role_id && user.role_id.toString() !== currentRoleRef.current) {
      setSelectedRole(user.role_id.toString());
    }
    
    // Set birth date for date picker
    const birthDate = user.profile?.birth_date || user.birth_date || '';
    if (birthDate && birthDate !== selectedBirthDate) {
      setSelectedBirthDate(birthDate);
    }

    // Initialize form data with user data for cross-tab persistence
    // Ensure critical fields are properly set
    const initialFormData = {
      ...defaultValues,
      role_id: user.role_id ? user.role_id.toString() : '',
      is_active: user.is_active !== undefined ? user.is_active.toString() : 'true',
      institution_id: user.institution_id ? user.institution_id.toString() : '',
      department_id: user.department_id ? user.department_id.toString() : ''
    };
    setFormData(initialFormData);
    console.log('🔄 Form data initialized:', initialFormData);
  }, [user, selectedBirthDate, defaultValues]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          if (loading) {
            e.preventDefault();
            return;
          }
          onClose();
        }}
        onPointerDownOutside={(e) => {
          if (loading) {
            e.preventDefault();
            return;
          }
          onClose();
        }}
        onInteractOutside={(e) => {
          if (loading) {
            e.preventDefault();
            return;
          }
          onClose();
        }}
        aria-describedby="user-modal-description"
        role="dialog"
        aria-modal="true"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            {user
              ? (mode === 'teacher' ? 'Müəllim məlumatlarını redaktə et' :
                 mode === 'student' ? 'Şagird məlumatlarını redaktə et' :
                 'İstifadəçi məlumatlarını redaktə et')
              : (mode === 'teacher' ? 'Yeni müəllim əlavə et' :
                 mode === 'student' ? 'Yeni şagird əlavə et' :
                 'Yeni istifadəçi əlavə et')
            }
            {user && user.utis_code && (
              <Badge variant="outline" className="ml-2">
                UTIS: {user.utis_code}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription id="user-modal-description" className="text-muted-foreground">
            {user
              ? (mode === 'teacher' ? 'Mövcud müəllimin məlumatlarını dəyişdirin və yadda saxlayın.' :
                 mode === 'student' ? 'Mövcud şagirdin məlumatlarını dəyişdirin və yadda saxlayın.' :
                 'Mövcud istifadəçinin məlumatlarını dəyişdirin və yadda saxlayın.')
              : (mode === 'teacher' ? 'Yeni müəllimin məlumatlarını daxil edin və əlavə edin.' :
                 mode === 'student' ? 'Yeni şagirdin məlumatlarını daxil edin və əlavə edin.' :
                 'Yeni istifadəçinin məlumatlarını daxil edin və əlavə edin.')
            }
          </DialogDescription>
        </DialogHeader>
        
        <Tabs 
          value={activeTab} 
          onValueChange={(newTab) => {
            console.log('🔄 Tab switching from', activeTab, 'to', newTab);
            console.log('📋 Current form data before switch:', formData);
            setActiveTab(newTab);
          }} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Əsas məlumatlar
            </TabsTrigger>
            <TabsTrigger 
              value="teacher" 
              className="flex items-center gap-2"
              disabled={!selectedRole || !isTeacherRole(selectedRole)}
            >
              <GraduationCap className="h-4 w-4" />
              Müəllim sahəsi
              {selectedRole && isTeacherRole(selectedRole) && (
                <Badge variant="secondary" className="text-xs">Aktiv</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="student" 
              className="flex items-center gap-2"
              disabled={!selectedRole || !isStudentRole(selectedRole)}
            >
              <BookOpen className="h-4 w-4" />
              Şagird sahəsi
              {selectedRole && isStudentRole(selectedRole) && (
                <Badge variant="secondary" className="text-xs">Aktiv</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="additional" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Əlavə məlumatlar
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {/* Context indicator based on active tab */}
            {activeTab === 'teacher' && selectedRole && isTeacherRole(selectedRole) && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <GraduationCap className="h-5 w-5" />
                  Müəllim üçün peşə məlumatları
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Bu bölmə yalnız müəllim rolunda olan istifadəçilər üçün doldurulmalıdır.
                </p>
              </div>
            )}
            {activeTab === 'student' && selectedRole && isStudentRole(selectedRole) && (
              <div className="mb-4 p-4 bg-green-50 rounded-lg border">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <BookOpen className="h-5 w-5" />
                  Şagird üçün akademik məlumatlar
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Bu bölmə yalnız şagird rolunda olan istifadəçilər üçün doldurulmalıdır.
                </p>
              </div>
            )}
            {activeTab === 'additional' && (
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border">
                <div className="flex items-center gap-2 text-purple-700 font-medium">
                  <FileText className="h-5 w-5" />
                  Əlavə və təcili əlaqə məlumatları
                </div>
                <p className="text-sm text-purple-600 mt-1">
                  Təcili hallarda əlaqə və digər əlavə məlumatlar.
                </p>
              </div>
            )}

            {/* Single FormBuilder with conditional fields */}
            <FormBuilder
              fields={getAllFields}
              onSubmit={handleSubmit}
              onChange={handleFormChange}
              submitLabel={user ? 'Yenilə' : 'Əlavə et'}
              loading={loading || loadingOptions}
              defaultValues={{...defaultValues, ...formData}} // Always merge latest form data
              columns={2}
              preserveValues={true} // Keep form values when fields change
              autoFocus={false} // Prevent auto focus to avoid aria-hidden issues
            />
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
