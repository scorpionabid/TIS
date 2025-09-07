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
      toast.success('Survey başladıldı');
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

  // Initialize responses from existing data
  useEffect(() => {
    if (existingResponse?.response) {
      setCurrentResponse(existingResponse.response);
      setResponses(existingResponse.response.responses || {});
    }
  }, [existingResponse]);

  // Auto-start response if no existing response
  useEffect(() => {
    if (surveyData && !responseId && !currentResponse && !startResponseMutation.isPending) {
      startResponseMutation.mutate();
    }
  }, [surveyData, responseId, currentResponse]);

  const handleInputChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSave = (autoSubmit: boolean = false) => {
    if (!currentResponse) return;
    
    saveResponseMutation.mutate({
      responseId: currentResponse.id,
      responses,
      autoSubmit
    });
  };

  const handleSubmit = () => {
    if (!currentResponse) return;
    submitResponseMutation.mutate(currentResponse.id);
  };

  const calculateProgress = (): number => {
    if (!surveyData?.questions) return 0;
    
    const totalQuestions = surveyData.questions.length;
    const answeredQuestions = surveyData.questions.filter(q => {
      const response = responses[q.id?.toString() || ''];
      return response !== undefined && response !== '' && response !== null;
    }).length;
    
    return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  };

  const renderQuestion = (question: SurveyQuestion) => {
    const questionId = question.id?.toString() || '';
    const value = responses[questionId];

    switch (question.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleInputChange(questionId, e.target.value)}
            placeholder="Cavabınızı yazın..."
            className="w-full"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleInputChange(questionId, e.target.value)}
            placeholder="Ətraflı cavabınızı yazın..."
            rows={4}
            className="w-full"
          />
        );

      case 'radio':
        return (
          <RadioGroup
            value={value || ''}
            onValueChange={(val) => handleInputChange(questionId, val)}
            className="space-y-2"
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${questionId}-${index}`} />
                <Label htmlFor={`${questionId}-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
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
                />
                <Label htmlFor={`${questionId}-${index}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={(val) => handleInputChange(questionId, val)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seçin..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'rating':
        const ratings = [1, 2, 3, 4, 5];
        return (
          <RadioGroup
            value={value?.toString() || ''}
            onValueChange={(val) => handleInputChange(questionId, parseInt(val))}
            className="flex space-x-4"
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
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleInputChange(questionId, e.target.value)}
            className="w-full"
          />
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleInputChange(questionId, e.target.value)}
            placeholder="Cavabınızı yazın..."
            className="w-full"
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
  const isComplete = progress === 100;
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
                {question.question}
                {question.required && <span className="text-red-500">*</span>}
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
              <div className="text-sm text-gray-600">
                {isComplete ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Survey tamamlandı və təqdim edilə bilər
                  </span>
                ) : (
                  <span>Survey tamamlanmayıb, lakin saxlanıla bilər</span>
                )}
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
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Survey uğurla təqdim edildi və nəzərdən keçirilmə gözləyir.
          </AlertDescription>
        </Alert>
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