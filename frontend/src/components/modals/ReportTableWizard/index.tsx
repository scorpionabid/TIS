/**
 * ReportTableWizard Modal
 * Modern, modular wizard for creating and editing report tables
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReportTable } from '@/types/reportTable';
import { useReportTableWizard } from './hooks/useReportTableWizard';
import { WizardStepper } from './components/WizardStepper';
import { Step1BasicInfo } from './components/Step1BasicInfo';
import { Step2Columns } from './components/Step2Columns';
import { Step3Institutions } from './components/Step3Institutions';
import { STEPS } from './types';

interface ReportTableWizardProps {
  open: boolean;
  onClose: () => void;
  editingTable?: ReportTable | null;
}

export function ReportTableWizard({
  open,
  onClose,
  editingTable,
}: ReportTableWizardProps) {
  const {
    currentStep,
    formData,
    validation,
    isLoading,
    goToStep,
    nextStep,
    prevStep,
    handleChange,
    canProceed,
    createTable,
    updateTable,
  } = useReportTableWizard(editingTable, onClose);

  const isEditing = !!editingTable;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isLoading && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Hesabat cədvəlini redaktə et' : 'Yeni hesabat cədvəli'}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <WizardStepper
          currentStep={currentStep}
          steps={STEPS}
          validation={validation}
          onStepClick={goToStep}
          canNavigateToStep={(step) => step <= currentStep || canProceed}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {currentStep === 1 && (
            <Step1BasicInfo
              formData={formData}
              onChange={handleChange}
              validation={validation}
              isEditing={isEditing}
            />
          )}
          {currentStep === 2 && (
            <Step2Columns
              formData={formData}
              onChange={handleChange}
              validation={validation}
              isEditing={isEditing}
              canEditColumns={!isEditing || !!editingTable?.can_edit_columns}
            />
          )}
          {currentStep === 3 && (
            <Step3Institutions
              formData={formData}
              onChange={handleChange}
              validation={validation}
              isEditing={isEditing}
              open={open}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Əvvəlki
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              Ləğv et
            </Button>
            {currentStep < 3 ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed || isLoading}
              >
                Növbəti <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (isEditing && editingTable) {
                    updateTable(editingTable.id);
                  } else {
                    createTable();
                  }
                }}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Yadda saxla' : 'Yarat'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Re-export for backward compatibility
export { ReportTableWizard as ReportTableModal };
