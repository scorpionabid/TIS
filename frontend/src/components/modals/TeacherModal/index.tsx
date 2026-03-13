/**
 * TeacherModal - Teacher Creation/Editing with Tabs
 * Tab 1: Required Basic Information (personal + status)
 * Tab 2: Position & Assessment (required position fields)
 * Tab 3: Additional Professional Information (optional)
 *
 * Layout and submit logic only — form fields are delegated to sub-components.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { userService } from '@/services/users';

import {
  DEFAULT_TEACHER_VALUES,
  SUCCESS_MESSAGES,
  FIELD_NAME_MAP,
} from './utils/constants';

import {
  transformTeacherDataToBackend,
  transformBackendDataToForm,
} from './utils/transformers';

import { BasicInfoTab } from './components/BasicInfoTab';
import { PositionTab } from './components/PositionTab';
import { ProfessionalTab } from './components/ProfessionalTab';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeacherModalProps {
  open: boolean;
  onClose: () => void;
  /** Existing teacher record for edit mode; omit or pass null for create mode */
  teacher?: Record<string, unknown> | null;
  onSave: (teacherData: Record<string, unknown>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const createTeacherSchema = (isNewTeacher: boolean) => {
  const baseSchema = {
    // Basic required fields
    first_name: z.string().min(1, 'Ad məcburidir'),
    last_name: z.string().min(1, 'Soyad məcburidir'),
    patronymic: z.string().min(1, 'Ata adı məcburidir'),
    email: z.string().email('Email formatı düz deyil'),
    username: z.string().min(1, 'İstifadəçi adı məcburidir'),

    // Position fields
    position_type: z.string().min(1, 'Vəzifə məcburidir'),
    workplace_type: z.string().min(1, 'İş yeri növü məcburidir'),
    specialty: z.string().min(1, 'İxtisas məcburidir'),

    // Assessment fields
    assessment_type: z.string().min(1, 'Qiymətləndirmə növü məcburidir'),
    assessment_score: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z
        .number({ invalid_type_error: 'Rəqəm daxil edin' })
        .min(0, 'Minimum 0')
        .max(100, 'Maksimum 100')
        .optional()
    ),

    // Status
    is_active: z.string(),

    // Optional basic fields
    contact_phone: z.string().optional(),
    birth_date: z.string().optional(),
    gender: z.string().optional(),
    national_id: z.string().optional(),

    // Optional professional fields
    specialty_level: z.string().optional(),
    specialty_score: z.string().optional(),
    experience_years: z.string().optional(),

    // Optional contract fields
    contract_start_date: z.string().optional(),
    contract_end_date: z.string().optional(),

    // Optional certification fields
    miq_score: z.string().optional(),
    certification_score: z.string().optional(),
    last_certification_date: z.string().optional(),

    // Optional education fields
    degree_level: z.string().optional(),
    graduation_university: z.string().optional(),
    graduation_year: z.string().optional(),
    university_gpa: z.string().optional(),

    // Optional emergency contact fields
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    emergency_contact_email: z.string().optional(),
    notes: z.string().optional(),
  };

  if (isNewTeacher) {
    return z
      .object({
        ...baseSchema,
        password: z.string().min(8, 'Şifrə minimum 8 simvol olmalıdır'),
        password_confirmation: z.string().min(8, 'Şifrə təkrarı minimum 8 simvol olmalıdır'),
      })
      .refine((data) => data.password === data.password_confirmation, {
        message: 'Şifrələr uyğun gəlmir',
        path: ['password_confirmation'],
      });
  }

  return z.object({
    ...baseSchema,
    password: z.string().optional(),
    password_confirmation: z.string().optional(),
  });
};

// ---------------------------------------------------------------------------
// Fields that live in each tab — used for error badge detection
// ---------------------------------------------------------------------------

const BASIC_TAB_FIELDS = [
  'first_name',
  'last_name',
  'patronymic',
  'email',
  'username',
  'password',
  'password_confirmation',
  'is_active',
] as const;

