/**
 * UserModal Component (Refactored)
 * Main modal component for creating/editing users
 * Supports teacher, student, and general user modes
 */

import React, { useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  User as UserIcon,
} from 'lucide-react';

// Custom hooks
import { useUserModalState } from './hooks/useUserModalState';
import { useUserModalOptions } from './hooks/useUserModalOptions';
import { useUserModalFields } from './hooks/useUserModalFields';
import { useUserModalValidation } from './hooks/useUserModalValidation';

// Utils
import { transformFormDataToBackend } from './utils/fieldTransformers';
import {
  processSubjectsField,
  convertIsActiveToBoolean,
  normalizeBirthDate,
} from './utils/fieldTransformers';
import {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  TAB_CONFIG,
  FIELD_NAME_MAP,
} from './utils/constants';
import type { UserModalMode } from './utils/constants';
import { getFieldNameForError } from './utils/validators';

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  user?: any | null;
  onSave: (user: any) => Promise<void>;
  defaultRole?: string;
  mode?: UserModalMode;
}

export function UserModal({
  open,
  onClose,
  user = null,
  onSave,
  defaultRole,
  mode,
}: UserModalProps) {
  const { toast } = useToast();

  // Initialize hooks
  const state = useUserModalState(user, open);
  const options = useUserModalOptions(open, state.selectedRole);

  // Create validation hook first (to get debouncedEmailCheck)
  const validationTemp = useUserModalValidation(
    user,
    state.emailValidation,
    state.setEmailValidation,
    state.selectedRole,
    (roleId: string) => false // Temporary, will be replaced
  );

  // Create fields hook with debouncedEmailCheck
  const fields = useUserModalFields({
    mode,
    ...options,
    selectedRole: state.selectedRole,
    selectedBirthDate: state.selectedBirthDate,
    emailValidation: state.emailValidation,
    setSelectedRole: state.setSelectedRole,
    setActiveTab: state.setActiveTab,
    setSelectedBirthDate: state.setSelectedBirthDate,
    debouncedEmailCheck: validationTemp.debouncedEmailCheck,
    user,
  });

  // Re-create validation with actual isTeacherRole
  const validation = useUserModalValidation(
    user,
    state.emailValidation,
    state.setEmailValidation,
    state.selectedRole,
    fields.isTeacherRole
  );

  // Auto-select default role when modal opens
  React.useEffect(() => {
    if (open && defaultRole && options.availableRoles.length > 0 && !user) {
      const roleToSelect = options.availableRoles.find(r =>
        r.name.toLowerCase() === defaultRole.toLowerCase() ||
        r.display_name.toLowerCase().includes(defaultRole.toLowerCase())
      );

      if (roleToSelect) {
        state.setSelectedRole(roleToSelect.id.toString());
      }
    }
  }, [open, defaultRole, mode, options.availableRoles, user, state]);

  // Form change handler - persists data across tabs
  const handleFormChange = useCallback((allFormValues: any) => {
    console.log('📅 Form change:', { activeTab: state.activeTab, allFormValues });

    state.setFormData(prev => {
      const updated = { ...prev, ...allFormValues };
      console.log('📋 Updated form data (all tabs):', {
        previous: Object.keys(prev),
        incoming: Object.keys(allFormValues),
        merged: Object.keys(updated)
      });
      return updated;
    });

    // Handle role change
    if (allFormValues.role_id && allFormValues.role_id !== state.selectedRole) {
      state.setSelectedRole(allFormValues.role_id);
      if (fields.isTeacherRole(allFormValues.role_id) && state.activeTab === 'basic') {
        setTimeout(() => state.setActiveTab('teacher'), 100);
      } else if (fields.isStudentRole(allFormValues.role_id) && state.activeTab === 'basic') {
        setTimeout(() => state.setActiveTab('student'), 100);
      }
    }

    // Handle email validation
    if (allFormValues.email && allFormValues.email !== state.formData.email) {
      validation.debouncedEmailCheck(allFormValues.email);
    }

    // Handle birth date
    if (allFormValues.birth_date && allFormValues.birth_date !== state.selectedBirthDate) {
      state.setSelectedBirthDate(allFormValues.birth_date);
    }
  }, [state, fields, validation]);

  // Form submit handler
  const handleSubmit = async (data: any) => {
    // Merge all tabs' data
    const finalData = { ...state.formData, ...data };

    console.log('📈 Form submit details:', {
      activeTab: state.activeTab,
      formDataKeys: Object.keys(state.formData),
      currentDataKeys: Object.keys(data),
      finalDataKeys: Object.keys(finalData),
      finalData
    });

    // Validate
    const validationResult = validation.validate(finalData);
    if (!validationResult.isValid) {
      console.error('❌ Validation errors:', validationResult.errors);
      toast({
        title: ERROR_MESSAGES.VALIDATION_ERROR,
        description: validationResult.errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    state.setLoading(true);
    try {
      // Process special fields
      if (finalData.subjects && Array.isArray(finalData.subjects)) {
        finalData.subjects = processSubjectsField(finalData.subjects);
      }
      finalData.is_active = convertIsActiveToBoolean(finalData.is_active);
      finalData.birth_date = normalizeBirthDate(finalData.birth_date);

      // Ensure role metadata is populated for backend validators (regionadmin endpoints require role_name)
      const activeRoleId = finalData.role_id ?? state.selectedRole;
      if (activeRoleId) {
        const roleMeta = options.availableRoles.find(
          (role) => String(role.id) === String(activeRoleId)
        );
        if (roleMeta) {
          finalData.role_id = roleMeta.id?.toString?.() ?? activeRoleId;
          finalData.role_name = roleMeta.name ?? roleMeta.slug ?? roleMeta.display_name ?? '';
          finalData.role_display_name = roleMeta.display_name ?? roleMeta.name ?? '';
        }
      }

      // Determine institution_id
      let institutionIdToUse = finalData.institution_id ? parseInt(finalData.institution_id) : null;
      if (finalData.role_name === 'regionoperator' && finalData.department_id && !institutionIdToUse) {
        const selectedDept = options.availableDepartments.find(
          dept => dept.id.toString() === finalData.department_id
        );
        if (selectedDept?.institution) {
          institutionIdToUse = selectedDept.institution.id;
        }
      }

      // Transform to backend format
      const userData = transformFormDataToBackend(
        finalData,
        mode,
        institutionIdToUse,
        fields.isTeacherRole,
        fields.isStudentRole
      );

      console.log('📤 UserModal sending data to backend:', {
        mode,
        hasProfile: !!userData.profile,
        profileFieldCount: Object.keys(userData.profile || {}).length,
        subjects: userData.profile?.subjects,
        userData
      });

      await onSave(userData);

      toast({
        title: 'Uğurlu',
        description: user
          ? (mode === 'teacher' ? SUCCESS_MESSAGES.TEACHER_UPDATED :
             mode === 'student' ? SUCCESS_MESSAGES.STUDENT_UPDATED :
             SUCCESS_MESSAGES.USER_UPDATED)
          : (mode === 'teacher' ? SUCCESS_MESSAGES.TEACHER_CREATED :
             mode === 'student' ? SUCCESS_MESSAGES.STUDENT_CREATED :
             SUCCESS_MESSAGES.USER_CREATED),
      });
      onClose();
    } catch (error: any) {
      console.error('User creation/update error:', error);

      let errorTitle = 'Xəta';
      let errorDescription = ERROR_MESSAGES.OPERATION_FAILED;

      if (error.message === 'Validation failed' && error.errors) {
        errorTitle = ERROR_MESSAGES.VALIDATION_ERROR;
        const errorMessages = Object.entries(error.errors)
          .map(([field, messages]: [string, any]) => {
            const fieldName = getFieldNameForError(field, FIELD_NAME_MAP);
            const messageList = Array.isArray(messages) ? messages : [messages];
            return `${fieldName}: ${messageList.join(', ')}`;
          })
          .join('\n');
        errorDescription = errorMessages;
      } else if (error.status === 422) {
        errorTitle = ERROR_MESSAGES.VALIDATION_ERROR;
        errorDescription = 'Daxil edilmiş məlumatlar düz deyil. Zəhmət olmasa yoxlayın.';
      } else if (error.status === 409) {
        errorTitle = 'Dublikat Məlumat';
        errorDescription = ERROR_MESSAGES.DUPLICATE_DATA;
      } else if (error.status === 500) {
        errorTitle = 'Server Xətası';
        errorDescription = ERROR_MESSAGES.SERVER_ERROR;
      } else if (!error.message || error.message.includes('fetch')) {
        errorTitle = 'Əlaqə Xətası';
        errorDescription = ERROR_MESSAGES.CONNECTION_ERROR;
      } else {
        errorDescription = error.message;
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
    } finally {
      state.setLoading(false);
    }
  };

  // Get fields for current tab
  const getCurrentTabFields = useMemo(() => {
    switch (state.activeTab) {
      case 'basic':
        return fields.getBasicFields();
      case 'teacher':
        return state.selectedRole && fields.isTeacherRole(state.selectedRole)
          ? fields.getTeacherFields()
          : [];
      case 'student':
        return state.selectedRole && fields.isStudentRole(state.selectedRole)
          ? fields.getStudentFields()
          : [];
      case 'additional':
        return fields.getAdditionalFields();
      default:
        return [];
    }
  }, [state.activeTab, state.selectedRole, fields]);

  // Default values for FormBuilder
  const formDefaultValues = useMemo(() => {
    return { ...state.formData };
  }, [state.formData]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          if (state.loading) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (state.loading) e.preventDefault();
        }}
        aria-describedby="user-modal-description"
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
          <DialogDescription id="user-modal-description">
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

        <Tabs value={state.activeTab} onValueChange={state.setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Əsas məlumatlar
            </TabsTrigger>
            <TabsTrigger
              value="teacher"
              className="flex items-center gap-2"
              disabled={!state.selectedRole || !fields.isTeacherRole(state.selectedRole)}
            >
              <GraduationCap className="h-4 w-4" />
              Müəllim
            </TabsTrigger>
            <TabsTrigger
              value="student"
              className="flex items-center gap-2"
              disabled={!state.selectedRole || !fields.isStudentRole(state.selectedRole)}
            >
              <BookOpen className="h-4 w-4" />
              Şagird
            </TabsTrigger>
            <TabsTrigger value="additional" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Əlavə məlumatlar
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {/* Tab context indicators */}
            {state.activeTab === 'teacher' && state.selectedRole && fields.isTeacherRole(state.selectedRole) && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <GraduationCap className="h-5 w-5" />
                  {TAB_CONFIG.teacher.description}
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  {TAB_CONFIG.teacher.helperText}
                </p>
              </div>
            )}

            {state.activeTab === 'student' && state.selectedRole && fields.isStudentRole(state.selectedRole) && (
              <div className="mb-4 p-4 bg-green-50 rounded-lg border">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <BookOpen className="h-5 w-5" />
                  {TAB_CONFIG.student.description}
                </div>
                <p className="text-sm text-green-600 mt-1">
                  {TAB_CONFIG.student.helperText}
                </p>
              </div>
            )}

            {state.activeTab === 'additional' && (
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border">
                <div className="flex items-center gap-2 text-purple-700 font-medium">
                  <FileText className="h-5 w-5" />
                  {TAB_CONFIG.additional.description}
                </div>
                <p className="text-sm text-purple-600 mt-1">
                  {TAB_CONFIG.additional.helperText}
                </p>
              </div>
            )}

            <FormBuilder
              fields={getCurrentTabFields}
              onSubmit={handleSubmit}
              onChange={handleFormChange}
              submitLabel={user ? 'Yenilə' : 'Əlavə et'}
              loading={state.loading || options.loadingOptions}
              defaultValues={formDefaultValues}
              columns={2}
              preserveValues={true}
              autoFocus={false}
            />
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default UserModal;
