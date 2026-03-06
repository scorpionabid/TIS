/**
 * ReportTableWizard Types
 * Shared types for the modular report table creation wizard
 */

import type { ReportTable, ReportTableColumn, ColumnType } from '@/types/reportTable';
import type { Institution } from '@/services/institutions';

export { COLUMN_TYPES, MAX_ROWS_OPTIONS } from './constants';

/**
 * Form data structure for the wizard
 */
export interface FormData {
  title: string;
  description: string;
  notes: string;
  columns: ReportTableColumn[];
  fixed_rows: { id: string; label: string }[] | null;
  max_rows: number;
  target_institutions: number[];
  deadline: string;
}

/**
 * Wizard step definitions
 */
export type WizardStep = 1 | 2 | 3;

export interface StepConfig {
  n: WizardStep;
  label: string;
  description?: string;
}

export const STEPS: StepConfig[] = [
  { n: 1, label: 'Əsas məlumatlar', description: 'Cədvəl başlığı və təlimatları' },
  { n: 2, label: 'Sütunlar', description: 'Sütun tipləri və qaydalar' },
  { n: 3, label: 'Müəssisələr', description: 'Hədəf müəssisələri seçin' },
];

/**
 * Validation state for each step
 */
export interface ValidationState {
  step1: {
    valid: boolean;
    errors: string[];
    fields: Record<string, boolean>;
  };
  step2: {
    valid: boolean;
    errors: string[];
    columnErrors: Record<number, string[]>;
  };
  step3: {
    valid: boolean;
    errors: string[];
    selectedCount: number;
  };
}

/**
 * Props for step components
 */
export interface StepProps {
  formData: FormData;
  onChange: (field: keyof FormData, value: unknown) => void;
  validation: ValidationState;
  isEditing: boolean;
  disabled?: boolean;
}

/**
 * Column editor props
 */
export interface ColumnEditorProps {
  column: ReportTableColumn;
  index: number;
  disabled: boolean;
  onUpdate: (index: number, field: keyof ReportTableColumn, value: string | boolean | number | string[] | undefined) => void;
  onRemove: (index: number) => void;
  dragHandleProps?: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown>;
    ref: React.RefCallback<HTMLElement>;
  };
}

/**
 * Institution selection props
 */
export interface InstitutionSelectionProps {
  institutions: Institution[];
  selectedIds: number[];
  sectorMap: Record<number, string>;
  searchTerm: string;
  onToggle: (id: number) => void;
  onToggleSector: (insts: Institution[]) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

/**
 * Wizard hook return type
 */
export interface UseReportTableWizardReturn {
  currentStep: WizardStep;
  formData: FormData;
  validation: ValidationState;
  isLoading: boolean;
  
  // Actions
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  goToStep: (step: WizardStep) => boolean;
  nextStep: () => boolean;
  prevStep: () => void;
  handleChange: (field: keyof FormData, value: unknown) => void;
  
  // Validation
  canProceed: boolean;
  validateCurrentStep: () => boolean;
  
  // Submit
  createTable: () => Promise<void>;
  updateTable: (id: number) => Promise<void>;
}

/**
 * Column management hook return type
 */
export interface UseColumnManagementReturn {
  columns: ReportTableColumn[];
  addColumn: () => void;
  removeColumn: (index: number) => void;
  updateColumn: (index: number, field: keyof ReportTableColumn, value: unknown) => void;
  reorderColumns: (oldIndex: number, newIndex: number) => void;
  importColumns: (columns: ReportTableColumn[]) => void;
  validateColumns: () => { valid: boolean; errors: string[]; columnErrors: Record<number, string[]> };
}

/**
 * Wizard stepper props
 */
export interface WizardStepperProps {
  currentStep: WizardStep;
  steps: StepConfig[];
  validation: ValidationState;
  onStepClick?: (step: WizardStep) => void;
  canNavigateToStep?: (step: WizardStep) => boolean;
}

/**
 * Main modal props
 */
export interface ReportTableWizardProps {
  open: boolean;
  onClose: () => void;
  editingTable?: ReportTable | null;
}
