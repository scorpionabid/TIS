import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { surveyService, SurveyResponse, SurveyQuestion } from '@/services/surveys';
import { isEmptyValue, validateQuestionValue } from '@/utils/surveyValidation';
import { toast } from 'sonner';

interface UseSurveyResponseProps {
  surveyId: number;
  responseId?: number;
  onComplete?: (response: SurveyResponse) => void;
  onSave?: (response: SurveyResponse) => void;
}

export function useSurveyResponse({ 
  surveyId, 
  responseId, 
  onComplete, 
  onSave 
}: UseSurveyResponseProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentResponse, setCurrentResponse] = useState<SurveyResponse | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Get survey form data
  const { data: surveyData, isLoading: surveyLoading, error: surveyError } = useQuery({
    queryKey: ['survey-form', surveyId],
    queryFn: () => surveyService.getSurveyForResponse(surveyId),
    enabled: !!surveyId
  });

  // Get existing response if responseId is provided
  const { data: existingResponse, isLoading: responseLoading } = useQuery({
    queryKey: ['survey-response', responseId],
    queryFn: () => surveyService.getResponse(responseId!),
    enabled: !!responseId
  });

  // Start new response mutation
  const startResponseMutation = useMutation({
    mutationFn: (departmentId?: number) => surveyService.startResponse(surveyId, departmentId),
    onSuccess: (data) => {
      setCurrentResponse(data.response);
      queryClient.invalidateQueries({ queryKey: ['my-survey-responses'] });
      if (data.response.responses && Object.keys(data.response.responses).length > 0) {
        setResponses(data.response.responses);
        setHasUnsavedChanges(false);
        toast.success('Saxlanmış survey yükləndi');
      } else {
        toast.success('Survey başladıldı');
      }
    }
  });

  // Save response mutation
  const saveResponseMutation = useMutation({
    mutationFn: ({ rId, resps, autoSubmit }: { rId: number; resps: Record<string, any>; autoSubmit?: boolean }) =>
      surveyService.saveResponse(rId, resps, autoSubmit),
    onSuccess: (data, variables) => {
      setCurrentResponse(data.response);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());

      if (variables?.rId) {
        queryClient.invalidateQueries({ queryKey: ['survey-response', variables.rId] });
      }

      if (data.response.status === 'submitted') {
        toast.success('Survey təqdim edildi');
        onComplete?.(data.response);
        return;
      }
      toast.success('Survey saxlanıldı');
      onSave?.(data.response);
    }
  });

  const handleValueChange = useCallback((questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
    setHasUnsavedChanges(true);
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  }, [validationErrors]);

  const validateAll = useCallback((questions: SurveyQuestion[]) => {
    const errors: Record<string, string> = {};
    questions.forEach(q => {
      const error = validateQuestionValue(q, responses[q.id]);
      if (error) errors[q.id] = error;
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [responses]);

  return {
    surveyData,
    surveyLoading,
    surveyError,
    existingResponse,
    responseLoading,
    currentResponse,
    setCurrentResponse,
    responses,
    setResponses,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    lastSaved,
    validationErrors,
    startResponseMutation,
    saveResponseMutation,
    handleValueChange,
    validateAll,
  };
}
