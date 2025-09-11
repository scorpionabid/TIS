import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormBuilder, createField, commonValidations } from '@/components/forms/FormBuilder';
import { userFields, studentFields } from '@/components/modals/configurations/modalFieldConfig';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Student, StudentCreateData } from '@/services/students';
import { institutionService } from '@/services/institutions';
import { gradeService } from '@/services/grades';
import { 
  User as UserIcon, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Users,
  Heart,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Badge as BadgeIcon
} from 'lucide-react';

interface StudentModalProps {
  open: boolean;
  onClose: () => void;
  student?: Student | null;
  onSave: (student: StudentCreateData) => Promise<void>;
}

// Student validation schema
const studentSchema = z.object({
  first_name: z.string().min(1, 'Ad tələb olunur'),
  last_name: z.string().min(1, 'Soyad tələb olunur'),
  student_number: z.string().min(1, 'Şagird nömrəsi tələb olunur'),
  email: z.string().email('Düzgün email formatı daxil edin').optional().or(z.literal('')),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().optional(),
  enrollment_date: z.string().optional(),
  current_grade_level: z.number().min(1).max(12).optional(),
  class_id: z.number().optional(),
  institution_id: z.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  
  // Guardian information
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().email().optional().or(z.literal('')),
  guardian_relation: z.string().optional(),
  
  // Medical information
  medical_conditions: z.string().optional(),
  allergies: z.string().optional(),
  emergency_contact: z.string().optional(),
  
  // Notes
  notes: z.string().optional(),
});

