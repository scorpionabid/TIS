/**
 * useSurveyForm Hook
 * Manages survey form state, question management, and validation
 */

import { useState, useEffect, useCallback } from 'react';
import type { Question } from '@/types/surveyModal';
import type { Survey, CreateSurveyData } from '@/services/surveys';
import { surveyService } from '@/services/surveys';
import { useToast } from '@/hooks/use-toast';
import {
  mapQuestionFromBackend,
  mapQuestionForBackend,
  generateQuestionId,
  validateSurveyData,
} from '@/utils/surveyHelpers';

interface UseSurveyFormProps {
  survey?: Survey | null;
  onSave: (data: CreateSurveyData) => Promise<void>;
  onClose: () => void;
}

interface UseSurveyFormReturn {
  // Form state
  formData: CreateSurveyData;
  questions: Question[];
  isLoading: boolean;

  // Question editing state
  editingQuestionId: string | null;
  editingQuestion: Question | null;

  // Form operations
  updateField: (field: keyof CreateSurveyData, value: any) => void;
  resetForm: () => void;

  // Question operations
  addQuestion: (question: Partial<Question>) => void;
  removeQuestion: (id: string) => void;
  updateQuestionOrder: (questions: Question[]) => void;

  // Question editing operations
  startEditingQuestion: (question: Question) => void;
  cancelEditingQuestion: () => void;
  saveEditingQuestion: (surveyId?: number) => Promise<void>;
  updateEditingQuestion: (field: keyof Question, value: any) => void;

  // Question option operations
  addEditingQuestionOption: () => void;
  updateEditingQuestionOption: (index: number, value: string) => void;
  removeEditingQuestionOption: (index: number, canRemove: boolean) => void;

  // Validation and submission
  validateForm: () => boolean;
  handleSubmit: () => Promise<void>;
}

const INITIAL_FORM_DATA: CreateSurveyData = {
  title: '',
  description: '',
  questions: [],
  is_anonymous: false,
  allow_multiple_responses: false,
  target_institutions: [],
  target_roles: [],
  // Set start_date to today (backend now accepts today with after_or_equal:today validation)
  start_date: new Date().toISOString().split('T')[0],
};

/**
 * Custom hook for managing survey form state and operations
 */
