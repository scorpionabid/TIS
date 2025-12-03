import React, { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Target, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Survey, CreateSurveyData } from '@/services/surveys';
import { institutionService } from '@/services/institutions';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/constants/roles';
import { SurveyTemplateGallery } from '@/components/surveys/SurveyTemplateGallery';
import { Step1BasicInfo } from './survey/Step1BasicInfo';
import { Step2Questions } from './survey/Step2Questions';
import { Step3Targeting } from './survey/Step3Targeting';

// Import new hooks and utilities
import { useSurveyForm } from '@/hooks/useSurveyForm';
import { useQuestionRestrictions } from '@/hooks/useQuestionRestrictions';
import {
  isSurveyEditable,
  questionNeedsOptions,
  questionNeedsNumberValidation,
  questionNeedsFileValidation,
  questionNeedsMatrixConfiguration,
  questionNeedsRatingConfiguration,
} from '@/utils/surveyHelpers';
import {
  QUESTION_TYPES,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_QUESTION_LENGTH,
  type Question,
  type Institution,
} from '@/types/surveyModal';

// Template type - use Omit to avoid type conflict with questions
interface SurveyTemplate extends Omit<Survey, 'questions'> {
  current_questions_count?: number;
  questions?: Array<any>;
}

interface SurveyModalProps {
  open: boolean;
  onClose: () => void;
  survey?: Survey | null;
  onSave: (data: CreateSurveyData) => Promise<void>;
}

