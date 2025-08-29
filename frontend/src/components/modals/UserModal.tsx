import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
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
    }),
    createField('password', 'Şifrə', 'password', {
      required: !user,
      placeholder: 'Minimum 8 simvol',
      validation: !user ? commonValidations.required : undefined,
    }),
    createField('contact_phone', 'Telefon', 'text', {
      placeholder: '+994 XX XXX XX XX',
      validation: commonValidations.phone.optional(),
    }),
    createField('birth_date', 'Doğum tarixi', 'date', {
      placeholder: 'Tarix seçin (ixtiyari)',
      required: false,
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

      // Convert role_id to role_name
      if (data.role_id && availableRoles.length > 0) {
        const selectedRole = availableRoles.find(role => role.id.toString() === data.role_id.toString());
        if (selectedRole) {
          data.role_name = selectedRole.name;
          delete data.role_id; // Remove role_id as we now have role_name
        }
      }

      // Add password_confirmation for validation
      if (data.password) {
        data.password_confirmation = data.password;
      }

      // Ensure birth_date is null if empty
      if (!data.birth_date || data.birth_date.trim() === '') {
        data.birth_date = null;
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
        institution_id: data.institution_id ? parseInt(data.institution_id) : null,
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
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Əməliyyat zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const prepareDefaultValues = () => {
    if (!user) return {};
    
    const values = { ...user };
    
    // Set selected role from user data
    if (user.role_id) {
      setSelectedRole(user.role_id.toString());
    }

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