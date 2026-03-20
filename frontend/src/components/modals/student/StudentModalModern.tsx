import React, { useState, useEffect } from 'react';
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
import { Save, GraduationCap } from 'lucide-react';

import PersonalInfoStep from './PersonalInfoStep';

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
});

export function StudentModalModern({ open, onClose, student, onSave }: StudentModalModernProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
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
    },
    mode: 'onChange',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
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
        });
      }
    }
  }, [open, student, institutionId, form]);

  const handleSubmit = async () => {
    const isValid = await form.trigger(['first_name', 'last_name', 'student_number'] as any);
    if (!isValid) {
      toast({
        title: 'Xəta',
        description: 'Zəhmət olmasa, bütün tələb olunan sahələri doldurun',
        variant: 'destructive',
      });
      return;
    }

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

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GraduationCap className="h-6 w-6 text-primary" />
            {(student as any)?.id ? 'Şagird Məlumatlarını Redaktə Et' : 'Yeni Şagird Əlavə Et'}
          </DialogTitle>
          <DialogDescription>
            {(student as any)?.id
              ? 'Şagird məlumatlarını yeniləyin və yadda saxlayın'
              : 'Yeni şagird üçün məlumatları daxil edin'}
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[65vh]">
          <Card className="border-0 shadow-none">
            <PersonalInfoStep
              form={form}
              grades={grades}
              avatarUrl={avatarUrl}
              onAvatarChange={setAvatarUrl}
            />
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Ləğv et
          </Button>

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
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default StudentModalModern;
