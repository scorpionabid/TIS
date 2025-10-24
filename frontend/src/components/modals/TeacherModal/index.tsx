/**
 * TeacherModal - Specialized Modal for Teacher Creation/Editing
 * Simplified, focused modal only for teachers
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap } from 'lucide-react';

import { userService } from '@/services/users';
import { subjectService } from '@/services/subjects';

import {
  DEFAULT_TEACHER_VALUES,
  POSITION_TYPES,
  EMPLOYMENT_STATUS,
  WORKPLACE_TYPES,
  SPECIALTY_LEVELS,
  GENDER_OPTIONS,
  IS_ACTIVE_OPTIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FIELD_NAME_MAP,
} from './utils/constants';

import { validateTeacherData } from './utils/validators';
import {
  transformTeacherDataToBackend,
  transformBackendDataToForm,
  processSubjectsField,
} from './utils/transformers';

interface TeacherModalProps {
  open: boolean;
  onClose: () => void;
  teacher?: any | null;
  onSave: (teacherData: any) => Promise<void>;
}

export function TeacherModal({
  open,
  onClose,
  teacher = null,
  onSave,
}: TeacherModalProps) {
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [emailValidation, setEmailValidation] = useState({ isUnique: null as boolean | null });

  // Load subjects when modal opens
  useEffect(() => {
    if (!open) return;

    subjectService.getAll()
      .then(data => {
        const options = (data || []).map((subject: any) => ({
          label: subject.name,
          value: subject.id.toString(),
          category: subject.code
        }));
        setSubjects(options);
      })
      .catch(err => console.error('Failed to load subjects:', err));
  }, [open]);

  // Check email uniqueness (debounced)
  const checkEmailUnique = useCallback(
    async (email: string) => {
      if (!email || email === teacher?.email) {
        setEmailValidation({ isUnique: null });
        return;
      }

      // Basic email format validation before checking uniqueness
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailValidation({ isUnique: null });
        return;
      }

      try {
        const result = await userService.checkEmailUnique(email, teacher?.id);
        setEmailValidation({ isUnique: result?.isUnique ?? true });
      } catch (error) {
        console.warn('Email uniqueness check failed:', error);
        setEmailValidation({ isUnique: null });
      }
    },
    [teacher?.email, teacher?.id]
  );

  // Form fields
  const fields = useMemo(() => [
    // === BASIC INFO ===
    { name: 'first_name', label: 'Ad', type: 'text', required: true },
    { name: 'last_name', label: 'Soyad', type: 'text', required: true },
    { name: 'patronymic', label: 'Ata adı', type: 'text' },
    { name: 'email', label: 'Email', type: 'email', required: true, onChange: checkEmailUnique },
    { name: 'username', label: 'İstifadəçi adı', type: 'text', required: true },
    { name: 'password', label: 'Şifrə', type: 'password', required: !teacher, placeholder: 'Minimum 8 simvol' },
    { name: 'password_confirmation', label: 'Şifrə təkrarı', type: 'password', required: !teacher },
    { name: 'contact_phone', label: 'Telefon', type: 'text' },
    { name: 'birth_date', label: 'Doğum tarixi', type: 'date' },
    { name: 'gender', label: 'Cins', type: 'select', options: GENDER_OPTIONS },
    { name: 'national_id', label: 'Şəxsiyyət vəsiqəsi', type: 'text' },

    // === POSITION & EMPLOYMENT ===
    { name: 'position_type', label: 'Vəzifə', type: 'select', options: POSITION_TYPES },
    { name: 'employment_status', label: 'İş statusu', type: 'select', options: EMPLOYMENT_STATUS },
    { name: 'workplace_type', label: 'İş yeri növü', type: 'select', options: WORKPLACE_TYPES, defaultValue: 'primary' },
    { name: 'contract_start_date', label: 'Müqavilə başlanğıc tarixi', type: 'date' },
    { name: 'contract_end_date', label: 'Müqavilə bitmə tarixi', type: 'date' },

    // === PROFESSIONAL ===
    { name: 'subjects', label: 'Dərs verdiyi fənlər', type: 'multiselect', options: subjects, required: true, defaultValue: [] },
    { name: 'specialty', label: 'İxtisas', type: 'text' },
    { name: 'specialty_level', label: 'Təhsil səviyyəsi', type: 'select', options: SPECIALTY_LEVELS },
    { name: 'specialty_score', label: 'İxtisas balı', type: 'number' },
    { name: 'experience_years', label: 'İş təcrübəsi (il)', type: 'number' },

    // === CERTIFICATION ===
    { name: 'miq_score', label: 'MİQ balı', type: 'number' },
    { name: 'certification_score', label: 'Sertifikat balı', type: 'number' },
    { name: 'last_certification_date', label: 'Son sertifikat tarixi', type: 'date' },

    // === EDUCATION ===
    { name: 'degree_level', label: 'Təhsil dərəcəsi', type: 'text' },
    { name: 'graduation_university', label: 'Məzun olduğu universitet', type: 'text' },
    { name: 'graduation_year', label: 'Məzun olma ili', type: 'number' },
    { name: 'university_gpa', label: 'GPA', type: 'number' },

    // === EMERGENCY CONTACT ===
    { name: 'emergency_contact_name', label: 'Təcili əlaqə (ad)', type: 'text' },
    { name: 'emergency_contact_phone', label: 'Təcili əlaqə (telefon)', type: 'text' },
    { name: 'emergency_contact_email', label: 'Təcili əlaqə (email)', type: 'email' },
    { name: 'notes', label: 'Qeydlər', type: 'textarea' },

    { name: 'is_active', label: 'Status', type: 'select', options: IS_ACTIVE_OPTIONS, defaultValue: 'true', required: true },
  ], [subjects, teacher, checkEmailUnique]);

  // Default values
  const defaultValues = useMemo(() => {
    return teacher ? transformBackendDataToForm(teacher) : { ...DEFAULT_TEACHER_VALUES };
  }, [teacher]);

  // Submit handler
  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Process subjects
      if (data.subjects && Array.isArray(data.subjects)) {
        data.subjects = processSubjectsField(data.subjects);
      }

      // Validate
      const validationResult = validateTeacherData(data, {
        isNewTeacher: !teacher,
        emailIsUnique: emailValidation.isUnique,
      });

      if (!validationResult.isValid) {
        toast({
          title: ERROR_MESSAGES.VALIDATION_ERROR,
          description: validationResult.errors.join('\n'),
          variant: 'destructive',
        });
        return;
      }

      // Transform to backend format
      const teacherData = transformTeacherDataToBackend(data);

      console.log('📤 TeacherModal sending data:', teacherData);

      // Save
      await onSave(teacherData);

      toast({
        title: 'Uğurlu',
        description: teacher ? SUCCESS_MESSAGES.TEACHER_UPDATED : SUCCESS_MESSAGES.TEACHER_CREATED,
      });

      onClose();
    } catch (error: any) {
      console.error('Teacher save error:', error);

      let errorDescription = ERROR_MESSAGES.OPERATION_FAILED;
      if (error.message === 'Validation failed' && error.errors) {
        const errorMessages = Object.entries(error.errors)
          .map(([field, messages]: [string, any]) => {
            const fieldName = FIELD_NAME_MAP[field.replace('profile.', '')] || field;
            const messageList = Array.isArray(messages) ? messages : [messages];
            return `${fieldName}: ${messageList.join(', ')}`;
          })
          .join('\n');
        errorDescription = errorMessages;
      } else if (error.message) {
        errorDescription = error.message;
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {teacher ? 'Müəllim məlumatlarını redaktə et' : 'Yeni müəllim əlavə et'}
          </DialogTitle>
          <DialogDescription>
            {teacher
              ? 'Müəllimin məlumatlarını dəyişdirin və yadda saxlayın.'
              : 'Yeni müəllimin məlumatlarını daxil edin. Müəssisə avtomatik təyin olunacaq.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 font-medium">
            <GraduationCap className="h-5 w-5" />
            Müəllim Məlumatları
          </div>
          <p className="text-sm text-blue-600 mt-1">
            Bütün məlumatları doldurub təsdiq edin. Fənlər mütləq seçilməlidir.
          </p>
        </div>

        <FormBuilder
          fields={fields}
          onSubmit={handleSubmit}
          submitLabel={teacher ? 'Yenilə' : 'Əlavə et'}
          loading={loading}
          defaultValues={defaultValues}
          columns={2}
        />
      </DialogContent>
    </Dialog>
  );
}

export default TeacherModal;