export function SurveyModal({ open, onClose, survey, onSave }: SurveyModalProps) {
  const { currentUser, hasPermission, hasRole } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isStepChanging, setIsStepChanging] = useState(false);

  // Template Gallery state
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  // Institution search and filtering
  const [institutionSearch, setInstitutionSearch] = useState('');

  // New question state (for adding questions)
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    question: '',
    type: 'text',
    required: false,
    options: [],
    tableRows: [],
    tableHeaders: [],
    min_value: undefined,
    max_value: undefined,
    max_file_size: undefined,
    allowed_file_types: undefined,
    rating_min: undefined,
    rating_max: undefined,
    rating_min_label: undefined,
    rating_max_label: undefined,
  });

  const isEditMode = !!survey;

  // Check if user can edit survey
  const canEdit = useMemo(() =>
    isSurveyEditable(
      survey,
      currentUser?.id,
      hasRole(USER_ROLES.SUPERADMIN),
      hasPermission('surveys.write')
    ),
    [survey, currentUser?.id, hasRole, hasPermission]
  );

  // Use custom hooks
  const surveyForm = useSurveyForm({ survey, onSave, onClose });
  const questionRestrictions = useQuestionRestrictions(survey, canEdit);

  // Published survey with responses check
  const isPublishedWithResponses = useMemo(() =>
    survey?.status === 'published' &&
    (survey?.response_count || 0) > 0 &&
    survey?.creator?.id === currentUser?.id,
    [survey, currentUser]
  );

  // Load institutions for targeting
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions-for-surveys'],
    queryFn: () => institutionService.getAll({
      per_page: 1000,
      include_trashed: false
    }),
    enabled: open,
  });

  const availableInstitutions = useMemo(() => {
    // Handle different response structures
    if (!institutionsResponse) return [];

    const response = institutionsResponse as any;

    // Check if it's a direct array
    if (Array.isArray(response)) {
      return response;
    }

    // Check if it has data.data structure
    if (response.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
    }

    return [];
  }, [institutionsResponse]);

  // Filter institutions based on search
  const filteredInstitutions = useMemo(() =>
    availableInstitutions.filter((institution: Institution) =>
      institution.name.toLowerCase().includes(institutionSearch.toLowerCase())
    ),
    [availableInstitutions, institutionSearch]
  );

  // Helper functions for bulk selection
  const selectInstitutionsByLevel = useCallback((level: number) => {
    const levelIds = availableInstitutions
      .filter((inst: Institution) => inst.level === level)
      .map((inst: Institution) => inst.id);
    surveyForm.updateField('target_institutions', levelIds);
  }, [availableInstitutions, surveyForm]);

  const selectInstitutionsByType = useCallback((filterFn: (inst: Institution) => boolean) => {
    const typeIds = availableInstitutions
      .filter(filterFn)
      .map((inst: Institution) => inst.id);
    surveyForm.updateField('target_institutions', typeIds);
  }, [availableInstitutions, surveyForm]);

  // Check if question type needs options/validation
  const needsOptions = questionNeedsOptions(newQuestion.type as string);
  const needsNumberValidation = questionNeedsNumberValidation(newQuestion.type as string);
  const needsFileValidation = questionNeedsFileValidation(newQuestion.type as string);
  const needsMatrixConfiguration = questionNeedsMatrixConfiguration(newQuestion.type as string);
  const needsRatingConfiguration = questionNeedsRatingConfiguration(newQuestion.type as string);

  // Step validation functions
  const validateStep1 = useCallback((): boolean => {
    if (!surveyForm.formData.title.trim()) {
      return false;
    }
    return true;
  }, [surveyForm.formData.title]);

  const validateStep2 = useCallback((): boolean => {
    return surveyForm.questions.length > 0;
  }, [surveyForm.questions.length]);

  // Template selection handler
  const handleTemplateSelect = useCallback((template: SurveyTemplate) => {
    try {
      console.log('🎨 Template selected:', template);

      // Update form data with template
      surveyForm.updateField('title', template.title);
      surveyForm.updateField('description', template.description || '');
      surveyForm.updateField('is_anonymous', template.is_anonymous || false);
      surveyForm.updateField('allow_multiple_responses', template.allow_multiple_responses || false);
      surveyForm.updateField('start_date', template.start_date || new Date().toISOString().split('T')[0]);
      surveyForm.updateField('end_date', template.end_date || undefined);
      surveyForm.updateField('max_responses', template.max_responses || undefined);
      surveyForm.updateField('target_institutions', template.target_institutions || []);
      surveyForm.updateField('target_roles', template.target_roles || []);

      // Copy template questions
      if (template.questions && Array.isArray(template.questions)) {
        const templateQuestions: Question[] = template.questions.map((q: any, index: number) => ({
          id: `template_${Date.now()}_${index}`,
          question: q.title || q.question || q.text || '',
          description: q.description || '',
          type: q.type || 'text',
          options: q.options || [],
          required: q.required || q.is_required || false,
          order: q.order || q.order_index || index,
          validation: q.validation_rules || {},
          min_value: q.min_value ?? q.validation_rules?.min_value,
          max_value: q.max_value ?? q.validation_rules?.max_value,
          min_length: q.min_length ?? q.validation_rules?.min_length,
          max_length: q.max_length ?? q.validation_rules?.max_length,
          allowed_file_types: q.allowed_file_types || q.validation_rules?.allowed_file_types,
          max_file_size: q.max_file_size ?? q.validation_rules?.max_file_size,
          rating_min: q.rating_min,
          rating_max: q.rating_max,
          rating_min_label: q.rating_min_label,
          rating_max_label: q.rating_max_label,
          tableRows: Array.isArray(q.table_rows) ? q.table_rows : undefined,
          tableHeaders: Array.isArray(q.table_headers) ? q.table_headers : undefined,
        }));
        surveyForm.updateQuestionOrder(templateQuestions);
      }

      setCurrentStep(1);
      setShowTemplateGallery(false);
    } catch (error) {
      console.error('Error selecting template:', error);
    }
  }, [surveyForm]);

  // Handle next step
  const handleNextStep = useCallback(() => {
    console.log('🚀 handleNextStep called, currentStep:', currentStep);
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;

    console.log('🚀 Setting currentStep to:', currentStep + 1);
    setIsStepChanging(true);
    setCurrentStep(prev => prev + 1);

    setTimeout(() => {
      setIsStepChanging(false);
    }, 100);
  }, [currentStep, validateStep1, validateStep2]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚨 handleSubmit called, currentStep:', currentStep, 'isStepChanging:', isStepChanging);

    // Prevent form submission during step transitions
    if (isStepChanging) {
      console.log('🚨 handleSubmit: blocked due to step change in progress');
      return;
    }

    // Only submit if we're on step 3 (final step)
    if (currentStep < 3) {
      console.log('🚨 handleSubmit: currentStep < 3, returning early');
      return;
    }

    console.log('🚨 handleSubmit: proceeding with submission');
    await surveyForm.handleSubmit();
  };

  // Add new question
  const addQuestion = () => {
    surveyForm.addQuestion(newQuestion);
    setNewQuestion({
      question: '',
      type: 'text',
      required: false,
      options: [],
      tableRows: [],
      tableHeaders: [],
      min_value: undefined,
      max_value: undefined,
      max_file_size: undefined,
      allowed_file_types: undefined,
      rating_min: undefined,
      rating_max: undefined,
      rating_min_label: undefined,
      rating_max_label: undefined,
    });
  };

  // New question option operations
  const addOption = () => {
    setNewQuestion(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }));
  };

  const updateOption = (index: number, value: string) => {
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || []
    }));
  };

  const removeOption = (index: number) => {
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const addTableRow = () => {
    setNewQuestion(prev => ({
      ...prev,
      tableRows: [...(prev.tableRows || []), `Sətir ${(prev.tableRows?.length ?? 0) + 1}`]
    }));
  };

  const updateTableRow = (index: number, value: string) => {
    setNewQuestion(prev => ({
      ...prev,
      tableRows: (prev.tableRows || []).map((row, i) => (i === index ? value : row))
    }));
  };

  const removeTableRow = (index: number) => {
    setNewQuestion(prev => ({
      ...prev,
      tableRows: prev.tableRows?.filter((_, i) => i !== index)
    }));
  };

  const addTableColumn = () => {
    setNewQuestion(prev => ({
      ...prev,
      tableHeaders: [...(prev.tableHeaders || []), `Sütun ${(prev.tableHeaders?.length ?? 0) + 1}`]
    }));
  };

  const updateTableColumn = (index: number, value: string) => {
    setNewQuestion(prev => ({
      ...prev,
      tableHeaders: (prev.tableHeaders || []).map((header, i) => (i === index ? value : header))
    }));
  };

  const removeTableColumn = (index: number) => {
    setNewQuestion(prev => ({
      ...prev,
      tableHeaders: prev.tableHeaders?.filter((_, i) => i !== index)
    }));
  };

  // Reset current step when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setCurrentStep(1);
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {isEditMode ?
                (canEdit ?
                  (survey?.status === 'published' ?
                    `${survey?.title} sorğusunu redaktə et (Məhdud rejim)` :
                    `${survey?.title} sorğusunu redaktə et`
                  ) :
                  `${survey?.title} sorğusuna baxış (Redaktə edilə bilməz)`
                ) :
                'Yeni sorğu yarat'
              }
            </DialogTitle>
            <DialogDescription>
              {isEditMode ?
                (canEdit ?
                  (survey?.status === 'published' ?
                    (isPublishedWithResponses ?
                      'Bu sorğu yayımlanmış və cavabları var. Sual-cavab tamlığını qoruyaraq məhdudlaşdırılmış redaktə edə bilərsiniz.' :
                      'Bu sorğu yayımlanmış, amma hələ cavab yoxdur. Sualları təhlükəsiz redaktə edə bilərsiniz.'
                    ) :
                    'Sorğu məlumatlarını dəyişdirin və yenidən yadda saxlayın'
                  ) :
                  'Bu sorğunu redaktə etmək üçün icazəniz yoxdur.'
                ) :
                'Yeni sorğu yaratmaq üçün aşağıdakı formu doldurun'
              }
            </DialogDescription>

            {/* Enhanced warning for published surveys */}
            {survey?.status === 'published' && canEdit && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 mb-1">
                      Yayımlanmış Sorğu - Məhdud Redaktə Rejimi
                    </h4>
                    <p className="text-sm text-blue-700">
                      Bu sorğu yayımlanmış və <strong>{survey?.response_count || 0} cavabı</strong> var.
                      Hər sualın təsdiq edilmiş cavablarına əsasən müxtəlif məhdudiyyətlər tətbiq edilir:
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc space-y-1">
                      <li>✅ Sorğu başlığı və təsviri həmişə dəyişdirilə bilər</li>
                      <li>✅ Sualların mətni və təsviri (təsdiq edilmiş cavabı olmayan suallar üçün)</li>
                      <li>✅ Mövcud seçimlərə <strong>yeni seçimlər əlavə etmək</strong></li>
                      <li>⚠️ Sual növləri və təsdiq edilmiş cavabı olan sual mətnləri dəyişdirilə bilməz</li>
                      <li>🚫 Mövcud seçimləri silmək qadağandır</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Warning banner for non-editable surveys */}
          {isEditMode && !canEdit && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Bu sorğu redaktə edilə bilməz</p>
                  <p className="text-sm">Yayımlanmış və cavabları olan sorğuları dəyişdirmək məlumat tamlığını pozar. Yeni sorğu yaradın.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step indicators */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
                  1
                </div>
                <span>Əsas məlumatlar</span>
              </div>
              <div className="flex-1 h-px bg-border" />
              <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 2 ? 'bg-primary text-white' : 'bg-muted'}`}>
                  2
                </div>
                <span>Suallar</span>
              </div>
              <div className="flex-1 h-px bg-border" />
              <div className={`flex items-center gap-2 ${currentStep === 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 3 ? 'bg-primary text-white' : 'bg-muted'}`}>
                  3
                </div>
                <span>Hədəf və tənzimləmələr</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <Step1BasicInfo
                formData={{
                  title: surveyForm.formData.title,
                  description: surveyForm.formData.description,
                  start_date: surveyForm.formData.start_date,
                  end_date: surveyForm.formData.end_date,
                  is_anonymous: surveyForm.formData.is_anonymous || false,
                  allow_multiple_responses: surveyForm.formData.allow_multiple_responses || false,
                }}
                survey={survey || null}
                isEditMode={isEditMode}
                isLoading={surveyForm.isLoading}
                isPublishedWithResponses={isPublishedWithResponses}
                MAX_TITLE_LENGTH={MAX_TITLE_LENGTH}
                MAX_DESCRIPTION_LENGTH={MAX_DESCRIPTION_LENGTH}
                handleInputChange={surveyForm.updateField}
                isEditable={() => canEdit}
                onShowTemplateGallery={() => setShowTemplateGallery(true)}
              />
            )}

            {/* Step 2: Questions */}
            {currentStep === 2 && (
              <Step2Questions
                questions={surveyForm.questions}
                newQuestion={newQuestion}
                editingQuestion={surveyForm.editingQuestion}
                editingQuestionId={surveyForm.editingQuestionId}
                isPublishedWithResponses={isPublishedWithResponses}
                restrictionsLoading={questionRestrictions.loading}
                isLoading={surveyForm.isLoading}
                questionRestrictions={questionRestrictions.restrictions}
                MAX_QUESTION_LENGTH={MAX_QUESTION_LENGTH}
                MAX_DESCRIPTION_LENGTH={MAX_DESCRIPTION_LENGTH}
                needsOptions={needsOptions}
                needsNumberValidation={needsNumberValidation}
                needsFileValidation={needsFileValidation}
                needsMatrixConfiguration={needsMatrixConfiguration}
                needsRatingConfiguration={needsRatingConfiguration}
                questionTypes={QUESTION_TYPES}
                setQuestions={surveyForm.updateQuestionOrder}
                setNewQuestion={setNewQuestion}
                getQuestionRestrictions={questionRestrictions.getRestrictions}
                startEditingQuestion={surveyForm.startEditingQuestion}
                removeQuestion={surveyForm.removeQuestion}
                updateEditingQuestion={surveyForm.updateEditingQuestion}
                addEditingQuestionOption={surveyForm.addEditingQuestionOption}
                updateEditingQuestionOption={surveyForm.updateEditingQuestionOption}
                removeEditingQuestionOption={(index) => {
                  const restrictions = questionRestrictions.getRestrictions(surveyForm.editingQuestionId || '');
                  surveyForm.removeEditingQuestionOption(index, restrictions.can_remove_options);
                }}
                saveEditingQuestion={() => surveyForm.saveEditingQuestion(survey?.id)}
                cancelEditingQuestion={surveyForm.cancelEditingQuestion}
                addQuestion={addQuestion}
                addOption={addOption}
                updateOption={updateOption}
                removeOption={removeOption}
                addTableRow={addTableRow}
                updateTableRow={updateTableRow}
                removeTableRow={removeTableRow}
                addTableColumn={addTableColumn}
                updateTableColumn={updateTableColumn}
                removeTableColumn={removeTableColumn}
                toast={undefined as any} // Will use from hook internally
              />
            )}

            {/* Step 3: Targeting & Settings */}
            {currentStep === 3 && (
              <Step3Targeting
                formData={{
                  target_institutions: surveyForm.formData.target_institutions || [],
                  max_responses: surveyForm.formData.max_responses || null,
                }}
                institutionSearch={institutionSearch}
                availableInstitutions={availableInstitutions}
                filteredInstitutions={filteredInstitutions}
                setInstitutionSearch={setInstitutionSearch}
                handleInputChange={surveyForm.updateField}
                selectInstitutionsByLevel={selectInstitutionsByLevel}
                selectInstitutionsByType={selectInstitutionsByType}
              />
            )}

            {/* Form Actions */}
            <div className="flex justify-between pt-4 border-t">
              <div>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    disabled={surveyForm.isLoading}
                  >
                    Geri
                  </Button>
                )}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose} disabled={surveyForm.isLoading}>
                  Ləğv et
                </Button>

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    disabled={surveyForm.isLoading}
                  >
                    Növbəti
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={surveyForm.isLoading || (isEditMode && !canEdit)}
                  >
                    {surveyForm.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ?
                      (canEdit ? 'Yenilə' : 'Redaktə edilə bilməz') :
                      'Yarat'
                    }
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template Gallery Modal */}
      <SurveyTemplateGallery
        open={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </>
  );
}
