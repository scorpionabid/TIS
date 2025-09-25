import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Loader2, Plus, X, Target, Users, Building2, Clock, AlertTriangle, Edit, Layout } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Survey, CreateSurveyData, SurveyQuestionRestrictions, QuestionRestrictions, surveyService } from '@/services/surveys';
import { institutionService } from '@/services/institutions';
import { departmentService } from '@/services/departments';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/constants/roles';
import { SurveyTemplateGallery } from '@/components/surveys/SurveyTemplateGallery';

// Template type import (SurveyTemplateGallery-dən)
interface SurveyTemplate extends Survey {
  is_featured: boolean;
  usage_count: number;
  last_used_at: string | null;
  success_rate: number;
  average_completion_time: number;
  template_tags: string[];
  created_by_name: string;
  institution_name: string;
}

interface SurveyModalProps {
  open: boolean;
  onClose: () => void;
  survey?: Survey | null;
  onSave: (data: CreateSurveyData) => Promise<void>;
}

interface Question {
  id?: string;
  question: string;
  description?: string; // YENİ: Question description support
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

const questionTypes = [
  { value: 'text', label: 'Mətn sahəsi' },
  { value: 'number', label: 'Rəqəm sahəsi' },
  { value: 'date', label: 'Tarix seçimi' },
  { value: 'single_choice', label: 'Tək seçim' },
  { value: 'multiple_choice', label: 'Çox seçim' },
  { value: 'file_upload', label: 'Fayl yükləmə' },
  { value: 'rating', label: 'Qiymətləndirmə' },
  { value: 'table_matrix', label: 'Cədvəl/Matris' },
];

export function SurveyModal({ open, onClose, survey, onSave }: SurveyModalProps) {
  const { toast } = useToast();
  const { currentUser, hasPermission, hasRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isStepChanging, setIsStepChanging] = useState(false);

  // Template Gallery state
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  
  const [formData, setFormData] = useState<CreateSurveyData>({
    title: '',
    description: '',
    questions: [],
    is_anonymous: false,
    allow_multiple_responses: false,
    target_institutions: [],
    target_roles: [],
    start_date: new Date().toISOString().split('T')[0], // Default to today
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    question: '',
    type: 'text',
    required: false,
  });

  // YENİ: Question editing state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // YENİ: Question restrictions state
  const [questionRestrictions, setQuestionRestrictions] = useState<Record<string, any>>({});
  const [restrictionsLoading, setRestrictionsLoading] = useState(false);

  // Character limits
  const MAX_TITLE_LENGTH = 200;
  const MAX_DESCRIPTION_LENGTH = 1000;
  const MAX_QUESTION_LENGTH = 500;

  // Institution search and filtering
  const [institutionSearch, setInstitutionSearch] = useState('');

  const isEditMode = !!survey;

  // Load institutions for targeting - məktəb sorğuları üçün bütün müəssisələri yüklə
  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions-for-surveys'],
    queryFn: () => institutionService.getAll({
      per_page: 1000, // Bütün müəssisələri yüklə (1000 limit kifayətdir)
      include_trashed: false // Yalnız aktiv müəssisələr
    }),
    enabled: open,
  });

  const availableInstitutions = Array.isArray(institutionsResponse?.institutions) 
    ? institutionsResponse.institutions
    : Array.isArray(institutionsResponse?.data?.data) 
    ? institutionsResponse.data.data
    : Array.isArray(institutionsResponse?.data)
    ? institutionsResponse.data
    : [];

  // Filter institutions based on search
  const filteredInstitutions = availableInstitutions.filter((institution: any) => 
    institution.name.toLowerCase().includes(institutionSearch.toLowerCase())
  );

  // Helper functions for bulk selection
  const selectInstitutionsByLevel = (level: number) => {
    const levelIds = availableInstitutions
      .filter((inst: any) => inst.level === level)
      .map((inst: any) => inst.id);
    handleInputChange('target_institutions', levelIds);
  };

  const selectInstitutionsByType = (filterFn: (inst: any) => boolean) => {
    const typeIds = availableInstitutions
      .filter(filterFn)
      .map((inst: any) => inst.id);
    handleInputChange('target_institutions', typeIds);
  };

  // Check if survey is editable
  const isEditable = (survey: Survey | null) => {
    if (!survey) return true; // New surveys are always editable

    // Draft surveys can always be edited by creator or those with permissions
    if (survey.status === 'draft') return true;

    // Active surveys can be edited
    if (survey.status === 'active') return true;

    // YENİ: Published surveys - creator və ya surveys.write permissions olanlar edit edə bilər
    if (survey.status === 'published') {
      // Creator check - əgər survey yaradanıdırsa, edit edə bilər
      const isCreator = survey.creator?.id === currentUser?.id;
      console.log('🔍 Published survey isEditable check:', {
        surveyId: survey.id,
        creatorId: survey.creator?.id,
        currentUserId: currentUser?.id,
        isCreator
      });

      // SuperAdmin check - SuperAdmin hər şeyi edə bilər
      const isSuperAdmin = hasRole(USER_ROLES.SUPERADMIN);
      // Permission check - surveys.write permission varsa edit edə bilər
      const hasWritePermission = hasPermission('surveys.write');

      console.log('🔍 Permission checks:', {
        isCreator,
        isSuperAdmin,
        hasWritePermission,
        canEdit: isCreator || isSuperAdmin || hasWritePermission
      });

      return isCreator || isSuperAdmin || hasWritePermission;
    }

    // Completed, archived və digər statuslar üçün edit edilə bilməz
    return false;
  };

  // YENİ: Published survey-də responses varsa məhdudlaşdırılmış edit rejimi
  const isPublishedWithResponses = survey?.status === 'published' &&
                                   (survey?.response_count || 0) > 0 &&
                                   survey?.creator?.id === currentUser?.id;

  // YENİ: Get restrictions for specific question
  const getQuestionRestrictions = (questionId: string | undefined) => {
    if (!questionId) {
      return {
        approved_responses_count: 0,
        can_edit_text: true,
        can_edit_type: false, // Type always disabled for published surveys
        can_edit_required: true,
        can_add_options: true,
        can_remove_options: true,
      };
    }

    // Əgər bu published survey deyil, hər şeyə icazə ver
    if (survey?.status !== 'published') {
      return {
        approved_responses_count: 0,
        can_edit_text: true,
        can_edit_type: true,
        can_edit_required: true,
        can_add_options: true,
        can_remove_options: true,
      };
    }

    // Published survey üçün restrictions yüklənibsə, onu istifadə et
    if (questionRestrictions[questionId]) {
      return questionRestrictions[questionId];
    }

    // Əgər restrictions hələ yüklənməyibsə, default olaraq edit-ə icazə ver
    // (restrictions yükləndikdən sonra düzgün limitations tətbiq ediləcək)
    return {
      approved_responses_count: 0,
      can_edit_text: true,
      can_edit_type: false, // Type always disabled for published surveys
      can_edit_required: true,
      can_add_options: true,
      can_remove_options: true,
    };
  };

  // YENİ: Load question restrictions
  const loadQuestionRestrictions = async (surveyId: number) => {
    try {
      setRestrictionsLoading(true);
      const restrictionsData = await surveyService.getQuestionRestrictions(surveyId);
      setQuestionRestrictions(restrictionsData.question_restrictions || {});
      console.log('🔐 Question restrictions loaded:', restrictionsData);
    } catch (error) {
      console.error('Failed to load question restrictions:', error);
      toast({
        title: "Xəta",
        description: "Sual məhdudiyyətləri yüklənə bilmədi",
        variant: "destructive",
      });
    } finally {
      setRestrictionsLoading(false);
    }
  };

  useEffect(() => {
    if (survey) {
      // Debug: Log survey data in edit mode
      console.log('🔍 Survey loaded for editing:', {
        id: survey.id,
        title: survey.title,
        target_institutions: survey.target_institutions,
        questions_count: survey.questions?.length || 0
      });

      // Debug: Check complete survey structure including critical fields
      console.log('🔍 Complete survey data:', {
        id: survey.id,
        title: survey.title,
        status: survey.status,
        creator: survey.creator,
        institution: survey.institution,
        response_count: survey.response_count,
        questions_count: survey.questions_count,
        allFields: Object.keys(survey)
      });
      
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
      
      // Debug: Confirm formData is set
      console.log('🔍 FormData set with target_institutions:', newFormData.target_institutions);
      setFormData(newFormData);
      const mappedQuestions = (survey.questions || []).map(q => {
        console.log('🐛 Raw question data:', {
          id: q.id,
          options: q.options,
          optionsType: typeof q.options,
          isArray: Array.isArray(q.options)
        });
        
        return {
          id: q.id?.toString(),
          question: q.title || q.question, // Backend might return 'title' field
          description: q.description, // Question description support
          type: q.type,
          options: Array.isArray(q.options) ? q.options : [],
          required: q.required || q.is_required, // Handle both field names
          order: q.order_index || q.order, // Handle both field names
        };
      });
      
      // Debug: Questions mapping
      console.log('🔍 Questions mapping:', {
        original: survey.questions,
        mapped: mappedQuestions,
        count: mappedQuestions.length
      });
      
      setQuestions(mappedQuestions);
      // Also sync formData to include the mapped questions
      setFormData(prev => ({
        ...prev,
        questions: mappedQuestions,
      }));

      // YENİ: Load question restrictions for published surveys

      // Load restrictions for published surveys if user can edit them
      if (survey.status === 'published') {
        const isCreator = survey.creator?.id === currentUser?.id;
        const isSuperAdmin = hasRole(USER_ROLES.SUPERADMIN);
        const hasWritePermission = hasPermission('surveys.write');
        const canEdit = isCreator || isSuperAdmin || hasWritePermission;

        console.log('🔐 Question restrictions loading check:', {
          surveyId: survey.id,
          status: survey.status,
          isCreator,
          isSuperAdmin,
          hasWritePermission,
          canEdit
        });

        if (canEdit) {
          console.log('🔐 Loading question restrictions for published survey');
          loadQuestionRestrictions(survey.id);
        }
      }
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
    
    if (!formData.title.trim()) {
      toast({
        title: "Xəta",
        description: "Sorğu başlığı daxil edilməlidir",
        variant: "destructive",
      });
      setCurrentStep(1);
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Xəta",
        description: "Ən azı bir sual əlavə edilməlidir",
        variant: "destructive",
      });
      setCurrentStep(2);
      return;
    }

    if (!formData.target_institutions || formData.target_institutions.length === 0) {
      toast({
        title: "Xəta",
        description: "Ən azı bir hədəf müəssisə seçilməlidir",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const surveyData: CreateSurveyData = {
        ...formData,
        questions: questions.map(q => ({
          // Map frontend field names to backend field names
          id: q.id, // Include ID for existing questions (for backend validation)
          title: q.question, // Backend expects 'title', frontend uses 'question'
          question: q.question, // Keep both for compatibility
          description: q.description, // Question description
          type: q.type,
          options: q.options,
          required: q.required,
          order: q.order,
        })),
      };

      // Debug: Log survey data being sent
      console.log('🚀 Sending survey data:', {
        questions: surveyData.questions.map(q => ({question: q.question, type: q.type})),
        questionCount: surveyData.questions.length,
        target_institutions: surveyData.target_institutions,
        formData_target_institutions: formData.target_institutions,
        all_survey_data_keys: Object.keys(surveyData)
      });

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

    const updatedQuestions = [...questions, question];
    setQuestions(updatedQuestions);
    // Sync formData.questions
    setFormData(prev => ({ ...prev, questions: updatedQuestions }));
    setNewQuestion({
      question: '',
      type: 'text',
      required: false,
      options: [],
    });
  };

  const removeQuestion = (id: string) => {
    const updatedQuestions = questions.filter(q => q.id !== id);
    setQuestions(updatedQuestions);
    // Sync formData.questions
    setFormData(prev => ({ ...prev, questions: updatedQuestions }));
  };

  // YENİ: Question editing methods
  const startEditingQuestion = (question: Question) => {
    setEditingQuestionId(question.id!);
    setEditingQuestion({ ...question }); // Deep copy
  };

  const cancelEditingQuestion = () => {
    setEditingQuestionId(null);
    setEditingQuestion(null);
  };

  const saveEditingQuestion = async () => {
    if (!editingQuestion || !editingQuestionId || !survey?.id) return;

    try {
      setIsLoading(true);

      console.log('💾 Saving question edit:', {
        surveyId: survey.id,
        questionId: editingQuestionId,
        changes: editingQuestion,
        surveyStatus: survey.status
      });

      // API call to update the survey with the modified question
      const surveyData = {
        title: survey.title,
        description: survey.description || '',
        questions: questions.map(q => {
          const isEditedQuestion = q.id === editingQuestionId;
          const questionData = isEditedQuestion ? editingQuestion : q;

          return {
            id: q.id, // Include ID for existing questions
            title: questionData.question, // Backend expects 'title' for published surveys
            question: questionData.question, // Backend expects 'question' for regular surveys
            description: questionData.description,
            type: questionData.type,
            options: questionData.options,
            required: questionData.required,
            is_required: questionData.required, // Both field names for compatibility
            order: q.order || 0,
          };
        }),
        target_institutions: survey.target_institutions || [],
        target_roles: survey.target_roles || [],
        is_anonymous: survey.is_anonymous,
        allow_multiple_responses: survey.allow_multiple_responses,
        max_responses: survey.max_responses,
      };

      console.log('🚀 API call data:', surveyData);
      const result = await surveyService.update(survey.id, surveyData);
      console.log('✅ API response:', result);

      // Update local state only after successful API call
      const updatedQuestions = questions.map(q =>
        q.id === editingQuestionId ? editingQuestion : q
      );

      setQuestions(updatedQuestions);
      setFormData(prev => ({ ...prev, questions: updatedQuestions }));

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
  };

  const updateEditingQuestion = (field: keyof Question, value: any) => {
    if (!editingQuestion) return;

    setEditingQuestion(prev => ({
      ...prev!,
      [field]: value,
    }));
  };

  // YENİ: Safe option operations for published surveys
  const addOptionToEditingQuestion = () => {
    if (!editingQuestion) return;

    const newOptions = [...(editingQuestion.options || []), ''];
    updateEditingQuestion('options', newOptions);
  };

  const updateEditingQuestionOption = (index: number, value: string) => {
    if (!editingQuestion) return;

    const updatedOptions = [...(editingQuestion.options || [])];
    updatedOptions[index] = value;
    updateEditingQuestion('options', updatedOptions);
  };

  const removeEditingQuestionOption = (index: number) => {
    if (!editingQuestion) return;

    // YENİ: Use question-specific restrictions
    const restrictions = getQuestionRestrictions(editingQuestionId || '');

    if (!restrictions.can_remove_options) {
      toast({
        title: "Xəta",
        description: `Bu sualın ${restrictions.approved_responses_count} təsdiq edilmiş cavabı var. Mövcud seçimləri silmək olmaz, yalnız yeni əlavə edə bilərsiniz.`,
        variant: "destructive",
      });
      return;
    }

    const updatedOptions = editingQuestion.options?.filter((_, i) => i !== index) || [];
    updateEditingQuestion('options', updatedOptions);
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

  const needsOptions = ['single_choice', 'multiple_choice'].includes(newQuestion.type as string);
  const needsNumberValidation = newQuestion.type === 'number';
  const needsFileValidation = newQuestion.type === 'file_upload';

  // Step validation functions
  const validateStep1 = (): boolean => {
    if (!formData.title.trim()) {
      toast({
        title: "Xəta",
        description: "Sorğu başlığı daxil edilməlidir",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (questions.length === 0) {
      toast({
        title: "Xəta",
        description: "Ən azı bir sual əlavə edilməlidir",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // Template selection handler
  const handleTemplateSelect = (template: SurveyTemplate) => {
    try {
      console.log('🎨 Template selected:', template);

      // Form data-nı template ilə doldurmaq
      setFormData(prev => ({
        ...prev,
        title: template.title,
        description: template.description || '',
        is_anonymous: template.is_anonymous || false,
        allow_multiple_responses: template.allow_multiple_responses || false,
        start_date: template.start_date || new Date().toISOString().split('T')[0],
        end_date: template.end_date || undefined,
        max_responses: template.max_responses || undefined,
        target_institutions: template.target_institutions || [],
        target_roles: template.target_roles || [],
      }));

      // Template questions-ları kopyalamaq
      if (template.questions && Array.isArray(template.questions)) {
        const templateQuestions: Question[] = template.questions.map((q: any, index: number) => ({
          id: `template_${Date.now()}_${index}`,
          question: q.title || q.question || q.text || '',
          description: q.description || '',
          type: q.type || 'text',
          options: q.options || [],
          required: q.required || q.is_required || false,
          order: q.order || q.order_index || index,
          validation: q.validation_rules || {}
        }));
        setQuestions(templateQuestions);
      } else {
        setQuestions([]);
      }

      // Step 1-ə qayıtmaq (user-ə görmək üçün)
      setCurrentStep(1);

      // Template Gallery modal bağlamaq
      setShowTemplateGallery(false);

      // Success toast
      toast({
        title: "Template seçildi!",
        description: `"${template.title}" template-i əsasında sorğu hazırlanır.`,
      });

    } catch (error) {
      console.error('Error selecting template:', error);
      toast({
        title: "Xəta",
        description: "Template seçərkən xəta baş verdi. Yenidən cəhd edin.",
        variant: "destructive",
      });
    }
  };

  const handleNextStep = () => {
    console.log('🚀 handleNextStep called, currentStep:', currentStep);
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    
    console.log('🚀 Setting currentStep to:', currentStep + 1);
    setIsStepChanging(true);
    setCurrentStep(prev => prev + 1);
    
    // Reset the step changing flag after a brief moment
    setTimeout(() => {
      setIsStepChanging(false);
    }, 100);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {isEditMode ?
              (isEditable(survey) ?
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
              (isEditable(survey) ?
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

          {/* YENİ: Enhanced warning for published surveys */}
          {survey?.status === 'published' && isEditable(survey) && (
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
        {isEditMode && !isEditable(survey) && (
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
                <div className="flex justify-between">
                  <Label htmlFor="title">Sorğu başlığı *</Label>
                  <span className="text-xs text-muted-foreground">
                    {formData.title.length}/{MAX_TITLE_LENGTH}
                  </span>
                </div>
                <Input
                  id="title"
                  value={formData.title}
                  maxLength={MAX_TITLE_LENGTH}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Sorğunun başlığını daxil edin"
                  required
                  className={isPublishedWithResponses ? "bg-blue-50 border-blue-200" : ""}
                  disabled={!isEditable(survey)}
                />
                {formData.title.length > MAX_TITLE_LENGTH * 0.9 && (
                  <p className="text-xs text-amber-600">Başlıq uzunluq limitinə yaxındır</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="description">Təsvir</Label>
                  <span className="text-xs text-muted-foreground">
                    {(formData.description || '').length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="description"
                  value={formData.description}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Sorğunun təsvirini daxil edin..."
                  rows={4}
                  className={isPublishedWithResponses ? "bg-blue-50 border-blue-200" : ""}
                  disabled={!isEditable(survey)}
                />
                {(formData.description || '').length > MAX_DESCRIPTION_LENGTH * 0.9 && (
                  <p className="text-xs text-amber-600">Təsvir uzunluq limitinə yaxındır</p>
                )}
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

              {/* Template Selection - Only for new surveys */}
              {!isEditMode && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Layout className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">Sürətli Başlama</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Hazır template-lərdən birini seçərək sorğunu tez yaradın
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTemplateGallery(true)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 h-11 border-dashed hover:border-solid hover:bg-muted/50"
                  >
                    <Layout className="h-4 w-4" />
                    <span>Template Qaleriyasından Seç</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Questions */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Mövcud Suallar ({questions.length})</h3>
                  {restrictionsLoading && isPublishedWithResponses && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Məhdudiyyətlər yüklənir...
                    </div>
                  )}
                </div>

                {/* YENİ: Restrictions summary */}
                {!restrictionsLoading && Object.keys(questionRestrictions).length > 0 && isPublishedWithResponses && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-2">Məhdud Edit Rejimi</h4>
                        <div className="text-sm text-blue-800 space-y-1">
                          {(() => {
                            const totalQuestions = questions.length;
                            const restrictedQuestions = questions.filter(q =>
                              getQuestionRestrictions(q.id)?.approved_responses_count > 0
                            ).length;
                            const editableQuestions = totalQuestions - restrictedQuestions;

                            return (
                              <>
                                <p>• <strong>{editableQuestions}</strong> sual tam dəyişdirilə bilər</p>
                                <p>• <strong>{restrictedQuestions}</strong> sualın təsdiq edilmiş cavabları var və məhdudiyyətlidir</p>
                                <p>• Yeni suallar əlavə edilə bilər</p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className={`p-4 border rounded-lg space-y-3 ${
                      editingQuestionId === question.id ? 'border-blue-300 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <Badge variant="secondary">{questionTypes.find(t => t.value === question.type)?.label}</Badge>
                        {question.required && <Badge variant="destructive">Məcburi</Badge>}
                        {isPublishedWithResponses && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            {restrictionsLoading ? 'Yüklənir...' : 'Məhdud Edit'}
                          </Badge>
                        )}
                        {!restrictionsLoading && Object.keys(questionRestrictions).length > 0 && getQuestionRestrictions(question.id)?.approved_responses_count > 0 && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            {getQuestionRestrictions(question.id)?.approved_responses_count} Təsdiq
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editingQuestionId === question.id ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={saveEditingQuestion}
                              disabled={!editingQuestion?.question?.trim() || isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Saxlanır...
                                </>
                              ) : (
                                'Saxla'
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditingQuestion}
                            >
                              İmtina
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingQuestion(question)}
                              disabled={
                                !isEditable(survey) ||
                                (restrictionsLoading && isPublishedWithResponses)
                              }
                              title={
                                restrictionsLoading && isPublishedWithResponses
                                  ? 'Məhdudiyyətlər yüklənir...'
                                  : !isEditable(survey)
                                    ? 'Bu sorğunu redaktə etmək üçün icazəniz yoxdur'
                                    : isPublishedWithResponses
                                      ? 'Məhdud redaktə rejimi - sual mətnini və seçimlərini dəyişə bilərsiniz'
                                      : 'Suali redaktə et'
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQuestion(question.id!)}
                              disabled={
                                isPublishedWithResponses ||
                                (restrictionsLoading && survey?.status === 'published') ||
                                (!restrictionsLoading && getQuestionRestrictions(question.id)?.approved_responses_count > 0)
                              }
                              title={
                                restrictionsLoading && survey?.status === 'published'
                                  ? 'Məhdudiyyətlər yüklənir...'
                                  : getQuestionRestrictions(question.id)?.approved_responses_count > 0
                                    ? `Bu sualın ${getQuestionRestrictions(question.id)?.approved_responses_count} təsdiq edilmiş cavabı var - silmək olmaz`
                                    : isPublishedWithResponses
                                      ? 'Yayımlanmış sorğuda sualları silmək olmaz'
                                      : 'Suali sil'
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Question Content - Either Display or Edit Mode */}
                    {editingQuestionId === question.id && editingQuestion ? (
                      // EDIT MODE
                      <div className="space-y-4">
                        {/* Question Text Edit */}
                        <div className="space-y-2">
                          <Label>Sual mətni *</Label>
                          <Input
                            value={editingQuestion.question}
                            onChange={(e) => updateEditingQuestion('question', e.target.value)}
                            placeholder="Sual mətnini daxil edin"
                            maxLength={MAX_QUESTION_LENGTH}
                            className={getQuestionRestrictions(question.id)?.can_edit_text ? "bg-white" : "bg-gray-100"}
                            disabled={!getQuestionRestrictions(question.id)?.can_edit_text}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            {getQuestionRestrictions(question.id)?.can_edit_text ? (
                              <span className="text-green-600">✓ Bu sahə dəyişdirilə bilər</span>
                            ) : (
                              <span className="text-amber-600">⚠️ Təsdiq edilmiş cavablar var ({getQuestionRestrictions(question.id)?.approved_responses_count} cavab)</span>
                            )}
                            <span>{editingQuestion.question.length}/{MAX_QUESTION_LENGTH}</span>
                          </div>
                        </div>

                        {/* Question Description Edit */}
                        <div className="space-y-2">
                          <Label>Sual təsviri (İxtiyari)</Label>
                          <Textarea
                            value={editingQuestion.description || ''}
                            onChange={(e) => updateEditingQuestion('description', e.target.value)}
                            placeholder="Sualın təsvirini daxil edin (ixtiyari)"
                            rows={2}
                            maxLength={MAX_DESCRIPTION_LENGTH}
                            className="bg-white"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Bu sahə dəyişdirilə bilər</span>
                            <span>{(editingQuestion.description || '').length}/{MAX_DESCRIPTION_LENGTH}</span>
                          </div>
                        </div>

                        {/* Question Type - READONLY for published surveys */}
                        <div className="space-y-2">
                          <Label>Sual növü</Label>
                          <Select
                            value={editingQuestion.type}
                            onValueChange={(value) => updateEditingQuestion('type', value)}
                            disabled={isPublishedWithResponses}
                          >
                            <SelectTrigger className={isPublishedWithResponses ? "bg-gray-100" : "bg-white"}>
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
                          {isPublishedWithResponses && (
                            <p className="text-xs text-amber-600">⚠️ Yayımlanmış sorğuda sual növü dəyişdirilə bilməz</p>
                          )}
                        </div>

                        {/* Required Toggle */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`required-${question.id}`}
                            checked={editingQuestion.required}
                            onCheckedChange={(checked) => updateEditingQuestion('required', checked)}
                            disabled={!getQuestionRestrictions(question.id)?.can_edit_required}
                          />
                          <Label
                            htmlFor={`required-${question.id}`}
                            className={!getQuestionRestrictions(question.id)?.can_edit_required ? "text-gray-500" : ""}
                          >
                            Məcburi sual
                          </Label>
                          {!getQuestionRestrictions(question.id)?.can_edit_required && (
                            <span className="text-xs text-amber-600">
                              ⚠️ Təsdiq edilmiş cavablar var ({getQuestionRestrictions(question.id)?.approved_responses_count} cavab)
                            </span>
                          )}
                        </div>

                        {/* Options Editing for Choice Questions */}
                        {['single_choice', 'multiple_choice'].includes(editingQuestion.type) && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Seçimlər</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addOptionToEditingQuestion}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Yeni seçim
                              </Button>
                            </div>

                            {editingQuestion.options?.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs min-w-[24px] text-center">
                                  {optionIndex + 1}
                                </Badge>
                                <Input
                                  value={option}
                                  onChange={(e) => updateEditingQuestionOption(optionIndex, e.target.value)}
                                  placeholder={`Seçim ${optionIndex + 1}`}
                                  className="flex-1 bg-white"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeEditingQuestionOption(optionIndex)}
                                  disabled={!getQuestionRestrictions(question.id)?.can_remove_options}
                                  title={!getQuestionRestrictions(question.id)?.can_remove_options ? 'Təsdiq edilmiş cavablar var - seçimi silmək olmaz' : 'Seçimi sil'}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}

                            {!getQuestionRestrictions(question.id)?.can_remove_options && getQuestionRestrictions(question.id)?.approved_responses_count > 0 && (
                              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                                <p className="text-xs text-amber-700">
                                  <strong>Məhdud rejim:</strong> Bu sualın {getQuestionRestrictions(question.id)?.approved_responses_count} təsdiq edilmiş cavabı var.
                                  Yeni seçimlər əlavə edə bilərsiniz, lakin mövcud seçimləri silə bilməzsiniz.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      // DISPLAY MODE
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-lg">{question.question}</p>
                          {question.description && (
                            <p className="text-sm text-muted-foreground mt-1 italic">{question.description}</p>
                          )}
                        </div>
                        {question.options && question.options.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Seçimlər:</p>
                            <div className="grid grid-cols-1 gap-2">
                              {(() => {
                                const safeOptions = Array.isArray(question.options) ? question.options : [];
                                return safeOptions.map((option, i) => (
                                  <div key={i} className="flex items-center space-x-2 text-sm">
                                    <Badge variant="outline" className="text-xs min-w-[24px] text-center">
                                      {i + 1}
                                    </Badge>
                                    <span>{option}</span>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {questions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4" />
                    <p>Hələlik sual əlavə edilməyib</p>
                    {isEditMode && (
                      <p className="text-xs text-red-500 mt-2">
                        DEBUG: Edit mode - Questions count: {questions.length} | Survey ID: {survey?.id}
                      </p>
                    )}
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
                          checked={Boolean(newQuestion.required)}
                          onCheckedChange={(checked) => setNewQuestion(prev => ({ ...prev, required: Boolean(checked) }))}
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

                  {needsNumberValidation && (
                    <div className="space-y-2">
                      <Label>Rəqəm tənzimləmələri</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Minimum dəyər</Label>
                          <Input 
                            type="number" 
                            placeholder="0"
                            onChange={(e) => setNewQuestion(prev => ({
                              ...prev,
                              validation: { ...prev.validation, min_value: e.target.value ? Number(e.target.value) : undefined }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Maksimum dəyər</Label>
                          <Input 
                            type="number" 
                            placeholder="100"
                            onChange={(e) => setNewQuestion(prev => ({
                              ...prev,
                              validation: { ...prev.validation, max_value: e.target.value ? Number(e.target.value) : undefined }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {needsFileValidation && (
                    <div className="space-y-2">
                      <Label>Fayl yükləmə tənzimləmələri</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Maksimum fayl ölçüsü (MB)</Label>
                          <Input 
                            type="number" 
                            min="1" 
                            max="50" 
                            defaultValue="10"
                            onChange={(e) => setNewQuestion(prev => ({
                              ...prev,
                              validation: { ...prev.validation, max_file_size: e.target.value ? Number(e.target.value) * 1024 * 1024 : undefined }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">İcazəli formatlar</Label>
                          <Select onValueChange={(value) => {
                            const formats = value.split(',');
                            setNewQuestion(prev => ({
                              ...prev,
                              validation: { ...prev.validation, allowed_file_types: formats }
                            }));
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Format seçin..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pdf">PDF</SelectItem>
                              <SelectItem value="doc,docx">Word</SelectItem>
                              <SelectItem value="xls,xlsx">Excel</SelectItem>
                              <SelectItem value="jpg,png">Şəkil</SelectItem>
                              <SelectItem value="pdf,doc,docx,xls,xlsx">Sənədlər</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={addQuestion}
                    disabled={isPublishedWithResponses}
                    title={isPublishedWithResponses ? 'Yayımlanmış sorğuda yeni sual əlavə etmək olmaz' : 'Yeni sual əlavə et'}
                  >
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
                
                {/* Search Input */}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Müəssisə adı ilə axtar..."
                    value={institutionSearch}
                    onChange={(e) => setInstitutionSearch(e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                
                {/* Enhanced Bulk Selection Buttons */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Filtered institutions əsasında seç (axtarış nəticəsindəkilər)
                        const filteredIds = filteredInstitutions.map((inst: any) => inst.id);
                        handleInputChange('target_institutions', filteredIds);
                      }}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {institutionSearch
                        ? `Görünənləri seç (${filteredInstitutions.length})`
                        : `Hamısını seç (${availableInstitutions.length})`
                      }
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('target_institutions', [])}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Hamısını ləğv et
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectInstitutionsByLevel(2)}
                    >
                      <Building2 className="h-4 w-4 mr-1" />
                      Regional idarələr ({availableInstitutions.filter((inst: any) => inst.level === 2).length})
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectInstitutionsByLevel(3)}
                    >
                      <Target className="h-4 w-4 mr-1" />
                      Sektorlar ({availableInstitutions.filter((inst: any) => inst.level === 3).length})
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectInstitutionsByType((inst: any) => {
                        // Məktəb tipləri: secondary_school, vocational_school, və məktəb sözü olan bütün level 4 müəssisələr
                        const isSchoolType = ['secondary_school', 'vocational_school'].includes(inst.type);
                        const isSchoolByName = inst.level === 4 && inst.name?.toLowerCase().includes('məktəb');
                        return isSchoolType || isSchoolByName;
                      })}
                    >
                      <Building2 className="h-4 w-4 mr-1" />
                      Məktəblər ({availableInstitutions.filter((inst: any) => {
                        const isSchoolType = ['secondary_school', 'vocational_school'].includes(inst.type);
                        const isSchoolByName = inst.level === 4 && inst.name?.toLowerCase().includes('məktəb');
                        return isSchoolType || isSchoolByName;
                      }).length})
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectInstitutionsByType((inst: any) => 
                        inst.level === 4 && (inst.name.toLowerCase().includes('bağça') || inst.name.toLowerCase().includes('uşaq'))
                      )}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Məktəbəqədər
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  {filteredInstitutions.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2" />
                      <p>Axtarış nəticəsində müəssisə tapılmadı</p>
                    </div>
                  ) : (
                    filteredInstitutions.map((institution: any) => (
                      <div key={institution.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`institution-${institution.id}`}
                          checked={
                            // Sadə və etibarlı yoxlama - həm number həm string ID-ləri dəstəkləyir
                            (formData.target_institutions || []).some(id => String(id) === String(institution.id))
                          }
                          onCheckedChange={(checked) => {
                            const currentTargets = formData.target_institutions || [];
                            const institutionId = institution.id;

                            if (checked) {
                              // Əgər artıq seçilməyibsə əlavə et (duplicate yoxla)
                              if (!currentTargets.some(id => String(id) === String(institutionId))) {
                                handleInputChange('target_institutions', [...currentTargets, institutionId]);
                              }
                            } else {
                              // Seçimi ləğv et - bütün eyni ID-li elementləri sil
                              handleInputChange('target_institutions',
                                currentTargets.filter(id => String(id) !== String(institutionId))
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={`institution-${institution.id}`}
                          className="text-sm font-normal cursor-pointer flex items-center gap-2"
                        >
                          <span>{institution.name}</span>
                          {institution.level && (
                            <Badge variant="outline" className="text-xs">
                              Səviyyə {institution.level}
                            </Badge>
                          )}
                        </Label>
                      </div>
                    ))
                  )}
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
                  onClick={handleNextStep}
                  disabled={isLoading}
                >
                  Növbəti
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isLoading || (isEditMode && !isEditable(survey))}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 
                    (isEditable(survey) ? 'Yenilə' : 'Redaktə edilə bilməz') : 
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