const POSITION_TAB_FIELDS = [
  'position_type',
  'workplace_type',
  'specialty',
  'assessment_type',
  'assessment_score',
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TeacherModal({
  open,
  onClose,
  teacher = null,
  onSave,
}: TeacherModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailValidation, setEmailValidation] = useState<{ isUnique: boolean | null }>({
    isUnique: null,
  });
  const [activeTab, setActiveTab] = useState('basic');

  const isNewTeacher = !teacher;

  const form = useForm({
    resolver: zodResolver(createTeacherSchema(isNewTeacher)),
    defaultValues: teacher
      ? transformBackendDataToForm(teacher)
      : DEFAULT_TEACHER_VALUES,
  });

  // Reset form when modal opens/closes or teacher changes
  useEffect(() => {
    if (open) {
      const values = teacher ? transformBackendDataToForm(teacher) : DEFAULT_TEACHER_VALUES;
      form.reset(values);
      setActiveTab('basic');
    }
  }, [open, teacher, form]);

  // Email uniqueness check
  const checkEmailUnique = useCallback(
    async (email: string) => {
      const existingEmail = teacher?.email as string | undefined;
      if (!email || email === existingEmail) {
        setEmailValidation({ isUnique: null });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailValidation({ isUnique: null });
        return;
      }

      try {
        const teacherId = teacher?.id as number | string | undefined;
        const result = await userService.checkEmailUnique(email, teacherId);
        setEmailValidation({ isUnique: result?.isUnique ?? true });
      } catch (error) {
        console.warn('Email uniqueness check failed:', error);
        setEmailValidation({ isUnique: null });
      }
    },
    [teacher?.email, teacher?.id]
  );

  // Submit handler
  const handleSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    try {
      if (emailValidation.isUnique === false) {
        toast({
          title: 'Xəta',
          description: 'Bu email artıq istifadə olunur',
          variant: 'destructive',
        });
        return;
      }

      const teacherData = transformTeacherDataToBackend(data);

      console.log('TeacherModal sending data:', teacherData);

      await onSave(teacherData);

      toast({
        title: 'Uğurlu',
        description: teacher
          ? SUCCESS_MESSAGES.TEACHER_UPDATED
          : SUCCESS_MESSAGES.TEACHER_CREATED,
      });

      onClose();
    } catch (error: unknown) {
      console.error('Teacher save error:', error);

      let errorDescription = 'Əməliyyat zamanı xəta baş verdi';

      if (
        error !== null &&
        typeof error === 'object' &&
        'message' in error &&
        (error as { message: string }).message === 'Validation failed' &&
        'errors' in error
      ) {
        const validationError = error as { message: string; errors: Record<string, unknown> };
        errorDescription = Object.entries(validationError.errors)
          .map(([field, messages]) => {
            const fieldName = FIELD_NAME_MAP[field.replace('profile.', '')] ?? field;
            const messageList = Array.isArray(messages) ? messages : [messages];
            return `${fieldName}: ${messageList.join(', ')}`;
          })
          .join('\n');
      } else if (
        error !== null &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
      ) {
        errorDescription = (error as { message: string }).message;
      }

      toast({
        title: 'Xəta',
        description: errorDescription,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Error badge helpers
  const basicTabHasErrors = BASIC_TAB_FIELDS.some(
    (key) => key in form.formState.errors
  );
  const positionTabHasErrors = POSITION_TAB_FIELDS.some(
    (key) => key in form.formState.errors
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {teacher ? 'Müəllim məlumatlarını redaktə et' : 'Yeni müəllim əlavə et'}
          </DialogTitle>
          <DialogDescription>
            {teacher
              ? 'Müəllimin məlumatlarını dəyişdirin və yadda saxlayın.'
              : 'Yeni müəllimin məlumatlarını daxil edin. Məcburi sahələri doldurun.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 overflow-hidden flex flex-col"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic" className="relative">
                    Əsas Məlumatlar *
                    {basicTabHasErrors && (
                      <Badge
                        variant="destructive"
                        className="ml-2 h-5 w-5 p-0 flex items-center justify-center"
                      >
                        <AlertCircle className="h-3 w-3" />
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger value="position" className="relative">
                    Vəzifə *
                    {positionTabHasErrors && (
                      <Badge
                        variant="destructive"
                        className="ml-2 h-5 w-5 p-0 flex items-center justify-center"
                      >
                        <AlertCircle className="h-3 w-3" />
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger value="additional">Əlavə Məlumatlar</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto px-1 pb-4">
                  <TabsContent value="basic" className="mt-4">
                    <BasicInfoTab
                      isNewTeacher={isNewTeacher}
                      emailValidationIsUnique={emailValidation.isUnique}
                      onEmailBlur={checkEmailUnique}
                    />
                  </TabsContent>

                  <TabsContent value="position" className="mt-4">
                    <PositionTab />
                  </TabsContent>

                  <TabsContent value="additional" className="mt-4">
                    <ProfessionalTab />
                  </TabsContent>
                </div>
              </Tabs>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Ləğv et
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Yüklənir...' : teacher ? 'Yenilə' : 'Əlavə et'}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default TeacherModal;
