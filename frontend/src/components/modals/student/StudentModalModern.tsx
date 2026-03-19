import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Student, StudentCreateData } from '@/services/students';
import { gradeService } from '@/services/grades';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Users,
  Heart,
  FileText,
  ChevronLeft,
  ChevronRight,
  Save,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import step components
import StepIndicator from './StepIndicator';
import PersonalInfoStep from './PersonalInfoStep';
import GuardianStep from './GuardianStep';
import AdditionalInfoStep from './AdditionalInfoStep';
import ReviewStep from './ReviewStep';

interface StudentModalModernProps {
  open: boolean;
  onClose: () => void;
  student?: Student | null;
  onSave: (student: StudentCreateData) => Promise<void>;
}

// Validation schema
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
  class_id: z.union([z.number(), z.string()]).optional(),
  institution_id: z.union([z.number(), z.string()]).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  
  // Guardian information
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().email().optional().or(z.literal('')),
  guardian_relation: z.string().optional(),
  guardian2_name: z.string().optional(),
  guardian2_phone: z.string().optional(),
  guardian2_email: z.string().email().optional().or(z.literal('')),
  guardian2_relation: z.string().optional(),
  
  // Medical information
  medical_conditions: z.string().optional(),
  allergies: z.string().optional(),
  emergency_contact: z.string().optional(),
  
  // Notes
  notes: z.string().optional(),
});

const steps = [
  { id: 1, label: 'Şəxsi Məlumat', icon: <User className="w-4 h-4" /> },
  { id: 2, label: 'Valideyn', icon: <Users className="w-4 h-4" /> },
  { id: 3, label: 'Əlavə Məlumat', icon: <Heart className="w-4 h-4" /> },
  { id: 4, label: 'Yoxlama', icon: <FileText className="w-4 h-4" /> },
];

export function StudentModalModern({ open, onClose, student, onSave }: StudentModalModernProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  const institutionId = (student as any)?.institution_id || currentUser?.institution?.id || currentUser?.institution_id;

  // Load grades
  const { data: gradesResponse } = useQuery({
    queryKey: ['grades', 'for-student-modal', institutionId || 'all'],
    queryFn: () => gradeService.get(institutionId ? { institution_id: Number(institutionId), per_page: 100, is_active: true } : { per_page: 100, is_active: true }),
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  const grades = React.useMemo(() => {
    const rawData = gradesResponse as any;
    const items = rawData?.items || 
                 (Array.isArray(rawData) ? rawData : 
                 (rawData?.data?.grades || rawData?.data || []));
    const list = Array.isArray(items) ? items : [];
    return [...list].sort(
      (a: any, b: any) => (a.class_level || 0) - (b.class_level || 0) || (a.name || '').localeCompare(b.name || '')
    );
  }, [gradesResponse]);

  // Form setup
  const form = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      student_number: '',
      email: '',
      phone: '',
      date_of_birth: '',
      gender: '',
      address: '',
      enrollment_date: '',
      class_id: '',
      institution_id: institutionId || '',
      status: 'active',
      guardian_name: '',
      guardian_phone: '',
      guardian_email: '',
      guardian_relation: '',
      guardian2_name: '',
      guardian2_phone: '',
      guardian2_email: '',
      guardian2_relation: '',
      medical_conditions: '',
      allergies: '',
      emergency_contact: '',
      notes: '',
    },
    mode: 'onChange',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setAvatarUrl('');
      
      if (student) {
        form.reset({
          first_name: (student as any).first_name || '',
          last_name: (student as any).last_name || '',
          student_number: (student as any).student_number || '',
          email: (student as any).email || '',
          phone: (student as any).phone || '',
          date_of_birth: (student as any).date_of_birth ? String((student as any).date_of_birth).split('T')[0] : '',
          gender: (student as any).gender || '',
          address: (student as any).address || '',
          enrollment_date: (student as any).enrollment_date ? String((student as any).enrollment_date).split('T')[0] : '',
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
        });
      } else {
        form.reset({
          first_name: '',
          last_name: '',
          student_number: '',
          email: '',
          phone: '',
          date_of_birth: '',
          gender: '',
          address: '',
          enrollment_date: '',
          class_id: '',
          institution_id: institutionId || '',
          status: 'active',
          guardian_name: '',
          guardian_phone: '',
          guardian_email: '',
          guardian_relation: '',
          guardian2_name: '',
          guardian2_phone: '',
          guardian2_email: '',
          guardian2_relation: '',
          medical_conditions: '',
          allergies: '',
          emergency_contact: '',
          notes: '',
        });
      }
    }
  }, [open, student, institutionId, form]);

  const handleNext = async () => {
    // Validate current step fields before proceeding
    let fieldsToValidate: string[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['first_name', 'last_name', 'student_number'];
        break;
      default:
        break;
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await form.trigger(fieldsToValidate as any);
      if (!isValid) {
        toast({
          title: 'Xəta',
          description: 'Zəhmət olmasa, bütün tələb olunan sahələri doldurun',
          variant: 'destructive',
        });
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const data = form.getValues();
      
      // Clean empty strings to undefined
      const cleanedData = Object.entries(data).reduce((acc: any, [key, value]) => {
        acc[key] = value === '' ? undefined : value;
        return acc;
      }, {});

      const studentData: StudentCreateData = {
        ...cleanedData,
        institution_id: institutionId ? Number(institutionId) : data.institution_id,
        current_grade_level: data.class_id
          ? grades.find((g: any) => String(g.id) === String(data.class_id))?.class_level
          : undefined,
        class_id: data.class_id ? Number(data.class_id) : undefined,
        grade_id: data.class_id ? Number(data.class_id) : undefined,
        status: data.status || 'active',
        is_active: true,
      };

      await onSave(studentData);
      
      const studentName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      
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
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            form={form}
            grades={grades}
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
          />
        );
      case 2:
        return <GuardianStep form={form} />;
      case 3:
        return <AdditionalInfoStep form={form} />;
      case 4:
        return (
          <ReviewStep
            form={form}
            grades={grades}
            avatarUrl={avatarUrl}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GraduationCap className="h-6 w-6 text-primary" />
            {(student as any)?.id ? 'Şagird Məlumatlarını Redaktə Et' : 'Yeni Şagird Əlavə Et'}
          </DialogTitle>
          <DialogDescription>
            {(student as any)?.id 
              ? 'Şagird məlumatlarını yeniləyin və yadda saxlayın' 
              : 'Yeni şagird üçün məlumatları addım-addım daxil edin'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="px-6 py-4 bg-gray-50/50 border-y">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
          <Card className="border-0 shadow-none">
            {renderStepContent()}
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            className={cn(currentStep === 1 && 'invisible')}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Ləğv et
            </Button>
            
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={loading}
              >
                Növbəti
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-primary"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Yadda saxlanılır...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Yadda Saxla
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default StudentModalModern;
