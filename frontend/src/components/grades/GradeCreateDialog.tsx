import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Grade, gradeService, GradeCreateData, GradeUpdateData } from '@/services/grades';
import { gradeCustomLogic } from './configurations/gradeConfig';
import { logger } from '@/utils/logger';
import { 
  Loader2, AlertCircle, Users, MapPin, School, Lightbulb, Info, 
  CheckCircle2, ArrowRight, Sparkles, BookOpen, Calculator,
  TrendingUp, Target, Zap
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/constants/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface GradeCreateDialogProps {
  open: boolean;
  onClose: () => void;
  currentUser: User | null;
  editingGrade?: Grade | null;
  availableInstitutions: Array<{ id: number; name: string }>;
  availableAcademicYears: Array<{ id: number; name: string; is_active: boolean }>;
}

export const GradeCreateDialog: React.FC<GradeCreateDialogProps> = ({
  open,
  onClose,
  currentUser,
  editingGrade,
  availableInstitutions,
  availableAcademicYears,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = React.useState<GradeCreateData>({
    name: '',
    class_level: 1,
    academic_year_id: 0,
    institution_id: 0,
    specialty: '',
    student_count: 0,
  });

  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
  const [namingSuggestions, setNamingSuggestions] = React.useState<any>(null);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
  const [showNamingHelp, setShowNamingHelp] = React.useState(false);

  // Enhanced UX state
  const [creationMode, setCreationMode] = React.useState<'single' | 'bulk' | 'template'>('single');
  const [currentStep, setCurrentStep] = React.useState(1);
  const [previewData, setPreviewData] = React.useState<any>(null);
  const [bulkGrades, setBulkGrades] = React.useState<string[]>([]);
  const [selectedNamingSystem, setSelectedNamingSystem] = React.useState<'auto' | 'numeric' | 'letter'>('auto');

  // Check if user is school admin
  const isSchoolAdmin = currentUser?.role === USER_ROLES.SCHOOLADMIN;
  const userInstitution = currentUser?.institution;

  // Initialize form data when editing
  React.useEffect(() => {
    if (editingGrade && open) {
      setFormData({
        name: editingGrade.name,
        class_level: editingGrade.class_level,
        academic_year_id: editingGrade.academic_year_id,
        institution_id: editingGrade.institution_id,
        specialty: editingGrade.specialty || '',
        student_count: editingGrade.student_count,
      });
    } else if (open && !editingGrade) {
      // Reset form for new grade
      const activeYear = availableAcademicYears.find(year => year.is_active);
      
      // For school admin, use their institution automatically
      // For other roles, use first available institution
      const defaultInstitutionId = isSchoolAdmin && userInstitution?.id 
        ? userInstitution.id 
        : availableInstitutions[0]?.id || 0;
      
      setFormData({
        name: '',
        class_level: 1,
        academic_year_id: activeYear?.id || 0,
        institution_id: defaultInstitutionId,
        specialty: '',
        student_count: 0,
      });
    }
    setValidationErrors({});
  }, [editingGrade, open, availableAcademicYears, availableInstitutions, isSchoolAdmin, userInstitution]);

  // Fetch available rooms and teachers when institution is selected
  // Note: Temporarily disabled until backend endpoints are implemented
  const { data: availableRooms } = useQuery({
    queryKey: ['rooms', 'available', formData.institution_id, formData.academic_year_id],
    queryFn: () => gradeService.getAvailableRooms(
      formData.institution_id, 
      formData.academic_year_id, 
      editingGrade?.id
    ),
    enabled: false, // Disabled until backend endpoint exists
  });

  const { data: availableTeachers } = useQuery({
    queryKey: ['teachers', 'available', formData.institution_id],
    queryFn: () => gradeService.getAvailableTeachers(formData.institution_id, editingGrade?.id),
    enabled: false, // Disabled until backend endpoint exists
  });

  // Fetch smart naming suggestions when form data changes
  const fetchNamingSuggestions = React.useCallback(async () => {
    if (!formData.institution_id || !formData.class_level || !formData.academic_year_id || editingGrade) {
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await gradeService.getNamingSuggestions(
        formData.institution_id,
        formData.class_level,
        formData.academic_year_id
      );
      
      logger.debug('Naming suggestions response', {
        component: 'GradeCreateDialog',
        mode: response.data?.mode,
        primary_suggestion: response.data?.primary_suggestion
      });
      
      setNamingSuggestions(response.data);
      setShowNamingHelp(true);
    } catch (error) {
      logger.error('Failed to fetch naming suggestions', {
        component: 'GradeCreateDialog',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoadingSuggestions(false);
    }
  }, [formData.institution_id, formData.class_level, formData.academic_year_id, editingGrade]);

  // Auto-fetch suggestions when relevant form data changes
  React.useEffect(() => {
    if (open && !editingGrade) {
      const timer = setTimeout(() => {
        fetchNamingSuggestions();
      }, 500); // Debounce
      return () => clearTimeout(timer);
    }
  }, [open, fetchNamingSuggestions, editingGrade]);

  // Helper functions for enhanced UX
  const calculateProgress = () => {
    const steps = creationMode === 'bulk' ? 3 : 2;
    return (currentStep / steps) * 100;
  };

  const generatePreview = React.useCallback(() => {
    if (!formData.class_level || !formData.name) return null;
    
    const preview = {
      full_name: `${formData.class_level}-${formData.name}`,
      display_name: `${formData.class_level} sinif - ${formData.name}${formData.specialty ? ' - ' + formData.specialty : ''}`,
      system_type: /^\d+$/.test(formData.name) ? 'Rəqəm Sistemi' : 'Hərf Sistemi',
      capacity_info: formData.student_count ? `${formData.student_count} tələbə` : 'Tutum təyin edilməyib'
    };
    
    setPreviewData(preview);
    return preview;
  }, [formData]);

  const generateBulkGrades = (pattern: string, count: number) => {
    const grades = [];
    if (pattern === 'numeric') {
      for (let i = 1; i <= count; i++) {
        grades.push(i.toString());
      }
    } else {
      for (let i = 0; i < count && i < 26; i++) {
        grades.push(String.fromCharCode(65 + i));
      }
    }
    setBulkGrades(grades);
    return grades;
  };

  const resetForm = () => {
    setCurrentStep(1);
    setCreationMode('single');
    setPreviewData(null);
    setBulkGrades([]);
    setSelectedNamingSystem('auto');
    setShowNamingHelp(false);
    setValidationErrors({});
    setNamingSuggestions(null);
    setLoadingSuggestions(false);
  };

  // Update preview when form data changes
  React.useEffect(() => {
    if (creationMode === 'single') {
      generatePreview();
    }
  }, [formData, creationMode, generatePreview]);

  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: (data: GradeCreateData) => gradeService.createGrade(data),
    onSuccess: (response) => {
      logger.info('Grade created successfully', {
        component: 'GradeCreateDialog',
        action: 'createGrade',
        data: { gradeId: response.data?.id, gradeName: formData.name }
      });

      toast({
        title: 'Müvəffəqiyyət',
        description: 'Sinif uğurla yaradıldı',
      });

      // Invalidate all grade-related queries with more specific patterns
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === 'grades' || 
        (Array.isArray(query.queryKey) && query.queryKey.includes('grades'))
      });
      // Force refetch to ensure immediate UI update
      queryClient.refetchQueries({ queryKey: ['grades'] });
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      logger.error('Failed to create grade', {
        component: 'GradeCreateDialog',
        action: 'createGrade',
        error: error.message,
        data: { formData }
      });

      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Sinif yaradılarkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; updates: GradeUpdateData }) => 
      gradeService.updateGrade(data.id, data.updates),
    onSuccess: (response) => {
      logger.info('Grade updated successfully', {
        component: 'GradeCreateDialog',
        action: 'updateGrade',
        data: { gradeId: editingGrade?.id, gradeName: formData.name }
      });

      toast({
        title: 'Müvəffəqiyyət',
        description: 'Sinif məlumatları uğurla yeniləndi',
      });

      // Invalidate all grade-related queries with more specific patterns
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === 'grades' || 
        (Array.isArray(query.queryKey) && query.queryKey.includes('grades'))
      });
      // Force refetch to ensure immediate UI update
      queryClient.refetchQueries({ queryKey: ['grades'] });
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      logger.error('Failed to update grade', {
        component: 'GradeCreateDialog',
        action: 'updateGrade',
        error: error.message,
        data: { gradeId: editingGrade?.id, formData }
      });

      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Sinif yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const handleSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validation = gradeCustomLogic.validateCreateData(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    // Transform data
    const transformedData = gradeCustomLogic.transformCreateData(formData);

    if (editingGrade) {
      // Update existing grade
      const updateData: GradeUpdateData = {
        name: transformedData.name,
        specialty: transformedData.specialty,
        student_count: transformedData.student_count,
      };

      updateMutation.mutate({ id: editingGrade.id, updates: updateData });
    } else {
      // Create new grade
      createMutation.mutate(transformedData);
    }
  }, [formData, editingGrade, createMutation, updateMutation]);

  // Handle form field changes
  const handleFieldChange = React.useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [validationErrors]);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Handle dialog close
  const handleClose = () => {
    if (!editingGrade) {
      resetForm();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden">
        <DialogHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-blue-600" />
                {editingGrade ? 'Sinif Məlumatlarını Redaktə Et' : 'Ağıllı Sinif Yaradıcısı'}
              </DialogTitle>
              <DialogDescription className="mt-2">
                {editingGrade 
                  ? 'Mövcud sinifin məlumatlarını yeniləyin və dəyişiklikləri tətbiq edin.'
                  : 'Beynəlxalq standartlara uygun sinif yaradın. Sistem sizə ən uyğun adlandırma təkliflərini təqdim edəcək.'
                }
              </DialogDescription>
            </div>
            {!editingGrade && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">İrəliləyiş</div>
                <Progress value={calculateProgress()} className="w-24" />
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh]">
          {!editingGrade ? (
            <Tabs value={creationMode} onValueChange={(value) => setCreationMode(value as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="single" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Tək Sinif
                </TabsTrigger>
                <TabsTrigger value="bulk" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Kütləvi Yaratma
                </TabsTrigger>
                <TabsTrigger value="template" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Şablon
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-6">
                <form onSubmit={handleSubmit}>
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Zap className="h-5 w-5 text-yellow-500" />
                          Əsas Məlumatlar
                        </h3>
                        <Badge variant="secondary">1/2</Badge>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                          {/* Class Level Selection - Required for Smart Naming */}
                          <div className="space-y-2">
                            <Label htmlFor="class_level" className="text-sm font-medium">
                              Sinif Səviyyəsi <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={formData.class_level.toString()}
                              onValueChange={(value) => handleFieldChange('class_level', parseInt(value))}
                              disabled={isLoading}
                            >
                              <SelectTrigger className={validationErrors.class_level ? 'border-red-500' : ''}>
                                <SelectValue placeholder="Sinif səviyyəsini seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(level => (
                                  <SelectItem key={level} value={level.toString()}>
                                    {`${level}. sinif`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {validationErrors.class_level && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {validationErrors.class_level}
                              </p>
                            )}
                          </div>

                          {/* Smart Naming System */}
                          {namingSuggestions && (
                            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-900">
                                  <Lightbulb className="h-5 w-5 text-blue-600" />
                                  Ağıllı Adlandırma Sistemi
                                </CardTitle>
                                <CardDescription>
                                  {namingSuggestions.message}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                {namingSuggestions.mode === 'selection' && namingSuggestions.options && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(namingSuggestions.options).map(([key, option]: [string, any]) => (
                                      <Card 
                                        key={key}
                                        className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 
                                          ${selectedNamingSystem === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                                        onClick={() => {
                                          setSelectedNamingSystem(key as any);
                                          handleFieldChange('name', option.suggestions[0]);
                                        }}
                                      >
                                        <CardContent className="p-4">
                                          <div className="flex items-center gap-3 mb-2">
                                            {key === 'numeric' ? (
                                              <Calculator className="h-5 w-5 text-green-600" />
                                            ) : (
                                              <BookOpen className="h-5 w-5 text-purple-600" />
                                            )}
                                            <div>
                                              <div className="font-semibold text-sm">{option.label}</div>
                                              <div className="text-xs text-muted-foreground">{option.description}</div>
                                            </div>
                                          </div>
                                          <div className="mt-2">
                                            <Badge 
                                              variant={key === namingSuggestions.recommendation ? "default" : "outline"}
                                              className="text-xs"
                                            >
                                              Tövsiyə: {option.suggestions[0]}
                                              {key === namingSuggestions.recommendation && (
                                                <CheckCircle2 className="ml-1 h-3 w-3" />
                                              )}
                                            </Badge>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                )}

                                {namingSuggestions.mode === 'fixed' && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-3">
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      <span className="text-sm font-medium">Sistem təyin edilib: {namingSuggestions.info?.system_type}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <Badge 
                                        variant="default" 
                                        size="lg"
                                        className="cursor-pointer hover:bg-primary/80 px-4 py-2"
                                        onClick={() => handleFieldChange('name', namingSuggestions.primary_suggestion)}
                                      >
                                        <Sparkles className="mr-1 h-3 w-3" />
                                        {namingSuggestions.primary_suggestion} (Tövsiyə)
                                      </Badge>
                                      {namingSuggestions.suggestions?.slice(1, 5).map((suggestion: string) => (
                                        <Badge 
                                          key={suggestion}
                                          variant="outline"
                                          className="cursor-pointer hover:bg-muted px-3 py-2"
                                          onClick={() => handleFieldChange('name', suggestion)}
                                        >
                                          {suggestion}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          {loadingSuggestions && (
                            <Card className="border-dashed">
                              <CardContent className="flex items-center justify-center py-8">
                                <div className="text-center">
                                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                                  <p className="text-sm text-muted-foreground">Ağıllı tövsiyələr hazırlanır...</p>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Manual Selection */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="name" className="text-sm font-medium">
                                Sinif Adı <span className="text-red-500">*</span>
                              </Label>
                              <Select
                                value={formData.name || ""}
                                onValueChange={(value) => handleFieldChange('name', value)}
                                disabled={isLoading}
                              >
                                <SelectTrigger className={validationErrors.name ? 'border-red-500' : ''}>
                                  <SelectValue placeholder="Sinif adını seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i)).map(letter => (
                                    <SelectItem key={letter} value={letter}>{letter}</SelectItem>
                                  ))}
                                  {Array.from({length: 9}, (_, i) => (i + 1).toString()).map(number => (
                                    <SelectItem key={number} value={number}>{number}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {validationErrors.name && (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {validationErrors.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Preview Panel */}
                        <div className="lg:col-span-1">
                          <Card className="sticky top-4">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Info className="h-4 w-4 text-blue-600" />
                                Sinif Önizləmə
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {previewData ? (
                                <div className="space-y-3">
                                  <div className="p-3 bg-muted rounded-lg">
                                    <div className="font-semibold text-lg text-center">{previewData.full_name}</div>
                                    <div className="text-sm text-center text-muted-foreground">{previewData.display_name}</div>
                                  </div>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                      <span>Sistem:</span>
                                      <Badge variant="outline" className="text-xs">
                                        {previewData.system_type}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Tutum:</span>
                                      <span>{previewData.capacity_info}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                  <p className="text-xs text-muted-foreground">Məlumatları doldurun</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          type="button" 
                          onClick={() => setCurrentStep(2)}
                          disabled={!formData.name || !formData.class_level || !formData.institution_id || !formData.academic_year_id}
                          className="px-6"
                        >
                          Növbəti Addım
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Users className="h-5 w-5 text-green-500" />
                          Əlavə Təfərrüatlar
                        </h3>
                        <Badge variant="secondary">2/2</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Class Level */}
                        <div className="space-y-2">
                          <Label htmlFor="class_level">
                            Sinif Səviyyəsi <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={formData.class_level.toString()}
                            onValueChange={(value) => handleFieldChange('class_level', parseInt(value))}
                            disabled={isLoading || !!editingGrade}
                          >
                            <SelectTrigger className={validationErrors.class_level ? 'border-red-500' : ''}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(level => (
                                <SelectItem key={level} value={level.toString()}>
                                  {`${level}. sinif`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {validationErrors.class_level && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {validationErrors.class_level}
                            </p>
                          )}
                        </div>

                        {/* Student Count */}
                        <div className="space-y-2">
                          <Label htmlFor="student_count">Tələbə Sayı</Label>
                          <Input
                            id="student_count"
                            type="number"
                            min="0"
                            max="50"
                            value={formData.student_count}
                            onChange={(e) => handleFieldChange('student_count', parseInt(e.target.value) || 0)}
                            disabled={isLoading}
                            className={validationErrors.student_count ? 'border-red-500' : ''}
                          />
                          {validationErrors.student_count && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {validationErrors.student_count}
                            </p>
                          )}
                        </div>

                        {/* Institution */}
                        {!isSchoolAdmin ? (
                          <div className="space-y-2">
                            <Label htmlFor="institution_id">
                              Məktəb <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={formData.institution_id.toString()}
                              onValueChange={(value) => handleFieldChange('institution_id', parseInt(value))}
                              disabled={isLoading || !!editingGrade}
                            >
                              <SelectTrigger className={validationErrors.institution_id ? 'border-red-500' : ''}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableInstitutions.map(institution => (
                                  <SelectItem key={institution.id} value={institution.id.toString()}>
                                    {institution.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {validationErrors.institution_id && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {validationErrors.institution_id}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>Məktəb</Label>
                            <div className="flex items-center gap-2 p-3 border border-input rounded-md bg-muted/50">
                              <School className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{userInstitution?.name || 'Məktəb məlumatı yoxdur'}</span>
                              <Badge variant="outline" className="ml-auto">Avtomatik</Badge>
                            </div>
                          </div>
                        )}

                        {/* Academic Year */}
                        <div className="space-y-2">
                          <Label htmlFor="academic_year_id">
                            Təhsil İli <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={formData.academic_year_id.toString()}
                            onValueChange={(value) => handleFieldChange('academic_year_id', parseInt(value))}
                            disabled={isLoading || !!editingGrade}
                          >
                            <SelectTrigger className={validationErrors.academic_year_id ? 'border-red-500' : ''}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAcademicYears.map(year => {
                                const displayName = Array.isArray(year.name) ? year.name.join(' ') : year.name;
                                const fullText = `${displayName}${year.is_active ? ' (Aktiv)' : ''}`;
                                
                                return (
                                  <SelectItem key={year.id} value={year.id.toString()}>
                                    {fullText}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          {validationErrors.academic_year_id && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {validationErrors.academic_year_id}
                            </p>
                          )}
                        </div>

                        {/* Specialty */}
                        <div className="space-y-2">
                          <Label htmlFor="specialty">İxtisas</Label>
                          <Input
                            id="specialty"
                            value={formData.specialty}
                            onChange={(e) => handleFieldChange('specialty', e.target.value)}
                            placeholder="məs: Riyaziyyat, Humanitar"
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between mt-6">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setCurrentStep(1)}
                          className="px-6"
                        >
                          Geri
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={isLoading}
                          className="px-8"
                        >
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Sinif Yarat
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </TabsContent>

              {/* Bulk Creation Tab */}
              <TabsContent value="bulk" className="space-y-6">
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Kütləvi Sinif Yaratma</h3>
                  <p className="text-muted-foreground mb-4">Bir anda çoxlu sinif yaradın</p>
                  <Badge variant="secondary">Tezliklə</Badge>
                </div>
              </TabsContent>

              {/* Template Tab */}
              <TabsContent value="template" className="space-y-6">
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Şablon əsaslı Yaratma</h3>
                  <p className="text-muted-foreground mb-4">Hazır şablonlardan istifadə edin</p>
                  <Badge variant="secondary">Tezliklə</Badge>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                  <School className="h-5 w-5 text-blue-600" />
                  Sinif Məlumatlarını Yenilə
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Simple edit form for existing grades */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Sinif Adı <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.name || ""}
                      onValueChange={(value) => handleFieldChange('name', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className={validationErrors.name ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Sinif adını seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i)).map(letter => (
                          <SelectItem key={letter} value={letter}>{letter}</SelectItem>
                        ))}
                        {Array.from({length: 9}, (_, i) => (i + 1).toString()).map(number => (
                          <SelectItem key={number} value={number}>{number}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.name && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialty">İxtisas</Label>
                    <Input
                      id="specialty"
                      value={formData.specialty}
                      onChange={(e) => handleFieldChange('specialty', e.target.value)}
                      placeholder="məs: Riyaziyyat, Humanitar"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student_count">Tələbə Sayı</Label>
                    <Input
                      id="student_count"
                      type="number"
                      min="0"
                      max="50"
                      value={formData.student_count}
                      onChange={(e) => handleFieldChange('student_count', parseInt(e.target.value) || 0)}
                      disabled={isLoading}
                      className={validationErrors.student_count ? 'border-red-500' : ''}
                    />
                    {validationErrors.student_count && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.student_count}
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit Preview */}
                <div>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        Mövcud Sinif
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {editingGrade && (
                        <div className="space-y-3">
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="font-semibold text-lg text-center">{editingGrade.full_name}</div>
                            <div className="text-sm text-center text-muted-foreground">{editingGrade.display_name}</div>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span>Səviyyə:</span>
                              <Badge variant="outline" className="text-xs">
                                {editingGrade.class_level}. sinif
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Tələbə sayı:</span>
                              <span>{editingGrade.student_count}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Ləğv et
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Yenilə
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};