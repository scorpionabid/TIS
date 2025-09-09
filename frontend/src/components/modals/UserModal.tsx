import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormBuilder, createField, commonValidations } from '@/components/forms/FormBuilder';
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
}

export function UserModal({ open, onClose, user, onSave }: UserModalProps) {
  
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

  // Load subjects for teacher professional fields
  const { data: subjects } = useQuery({
    queryKey: subjectKeys.options(),
    queryFn: () => subjectService.getSubjectOptions(),
    enabled: open,
  });

  // Load available roles and institutions when modal opens
  useEffect(() => {
    if (open) {
      loadOptions();
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
    }
  }, [open]);

  // Load institutions or departments when selected role changes
  useEffect(() => {
    if (selectedRole && availableRoles.length > 0) {
      const selectedRoleData = availableRoles.find(r => r.id.toString() === selectedRole);
      
      // Reset previous state
      setAvailableInstitutions([]);
      setAvailableDepartments([]);
      
      if (selectedRoleData?.name === 'regionoperator') {
        loadDepartmentsForRole();
      } else {
        loadInstitutionsForRole();
      }
    }
  }, [selectedRole, availableRoles]);

  const loadOptions = async () => {
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
  };

  const loadInstitutionsForRole = async () => {
    try {
      const selectedRoleData = availableRoles.find(r => r.id.toString() === selectedRole);
      if (!selectedRoleData) return;

      console.log('🔄 Loading institutions for role:', selectedRoleData.name);
      const institutions = await userService.getAvailableInstitutions(selectedRoleData.name);
      console.log('🏢 Filtered institutions:', institutions);
      setAvailableInstitutions(institutions);
    } catch (error) {
      console.error('Failed to load institutions for role:', error);
      toast({
        title: 'Xəta',
        description: 'Seçilmiş rol üçün müəssisələr yüklənə bilmədi',
        variant: 'destructive',
      });
    }
  };

  const loadDepartmentsForRole = async () => {
    try {
      const selectedRoleData = availableRoles.find(r => r.id.toString() === selectedRole);
      if (!selectedRoleData) return;

      console.log('🔄 Loading departments for role:', selectedRoleData.name);
      const departments = await userService.getAvailableDepartments(selectedRoleData.name);
      console.log('🏢 Filtered departments:', departments);
      setAvailableDepartments(departments);
    } catch (error) {
      console.error('Failed to load departments for role:', error);
      toast({
        title: 'Xəta',
        description: 'Seçilmiş rol üçün departamentlər yüklənə bilmədi',
        variant: 'destructive',
      });
    }
  };

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

  // Check if selected role is teacher or student
  const isTeacherRole = (roleId: string) => {
    const role = availableRoles.find(r => r.id.toString() === roleId);
    return role && (role.name.toLowerCase().includes('teacher') || 
                   role.name.toLowerCase().includes('müəllim') ||
                   role.display_name.toLowerCase().includes('müəllim'));
  };

  const isStudentRole = (roleId: string) => {
    const role = availableRoles.find(r => r.id.toString() === roleId);
    return role && (role.name.toLowerCase().includes('student') || 
                   role.name.toLowerCase().includes('şagird') ||
                   role.display_name.toLowerCase().includes('şagird'));
  };

  const isRegionalOperatorRole = (roleId: string) => {
    const role = availableRoles.find(r => r.id.toString() === roleId);
    return role && role.name === 'regionoperator';
  };

  // Basic Information Fields
  const getBasicFields = () => [
    createField('first_name', 'Ad', 'text', {
      required: true,
      placeholder: 'İstifadəçinin adı',
      validation: commonValidations.required,
    }),
    createField('last_name', 'Soyad', 'text', {
      required: true,
      placeholder: 'İstifadəçinin soyadı',
      validation: commonValidations.required,
    }),
    createField('patronymic', 'Ata adı', 'text', {
      placeholder: 'Ata adı (məcburi deyil)',
    }),
    createField('username', 'İstifadəçi adı', 'text', {
      required: true,
      placeholder: 'istifadeci_adi',
      validation: commonValidations.required,
    }),
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
    createField('contact_phone', 'Telefon', 'text', {
      placeholder: '+994 XX XXX XX XX',
      validation: commonValidations.phone.optional(),
    }),
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
    createField('gender', 'Cins', 'select', {
      options: [
        { label: 'Kişi', value: 'male' },
        { label: 'Qadın', value: 'female' }
      ],
      placeholder: 'Cinsi seçin',
    }),
    createField('national_id', 'Şəxsiyyət vəsiqəsi', 'text', {
      placeholder: 'AZE1234567',
    }),
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
  ];

  // Teacher Professional Fields
  const getTeacherFields = () => [
    createField('subjects', 'Dərs verdiyi fənlər', 'multiselect', {
      options: subjects || [],
      placeholder: 'Fənləri seçin',
      description: 'Müəllimin dərs verə biləcəyi fənlər',
    }),
    createField('specialty', 'İxtisas', 'text', {
      placeholder: 'Məsələn: Riyaziyyat müəllimi',
      description: 'Müəllimin peşə ixtisası',
    }),
    createField('experience_years', 'İş təcrübəsi (il)', 'number', {
      placeholder: '0',
      min: 0,
      max: 50,
      description: 'Təhsil sahəsindəki iş təcrübəsi',
    }),
    createField('miq_score', 'MİQ balı', 'number', {
      placeholder: '0.00',
      min: 0,
      max: 999.99,
      step: 0.01,
      description: 'Müəllimin peşə inkişafı üzrə MİQ balı',
    }),
    createField('certification_score', 'Sertifikasiya balı', 'number', {
      placeholder: '0.00',
      min: 0,
      max: 999.99,
      step: 0.01,
      description: 'Müəllimin sertifikasiya balı',
    }),
    createField('last_certification_date', 'Son sertifikasiya tarixi', 'date', {
      description: 'Ən son sertifikasiya alınma tarixi',
    }),
    createField('degree_level', 'Təhsil səviyyəsi', 'select', {
      options: [
        { label: 'Orta təhsil', value: 'secondary' },
        { label: 'Orta peşə təhsili', value: 'vocational' },
        { label: 'Bakalavr', value: 'bachelor' },
        { label: 'Magistr', value: 'master' },
        { label: 'Doktorantura', value: 'phd' }
      ],
      placeholder: 'Təhsil səviyyəsini seçin',
    }),
    createField('graduation_university', 'Bitirdiyi universitet', 'text', {
      placeholder: 'Universitet adı',
    }),
    createField('graduation_year', 'Bitirmə ili', 'number', {
      placeholder: '2020',
      min: 1950,
      max: new Date().getFullYear(),
    }),
    createField('university_gpa', 'Universitet GPA', 'number', {
      placeholder: '3.50',
      min: 0,
      max: 4.00,
      step: 0.01,
      description: '4.0 şkalası üzrə orta bal',
    }),
  ];

  // Student Academic Fields  
  const getStudentFields = () => [
    createField('student_miq_score', 'Şagird MİQ balı', 'number', {
      placeholder: '0.00',
      min: 0,
      max: 999.99,
      step: 0.01,
      description: 'Şagirdin akademik uğur göstəricisi',
    }),
    createField('previous_school', 'Əvvəlki məktəb', 'text', {
      placeholder: 'Əvvəl oxuduğu təhsil müəssisəsi',
    }),
    createField('family_income', 'Ailə gəliri (AZN)', 'number', {
      placeholder: '500.00',
      min: 0,
      step: 0.01,
      description: 'Ailənin aylıq gəliri',
    }),
  ];

  // Additional fields
  const getAdditionalFields = () => [
    createField('emergency_contact_name', 'Təcili əlaqə şəxsi', 'text', {
      placeholder: 'Təcili hallarda əlaqə saxlanılacaq şəxsin adı',
    }),
    createField('emergency_contact_phone', 'Təcili əlaqə telefonu', 'text', {
      placeholder: '+994 XX XXX XX XX',
      validation: commonValidations.phone.optional(),
    }),
    createField('emergency_contact_email', 'Təcili əlaqə e-poçtu', 'email', {
      placeholder: 'emergency@example.com',
      validation: commonValidations.email.optional(),
    }),
    createField('notes', 'Əlavə qeydlər', 'textarea', {
      placeholder: 'Digər mühüm məlumatlar',
      rows: 3,
    }),
  ];

  const handleSubmit = async (data: any) => {
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
      
      // Handle validation errors specifically
      if (error.message === 'Validation failed' && error.errors) {
        const errorMessages = Object.entries(error.errors)
          .map(([field, messages]: [string, any]) => {
            const fieldName = field === 'username' ? 'İstifadəçi adı' :
                            field === 'email' ? 'E-poçt' :
                            field === 'institution_id' ? 'Müəssisə' :
                            field === 'department_id' ? 'Departament' :
                            field === 'role_name' ? 'Rol' :
                            field === 'password' ? 'Parol' : field;
            
            const messageList = Array.isArray(messages) ? messages : [messages];
            return `${fieldName}: ${messageList.join(', ')}`;
          })
          .join('\n');
          
        toast({
          title: 'Validation Xətası',
          description: errorMessages,
          variant: 'destructive',
        });
      } else {
        // Generic error message
        toast({
          title: 'Xəta',
          description: error.message || 'Əməliyyat zamanı xəta baş verdi',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const prepareDefaultValues = () => {
    if (!user) return {};
    
    console.log('🔍 UserModal prepareDefaultValues - user data:', user);
    console.log('🔍 UserModal prepareDefaultValues - user.role_id:', user.role_id);
    
    const values: any = {
      // Basic user fields
      username: user.username || '',
      email: user.email || '',
      is_active: user.is_active !== undefined ? user.is_active : true,
      role_id: user.role_id || '',
      institution_id: user.institution_id || '',
      department_id: user.department_id || '',
      utis_code: user.utis_code || '',
      
      // Profile fields - flatten profile data to match form fields
      first_name: user.profile?.first_name || user.first_name || '',
      last_name: user.profile?.last_name || user.last_name || '',
      patronymic: user.profile?.patronymic || user.patronymic || '',
      birth_date: user.profile?.birth_date || user.birth_date || '',
      gender: user.profile?.gender || user.gender || '',
      national_id: user.profile?.national_id || user.national_id || '',
      contact_phone: user.profile?.contact_phone || user.contact_phone || '',
      emergency_contact: user.profile?.emergency_contact || user.emergency_contact || '',
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
    
    // Set selected role from user data for dropdown
    if (user.role_id) {
      setSelectedRole(user.role_id.toString());
    }
    
    // Set birth date for date picker
    if (values.birth_date) {
      setSelectedBirthDate(values.birth_date);
    }
    
    console.log('✅ UserModal prepareDefaultValues - prepared values:', values);
    console.log('✅ UserModal prepareDefaultValues - role_id in values:', values.role_id);
    
    return values;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          // Allow default escape behavior, just ensure clean close
          onClose();
        }}
        onPointerDownOutside={(e) => {
          // Allow default outside click behavior, just ensure clean close  
          onClose();
        }}
        onInteractOutside={(e) => {
          // Handle all outside interactions consistently
          if (loading) {
            e.preventDefault();
            return;
          }
          onClose();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            {user ? 'İstifadəçi məlumatlarını redaktə et' : 'Yeni istifadəçi əlavə et'}
            {user && user.utis_code && (
              <Badge variant="outline" className="ml-2">
                UTIS: {user.utis_code}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {user 
              ? 'Mövcud istifadəçinin məlumatlarını dəyişdirin və yadda saxlayın.'
              : 'Yeni istifadəçinin məlumatlarını daxil edin və əlavə edin.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

          <TabsContent value="basic" className="mt-6">
            <FormBuilder
              fields={getBasicFields()}
              onSubmit={handleSubmit}
              submitLabel={user ? 'Yenilə' : 'Əlavə et'}
              loading={loading || loadingOptions}
              defaultValues={prepareDefaultValues()}
              columns={2}
            />
          </TabsContent>

          <TabsContent value="teacher" className="mt-6">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border">
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <GraduationCap className="h-5 w-5" />
                Müəllim üçün peşə məlumatları
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Bu bölmə yalnız müəllim rolunda olan istifadəçilər üçün doldurulmalıdır.
              </p>
            </div>
            <FormBuilder
              fields={getTeacherFields()}
              onSubmit={handleSubmit}
              submitLabel={user ? 'Yenilə' : 'Əlavə et'}
              loading={loading || loadingOptions}
              defaultValues={prepareDefaultValues()}
              columns={2}
            />
          </TabsContent>

          <TabsContent value="student" className="mt-6">
            <div className="mb-4 p-4 bg-green-50 rounded-lg border">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <BookOpen className="h-5 w-5" />
                Şagird üçün akademik məlumatlar
              </div>
              <p className="text-sm text-green-600 mt-1">
                Bu bölmə yalnız şagird rolunda olan istifadəçilər üçün doldurulmalıdır.
              </p>
            </div>
            <FormBuilder
              fields={getStudentFields()}
              onSubmit={handleSubmit}
              submitLabel={user ? 'Yenilə' : 'Əlavə et'}
              loading={loading || loadingOptions}
              defaultValues={prepareDefaultValues()}
              columns={2}
            />
          </TabsContent>

          <TabsContent value="additional" className="mt-6">
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border">
              <div className="flex items-center gap-2 text-purple-700 font-medium">
                <FileText className="h-5 w-5" />
                Əlavə və təcili əlaqə məlumatları
              </div>
              <p className="text-sm text-purple-600 mt-1">
                Təcili hallarda əlaqə və digər əlavə məlumatlar.
              </p>
            </div>
            <FormBuilder
              fields={getAdditionalFields()}
              onSubmit={handleSubmit}
              submitLabel={user ? 'Yenilə' : 'Əlavə et'}
              loading={loading || loadingOptions}
              defaultValues={prepareDefaultValues()}
              columns={2}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}