export const useSurveyForm = ({
  survey,
  onSave,
  onClose,
}: UseSurveyFormProps): UseSurveyFormReturn => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CreateSurveyData>(INITIAL_FORM_DATA);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Question editing state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  /**
   * Initialize form with survey data (edit mode)
   */
  useEffect(() => {
    if (survey) {
      console.log('🔍 Survey loaded for editing:', {
        id: survey.id,
        title: survey.title,
        target_institutions: survey.target_institutions,
        questions_count: survey.questions?.length || 0
      });

      const newFormData: CreateSurveyData = {
        title: survey.title,
        description: survey.description || '',
        questions: survey.questions || [],
        start_date: survey.start_date,
        end_date: survey.end_date,
        target_institutions: Array.isArray(survey.target_institutions) ? survey.target_institutions : [],
        target_roles: survey.target_roles || [],
        is_anonymous: survey.is_anonymous,
        allow_multiple_responses: survey.allow_multiple_responses,
        max_responses: survey.max_responses,
      };

      setFormData(newFormData);

      // Map questions from backend format
      const mappedQuestions = (survey.questions || []).map(mapQuestionFromBackend);
      setQuestions(mappedQuestions);

      console.log('🔍 Questions mapping:', {
        original: survey.questions,
        mapped: mappedQuestions,
        count: mappedQuestions.length
      });
    } else {
      // Reset form for new survey
      setFormData(INITIAL_FORM_DATA);
      setQuestions([]);
    }
  }, [survey]);

  /**
   * Update form field
   */
  const updateField = useCallback((field: keyof CreateSurveyData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setQuestions([]);
    setEditingQuestionId(null);
    setEditingQuestion(null);
  }, []);

  /**
   * Add a new question
   */
  const addQuestion = useCallback((newQuestion: Partial<Question>) => {
    if (!newQuestion.question?.trim()) {
      toast({
        title: "Xəta",
        description: "Sual mətni daxil edilməlidir",
        variant: "destructive",
      });
      return;
    }

    const question: Question = {
      id: generateQuestionId(),
      question: newQuestion.question!,
      description: newQuestion.description,
      type: newQuestion.type || 'text',
      options: newQuestion.options || [],
      required: newQuestion.required || false,
      order: questions.length + 1,
      validation: newQuestion.validation,
    };

    setQuestions(prev => [...prev, question]);
  }, [questions.length, toast]);

  /**
   * Remove a question
   */
  const removeQuestion = useCallback((id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  }, []);

  /**
   * Update question order (for drag & drop)
   */
  const updateQuestionOrder = useCallback((reorderedQuestions: Question[]) => {
    setQuestions(reorderedQuestions);
  }, []);

  /**
   * Start editing a question
   */
  const startEditingQuestion = useCallback((question: Question) => {
    setEditingQuestionId(question.id!);
    setEditingQuestion({ ...question }); // Deep copy
  }, []);

  /**
   * Cancel question editing
   */
  const cancelEditingQuestion = useCallback(() => {
    setEditingQuestionId(null);
    setEditingQuestion(null);
  }, []);

  /**
   * Save edited question
   */
  const saveEditingQuestion = useCallback(async (surveyId?: number) => {
    if (!editingQuestion || !editingQuestionId) return;

    // If survey ID provided, make API call
    if (surveyId) {
      try {
        setIsLoading(true);

        console.log('💾 Saving question edit:', {
          surveyId,
          questionId: editingQuestionId,
          changes: editingQuestion
        });

        // Prepare updated survey data
        const updatedQuestions = questions.map(q =>
          q.id === editingQuestionId ? editingQuestion : q
        );

        const surveyData = {
          ...formData,
          questions: updatedQuestions.map(mapQuestionForBackend),
        };

        await surveyService.update(surveyId, surveyData);

        // Update local state after successful API call
        setQuestions(updatedQuestions);
        setEditingQuestionId(null);
        setEditingQuestion(null);

        toast({
          title: "Uğurlu",
          description: "Sual uğurla yeniləndi və yadda saxlanıldı",
        });
      } catch (error: any) {
        console.error('❌ Question edit save error:', error);
        toast({
          title: "Xəta",
          description: error.response?.data?.message || "Sual yenilənməsində xəta baş verdi",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Just update local state (for new surveys)
      const updatedQuestions = questions.map(q =>
        q.id === editingQuestionId ? editingQuestion : q
      );
      setQuestions(updatedQuestions);
      setEditingQuestionId(null);
      setEditingQuestion(null);
    }
  }, [editingQuestion, editingQuestionId, questions, formData, toast]);

  /**
   * Update editing question field
   */
  const updateEditingQuestion = useCallback((field: keyof Question, value: any) => {
    if (!editingQuestion) return;
    setEditingQuestion(prev => ({ ...prev!, [field]: value }));
  }, [editingQuestion]);

  /**
   * Add option to editing question
   */
  const addEditingQuestionOption = useCallback(() => {
    if (!editingQuestion) return;
    const newOptions = [...(editingQuestion.options || []), ''];
    setEditingQuestion(prev => ({ ...prev!, options: newOptions }));
  }, [editingQuestion]);

  /**
   * Update editing question option
   */
  const updateEditingQuestionOption = useCallback((index: number, value: string) => {
    if (!editingQuestion) return;
    const updatedOptions = [...(editingQuestion.options || [])];
    updatedOptions[index] = value;
    setEditingQuestion(prev => ({ ...prev!, options: updatedOptions }));
  }, [editingQuestion]);

  /**
   * Remove editing question option
   */
  const removeEditingQuestionOption = useCallback((index: number, canRemove: boolean) => {
    if (!editingQuestion) return;

    if (!canRemove) {
      toast({
        title: "Xəta",
        description: "Bu sualın təsdiq edilmiş cavabları var. Mövcud seçimləri silmək olmaz, yalnız yeni əlavə edə bilərsiniz.",
        variant: "destructive",
      });
      return;
    }

    const updatedOptions = editingQuestion.options?.filter((_, i) => i !== index) || [];
    setEditingQuestion(prev => ({ ...prev!, options: updatedOptions }));
  }, [editingQuestion, toast]);

  /**
   * Validate form data
   */
  const validateForm = useCallback((): boolean => {
    const validation = validateSurveyData(formData, questions);

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast({
          title: "Xəta",
          description: error,
          variant: "destructive",
        });
      });
    }

    return validation.isValid;
  }, [formData, questions, toast]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const surveyData: CreateSurveyData = {
        ...formData,
        questions: questions.map(mapQuestionForBackend),
      };

      console.log('🚀 Sending survey data:', {
        questions: surveyData.questions.map(q => ({ question: q.question, type: q.type })),
        questionCount: surveyData.questions.length,
        target_institutions: surveyData.target_institutions,
      });

      await onSave(surveyData);

      toast({
        title: "Uğurlu",
        description: survey ? "Sorğu məlumatları yeniləndi" : "Yeni sorğu yaradıldı",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Xəta",
        description: error instanceof Error ? error.message : "Əməliyyat zamanı xəta baş verdi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, questions, survey, validateForm, onSave, onClose, toast]);

  return {
    formData,
    questions,
    isLoading,
    editingQuestionId,
    editingQuestion,
    updateField,
    resetForm,
    addQuestion,
    removeQuestion,
    updateQuestionOrder,
    startEditingQuestion,
    cancelEditingQuestion,
    saveEditingQuestion,
    updateEditingQuestion,
    addEditingQuestionOption,
    updateEditingQuestionOption,
    removeEditingQuestionOption,
    validateForm,
    handleSubmit,
  };
};
