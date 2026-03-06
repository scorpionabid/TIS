/**
 * useReportTableWizard Hook
 * Manages wizard state, validation, and navigation
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ReportTable } from '@/types/reportTable';
import { reportTableService } from '@/services/reportTables';
import type { FormData, WizardStep, ValidationState, UseReportTableWizardReturn } from '../types';
import { DEFAULT_FORM_DATA } from '../constants';

export function useReportTableWizard(
  editingTable: ReportTable | null | undefined,
  onClose: () => void
): UseReportTableWizardReturn {
  const queryClient = useQueryClient();
  const isEditing = !!editingTable;

  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);

  // Initialize form data when editing
  useEffect(() => {
    if (editingTable) {
      setFormData({
        title: editingTable.title,
        description: editingTable.description ?? '',
        notes: editingTable.notes ?? '',
        columns: editingTable.columns ?? [],
        fixed_rows: editingTable.fixed_rows ?? null,
        max_rows: editingTable.max_rows ?? 50,
        target_institutions: editingTable.target_institutions ?? [],
        deadline: editingTable.deadline
          ? new Date(editingTable.deadline).toISOString().split('T')[0]
          : '',
      });
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
    setCurrentStep(1);
  }, [editingTable]);

  // Validation
  const validation = useMemo<ValidationState>(() => {
    const step1Errors: string[] = [];
    const step1Fields: Record<string, boolean> = {};

    if (!formData.title.trim()) {
      step1Errors.push('Başlıq tələb olunur');
      step1Fields.title = false;
    } else if (formData.title.trim().length < 3) {
      step1Errors.push('Başlıq ən azı 3 simvol olmalıdır');
      step1Fields.title = false;
    } else {
      step1Fields.title = true;
    }

    const step2Errors: string[] = [];
    const columnErrors: Record<number, string[]> = {};

    if (formData.columns.length === 0) {
      step2Errors.push('Ən azı bir sütun əlavə edilməlidir');
    } else {
      formData.columns.forEach((col, idx) => {
        const errors: string[] = [];

        if (!col.key.trim()) {
          errors.push('Açar ad tələb olunur');
        } else if (!/^[a-z0-9_]+$/.test(col.key)) {
          errors.push('Açar ad yalnız kiçik hərflər, rəqəmlər və _ ola bilər');
        }

        if (!col.label.trim()) {
          errors.push('Etiket tələb olunur');
        }

        if (col.type === 'select' && (!col.options || col.options.length === 0)) {
          errors.push('Seçim tipi üçün variantlar tələb olunur');
        }

        if (errors.length > 0) {
          columnErrors[idx] = errors;
        }
      });

      if (Object.keys(columnErrors).length > 0) {
        step2Errors.push(`${Object.keys(columnErrors).length} sütunda xətalar var`);
      }
    }

    const step3Errors: string[] = [];

    return {
      step1: {
        valid: step1Errors.length === 0,
        errors: step1Errors,
        fields: step1Fields,
      },
      step2: {
        valid: step2Errors.length === 0 && Object.keys(columnErrors).length === 0,
        errors: step2Errors,
        columnErrors,
      },
      step3: {
        valid: true, // Institutions are optional
        errors: step3Errors,
        selectedCount: formData.target_institutions.length,
      },
    };
  }, [formData]);

  // Navigation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1: return validation.step1.valid;
      case 2: return validation.step2.valid;
      case 3: return true;
      default: return false;
    }
  }, [currentStep, validation]);

  const goToStep = useCallback((step: WizardStep): boolean => {
    // Can always go back
    if (step < currentStep) {
      setCurrentStep(step);
      return true;
    }

    // Can go forward only if current step is valid
    if (step > currentStep && canProceed) {
      setCurrentStep(step);
      return true;
    }

    return false;
  }, [currentStep, canProceed]);

  const nextStep = useCallback((): boolean => {
    if (currentStep < 3 && canProceed) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
      return true;
    }
    return false;
  }, [currentStep, canProceed]);

  const prevStep = useCallback((): void => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  }, [currentStep]);

  const handleChange = useCallback((field: keyof FormData, value: unknown): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 1: return validation.step1.valid;
      case 2: return validation.step2.valid;
      case 3: return validation.step3.valid;
      default: return false;
    }
  }, [currentStep, validation]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => {
      console.log('[createMutation] Calling API with:', {
        title: formData.title,
        notes: formData.notes,
        columnsCount: formData.columns.length
      });
      return reportTableService.createTable({
        title: formData.title,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        columns: formData.columns,
        fixed_rows: formData.fixed_rows || undefined,
        max_rows: formData.max_rows,
        target_institutions: formData.target_institutions,
        deadline: formData.deadline || undefined,
      });
    },
    onSuccess: (data) => {
      console.log('[createMutation] Success:', data);
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Hesabat cədvəli yaradıldı');
      onClose();
    },
    onError: (err: Error) => {
      console.error('[createMutation] Error:', err);
      toast.error(err.message || 'Xəta baş verdi');
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      reportTableService.updateTable(editingTable!.id, {
        title: formData.title,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        columns: editingTable?.can_edit_columns ? formData.columns : undefined,
        fixed_rows: editingTable?.can_edit_columns ? (formData.fixed_rows || undefined) : undefined,
        max_rows: formData.max_rows,
        target_institutions: formData.target_institutions,
        deadline: formData.deadline || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Hesabat cədvəli yeniləndi');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Xəta baş verdi'),
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const createTable = useCallback(async (): Promise<void> => {
    console.log('[createTable] Starting...', { step1Valid: validation.step1.valid, step2Valid: validation.step2.valid });
    if (!validation.step1.valid || !validation.step2.valid) {
      console.log('[createTable] Validation failed:', validation);
      toast.error('Zəhmət olmasa, bütün tələb olunan sahələri doldurun');
      return;
    }
    console.log('[createTable] Validation passed, calling mutation...');
    await createMutation.mutateAsync();
  }, [createMutation, validation]);

  const updateTable = useCallback(async (id: number): Promise<void> => {
    if (!validation.step1.valid || !validation.step2.valid) {
      toast.error('Zəhmət olmasa, bütün tələb olunan sahələri doldurun');
      return;
    }
    await updateMutation.mutateAsync();
  }, [updateMutation, validation]);

  return {
    currentStep,
    formData,
    validation,
    isLoading,
    setFormData,
    goToStep,
    nextStep,
    prevStep,
    handleChange,
    canProceed,
    validateCurrentStep,
    createTable,
    updateTable,
  };
}
