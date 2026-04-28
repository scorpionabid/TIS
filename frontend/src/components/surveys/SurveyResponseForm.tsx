import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Save, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { surveyService, SurveyResponse, SurveyQuestion, SurveyFormSchema } from '@/services/surveys';
import { SurveyQuestionAttachmentDisplay } from '@/components/surveys/questions/types';
import { isEmptyValue, validateQuestionValue } from '@/utils/surveyValidation';
import { toast } from 'sonner';
import { SurveyQuestionRenderer } from '@/components/surveys/questions';

interface SurveyResponseFormProps {
  surveyId: number;
  responseId?: number;
  readonly?: boolean;
  onComplete?: (response: SurveyResponse) => void;
  onSave?: (response: SurveyResponse) => void;
}

export function SurveyResponseForm({ surveyId, responseId, readonly = false, onComplete, onSave }: SurveyResponseFormProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentResponse, setCurrentResponse] = useState<SurveyResponse | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Record<string, SurveyQuestionAttachmentDisplay | null>>({});
  const [attachmentUploading, setAttachmentUploading] = useState<Record<string, boolean>>({});
  const [autoSaveFailureCount, setAutoSaveFailureCount] = useState(0);
  const [autoSaveDelay, setAutoSaveDelay] = useState(30000);
  const [lastSaveSilentFailure, setLastSaveSilentFailure] = useState(false);
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
      // If this returns an existing response (has responses), load them
      if (data.response.responses && Object.keys(data.response.responses).length > 0) {
        setResponses(data.response.responses);
        setHasUnsavedChanges(false);
        toast.success('Saxlanmış survey yükləndi');
      } else {
        toast.success('Survey başladıldı');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Survey başladılarkən xəta baş verdi');
    }
  });

  // Save response mutation
  type SaveResponsePayload = {
    responseId: number;
    responses: Record<string, any>;
    autoSubmit?: boolean;
    silent?: boolean;
  };

  const saveResponseMutation = useMutation({
    mutationFn: ({ responseId, responses, autoSubmit }: SaveResponsePayload) =>
      surveyService.saveResponse(responseId, responses, autoSubmit),
    onSuccess: (data, variables) => {
      setCurrentResponse(data.response);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      setAutoSaveFailureCount(0);
      setAutoSaveDelay(30000);
      setLastSaveSilentFailure(false);

      if (variables?.responseId) {
        queryClient.invalidateQueries({ queryKey: ['survey-response', variables.responseId] });
      }

      if (data.response.status === 'submitted') {
        toast.success('Survey təqdim edildi');
        onComplete?.(data.response);
        return;
      }

      if (!variables?.silent) {
        toast.success('Survey saxlanıldı');
      }

      onSave?.(data.response);
    },
    onError: (error: any, variables) => {
      setAutoSaveFailureCount((count) => count + 1);
      setAutoSaveDelay((delay) => Math.min(delay * 2, 120000));
      setLastSaveSilentFailure(Boolean(variables?.silent));

      if (!variables?.silent) {
        toast.error(error.response?.data?.message || 'Saxlanılan zaman xəta baş verdi');
      }
    }
  });

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: (responseId: number) => surveyService.submitResponse(responseId),
    onSuccess: (data) => {
      setCurrentResponse(data.response);
      queryClient.invalidateQueries({ queryKey: ['survey-response', responseId] });
      toast.success('Survey təqdim edildi');
      onComplete?.(data.response);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Təqdim edərkən xəta baş verdi');
    }
  });

  // Reopen as draft mutation (for submitted responses)
  const reopenDraftMutation = useMutation({
    mutationFn: (responseId: number) => surveyService.reopenAsDraft(responseId),
    onSuccess: (data) => {
      setCurrentResponse(data.response);
      setResponses(data.response.responses ?? {});
      queryClient.invalidateQueries({ queryKey: ['survey-response', responseId] });
      toast.success('Survey yenidən redaktə üçün açıldı');
      setHasUnsavedChanges(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Yenidən açarkən xəta baş verdi');
    }
  });

  const getQuestionKey = useCallback((question: SurveyQuestion): string => {
    if (question.id != null) {
      return question.id.toString();
    }

    const order = question.order ?? question.order_index ?? 0;
    return `${question.title}-${order}`;
  }, []);

  const getAttachmentKey = useCallback((question: SurveyQuestion): string => {
    return question.id != null ? question.id.toString() : getQuestionKey(question);
  }, [getQuestionKey]);

  const resolveAttachmentDownloadUrl = useCallback((question: SurveyQuestion) => {
    if (!currentResponse?.id || !question.id) {
      return null;
    }

    return surveyService.getQuestionAttachmentDownloadUrl(currentResponse.id, question.id);
  }, [currentResponse?.id]);

  const validateQuestion = useCallback(
    (question: SurveyQuestion, value: unknown) =>
      validateQuestionValue(question, value, attachments),
    [attachments],
  );

  const validateAllQuestions = useCallback((questions: SurveyQuestion[], nextResponses: Record<string, unknown>) => {
    const errors: Record<string, string> = {};

    questions.forEach((question) => {
      const key = getQuestionKey(question);
      const value = nextResponses[key];
      const error = validateQuestion(question, value);
      if (error) errors[key] = error;
    });

    setValidationErrors(errors);
    return errors;
  }, [getQuestionKey, validateQuestion]);

  // Initialize responses from existing data
  const buildAttachmentMap = useCallback((list?: SurveyResponse['attachments'], responseIdentifier?: number) => {
    if (!list) {
      return {} as Record<string, SurveyQuestionAttachmentDisplay | null>;
    }

    return list.reduce<Record<string, SurveyQuestionAttachmentDisplay | null>>((acc, attachment) => {
      if (attachment.document && attachment.survey_question_id != null) {
        acc[attachment.survey_question_id.toString()] = {
          documentId: attachment.document.id,
          filename: attachment.document.original_filename,
          fileSize: attachment.document.file_size,
          mimeType: attachment.document.mime_type,
          downloadUrl: responseIdentifier && attachment.survey_question_id != null
            ? surveyService.getQuestionAttachmentDownloadUrl(responseIdentifier, attachment.survey_question_id)
            : null,
        };
      }
      return acc;
    }, {});
  }, []);

  useEffect(() => {
    if (existingResponse?.response) {
      setCurrentResponse(existingResponse.response);
      setResponses(existingResponse.response.responses || {});
      setAttachments(buildAttachmentMap(existingResponse.response.attachments, existingResponse.response.id));
      setHasUnsavedChanges(false); // Mark as saved when loading existing
    }
  }, [existingResponse, buildAttachmentMap]);

  useEffect(() => {
    if (currentResponse?.attachments) {
      setAttachments(buildAttachmentMap(currentResponse.attachments, currentResponse.id));
    }
  }, [currentResponse?.attachments, buildAttachmentMap]);

  // Auto-start response if no existing response and no responseId provided (skip in readonly mode)
  useEffect(() => {
    if (readonly) return;
    if (surveyData && !responseId && !currentResponse && !startResponseMutation.isPending) {
      startResponseMutation.mutate();
    }
  }, [surveyData, responseId, currentResponse, startResponseMutation, readonly]);
  
  // Load responses from started response (only for new responses without existing data)
  useEffect(() => {
    if (currentResponse && !responseId && Object.keys(responses).length === 0) {
      // This is from startResponse mutation - load its responses if not already loaded
      setResponses(currentResponse.responses || {});
      setHasUnsavedChanges(false);
    }
  }, [currentResponse, responseId, responses]);

  useEffect(() => {
    if (autoSaveFailureCount === 0 || !lastSaveSilentFailure) {
      return;
    }

    toast.error(`Avto-saxlama alınmadı. Sistem ${Math.round(autoSaveDelay / 1000)} saniyəyə yenidən cəhd edəcək.`);
  }, [autoSaveFailureCount, autoSaveDelay, lastSaveSilentFailure]);

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && currentResponse?.status === 'draft') {
        e.preventDefault();
        e.returnValue = 'Saxlanmayan dəyişikliklər var. Səhifəni tərk etmək istəyirsiniz?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, currentResponse]);

  const handleUploadAttachment = useCallback(async (question: SurveyQuestion, file: File) => {
    if (!currentResponse?.id || !question.id) {
      return;
    }

    const key = getAttachmentKey(question);
    setAttachmentUploading(prev => ({ ...prev, [key]: true }));

    try {
      const attachment = await surveyService.uploadQuestionAttachment(currentResponse.id, question.id, file);
      if (attachment.document) {
        setAttachments(prev => ({
          ...prev,
          [key]: {
            documentId: attachment.document.id,
            filename: attachment.document.original_filename,
            fileSize: attachment.document.file_size,
            mimeType: attachment.document.mime_type,
            downloadUrl: surveyService.getQuestionAttachmentDownloadUrl(currentResponse.id, question.id),
          },
        }));

        setResponses(prev => ({
          ...prev,
          [key]: {
            document_id: attachment.document.id,
            filename: attachment.document.original_filename,
            file_size: attachment.document.file_size,
          },
        }));

        setValidationErrors(prev => {
          if (prev[key]) {
            const next = { ...prev };
            delete next[key];
            return next;
          }
          return prev;
        });

        setHasUnsavedChanges(true);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Fayl yüklənərkən xəta baş verdi');
    } finally {
      setAttachmentUploading(prev => ({ ...prev, [key]: false }));
    }
  }, [currentResponse?.id, getAttachmentKey]);

  const handleRemoveAttachment = useCallback(async (question: SurveyQuestion) => {
    if (!currentResponse?.id || !question.id) {
      return;
    }

    const key = getAttachmentKey(question);
    if (!attachments[key]) {
      return;
    }

    setAttachmentUploading(prev => ({ ...prev, [key]: true }));

    try {
      await surveyService.deleteQuestionAttachment(currentResponse.id, question.id);
      setAttachments(prev => ({
        ...prev,
        [key]: null,
      }));
      setResponses(prev => ({
        ...prev,
        [key]: null,
      }));
      setHasUnsavedChanges(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Fayl silinərkən xəta baş verdi');
    } finally {
      setAttachmentUploading(prev => ({ ...prev, [key]: false }));
    }
  }, [attachments, currentResponse?.id, getAttachmentKey]);

  const handleQuestionChange = (question: SurveyQuestion, value: any) => {
    const key = getQuestionKey(question);

    if (question.type === 'file_upload') {
      return;
    }

    setResponses((prev) => {
      const nextResponses = {
        ...prev,
        [key]: value,
      };

      const errorMessage = validateQuestion(question, value);

      setValidationErrors((prevErrors) => {
        if (!errorMessage) {
          if (prevErrors[key]) {
            const { [key]: _, ...rest } = prevErrors;
            return rest;
          }
          return prevErrors;
        }

        return {
          ...prevErrors,
          [key]: errorMessage,
        };
      });

      return nextResponses;
    });

    setHasUnsavedChanges(true);
  };

  const handleSave = useCallback((autoSubmit: boolean = false, silent: boolean = false) => {
    if (!currentResponse || !surveyData?.questions) {
      return;
    }

    const errors = validateAllQuestions(surveyData.questions, responses);
    const hasBlockingErrors = Object.keys(errors).length > 0;

    if (!silent && !autoSubmit && hasBlockingErrors) {
      toast.error('Zəhmət olmasa səhvləri düzəldin.');
      return;
    }

    saveResponseMutation.mutate({
      responseId: currentResponse.id,
      responses,
      autoSubmit,
      silent,
    });
  }, [currentResponse, surveyData?.questions, responses, saveResponseMutation, validateAllQuestions]);

  // Auto-save with adaptive delay if there are unsaved changes
  useEffect(() => {
    if (
      !hasUnsavedChanges ||
      !currentResponse ||
      currentResponse.status !== 'draft' ||
      saveResponseMutation.isPending
    ) {
      return;
    }

    const timer = setTimeout(() => {
      handleSave(false, true);
    }, autoSaveDelay);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, currentResponse, autoSaveDelay, saveResponseMutation.isPending, handleSave]);

  const handleSubmit = () => {
    if (!currentResponse || !surveyData?.questions) return;

    const errors = validateAllQuestions(surveyData.questions, responses);
    if (Object.keys(errors).length > 0) {
      toast.error('Təqdim etməzdən əvvəl bütün məcburi sahələri doldurun.');
      return;
    }

    submitResponseMutation.mutate(currentResponse.id);
  };

  const calculateProgress = useCallback((): number => {
    if (!surveyData?.questions) return 0;
    const total = surveyData.questions.length;
    const answered = surveyData.questions.filter((question) => {
      const key = getQuestionKey(question);
      const response = responses[key];
      return !isEmptyValue(response) && !validateQuestion(question, response);
    }).length;
    return total > 0 ? Math.round((answered / total) * 100) : 0;
  }, [surveyData?.questions, responses, getQuestionKey, validateQuestion]);

  const getUnansweredRequiredQuestions = useCallback((): SurveyQuestion[] => {
    if (!surveyData?.questions) return [];
    return surveyData.questions.filter((question) => {
      if (!(question.required || question.is_required)) return false;
      const key = getQuestionKey(question);
      const response = responses[key];
      return isEmptyValue(response) || Boolean(validateQuestion(question, response));
    });
  }, [surveyData?.questions, responses, getQuestionKey, validateQuestion]);

  if (surveyLoading || responseLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Survey yüklənir...</p>
        </div>
      </div>
    );
  }

  if (surveyError) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Survey yüklənərkən xəta baş verdi: {surveyError.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!surveyData) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Survey tapılmadı
        </AlertDescription>
      </Alert>
    );
  }

  const survey: SurveyFormSchema = surveyData;
  const progress = calculateProgress();
  const unansweredRequired = getUnansweredRequiredQuestions();
  // Survey can be submitted when all required questions are answered (optional questions don't block submission)
  const isComplete = unansweredRequired.length === 0;
  const canSubmit = isComplete && currentResponse?.status === 'draft';

  const getStatusBadge = () => {
    if (!currentResponse) return null;

    switch (currentResponse.status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Qaralama</Badge>;
      case 'submitted':
        return <Badge variant="default"><Send className="w-3 h-3 mr-1" />Təqdim edilib</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-green-500 text-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Təsdiqlənib</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rədd edilib</Badge>;
      default:
        return null;
    }
  };

  return (
    <div data-testid="survey-form" className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Survey Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle data-testid="survey-title" className="text-2xl">{survey.title}</CardTitle>
              {survey.description && (
                <CardDescription className="text-base">
                  {survey.description}
                </CardDescription>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Tamamlanma müddəti: ~{survey.estimated_duration} dəqiqə</span>
                {survey.max_responses && (
                  <span>Cavab sayı: {survey.response_count}/{survey.max_responses}</span>
                )}
                {survey.expires_at && (
                  <span>Son tarix: {new Date(survey.expires_at).toLocaleDateString('az-AZ')}</span>
                )}
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
      </Card>

      {/* Progress */}
      {currentResponse?.status === 'draft' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Tamamlanma: {progress}%</span>
                <span>{Math.ceil(survey.questions.filter(q => responses[q.id?.toString() || '']).length)}/{survey.questions.length} sual</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {survey.questions?.map((question, index) => (
          <Card key={question.id || index}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                {question.title}
                {(question.required || question.is_required) && <span className="text-red-500">*</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SurveyQuestionRenderer
                question={question}
                value={responses[getQuestionKey(question)]}
                onChange={(value) => handleQuestionChange(question, value)}
                disabled={readonly || currentResponse?.status !== 'draft'}
                error={validationErrors[getQuestionKey(question)]}
                fileAttachments={attachments}
                onUploadAttachment={handleUploadAttachment}
                onRemoveAttachment={handleRemoveAttachment}
                attachmentUploads={attachmentUploading}
                getAttachmentDownloadUrl={resolveAttachmentDownloadUrl}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      {!readonly && currentResponse?.status === 'draft' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 space-y-1">
                {isComplete ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Survey tamamlandı və təqdim edilə bilər
                  </span>
                ) : (
                  <div className="space-y-1">
                    <span>Survey tamamlanmayıb, lakin saxlanıla bilər</span>
                    {unansweredRequired.length > 0 && (
                      <div className="text-xs text-red-600">
                        {unansweredRequired.length} məcburi sual cavabsızdır:
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {unansweredRequired.slice(0, 3).map((q, i) => (
                            <li key={i}>{q.title}</li>
                          ))}
                          {unansweredRequired.length > 3 && (
                            <li>və {unansweredRequired.length - 3} digər...</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Save Status */}
                <div className="flex items-center gap-2 text-xs">
                  {hasUnsavedChanges ? (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Saxlanmayan dəyişikliklər
                    </span>
                  ) : lastSaved ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Son saxlanma: {lastSaved.toLocaleTimeString('az-AZ')}
                    </span>
                  ) : null}
                  {saveResponseMutation.isPending && (
                    <span className="text-blue-600 flex items-center gap-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      Saxlanılır...
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  data-testid="survey-save-draft"
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={saveResponseMutation.isPending}
                >
                  {saveResponseMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Saxlanılır...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Saxla
                    </>
                  )}
                </Button>
                
                <Button
                  data-testid="survey-submit"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitResponseMutation.isPending}
                >
                  {submitResponseMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Təqdim edilir...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Təqdim et
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Messages */}
      {!readonly && currentResponse?.status === 'submitted' && (
        <Card>
          <CardContent className="pt-6">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Survey uğurla təqdim edildi və nəzərdən keçirilmə gözləyir.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {currentResponse?.status === 'approved' && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Survey təsdiqləndi. Təşəkkür edirik!
          </AlertDescription>
        </Alert>
      )}

      {currentResponse?.status === 'rejected' && (
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Survey rədd edildi: {currentResponse.rejection_reason || 'Dəyişiklik tələb olunur.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
