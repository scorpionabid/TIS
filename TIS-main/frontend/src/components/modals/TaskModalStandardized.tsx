import React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Users, Trash2, Undo2 } from 'lucide-react';
import { z } from 'zod';
import { BaseModal } from '@/components/common/BaseModal';
import { FormField } from '@/components/forms/FormBuilder';
import { createField, commonValidations } from '@/components/forms/FormBuilder.helpers';
import { Task, CreateTaskData } from '@/services/tasks';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { useTaskFormData } from '@/hooks/tasks/useTaskFormData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTaskDraft } from '@/hooks/tasks/useTaskDraft';

// Import hooks
import { useAssignedInstitutionSync } from '@/components/tasks/hooks/useAssignedInstitutionSync';

// Import configuration
import {
  priorityOptions,
  taskFormPlaceholders,
  taskFormDescriptions,
  taskValidationMessages,
} from '@/components/tasks/config/taskFormFields';

// Import data transformers
import {
  prepareTaskDefaultValues,
  transformTaskDataForAPI,
  sanitizeTaskDataForLogging,
} from '@/utils/taskDataTransformer';
import { ResponsibleUserSelector } from '@/components/tasks/ResponsibleUserSelector';

interface TaskModalStandardizedProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  onSave: (data: CreateTaskData) => Promise<void>;
  originScope?: 'region' | 'sector' | null;
}

/**
 * TaskModalStandardized - Tapşırıq yaratma və redaktə modalı
 *
 * Xüsusiyyətlər:
 * - Sadələşdirilmiş single-tab strukturu
 * - Modular komponent strukturu
 * - Form validation ilə inteqrasiya
 * - Responsive dizayn
 * - Performance optimized (30min cache, optimized memoization)
 *
 * Refactored: Tab strukturu silinib, daha sadə UI
 */
