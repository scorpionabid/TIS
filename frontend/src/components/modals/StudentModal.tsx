import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { createField, commonValidations } from '@/components/forms/FormBuilder.helpers';
import { userFields, studentFields } from '@/components/modals/configurations/modalFieldConfig';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Student, StudentCreateData } from '@/services/students';
import { institutionService } from '@/services/institutions';
import { gradeService } from '@/services/grades';
import { useAuth } from '@/contexts/AuthContext';
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
  current_grade_level: z.union([z.number(), z.string()]).optional(),
  class_id: z.union([z.number(), z.string()]).optional(),
  institution_id: z.union([z.number(), z.string()]).optional(),
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
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Debug logging for modal open state
  useEffect(() => {
    if (open) {
      console.log('🚀 StudentModal OPENED:', { 
        studentId: (student as any)?.id,
        institutionId: (student as any)?.institution_id || currentUser?.institution_id,
        hasCurrentUser: !!currentUser 
      });
    }
  }, [open, student, currentUser]);

  const institutionId = (student as any)?.institution_id || currentUser?.institution?.id || currentUser?.institution_id;

  // Load grades scoped to the current institution
  const { data: gradesResponse, refetch: refetchGrades } = useQuery({
    queryKey: ['grades', 'for-student-modal', institutionId || 'all'],
    queryFn: () => gradeService.get(institutionId ? { institution_id: Number(institutionId), per_page: 100, is_active: true } : { per_page: 100, is_active: true }),
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  // Force refetch when modal opens to ensure fresh data
  useEffect(() => {
    if (open) {
      console.log('🔄 StudentModal: Forcing grades refetch for institution:', institutionId);
      refetchGrades();
    }
  }, [open, institutionId, refetchGrades]);

  // Process data for class dropdown — sorted by level then name
  const rawData = gradesResponse as any;
  const grades = React.useMemo(() => {
    // Robust extraction of items array from various possible response shapes
    const items = rawData?.items || 
                 (Array.isArray(rawData) ? rawData : 
                 (rawData?.data?.grades || rawData?.data || []));
    
    const list = Array.isArray(items) ? items : [];
    
    if (open) {
      console.log('📊 StudentModal Grades Processed:', {
        itemsCount: list.length,
        firstItem: list[0] ? { id: list[0].id, name: list[0].name } : 'none'
      });
    }

    return [...list].sort(
      (a: any, b: any) => (a.class_level || 0) - (b.class_level || 0) || (a.name || '').localeCompare(b.name || '')
    );
  }, [rawData, open]);

  // Create shared form instance for all tabs
  const sharedForm = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: student ? {
      first_name: (student as any).first_name || '',
      last_name: (student as any).last_name || '',
      student_number: (student as any).student_number || '',
      email: (student as any).email || '',
      phone: (student as any).phone || '',
      date_of_birth: (student as any).date_of_birth ? String((student as any).date_of_birth).split('T')[0] : '',
      gender: (student as any).gender || '',
      address: (student as any).address || '',
      enrollment_date: (student as any).enrollment_date ? String((student as any).enrollment_date).split('T')[0] : '',
      current_grade_level: (student as any).current_grade_level || '',
      class_id: (student as any).current_class?.id ? String((student as any).current_class.id) : ((student as any).class_id ? String((student as any).class_id) : ''),
      institution_id: (student as any).institution_id || '',
      status: (student as any).status || 'active',
      guardian_name: (student as any).guardian_name || '',
      guardian_phone: (student as any).guardian_phone || '',
      guardian_email: (student as any).guardian_email || '',
      guardian_relation: (student as any).guardian_relation || '',
      medical_conditions: (student as any).medical_conditions || '',
      allergies: (student as any).allergies || '',
      emergency_contact: (student as any).emergency_contact || '',
      notes: (student as any).notes || '',
    } : {
      first_name: '',
      last_name: '',
      student_number: '',
      email: '',
      phone: '',
      date_of_birth: '',
      gender: '',
      address: '',
      enrollment_date: '',
      current_grade_level: '',
      class_id: '',
      institution_id: institutionId || '',
      status: 'active',
      guardian_name: '',
      guardian_phone: '',
      guardian_email: '',
      guardian_relation: '',
      medical_conditions: '',
      allergies: '',
      emergency_contact: '',
      notes: '',
    },
  });

  // Reset form when modal opens/closes or student changes
  useEffect(() => {
    if (open) {
      sharedForm.reset(student ? {
        first_name: (student as any).first_name || '',
        last_name: (student as any).last_name || '',
        student_number: (student as any).student_number || '',
        email: (student as any).email || '',
        phone: (student as any).phone || '',
        date_of_birth: (student as any).date_of_birth ? String((student as any).date_of_birth).split('T')[0] : '',
        gender: (student as any).gender || '',
        address: (student as any).address || '',
        enrollment_date: (student as any).enrollment_date ? String((student as any).enrollment_date).split('T')[0] : '',
        current_grade_level: (student as any).current_grade_level || '',
        class_id: (student as any).current_class?.id ? String((student as any).current_class.id) : ((student as any).class_id ? String((student as any).class_id) : ''),
        institution_id: (student as any).institution_id || institutionId || '',
        status: (student as any).status || 'active',
        guardian_name: (student as any).guardian_name || '',
        guardian_phone: (student as any).guardian_phone || '',
        guardian_email: (student as any).guardian_email || '',
        guardian_relation: (student as any).guardian_relation || '',
        medical_conditions: (student as any).medical_conditions || '',
        allergies: (student as any).allergies || '',
        emergency_contact: (student as any).emergency_contact || '',
        notes: (student as any).notes || '',
      } : {
        first_name: '',
        last_name: '',
        student_number: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: '',
        address: '',
        enrollment_date: '',
        current_grade_level: '',
        class_id: '',
        institution_id: institutionId || '',
        status: 'active',
        guardian_name: '',
        guardian_phone: '',
        guardian_email: '',
        guardian_relation: '',
        medical_conditions: '',
        allergies: '',
        emergency_contact: '',
        notes: '',
      });
      setActiveTab('basic');
    }
  }, [open, student, institutionId, sharedForm]);

  // Reset tab when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab('basic');
    }
  }, [open]);

  const handleFormSubmit = useCallback(async (data: any) => {
    try {
      setLoading(true);
      
      console.log('🔍 StudentModal - Raw form data:', data);
      
      // Clean empty strings to undefined so they don't cause backend type issues
      const cleanedData = Object.entries(data).reduce((acc: any, [key, value]) => {
        acc[key] = value === '' ? undefined : value;
        return acc;
      }, {});

      // Always inject institution_id from the current user — never trust the form
      const studentData: StudentCreateData = {
        ...cleanedData,
        institution_id: institutionId ? Number(institutionId) : data.institution_id,
        // Derive current_grade_level from the selected class
        current_grade_level: data.class_id
          ? grades.find((g: any) => String(g.id) === String(data.class_id))?.class_level
          : undefined,
        class_id: data.class_id ? Number(data.class_id) : undefined,
        grade_id: data.class_id ? Number(data.class_id) : undefined, // Ensure grade_id is also sent
        status: data.status || 'active',
        is_active: true,
      };

      console.log('🔍 StudentModal - Processed student data:', studentData);
      console.log('🔍 StudentModal - first_name:', studentData.first_name);
      console.log('🔍 StudentModal - last_name:', studentData.last_name);
      console.log('🔍 StudentModal - student_number:', studentData.student_number);

      await onSave(studentData);
      
      const studentName = data.name ||
        ((data.first_name || data.last_name) ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : null) ||
        student?.name ||
        ((student?.first_name || student?.last_name) ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : null) ||
        'Şagird';

      toast({
        title: student?.id ? "Şagird yeniləndi" : "Yeni şagird yaradıldı",
        description: student?.id
          ? `${studentName} məlumatları yeniləndi` 
          : `${studentName} sistemə əlavə edildi`,
      });
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Xəta baş verdi",
        description: error.message || "Şagird yadda saxlanıla bilmədi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [student, onSave, onClose, toast, institutionId, grades]);

  // Form fields configuration - Using modalFieldConfig
  const basicFields = [
    userFields.firstName,
    userFields.lastName,
    createField('student_number', 'UTİS kod', 'text', {
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

  const academicFields = React.useMemo(() => [
    createField('enrollment_date', 'Qeydiyyat Tarixi', 'date', {
      placeholder: 'Qeydiyyat tarixini seçin',
    }),
    // Single combined class dropdown: shows "1-A", "1-B", "2-A"...
    createField('class_id', 'Sinif', 'select', {
      options: grades.map((grade: any) => ({
        value: String(grade.id),
        // Format: "1-A", "2-B" (level + dash + section name)
        label: grade.class_level != null
          ? `${grade.class_level}-${grade.name}`
          : grade.name,
      })),
      placeholder: 'Sinfi seçin  (məs: 1-A)',
    }),
    createField('status', 'Status', 'select', {
      options: [
        { value: 'active', label: 'Aktiv' },
        { value: 'inactive', label: 'Passiv' },
      ],
      placeholder: 'Statusu seçin',
    }),
  ], [grades]);

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

  return (
    <Dialog open={open} onOpenChange={(val) => {
      console.log('🔄 StudentModal onOpenChange:', val);
      if (!val) onClose();
    }}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {(student as any)?.id ? 'Şagird Məlumatlarını Redaktə Et' : 'Yeni Şagird Əlavə Et'}
            {(student as any)?.id && (
              <Badge className="ml-2">
                ID: {(student as any).id}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Şagird məlumatlarını buradan əlavə edə və ya redaktə edə bilərsiniz.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          key={`student-modal-${(student as any)?.id ?? 'new'}-${open}`}
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
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
              externalForm={sharedForm}
              loading={loading}
              submitLabel={student ? 'Yenilə' : 'Şagird Yarad'}
              columns={2}
              hideSubmit={true}
            />
          </TabsContent>

          <TabsContent value="academic" className="space-y-4">
            <FormBuilder
              fields={academicFields}
              onSubmit={handleFormSubmit}
              externalForm={sharedForm}
              loading={loading}
              submitLabel={student ? 'Yenilə' : 'Şagird Yarad'}
              columns={2}
              hideSubmit={true}
            />
          </TabsContent>

          <TabsContent value="guardian" className="space-y-4">
            <FormBuilder
              fields={guardianFields}
              onSubmit={handleFormSubmit}
              externalForm={sharedForm}
              loading={loading}
              submitLabel={student ? 'Yenilə' : 'Şagird Yarad'}
              columns={2}
              hideSubmit={true}
            />
          </TabsContent>

          <TabsContent value="medical" className="space-y-4">
            <FormBuilder
              fields={medicalFields}
              onSubmit={handleFormSubmit}
              externalForm={sharedForm}
              loading={loading}
              submitLabel={student ? 'Yenilə' : 'Şagird Yarad'}
              columns={2}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
