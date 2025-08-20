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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, userService } from '@/services/users';
import { subjectService, subjectKeys } from '@/services/subjects';
import { 
  User as UserIcon, 
  GraduationCap, 
  Award, 
  FileText, 
  Users,
  BookOpen
} from 'lucide-react';

interface EnhancedUserModalProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  onSave: (user: any) => Promise<void>;
}

export function EnhancedUserModal({ open, onClose, user, onSave }: EnhancedUserModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [availableRoles, setAvailableRoles] = useState<Array<{id: number, name: string, display_name: string, level: number}>>([]);
  const [availableInstitutions, setAvailableInstitutions] = useState<Array<{id: number, name: string, type: string, level: number, parent_id: number | null}>>([]);
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
    }
  }, [open]);

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      const [roles, institutions] = await Promise.all([
        userService.getAvailableRoles(),
        userService.getAvailableInstitutions()
      ]);
      
      setAvailableRoles(roles);
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
      required: false, // Email opsional oldu
      placeholder: 'ornek@edu.gov.az (məcburi deyil)',
      validation: commonValidations.email.optional(),
    }),
    createField('password', 'Şifrə', 'password', {
      required: !user,
      placeholder: 'Minimum 8 simvol',
      validation: !user ? commonValidations.required : undefined,
    }),
    createField('utis_code', 'UTIS Kodu', 'text', {
      placeholder: 'Avtomatik yaradılacaq',
      disabled: true,
      description: '7 rəqəmli unikal kod avtomatik təyin ediləcək',
    }),
    createField('contact_phone', 'Telefon', 'text', {
      placeholder: '+994 XX XXX XX XX',
      validation: commonValidations.phone.optional(),
    }),
    createField('birth_date', 'Doğum tarixi', 'date', {
      placeholder: 'Tarix seçin',
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
    createField('role_id', 'Rol', 'select', {
      required: true,
      options: availableRoles.map(role => ({ 
        label: role.display_name, 
        value: role.id.toString() 
      })),
      placeholder: loadingOptions ? 'Rollar yüklənir...' : 'Rol seçin',
      disabled: loadingOptions,
      validation: commonValidations.required,
    }),
    createField('institution_id', 'Müəssisə', 'select', {
      options: availableInstitutions.map(institution => ({ 
        label: `${institution.name} (${institution.type})`, 
        value: institution.id.toString() 
      })),
      placeholder: loadingOptions ? 'Müəssisələr yüklənir...' : 'Müəssisə seçin',
      disabled: loadingOptions,
    }),
    createField('is_active', 'Status', 'select', {
      required: true,
      options: [
        { label: 'Aktiv', value: true },
        { label: 'Deaktiv', value: false }
      ],
      defaultValue: true,
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

  // Complex fields that need special handling
  const getComplexFields = () => [
    createField('qualifications', 'Kvalifikasiyalar', 'textarea', {
      placeholder: 'Əlavə kvalifikasiyalar, sertifikatlar və s.',
      description: 'JSON formatında: ["Kvalifikasiya 1", "Kvalifikasiya 2"]',
    }),
    createField('training_courses', 'Təlim kursları', 'textarea', {
      placeholder: 'Keçdiyi təlim kursları',
      description: 'JSON formatında: ["Kurs 1", "Kurs 2"]',
    }),
    createField('academic_achievements', 'Akademik nailiyyətlər', 'textarea', {
      placeholder: 'Akademik uğurlar və mükafatlar',
      description: 'JSON formatında: ["Nailiyyət 1", "Nailiyyət 2"]',
    }),
    createField('extracurricular_activities', 'Əlavə fəaliyyətlər', 'textarea', {
      placeholder: 'İdman, musiqi, incəsənət və s.',
      description: 'JSON formatında: ["Fəaliyyət 1", "Fəaliyyət 2"]',
    }),
    createField('health_info', 'Sağlamlıq məlumatları', 'textarea', {
      placeholder: 'Sağlamlıq vəziyyəti, allergiyalar və s.',
      description: 'JSON formatında: {"allergies": [], "conditions": []}',
    }),
    createField('parent_occupation', 'Valideyn peşəsi', 'textarea', {
      placeholder: 'Valideynlərin peşə məlumatları',
      description: 'JSON formatında: {"mother": "Peşə", "father": "Peşə"}',
    }),
    createField('special_needs', 'Xüsusi ehtiyaclar', 'textarea', {
      placeholder: 'Xüsusi dəstək ehtiyacları',
      description: 'JSON formatında: ["Ehtiyac 1", "Ehtiyac 2"]',
    }),
    createField('notes', 'Əlavə qeydlər', 'textarea', {
      placeholder: 'Digər mühüm məlumatlar',
      rows: 3,
    }),
  ];

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Parse JSON fields for complex data
      const processedData = { ...data };
      
      // Process JSON fields
      const jsonFields = ['qualifications', 'training_courses', 'academic_achievements', 
                         'extracurricular_activities', 'health_info', 'parent_occupation', 'special_needs'];
      
      jsonFields.forEach(field => {
        if (processedData[field] && typeof processedData[field] === 'string') {
          try {
            processedData[field] = JSON.parse(processedData[field]);
          } catch (e) {
            // If parsing fails, convert to array of strings
            processedData[field] = [processedData[field]];
          }
        }
      });

      // Process subjects field
      if (processedData.subjects && Array.isArray(processedData.subjects)) {
        processedData.subjects = processedData.subjects.map((id: string) => parseInt(id));
      }

      await onSave(processedData);
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
    
    // Prepare JSON fields for display
    const jsonFields = ['qualifications', 'training_courses', 'academic_achievements', 
                       'extracurricular_activities', 'health_info', 'parent_occupation', 'special_needs'];
    
    jsonFields.forEach(field => {
      if (values[field] && typeof values[field] === 'object') {
        values[field] = JSON.stringify(values[field], null, 2);
      }
    });

    return values;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            {user ? 'İstifadəçi məlumatlarını redaktə et' : 'Yeni istifadəçi əlavə et'}
            {user && (
              <Badge variant="outline" className="ml-2">
                UTIS: {user.utis_code || 'Təyin edilməyib'}
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
            <TabsTrigger value="teacher" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Müəllim sahəsi
            </TabsTrigger>
            <TabsTrigger value="student" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Şagird sahəsi
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
                <Award className="h-5 w-5" />
                Əlavə və mürəkkəb məlumatlar
              </div>
              <p className="text-sm text-purple-600 mt-1">
                Bu sahələr JSON formatında strukturlaşdırılmış məlumatları qəbul edir.
              </p>
            </div>
            <FormBuilder
              fields={getComplexFields()}
              onSubmit={handleSubmit}
              submitLabel={user ? 'Yenilə' : 'Əlavə et'}
              loading={loading || loadingOptions}
              defaultValues={prepareDefaultValues()}
              columns={1}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}