export function StudentModal({ open, onClose, student, onSave }: StudentModalProps) {
  console.log('🎓 StudentModal rendered with props:', { open, hasStudent: !!student });
  
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Load institutions and grades for dropdowns
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions', 'for-student-modal'],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  const { data: gradesResponse } = useQuery({
    queryKey: ['grades', 'for-student-modal'],
    queryFn: () => gradeService.getAll({ per_page: 100 }),
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  // Process data for dropdowns
  const institutions = institutionsResponse?.data || [];
  const grades = gradesResponse?.data || [];

  // Reset tab when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab('basic');
    }
  }, [open]);

  const handleFormSubmit = useCallback(async (data: any) => {
    try {
      setLoading(true);
      console.log('🎓 StudentModal submitting data:', data);
      
      // Process the data
      const studentData: StudentCreateData = {
        ...data,
        current_grade_level: data.current_grade_level ? Number(data.current_grade_level) : undefined,
        class_id: data.class_id ? Number(data.class_id) : undefined,
        institution_id: data.institution_id ? Number(data.institution_id) : undefined,
        status: data.status || 'active',
        is_active: true,
      };

      await onSave(studentData);
      
      toast({
        title: student ? "Şagird yeniləndi" : "Yeni şagird yaradıldı",
        description: student 
          ? `${data.first_name} ${data.last_name} məlumatları yeniləndi` 
          : `${data.first_name} ${data.last_name} sistemi əlavə edildi`,
      });
      
      onClose();
    } catch (error: any) {
      console.error('🚨 StudentModal save error:', error);
      toast({
        title: "Xəta baş verdi",
        description: error.message || "Şagird yadda saxlanıla bilmədi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [student, onSave, onClose, toast]);

  // Form fields configuration - Using modalFieldConfig
  const basicFields = [
    userFields.firstName,
    userFields.lastName,
    createField('student_number', 'Şagird Nömrəsi', 'text', {
      required: true,
      placeholder: 'Məs: ST2024001',
      validation: commonValidations.required,
    }),
    userFields.email,
    userFields.contactPhone,
    userFields.birthDate,
    createField('gender', 'Cins', 'select', {
      options: [
        { value: 'male', label: 'Kişi' },
        { value: 'female', label: 'Qadın' },
        { value: 'other', label: 'Digər' },
      ],
      placeholder: 'Cinsi seçin',
    }),
    createField('address', 'Ünvan', 'textarea', {
      placeholder: 'Yaşayış ünvanı',
      rows: 2,
    }),
  ];

  const academicFields = [
    createField('enrollment_date', 'Qeydiyyat Tarixi', 'date', {
      placeholder: 'Qeydiyyat tarixini seçin',
    }),
    createField('current_grade_level', 'Sinif Səviyyəsi', 'select', {
      options: Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: `${i + 1}-ci sinif`,
      })),
      placeholder: 'Sinif səviyyəsini seçin',
    }),
    createField('class_id', 'Sinif', 'select', {
      options: grades.map((grade: any) => ({
        value: String(grade.id),
        label: grade.name || `${grade.level}-ci sinif`,
      })),
      placeholder: 'Sinifdəni seçin',
    }),
    createField('institution_id', 'Təhsil Müəssisəsi', 'select', {
      options: institutions.map((institution: any) => ({
        value: String(institution.id),
        label: institution.name,
      })),
      placeholder: 'Müəssisəni seçin',
    }),
    createField('status', 'Status', 'select', {
      options: [
        { value: 'active', label: 'Aktiv' },
        { value: 'inactive', label: 'Passiv' },
      ],
      placeholder: 'Statusu seçin',
    }),
  ];

  const guardianFields = [
    createField('guardian_name', 'Valideyn/Himayədər Adı', 'text', {
      placeholder: 'Tam adı daxil edin',
    }),
    createField('guardian_phone', 'Valideyn Telefonu', 'text', {
      placeholder: '+994501234567',
    }),
    createField('guardian_email', 'Valideyn Email', 'email', {
      placeholder: 'email@example.com',
    }),
    createField('guardian_relation', 'Qohumluq Əlaqəsi', 'select', {
      options: [
        { value: 'mother', label: 'Ana' },
        { value: 'father', label: 'Ata' },
        { value: 'grandmother', label: 'Nənə' },
        { value: 'grandfather', label: 'Baba' },
        { value: 'guardian', label: 'Qəyyum' },
        { value: 'other', label: 'Digər' },
      ],
      placeholder: 'Əlaqəni seçin',
    }),
  ];

  const medicalFields = [
    createField('medical_conditions', 'Tibbi Vəziyyət', 'textarea', {
      placeholder: 'Məlum tibbi problemlər varsa qeyd edin',
      rows: 3,
    }),
    createField('allergies', 'Allergiyalar', 'textarea', {
      placeholder: 'Məlum allergiyalar varsa qeyd edin',
      rows: 2,
    }),
    createField('emergency_contact', 'Fövqəladə Hal Üçün Əlaqə', 'text', {
      placeholder: 'Fövqəladə hallarda əlaqə məlumatı',
    }),
    createField('notes', 'Əlavə Qeydlər', 'textarea', {
      placeholder: 'Digər mühüm məlumatlar',
      rows: 3,
    }),
  ];

  // Default values for form
  const defaultValues = student ? {
    first_name: student.first_name || '',
    last_name: student.last_name || '',
    student_number: student.student_number || '',
    email: student.email || '',
    phone: student.phone || '',
    date_of_birth: student.date_of_birth || '',
    gender: student.gender || '',
    address: student.address || '',
    enrollment_date: student.enrollment_date || '',
    current_grade_level: student.current_grade_level || '',
    class_id: student.current_class?.id || '',
    institution_id: student.institution_id || '',
    status: student.status || 'active',
    guardian_name: student.guardian_name || '',
    guardian_phone: student.guardian_phone || '',
    guardian_email: student.guardian_email || '',
    guardian_relation: student.guardian_relation || '',
    medical_conditions: student.medical_conditions || '',
    allergies: student.allergies || '',
    emergency_contact: student.emergency_contact || '',
    notes: student.notes || '',
  } : {
    status: 'active',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {student ? 'Şagird Məlumatlarını Redaktə Et' : 'Yeni Şagird Əlavə Et'}
            {student && (
              <Badge variant="outline" className="ml-2">
                ID: {student.id}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Əsas Məlumat
            </TabsTrigger>
            <TabsTrigger value="academic" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Akademik
            </TabsTrigger>
            <TabsTrigger value="guardian" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Valideyn
            </TabsTrigger>
            <TabsTrigger value="medical" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Tibbi/Qeydlər
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <FormBuilder
              fields={basicFields}
              onSubmit={handleFormSubmit}
              defaultValues={defaultValues}
              loading={loading}
              submitLabel={student ? 'Yenilə' : 'Şagird Yarad'}
              columns={2}
            />
          </TabsContent>

          <TabsContent value="academic" className="space-y-4">
            <FormBuilder
              fields={academicFields}
              onSubmit={handleFormSubmit}
              defaultValues={defaultValues}
              loading={loading}
              submitLabel={student ? 'Yenilə' : 'Şagird Yarad'}
              columns={2}
            />
          </TabsContent>

          <TabsContent value="guardian" className="space-y-4">
            <FormBuilder
              fields={guardianFields}
              onSubmit={handleFormSubmit}
              defaultValues={defaultValues}
              loading={loading}
              submitLabel={student ? 'Yenilə' : 'Şagird Yarad'}
              columns={2}
            />
          </TabsContent>

          <TabsContent value="medical" className="space-y-4">
            <FormBuilder
              fields={medicalFields}
              onSubmit={handleFormSubmit}
              defaultValues={defaultValues}
              loading={loading}
              submitLabel={student ? 'Yenilə' : 'Şagird Yarad'}
              columns={1}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}