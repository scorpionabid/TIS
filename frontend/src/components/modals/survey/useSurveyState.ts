import { useState, useCallback, useEffect } from 'react';
import { Survey, CreateSurveyData } from '@/services/surveys';

export interface Question {
  id?: string;
  question: string;
  type: 'text' | 'number' | 'date' | 'single_choice' | 'multiple_choice' | 'file_upload' | 'rating' | 'table_matrix';
  options?: string[];
  required: boolean;
  order: number;
  validation?: {
    min_value?: number;
    max_value?: number;
    max_file_size?: number;
    allowed_file_types?: string[];
  };
}

export const useSurveyState = (survey?: Survey | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isStepChanging, setIsStepChanging] = useState(false);
  
  const [formData, setFormData] = useState<CreateSurveyData>({
    title: '',
    description: '',
    questions: [],
    is_anonymous: false,
    allow_multiple_responses: false,
    target_institutions: [],
    target_roles: [],
    start_date: new Date().toISOString().split('T')[0],
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    question: '',
    type: 'text',
    required: false,
  });

  const [institutionSearch, setInstitutionSearch] = useState('');

  const isEditMode = !!survey;

  // Character limits
  const MAX_TITLE_LENGTH = 200;
  const MAX_DESCRIPTION_LENGTH = 1000;
  const MAX_QUESTION_LENGTH = 500;

  // Check if survey is editable
  const isEditable = useCallback((survey: Survey | null) => {
    if (!survey) return true;
    if (survey.status === 'draft') return true;
    if (survey.status === 'active') return true;
    if (survey.status === 'published') {
      return (survey.response_count || 0) === 0;
    }
    return false;
  }, []);

  // Initialize form data with survey data
  useEffect(() => {
    if (survey) {
      const newFormData = {
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
      
      const mappedQuestions = (survey.questions || []).map(q => ({
        id: q.id?.toString(),
        question: q.question,
        type: q.type,
        options: Array.isArray(q.options) ? q.options : [],
        required: q.required,
        order: q.order,
      }));
      
      setQuestions(mappedQuestions);
      setFormData(prev => ({
        ...prev,
        questions: mappedQuestions,
      }));
    } else {
      setFormData({
        title: '',
        description: '',
        questions: [],
        is_anonymous: false,
        allow_multiple_responses: false,
        target_institutions: [],
        target_roles: [],
        start_date: new Date().toISOString().split('T')[0],
      });
      setQuestions([]);
      setCurrentStep(1);
    }
  }, [survey]);

  // Handle input changes
  const handleInputChange = useCallback((field: keyof CreateSurveyData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Question management
  const addQuestion = useCallback(() => {
    if (!newQuestion.question?.trim()) return;

    const questionToAdd: Question = {
      question: newQuestion.question.trim(),
      type: newQuestion.type || 'text',
      options: ['single_choice', 'multiple_choice'].includes(newQuestion.type || 'text') 
        ? ['Seçim 1', 'Seçim 2'] 
        : [],
      required: newQuestion.required || false,
      order: questions.length + 1,
    };

    const updatedQuestions = [...questions, questionToAdd];
    setQuestions(updatedQuestions);
    setFormData(prev => ({ ...prev, questions: updatedQuestions }));
    
    setNewQuestion({
      question: '',
      type: 'text',
      required: false,
    });
  }, [newQuestion, questions]);

  const removeQuestion = useCallback((index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, order: i + 1 }));
    
    setQuestions(updatedQuestions);
    setFormData(prev => ({ ...prev, questions: updatedQuestions }));
  }, [questions]);

  const updateQuestion = useCallback((index: number, field: keyof Question, value: any) => {
    const updatedQuestions = questions.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    );
    
    setQuestions(updatedQuestions);
    setFormData(prev => ({ ...prev, questions: updatedQuestions }));
  }, [questions]);

  // Step management
  const nextStep = useCallback(() => {
    if (currentStep < 4) {
      setIsStepChanging(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsStepChanging(false);
      }, 150);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setIsStepChanging(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsStepChanging(false);
      }, 150);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4 && step !== currentStep) {
      setIsStepChanging(true);
      setTimeout(() => {
        setCurrentStep(step);
        setIsStepChanging(false);
      }, 150);
    }
  }, [currentStep]);

  // Institution selection helpers
  const selectInstitutionsByLevel = useCallback((level: number, availableInstitutions: any[]) => {
    const levelIds = availableInstitutions
      .filter((inst: any) => inst.level === level)
      .map((inst: any) => inst.id);
    handleInputChange('target_institutions', levelIds);
  }, [handleInputChange]);

  const selectInstitutionsByType = useCallback((filterFn: (inst: any) => boolean, availableInstitutions: any[]) => {
    const typeIds = availableInstitutions
      .filter(filterFn)
      .map((inst: any) => inst.id);
    handleInputChange('target_institutions', typeIds);
  }, [handleInputChange]);

  // Validation
  const isStepValid = useCallback((step: number) => {
    switch (step) {
      case 1:
        return formData.title.trim().length > 0;
      case 2:
        return questions.length > 0;
      case 3:
        return formData.target_institutions.length > 0 || formData.target_roles.length > 0;
      case 4:
        return true; // Preview step, always valid
      default:
        return false;
    }
  }, [formData, questions]);

  const canProceed = useCallback(() => {
    return isStepValid(currentStep);
  }, [currentStep, isStepValid]);

  return {
    // State
    isLoading,
    setIsLoading,
    currentStep,
    isStepChanging,
    formData,
    questions,
    newQuestion,
    institutionSearch,
    setInstitutionSearch,
    isEditMode,
    
    // Constants
    MAX_TITLE_LENGTH,
    MAX_DESCRIPTION_LENGTH,
    MAX_QUESTION_LENGTH,
    
    // Handlers
    handleInputChange,
    setNewQuestion,
    addQuestion,
    removeQuestion,
    updateQuestion,
    
    // Step management
    nextStep,
    prevStep,
    goToStep,
    
    // Institution helpers
    selectInstitutionsByLevel,
    selectInstitutionsByType,
    
    // Validation
    isEditable,
    isStepValid,
    canProceed,
  };
};