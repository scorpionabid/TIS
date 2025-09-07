import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  X, 
  Loader2,
  School,
  Globe,
  AlertCircle,
  CheckCircle,
  Calendar,
  FileText,
  Target,
  Award
} from 'lucide-react';
import { assessmentService, CreateKSQData, CreateBSQData } from '@/services/assessments';
import { academicYearService } from '@/services/academicYears';
import { institutionService } from '@/services/institutions';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface AssessmentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssessmentCreated?: () => void;
}

interface KSQFormData extends Omit<CreateKSQData, 'criteria_scores' | 'strengths' | 'improvement_areas' | 'recommendations'> {
  criteria_scores: Array<{ name: string; score: number }>;
  strengths: string[];
  improvement_areas: string[];
  recommendations: string[];
}

interface BSQFormData extends Omit<CreateBSQData, 'competency_areas' | 'improvement_plan' | 'action_items'> {
  competency_areas: Array<{ name: string; score: number }>;
  improvement_plan: string[];
  action_items: string[];
}

export const AssessmentCreateModal: React.FC<AssessmentCreateModalProps> = ({
  isOpen,
  onClose,
  onAssessmentCreated
}) => {
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState<'ksq' | 'bsq'>('ksq');
  const [criteriaList, setCriteriaList] = useState<Array<{ name: string; score: number }>>([
    { name: '', score: 0 }
  ]);
  const [strengthsList, setStrengthsList] = useState<string[]>(['']);
  const [improvementsList, setImprovementsList] = useState<string[]>(['']);
  const [recommendationsList, setRecommendationsList] = useState<string[]>(['']);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load academic years and institutions
  const { data: academicYears, isLoading: loadingAcademicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => academicYearService.getAllForDropdown(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const { data: institutions, isLoading: loadingInstitutions } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionService.getAll({ per_page: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Get default academic year (active one)
  const activeAcademicYear = academicYears?.find(year => year.is_active) || academicYears?.[0];
  const defaultInstitution = institutions?.data?.data?.[0]; // Use first institution or current user's institution

  const { register: registerKSQ, handleSubmit: handleSubmitKSQ, setValue: setValueKSQ, watch: watchKSQ, reset: resetKSQ, formState: { errors: errorsKSQ } } = useForm<KSQFormData>({
    defaultValues: {
      institution_id: defaultInstitution?.id || 2,
      academic_year_id: activeAcademicYear?.id || 2,
      assessment_date: new Date().toISOString().split('T')[0],
      assessment_type: '',
      total_score: 0,
      max_possible_score: 100,
      grade_level: '',
      subject_id: undefined,
      criteria_scores: [{ name: '', score: 0 }],
      strengths: [''],
      improvement_areas: [''],
      recommendations: [''],
      notes: '',
      follow_up_required: false,
      follow_up_date: '',
      previous_assessment_id: undefined
    }
  });

  const { register: registerBSQ, handleSubmit: handleSubmitBSQ, setValue: setValueBSQ, watch: watchBSQ, reset: resetBSQ, formState: { errors: errorsBSQ } } = useForm<BSQFormData>({
    defaultValues: {
      institution_id: defaultInstitution?.id || 2,
      academic_year_id: activeAcademicYear?.id || 2,
      assessment_date: new Date().toISOString().split('T')[0],
      international_standard: '',
      assessment_body: '',
      total_score: 0,
      max_possible_score: 100,
      international_ranking: undefined,
      national_ranking: undefined,
      regional_ranking: undefined,
      competency_areas: [{ name: '', score: 0 }],
      certification_level: '',
      certification_valid_until: '',
      improvement_plan: [''],
      action_items: [''],
      external_report_url: '',
      compliance_score: undefined,
      accreditation_status: 'not_applicable'
    }
  });

  const addCriteria = () => {
    setCriteriaList(prev => [...prev, { name: '', score: 0 }]);
  };

  const removeCriteria = (index: number) => {
    if (criteriaList.length > 1) {
      setCriteriaList(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateCriteria = (index: number, field: 'name' | 'score', value: string | number) => {
    setCriteriaList(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addListItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList(prev => [...prev, '']);
  };

  const removeListItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    if (list.length > 1) {
      setList(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateListItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setList(prev => prev.map((item, i) => i === index ? value : item));
  };

  const onSubmitKSQ = async (data: KSQFormData) => {
    try {
      setCreating(true);

      // Convert form data to API format
      const criteriaScores: Record<string, number> = {};
      criteriaList.forEach(criteria => {
        if (criteria.name.trim()) {
          criteriaScores[criteria.name] = criteria.score;
        }
      });

      const createData: CreateKSQData = {
        ...data,
        criteria_scores: criteriaScores,
        strengths: strengthsList.filter(s => s.trim()),
        improvement_areas: improvementsList.filter(s => s.trim()),
        recommendations: recommendationsList.filter(s => s.trim())
      };

      const result = await assessmentService.createKSQ(createData);

      toast({
        title: 'Uğurlu',
        description: 'KSQ qiymətləndirməsi uğurla yaradıldı',
      });

      queryClient.invalidateQueries({ queryKey: ['assessments'] });

      resetKSQ();
      resetForm();
      onAssessmentCreated?.();
      onClose();

    } catch (error: any) {
      console.error('KSQ create error:', error);
      toast({
        title: 'Yaratma Xətası',
        description: error.message || 'KSQ qiymətləndirməsi yaradıla bilmədi.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const onSubmitBSQ = async (data: BSQFormData) => {
    try {
      setCreating(true);

      // Convert form data to API format
      const competencyAreas: Record<string, number> = {};
      criteriaList.forEach(criteria => {
        if (criteria.name.trim()) {
          competencyAreas[criteria.name] = criteria.score;
        }
      });

      const createData: CreateBSQData = {
        ...data,
        competency_areas: competencyAreas,
        improvement_plan: strengthsList.filter(s => s.trim()),
        action_items: improvementsList.filter(s => s.trim())
      };

      const result = await assessmentService.createBSQ(createData);

      toast({
        title: 'Uğurlu',
        description: 'BSQ qiymətləndirməsi uğurla yaradıldı',
      });

      queryClient.invalidateQueries({ queryKey: ['assessments'] });

      resetBSQ();
      resetForm();
      onAssessmentCreated?.();
      onClose();

    } catch (error: any) {
      console.error('BSQ create error:', error);
      toast({
        title: 'Yaratma Xətası',
        description: error.message || 'BSQ qiymətləndirməsi yaradıla bilmədi.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setCriteriaList([{ name: '', score: 0 }]);
    setStrengthsList(['']);
    setImprovementsList(['']);
    setRecommendationsList(['']);
  };

  const handleClose = () => {
    if (creating) {
      if (confirm('Qiymətləndirmə yaradılır. İptal etmək istədiyinizdən əminsiniz?')) {
        setCreating(false);
        onClose();
      }
    } else {
      resetKSQ();
      resetBSQ();
      resetForm();
      onClose();
    }
  };

  const calculatePercentage = (totalScore: number, maxScore: number) => {
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Yeni Qiymətləndirmə Yaradın</span>
          </DialogTitle>
          <DialogDescription>
            Təhsil müəssisəsi üçün keyfiyyət və ya beynəlxalq standartlar qiymətləndirməsi əlavə edin
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as 'ksq' | 'bsq')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ksq" className="flex items-center space-x-2">
              <School className="h-4 w-4" />
              <span>KSQ Qiymətləndirməsi</span>
            </TabsTrigger>
            <TabsTrigger value="bsq" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>BSQ Qiymətləndirməsi</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ksq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <School className="h-5 w-5" />
                  <span>Keyfiyyət Standartları Qiymətləndirməsi (KSQ)</span>
                </CardTitle>
                <CardDescription>
                  Daxili keyfiyyət standartları üzrə müəssisəni qiymətləndirin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitKSQ(onSubmitKSQ)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="institution_id">Müəssisə *</Label>
                      <Select 
                        onValueChange={(value) => setValueKSQ('institution_id', parseInt(value))}
                        disabled={creating || loadingInstitutions}
                        defaultValue={String(defaultInstitution?.id || 2)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Müəssisə seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {institutions?.data?.data?.map((institution) => (
                            <SelectItem key={institution.id} value={String(institution.id)}>
                              {institution.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="academic_year_id">Tədris ili *</Label>
                      <Select 
                        onValueChange={(value) => setValueKSQ('academic_year_id', parseInt(value))}
                        disabled={creating || loadingAcademicYears}
                        defaultValue={String(activeAcademicYear?.id || 2)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tədris ili seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYears?.map((year) => (
                            <SelectItem key={year.id} value={String(year.id)}>
                              {year.name} {year.is_active && '(Cari)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assessment_date">Qiymətləndirmə Tarixi *</Label>
                      <Input
                        id="assessment_date"
                        type="date"
                        {...registerKSQ('assessment_date', { required: 'Tarix tələb olunur' })}
                        disabled={creating}
                      />
                      {errorsKSQ.assessment_date && (
                        <p className="text-sm text-destructive">{errorsKSQ.assessment_date.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assessment_type">Qiymətləndirmə Növü *</Label>
                      <Input
                        id="assessment_type"
                        {...registerKSQ('assessment_type', { required: 'Qiymətləndirmə növü tələb olunur' })}
                        placeholder="məs: İllik keyfiyyət qiymətləndirməsi"
                        disabled={creating}
                      />
                      {errorsKSQ.assessment_type && (
                        <p className="text-sm text-destructive">{errorsKSQ.assessment_type.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="total_score">Ümumi Bal *</Label>
                      <Input
                        id="total_score"
                        type="number"
                        min="0"
                        step="0.1"
                        {...registerKSQ('total_score', { 
                          required: 'Ümumi bal tələb olunur',
                          min: { value: 0, message: 'Bal mənfi ola bilməz' }
                        })}
                        disabled={creating}
                      />
                      {errorsKSQ.total_score && (
                        <p className="text-sm text-destructive">{errorsKSQ.total_score.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_possible_score">Maksimum Bal *</Label>
                      <Input
                        id="max_possible_score"
                        type="number"
                        min="1"
                        step="0.1"
                        {...registerKSQ('max_possible_score', { 
                          required: 'Maksimum bal tələb olunur',
                          min: { value: 1, message: 'Maksimum bal ən azı 1 olmalıdır' }
                        })}
                        disabled={creating}
                      />
                      {errorsKSQ.max_possible_score && (
                        <p className="text-sm text-destructive">{errorsKSQ.max_possible_score.message}</p>
                      )}
                      {watchKSQ('total_score') && watchKSQ('max_possible_score') && (
                        <p className="text-sm text-muted-foreground">
                          Faiz: {calculatePercentage(watchKSQ('total_score'), watchKSQ('max_possible_score'))}%
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="grade_level">Sinif/Səviyyə</Label>
                      <Input
                        id="grade_level"
                        {...registerKSQ('grade_level')}
                        placeholder="məs: 1-11 siniflər"
                        disabled={creating}
                      />
                    </div>
                  </div>

                  {/* Criteria Scores */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Meyar Balları</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addCriteria} disabled={creating}>
                        <Plus className="h-4 w-4 mr-2" />
                        Meyar Əlavə Et
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {criteriaList.map((criteria, index) => (
                        <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                          <div className="flex-1">
                            <Input
                              placeholder="Meyar adı"
                              value={criteria.name}
                              onChange={(e) => updateCriteria(index, 'name', e.target.value)}
                              disabled={creating}
                            />
                          </div>
                          <div className="w-32">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Bal"
                              value={criteria.score}
                              onChange={(e) => updateCriteria(index, 'score', parseFloat(e.target.value) || 0)}
                              disabled={creating}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCriteria(index)}
                            disabled={creating || criteriaList.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Güclü Tərəflər</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => addListItem(strengthsList, setStrengthsList)} disabled={creating}>
                        <Plus className="h-4 w-4 mr-2" />
                        Əlavə Et
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {strengthsList.map((strength, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder="Güclü tərəf"
                            value={strength}
                            onChange={(e) => updateListItem(strengthsList, setStrengthsList, index, e.target.value)}
                            disabled={creating}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeListItem(strengthsList, setStrengthsList, index)}
                            disabled={creating || strengthsList.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Improvement Areas */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Təkmilləşdirmə Sahələri</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => addListItem(improvementsList, setImprovementsList)} disabled={creating}>
                        <Plus className="h-4 w-4 mr-2" />
                        Əlavə Et
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {improvementsList.map((improvement, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder="Təkmilləşdirmə sahəsi"
                            value={improvement}
                            onChange={(e) => updateListItem(improvementsList, setImprovementsList, index, e.target.value)}
                            disabled={creating}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeListItem(improvementsList, setImprovementsList, index)}
                            disabled={creating || improvementsList.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Tövsiyələr</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => addListItem(recommendationsList, setRecommendationsList)} disabled={creating}>
                        <Plus className="h-4 w-4 mr-2" />
                        Əlavə Et
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {recommendationsList.map((recommendation, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder="Tövsiyə"
                            value={recommendation}
                            onChange={(e) => updateListItem(recommendationsList, setRecommendationsList, index, e.target.value)}
                            disabled={creating}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeListItem(recommendationsList, setRecommendationsList, index)}
                            disabled={creating || recommendationsList.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes and Follow-up */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Qeydlər</Label>
                      <Textarea
                        id="notes"
                        {...registerKSQ('notes')}
                        placeholder="Əlavə qeydlər və müşahidələr..."
                        rows={3}
                        disabled={creating}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="follow_up_required"
                          checked={watchKSQ('follow_up_required')}
                          onCheckedChange={(checked) => setValueKSQ('follow_up_required', checked)}
                          disabled={creating}
                        />
                        <Label htmlFor="follow_up_required" className="text-sm">
                          İzləmə tələb olunur
                        </Label>
                      </div>

                      {watchKSQ('follow_up_required') && (
                        <div className="space-y-2">
                          <Label htmlFor="follow_up_date">İzləmə Tarixi</Label>
                          <Input
                            id="follow_up_date"
                            type="date"
                            {...registerKSQ('follow_up_date')}
                            disabled={creating}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={creating}
                    >
                      Ləğv et
                    </Button>
                    <Button
                      type="submit"
                      disabled={creating}
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Yaradılır...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          KSQ Yaradın
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bsq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Beynəlxalq Standartlar Qiymətləndirməsi (BSQ)</span>
                </CardTitle>
                <CardDescription>
                  Beynəlxalq keyfiyyət standartları və akkreditasiya qiymətləndirməsi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitBSQ(onSubmitBSQ)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bsq_institution_id">Müəssisə *</Label>
                      <Select 
                        onValueChange={(value) => setValueBSQ('institution_id', parseInt(value))}
                        disabled={creating || loadingInstitutions}
                        defaultValue={String(defaultInstitution?.id || 2)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Müəssisə seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {institutions?.data?.data?.map((institution) => (
                            <SelectItem key={institution.id} value={String(institution.id)}>
                              {institution.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bsq_academic_year_id">Tədris ili *</Label>
                      <Select 
                        onValueChange={(value) => setValueBSQ('academic_year_id', parseInt(value))}
                        disabled={creating || loadingAcademicYears}
                        defaultValue={String(activeAcademicYear?.id || 2)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tədris ili seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYears?.map((year) => (
                            <SelectItem key={year.id} value={String(year.id)}>
                              {year.name} {year.is_active && '(Cari)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bsq_assessment_date">Qiymətləndirmə Tarixi *</Label>
                      <Input
                        id="bsq_assessment_date"
                        type="date"
                        {...registerBSQ('assessment_date', { required: 'Tarix tələb olunur' })}
                        disabled={creating}
                      />
                      {errorsBSQ.assessment_date && (
                        <p className="text-sm text-destructive">{errorsBSQ.assessment_date.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="international_standard">Beynəlxalq Standart *</Label>
                      <Input
                        id="international_standard"
                        {...registerBSQ('international_standard', { required: 'Beynəlxalq standart tələb olunur' })}
                        placeholder="məs: ISO 21001, NEASC, Cambridge Assessment"
                        disabled={creating}
                      />
                      {errorsBSQ.international_standard && (
                        <p className="text-sm text-destructive">{errorsBSQ.international_standard.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assessment_body">Qiymətləndirmə Orqanı *</Label>
                      <Input
                        id="assessment_body"
                        {...registerBSQ('assessment_body', { required: 'Qiymətləndirmə orqanı tələb olunur' })}
                        placeholder="məs: Cambridge International, IB Organization"
                        disabled={creating}
                      />
                      {errorsBSQ.assessment_body && (
                        <p className="text-sm text-destructive">{errorsBSQ.assessment_body.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bsq_total_score">Ümumi Bal *</Label>
                      <Input
                        id="bsq_total_score"
                        type="number"
                        min="0"
                        step="0.1"
                        {...registerBSQ('total_score', { 
                          required: 'Ümumi bal tələb olunur',
                          min: { value: 0, message: 'Bal mənfi ola bilməz' }
                        })}
                        disabled={creating}
                      />
                      {errorsBSQ.total_score && (
                        <p className="text-sm text-destructive">{errorsBSQ.total_score.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bsq_max_possible_score">Maksimum Bal *</Label>
                      <Input
                        id="bsq_max_possible_score"
                        type="number"
                        min="1"
                        step="0.1"
                        {...registerBSQ('max_possible_score', { 
                          required: 'Maksimum bal tələb olunur',
                          min: { value: 1, message: 'Maksimum bal ən azı 1 olmalıdır' }
                        })}
                        disabled={creating}
                      />
                      {errorsBSQ.max_possible_score && (
                        <p className="text-sm text-destructive">{errorsBSQ.max_possible_score.message}</p>
                      )}
                      {watchBSQ('total_score') && watchBSQ('max_possible_score') && (
                        <p className="text-sm text-muted-foreground">
                          Faiz: {calculatePercentage(watchBSQ('total_score'), watchBSQ('max_possible_score'))}%
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accreditation_status">Akkreditasiya Statusu</Label>
                      <Select value={watchBSQ('accreditation_status')} onValueChange={(value) => setValueBSQ('accreditation_status', value as any)} disabled={creating}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_accreditation">Tam Akkreditasiya</SelectItem>
                          <SelectItem value="conditional_accreditation">Şərti Akkreditasiya</SelectItem>
                          <SelectItem value="provisional_accreditation">Müvəqqəti Akkreditasiya</SelectItem>
                          <SelectItem value="denied">Rədd edilib</SelectItem>
                          <SelectItem value="not_applicable">Tətbiq olunmur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Rankings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="international_ranking">Beynəlxalq Reyting</Label>
                      <Input
                        id="international_ranking"
                        type="number"
                        min="1"
                        {...registerBSQ('international_ranking')}
                        placeholder="məs: 150"
                        disabled={creating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="national_ranking">Milli Reyting</Label>
                      <Input
                        id="national_ranking"
                        type="number"
                        min="1"
                        {...registerBSQ('national_ranking')}
                        placeholder="məs: 25"
                        disabled={creating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="regional_ranking">Regional Reyting</Label>
                      <Input
                        id="regional_ranking"
                        type="number"
                        min="1"
                        {...registerBSQ('regional_ranking')}
                        placeholder="məs: 5"
                        disabled={creating}
                      />
                    </div>
                  </div>

                  {/* Certification */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="certification_level">Sertifikat Səviyyəsi</Label>
                      <Input
                        id="certification_level"
                        {...registerBSQ('certification_level')}
                        placeholder="məs: Gold, Silver, Bronze"
                        disabled={creating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="certification_valid_until">Sertifikat Etibarlılıq Tarixi</Label>
                      <Input
                        id="certification_valid_until"
                        type="date"
                        {...registerBSQ('certification_valid_until')}
                        disabled={creating}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={creating}
                    >
                      Ləğv et
                    </Button>
                    <Button
                      type="submit"
                      disabled={creating}
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Yaradılır...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          BSQ Yaradın
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};