export const TaskModalStandardized: React.FC<TaskModalStandardizedProps> = ({
  open,
  onClose,
  task,
  onSave,
  originScope,
}) => {
  const { toast } = useToast();
  const isEditMode = !!task;
  const [formInstance, setFormInstance] = React.useState<UseFormReturn<any> | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);
  const bypassCloseRef = React.useRef(false);
  const [hasRestoredDraft, setHasRestoredDraft] = React.useState(false);

  const effectiveOriginScope = React.useMemo(() => {
    if (originScope) {
      return originScope;
    }

    if (isEditMode && task?.origin_scope) {
      return task.origin_scope;
    }

    return null;
  }, [originScope, isEditMode, task?.origin_scope]);

  const draftStorageKey = React.useMemo(
    () => `task-modal-draft-${effectiveOriginScope ?? 'general'}`,
    [effectiveOriginScope]
  );
  const { draft, saveDraft, clearDraft } = useTaskDraft(draftStorageKey);

  const defaultFormValues = React.useMemo(() => {
    const baseValues = prepareTaskDefaultValues(task);

    if (!isEditMode && originScope) {
      baseValues.target_scope = originScope === 'region' ? 'regional' : 'sector';
    }

    return baseValues;
  }, [task, isEditMode, originScope]);

  const showDraftPrompt = React.useMemo(
    () => Boolean(draft && !isEditMode && open && !hasRestoredDraft),
    [draft, hasRestoredDraft, isEditMode, open]
  );

  const handleFormInstance = React.useCallback((form: UseFormReturn<any>) => {
    setFormInstance(form);
  }, []);

  const handleFormValuesChange = React.useCallback((values: Record<string, any>) => {
    if (!open || isEditMode) return;
    saveDraft(values);
  }, [open, isEditMode, saveDraft]);

  const performClose = React.useCallback(() => {
    formInstance?.reset(defaultFormValues);
    clearDraft();
    setHasRestoredDraft(false);
    onClose();
  }, [clearDraft, defaultFormValues, formInstance, onClose]);

  const handleModalClose = React.useCallback(() => {
    if (bypassCloseRef.current) {
      bypassCloseRef.current = false;
      performClose();
      return;
    }

    if (formInstance?.formState.isDirty) {
      setShowUnsavedDialog(true);
      return;
    }

    performClose();
  }, [formInstance, performClose]);

  const handleDiscardChanges = React.useCallback(() => {
    setShowUnsavedDialog(false);
    bypassCloseRef.current = false;
    performClose();
  }, [performClose]);

  const handleKeepEditing = React.useCallback(() => {
    setShowUnsavedDialog(false);
  }, []);

  const handleRestoreDraft = React.useCallback(() => {
    if (!draft || !formInstance) return;
    formInstance.reset({
      ...defaultFormValues,
      ...draft,
    });
    setHasRestoredDraft(true);
  }, [defaultFormValues, draft, formInstance]);

  const handleDiscardDraft = React.useCallback(() => {
    clearDraft();
    setHasRestoredDraft(false);
    formInstance?.reset(defaultFormValues);
  }, [clearDraft, defaultFormValues, formInstance]);

  React.useEffect(() => {
    if (!open) {
      setHasRestoredDraft(false);
    }
  }, [open]);

  // ============================================
  // Data Loading
  // ============================================

  const {
    creationContext,
    creationContextError,
    creationContextLoading: contextLoading,
    isLoading,
  } = useTaskFormData({
    originScope: effectiveOriginScope ?? null,
    enabled: open,
  });

  const allowedTargetRoles = React.useMemo(() => {
    const roles = creationContext?.allowed_target_roles ?? [];
    const scopeRoleMap: Record<'region' | 'sector', string[]> = {
      region: ['regionadmin', 'regionoperator', 'sektoradmin'],
      sector: ['sektoradmin', 'schooladmin'],
    };

    if (!effectiveOriginScope) {
      return roles;
    }

    const scopeRoles = scopeRoleMap[effectiveOriginScope] ?? [];
    const filtered = roles.filter((role) => scopeRoles.includes(role));

    if (filtered.length > 0) {
      return filtered;
    }

    return scopeRoles.length > 0 ? scopeRoles : roles;
  }, [creationContext, effectiveOriginScope]);

  React.useEffect(() => {
    if (creationContextError) {
      toast({
        title: 'Verilər yüklənmədi',
        description: 'Tapşırıq yaradılma konteksti alınarkən xəta baş verdi.',
        variant: 'destructive',
      });
    }
  }, [creationContextError, toast]);

  // ============================================
  // Form Field Configuration
  // ============================================

  const baseBasicFields = React.useMemo<FormField[]>(() => {
    const fields: FormField[] = [];

    if (showDraftPrompt) {
      fields.push(
        createField('__draft_banner', '', 'custom', {
          className: 'md:col-span-2',
          render: () => (
            <Alert className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <AlertTitle>Yarımçıq tapşırıq tapıldı</AlertTitle>
                  <AlertDescription>
                    Əvvəlki yarımçıq tapşırıq məlumatlarını bərpa etmək istəyirsiniz?
                  </AlertDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleDiscardDraft}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Sil
                  </Button>
                  <Button size="sm" onClick={handleRestoreDraft}>
                    <Undo2 className="mr-1 h-3.5 w-3.5" />
                    Davam et
                  </Button>
                </div>
              </div>
            </Alert>
          ),
        })
      );
    }

    fields.push(
      createField('title', 'Tapşırıq başlığı', 'text', {
        required: true,
        placeholder: taskFormPlaceholders.title,
        validation: commonValidations.required,
        className: 'md:col-span-2'
      }),
      createField('priority', 'Prioritet', 'select', {
        required: true,
        options: priorityOptions,
        placeholder: taskFormPlaceholders.priority,
        validation: commonValidations.required,
      }),
      createField('deadline', 'Son tarix', 'date', {
        placeholder: taskFormPlaceholders.deadline,
      }),
      createField('assigned_user_ids', 'Məsul şəxslər', 'custom', {
        required: true,
        description: taskFormDescriptions.assignedUsers,
        className: 'md:col-span-2',
        validation: z.array(z.string()).min(1, taskValidationMessages.assignedUsersRequired),
        render: ({ field: formField }) => (
          <ResponsibleUserSelector
            value={Array.isArray(formField.value) ? formField.value : []}
            onChange={(ids) => formField.onChange(ids)}
            originScope={effectiveOriginScope}
            allowedRoles={allowedTargetRoles}
            disabled={contextLoading}
          />
        ),
      }),
      createField('description', 'Tapşırıq təsviri', 'textarea', {
        required: true,
        placeholder: taskFormPlaceholders.description,
        rows: 4,
        validation: commonValidations.required,
        className: 'md:col-span-2'
      }),
    );

    return fields;
  }, [showDraftPrompt, handleDiscardDraft, handleRestoreDraft, effectiveOriginScope, allowedTargetRoles, contextLoading]);

  const basicFieldNames = React.useMemo(
    () => baseBasicFields.map((field) => field.name),
    [baseBasicFields]
  );

  // All fields in single tab - simplified structure (no tabs)
  const allFields: FormField[] = React.useMemo(() => [
    ...baseBasicFields,
    // Hidden sync fields
    createField('assigned_institution_id', '', 'custom', {
      validation: z.union([z.number(), z.string(), z.null()]).optional(),
      defaultValue: null,
      render: ({ formControl }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useAssignedInstitutionSync(formControl);
        return null;
      }
    }),
    createField('target_institution_id', '', 'custom', {
      validation: z.union([z.number(), z.string(), z.null()]).optional(),
      defaultValue: null,
      render: () => null,
    }),
    // Optional additional fields
    createField('notes', 'Əlavə qeydlər (isteğe bağlı)', 'textarea', {
      placeholder: taskFormPlaceholders.notes,
      rows: 3,
      className: 'md:col-span-2'
    }),
    createField('requires_approval', 'Təsdiq tələb olunur', 'checkbox', {
      placeholder: taskFormPlaceholders.requiresApproval,
      defaultValue: false,
      className: 'md:col-span-2'
    }),
    createField('assignment_notes', 'Tapşırıq üzrə qeyd (isteğe bağlı)', 'textarea', {
      placeholder: taskFormPlaceholders.assignmentNotes,
      rows: 3,
      className: 'md:col-span-2'
    }),
  ], [baseBasicFields]);

  // ============================================
  // Modal Configuration - Single Tab (simplified)
  // ============================================

  const modalTabs = [
    {
      id: 'basic',
      label: 'Tapşırıq məlumatları',
      icon: <Users className="h-4 w-4" />,
      fields: allFields,
      description: 'Tapşırığın bütün məlumatlarını və məsul şəxsləri təyin edin',
      color: 'blue' as const,
    },
  ];

  // ============================================
  // Event Handlers
  // ============================================

  const handleSubmit = React.useCallback(async (data: any) => {
    try {
      if (!creationContext) {
        toast({
          title: 'Məlumat tapılmadı',
          description: 'Tapşırıq üçün lazım olan məlumatlar yüklənmədi. Zəhmət olmasa yenidən cəhd edin.',
          variant: 'destructive',
        });
        return;
      }

      const transformedData = transformTaskDataForAPI(data);

      if (!isEditMode && originScope) {
        transformedData.origin_scope = originScope;
        if (!transformedData.target_scope || transformedData.target_scope === 'specific') {
          transformedData.target_scope = originScope === 'region' ? 'regional' : 'sector';
        }
      }

      if (isEditMode && task?.origin_scope && !transformedData.origin_scope) {
        transformedData.origin_scope = task.origin_scope;
      }

      logger.info('TaskModal submitting', {
        component: 'TaskModalStandardized',
        action: 'submit',
        mode: isEditMode ? 'update' : 'create',
        taskId: task?.id,
        data: sanitizeTaskDataForLogging(transformedData)
      });

      await onSave(transformedData);

      if (formInstance) {
        formInstance.reset(defaultFormValues);
      }
      bypassCloseRef.current = true;

      toast({
        title: "Uğurlu",
        description: isEditMode
          ? "Tapşırıq məlumatları yeniləndi"
          : "Yeni tapşırıq yaradıldı",
      });
    } catch (error) {
      logger.error('TaskModal submit failed', error, {
        component: 'TaskModalStandardized',
        action: 'submit'
      });

      toast({
        title: "Xəta",
        description: error instanceof Error ? error.message : "Əməliyyat zamanı xəta baş verdi",
        variant: "destructive",
      });
      throw error;
    }
  }, [onSave, isEditMode, task?.id, task?.origin_scope, originScope, toast, creationContext, formInstance, defaultFormValues]);

  // ============================================
  // Render
  // ============================================

  return (
    <>
      <BaseModal
        open={open}
        onClose={handleModalClose}
        title={isEditMode ? `${task?.title} tapşırığını redaktə et` : 'Yeni tapşırıq yarat'}
        description="Tapşırıq məlumatlarını daxil edin və həyata keçirmək üçün məsul şəxs təyin edin"
        loading={isLoading}
      loadingText="Seçimlər yüklənir..."
      entity={task}
      tabs={modalTabs}
      defaultValues={defaultFormValues}
      onSubmit={handleSubmit}
        submitLabel={isEditMode ? 'Yenilə' : 'Yarat'}
        maxWidth="4xl"
        columns={2}
        onFormInstance={handleFormInstance}
        onValuesChange={handleFormValuesChange}
      />
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dəyişiklikləri ləğv edək?</AlertDialogTitle>
            <AlertDialogDescription>
              Modalı bağlasanız, daxil etdiyiniz məlumatlar silinəcək.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeepEditing}>
              Davam et
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges} className="bg-destructive text-white hover:bg-destructive/90">
              Dəyişiklikləri sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
