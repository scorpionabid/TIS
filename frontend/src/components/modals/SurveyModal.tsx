import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Loader2, Plus, X, Target, Users, Building2, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Survey, CreateSurveyData, surveyService } from '@/services/surveys';
import { institutionService } from '@/services/institutions';
import { departmentService } from '@/services/departments';
import { useToast } from '@/hooks/use-toast';

interface SurveyModalProps {
  open: boolean;
  onClose: () => void;
  survey?: Survey | null;
  onSave: (data: CreateSurveyData) => Promise<void>;
}

interface Question {
  id?: string;
  question: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'rating' | 'date';
  options?: string[];
  required: boolean;
  order: number;
}

const questionTypes = [
  { value: 'text', label: 'Qısa mətn' },
  { value: 'textarea', label: 'Uzun mətn' },
  { value: 'radio', label: 'Tək seçim' },
  { value: 'checkbox', label: 'Çox seçim' },
  { value: 'select', label: 'Dropdown seçim' },
  { value: 'rating', label: 'Qiymətləndirmə' },
  { value: 'date', label: 'Tarix' },
];

export function SurveyModal({ open, onClose, survey, onSave }: SurveyModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<CreateSurveyData>({
    title: '',
    description: '',
    questions: [],
    is_anonymous: false,
    allow_multiple_responses: false,
    target_institutions: [],
    target_roles: [],
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    question: '',
    type: 'text',
    required: false,
  });

  const isEditMode = !!survey;

  // Load institutions for targeting
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions-for-surveys'],
    queryFn: () => institutionService.getAll(),
    enabled: open,
  });

  const availableInstitutions = Array.isArray(institutionsResponse?.institutions) 
    ? institutionsResponse.institutions
    : Array.isArray(institutionsResponse?.data?.data) 
    ? institutionsResponse.data.data
    : Array.isArray(institutionsResponse?.data)
    ? institutionsResponse.data
    : [];

  useEffect(() => {
    if (survey) {
      setFormData({
        title: survey.title,
        description: survey.description || '',
        questions: survey.questions,
        start_date: survey.start_date,
        end_date: survey.end_date,
        target_institutions: survey.target_institutions || [],
        target_roles: survey.target_roles || [],
        is_anonymous: survey.is_anonymous,
        allow_multiple_responses: survey.allow_multiple_responses,
        max_responses: survey.max_responses,
      });
      setQuestions(survey.questions.map(q => ({
        id: q.id?.toString(),
        question: q.question,
        type: q.type,
        options: q.options || [],
        required: q.required,
        order: q.order,
      })));
    } else {
      setFormData({
        title: '',
        description: '',
        questions: [],
        is_anonymous: false,
        allow_multiple_responses: false,
        target_institutions: [],
        target_roles: [],
      });
      setQuestions([]);
    }
    setCurrentStep(1);
  }, [survey, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Xəta",
        description: "Sorğu başlığı daxil edilməlidir",
        variant: "destructive",
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Xəta",
        description: "Ən azı bir sual əlavə edilməlidir",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const surveyData: CreateSurveyData = {
        ...formData,
        questions: questions.map(q => ({
          question: q.question,
          type: q.type,
          options: q.options,
          required: q.required,
          order: q.order,
        })),
      };

      await onSave(surveyData);
      toast({
        title: "Uğurlu",
        description: isEditMode ? "Sorğu məlumatları yeniləndi" : "Yeni sorğu yaradıldı",
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
  };

  const handleInputChange = (field: keyof CreateSurveyData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addQuestion = () => {
    if (!newQuestion.question?.trim()) {
      toast({
        title: "Xəta",
        description: "Sual mətni daxil edilməlidir",
        variant: "destructive",
      });
      return;
    }

    const question: Question = {
      id: Date.now().toString(),
      question: newQuestion.question!,
      type: newQuestion.type as any || 'text',
      options: newQuestion.options || [],
      required: newQuestion.required || false,
      order: questions.length + 1,
    };

    setQuestions(prev => [...prev, question]);
    setNewQuestion({
      question: '',
      type: 'text',
      required: false,
      options: [],
    });
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

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

  const needsOptions = ['radio', 'checkbox', 'select'].includes(newQuestion.type as string);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {isEditMode ? `${survey?.title} sorğusunu redaktə et` : 'Yeni sorğu yarat'}
          </DialogTitle>
        </DialogHeader>

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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Sorğu başlığı *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Sorğunun başlığını daxil edin"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Təsvir</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Sorğunun təsvirini daxil edin..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Başlama tarixi</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date?.split('T')[0] || ''}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Bitmə tarixi</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date?.split('T')[0] || ''}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    min={formData.start_date?.split('T')[0] || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_anonymous"
                    checked={formData.is_anonymous}
                    onCheckedChange={(checked) => handleInputChange('is_anonymous', checked)}
                  />
                  <Label htmlFor="is_anonymous" className="text-sm font-normal cursor-pointer">
                    Anonim sorğu (cavab verənlərin kimliyi məxfi qalacaq)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allow_multiple_responses"
                    checked={formData.allow_multiple_responses}
                    onCheckedChange={(checked) => handleInputChange('allow_multiple_responses', checked)}
                  />
                  <Label htmlFor="allow_multiple_responses" className="text-sm font-normal cursor-pointer">
                    Çoxsaylı cavablar (eyni istifadəçi bir neçə dəfə cavab verə bilər)
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Questions */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Mövcud Suallar ({questions.length})</h3>
                
                {questions.map((question, index) => (
                  <div key={question.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <Badge variant="secondary">{questionTypes.find(t => t.value === question.type)?.label}</Badge>
                          {question.required && <Badge variant="destructive">Məcburi</Badge>}
                        </div>
                        <p className="font-medium">{question.question}</p>
                        {question.options && question.options.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">Seçimlər:</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {question.options.map((option, i) => (
                                <li key={i}>{option}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(question.id!)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {questions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4" />
                    <p>Hələlik sual əlavə edilməyib</p>
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Yeni sual əlavə et</h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sual mətni *</Label>
                    <Textarea
                      value={newQuestion.question || ''}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="Sualınızı daxil edin..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sual növü</Label>
                      <Select
                        value={newQuestion.type || 'text'}
                        onValueChange={(value) => setNewQuestion(prev => ({ ...prev, type: value as any, options: [] }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {questionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="required"
                          checked={newQuestion.required || false}
                          onCheckedChange={(checked) => setNewQuestion(prev => ({ ...prev, required: !!checked }))}
                        />
                        <Label htmlFor="required" className="text-sm font-normal cursor-pointer">
                          Məcburi sual
                        </Label>
                      </div>
                    </div>
                  </div>

                  {needsOptions && (
                    <div className="space-y-2">
                      <Label>Seçim variantları</Label>
                      <div className="space-y-2">
                        {(newQuestion.options || []).map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateOption(index, e.target.value)}
                              placeholder={`Seçim ${index + 1}`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOption(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addOption}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Seçim əlavə et
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button type="button" onClick={addQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Sualı əlavə et
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Targeting & Settings */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Hədəf müəssisələr</Label>
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  {availableInstitutions.map((institution: any) => (
                    <div key={institution.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`institution-${institution.id}`}
                        checked={(formData.target_institutions || []).includes(institution.id)}
                        onCheckedChange={(checked) => {
                          const currentTargets = formData.target_institutions || [];
                          if (checked) {
                            handleInputChange('target_institutions', [...currentTargets, institution.id]);
                          } else {
                            handleInputChange('target_institutions', currentTargets.filter(id => id !== institution.id));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`institution-${institution.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {institution.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {(formData.target_institutions || []).length} müəssisə seçilib
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_responses">Maksimal cavab sayı (isteğe bağlı)</Label>
                <Input
                  id="max_responses"
                  type="number"
                  min="1"
                  value={formData.max_responses || ''}
                  onChange={(e) => handleInputChange('max_responses', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Məhdudiyyət qoyulmur"
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={isLoading}
                >
                  Geri
                </Button>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Ləğv et
              </Button>
              
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={isLoading}
                >
                  Növbəti
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Yenilə' : 'Yarat'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}