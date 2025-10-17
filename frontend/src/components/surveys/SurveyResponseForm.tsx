import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Save, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { surveyService, SurveyResponse, SurveyQuestion } from '@/services/surveys';
import { useToast } from '@/hooks/use-toast';

interface SurveyResponseFormProps {
  surveyId: number;
  responseId?: number;
  onComplete?: (response: SurveyResponse) => void;
  onSave?: (response: SurveyResponse) => void;
}

interface SurveyFormData {
  id: number;
  title: string;
  description?: string;
  survey_type: string;
  questions: SurveyQuestion[];
  is_anonymous: boolean;
  allow_multiple_responses: boolean;
  requires_login: boolean;
  response_count: number;
  max_responses?: number;
  remaining_responses?: number;
  expires_at?: string;
  estimated_duration: number;
}

export function SurveyResponseForm({ surveyId, responseId, onComplete, onSave }: SurveyResponseFormProps) {
  const { toast } = useToast();
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentResponse, setCurrentResponse] = useState<SurveyResponse | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
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
  const saveResponseMutation = useMutation({
    mutationFn: ({ responseId, responses, autoSubmit }: { responseId: number; responses: Record<string, any>; autoSubmit?: boolean }) =>
      surveyService.saveResponse(responseId, responses, autoSubmit),
    onSuccess: (data) => {
      setCurrentResponse(data.response);
      queryClient.invalidateQueries({ queryKey: ['survey-response', responseId] });
      
      if (data.response.status === 'submitted') {
        toast.success('Survey təqdim edildi');
        onComplete?.(data.response);
      } else {
        toast.success('Survey saxlanıldı');
        onSave?.(data.response);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Saxlanılan zaman xəta baş verdi');
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
      queryClient.invalidateQueries({ queryKey: ['survey-response', responseId] });
      toast.success('Survey yenidən redaktə üçün açıldı');
      setHasUnsavedChanges(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Yenidən açarkən xəta baş verdi');
    }
  });

  // Initialize responses from existing data
  useEffect(() => {
    if (existingResponse?.response) {
      setCurrentResponse(existingResponse.response);
      setResponses(existingResponse.response.responses || {});
      setHasUnsavedChanges(false); // Mark as saved when loading existing
    }
  }, [existingResponse]);

  // Auto-start response if no existing response and no responseId provided
  useEffect(() => {
    if (surveyData && !responseId && !currentResponse && !startResponseMutation.isPending) {
      startResponseMutation.mutate();
    }
  }, [surveyData, responseId, currentResponse]);
  
  // Load responses from started response (only for new responses without existing data)
  useEffect(() => {
    if (currentResponse && !responseId && Object.keys(responses).length === 0) {
      // This is from startResponse mutation - load its responses if not already loaded
      setResponses(currentResponse.responses || {});
      setHasUnsavedChanges(false);
    }
  }, [currentResponse, responseId, responses]);

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || !currentResponse || currentResponse.status !== 'draft') {
      return;
    }

    const autoSaveInterval = setInterval(() => {
      handleSave(false);
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges, currentResponse]);

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

  const handleInputChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = (autoSubmit: boolean = false) => {
    if (!currentResponse) return;
    
    saveResponseMutation.mutate({
      responseId: currentResponse.id,
      responses,
      autoSubmit
    });
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
  };

  const handleSubmit = () => {
    if (!currentResponse) return;
    submitResponseMutation.mutate(currentResponse.id);
  };

  const calculateProgress = (): number => {
    if (!surveyData?.questions) return 0;
    
    const totalQuestions = surveyData.questions.length;
    const answeredQuestions = surveyData.questions.filter(q => {
      const questionId = q.id?.toString() || '';
      const response = responses[questionId];
      
      // Check if question has a meaningful answer
      if (response === undefined || response === null || response === '') {
        return false;
      }
      
      // For multiple choice, check if array has items
      if (q.type === 'multiple_choice' && Array.isArray(response)) {
        return response.length > 0;
      }
      
      // For other types, check if value exists and is not empty
      if (typeof response === 'string') {
        return response.trim().length > 0;
      }
      
      return true;
    }).length;
    
    return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  };
  
  const getUnansweredRequiredQuestions = (): SurveyQuestion[] => {
    if (!surveyData?.questions) return [];
    
    return surveyData.questions.filter(q => {
      const isRequired = q.required || q.is_required;
      if (!isRequired) return false;
      
      const questionId = q.id?.toString() || '';
      const response = responses[questionId];
      
      // Check if required question is unanswered
      if (response === undefined || response === null || response === '') {
        return true;
      }
      
      // For multiple choice, check if array has items
      if (q.type === 'multiple_choice' && Array.isArray(response)) {
        return response.length === 0;
      }
      
      // For other types, check if value exists and is not empty
      if (typeof response === 'string') {
        return response.trim().length === 0;
      }
      
      return false;
    });
  };

  const renderQuestion = (question: SurveyQuestion) => {
    const questionId = question.id?.toString() || '';
    const value = responses[questionId];
    const isDisabled = currentResponse?.status !== 'draft';

    switch (question.type) {
      case 'text':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleInputChange(questionId, e.target.value)}
            placeholder="Cavabınızı yazın..."
            rows={3}
            className="w-full"
            disabled={isDisabled}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleInputChange(questionId, e.target.value)}
            placeholder="Rəqəm daxil edin..."
            className="w-full"
            disabled={isDisabled}
          />
        );

      case 'single_choice':
        return (
          <RadioGroup
            value={value || ''}
            onValueChange={(val) => handleInputChange(questionId, val)}
            className="space-y-2"
            disabled={isDisabled}
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${questionId}-${index}`} />
                <Label htmlFor={`${questionId}-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'multiple_choice': {
        const checkboxValue = value || [];
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${questionId}-${index}`}
                  checked={checkboxValue.includes(option)}
                  onCheckedChange={(checked) => {
                    const newValue = checked
                      ? [...checkboxValue, option]
                      : checkboxValue.filter((v: string) => v !== option);
                    handleInputChange(questionId, newValue);
                  }}
                  disabled={isDisabled}
                />
                <Label htmlFor={`${questionId}-${index}`}>{option}</Label>
              </div>
            ))}
          </div>
        );
      }

      case 'rating': {
        const ratings = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        return (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Pis</span>
              <span>Əla</span>
            </div>
            <RadioGroup
              value={value?.toString() || ''}
              onValueChange={(val) => handleInputChange(questionId, parseInt(val))}
              className="flex space-x-2 justify-between"
              disabled={isDisabled}
            >
              {ratings.map((rating) => (
                <div key={rating} className="flex flex-col items-center space-y-1">
                  <RadioGroupItem value={rating.toString()} id={`${questionId}-${rating}`} />
                  <Label htmlFor={`${questionId}-${rating}`} className="text-xs">
                    {rating}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      }

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleInputChange(questionId, e.target.value)}
            className="w-full"
            disabled={isDisabled}
          />
        );

      case 'file_upload':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleInputChange(questionId, {
                    name: file.name,
                    size: file.size,
                    type: file.type
                  });
                }
              }}
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              className="w-full"
              disabled={isDisabled}
            />
            {value && (
              <p className="text-sm text-gray-600">Seçilmiş fayl: {value.name}</p>
            )}
          </div>
        );

      case 'table_matrix':
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Cədvəl tipli suallar hələ dəstəklənmir</p>
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleInputChange(questionId, e.target.value)}
            placeholder="Cavabınızı yazın..."
            className="w-full"
            disabled={isDisabled}
          />
        );
    }
  };

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

  const survey: SurveyFormData = surveyData;
  const progress = calculateProgress();
  const unansweredRequired = getUnansweredRequiredQuestions();
  const isComplete = progress === 100 && unansweredRequired.length === 0;
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
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Survey Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{survey.title}</CardTitle>
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
              {renderQuestion(question)}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      {currentResponse?.status === 'draft' && (
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
      {currentResponse?.status === 'submitted' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Alert className="flex-1 mr-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Survey uğurla təqdim edildi və nəzərdən keçirilmə gözləyir.
                </AlertDescription>
              </Alert>
              
              <Button
                variant="outline"
                onClick={() => currentResponse && reopenDraftMutation.mutate(currentResponse.id)}
                disabled={reopenDraftMutation.isPending}
              >
                {reopenDraftMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Açılır...
                  </>
                ) : (
                  'Yenidən redaktə et'
                )}
              </Button>
            </div>
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
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Survey rədd edildi: {currentResponse.rejection_reason}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
