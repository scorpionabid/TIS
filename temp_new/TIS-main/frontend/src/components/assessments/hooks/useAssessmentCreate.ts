import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { assessmentService, CreateKSQData, CreateBSQData } from '@/services/assessments';
import { academicYearService } from '@/services/academicYears';
import { institutionService } from '@/services/institutions';

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

interface UseAssessmentCreateProps {
  onAssessmentCreated?: () => void;
  onClose: () => void;
}

export const useAssessmentCreate = ({ onAssessmentCreated, onClose }: UseAssessmentCreateProps) => {
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

  // Get default values
  const activeAcademicYear = academicYears?.find(year => year.is_active) || academicYears?.[0];
  const defaultInstitution = institutions?.data?.data?.[0];

  // KSQ Form
  const ksqForm = useForm<KSQFormData>({
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

  // BSQ Form
  const bsqForm = useForm<BSQFormData>({
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

  // Criteria management
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

  // List management functions
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

  // Submit handlers
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

      await assessmentService.createKSQ(createData);

      toast({
        title: 'Uğurlu',
        description: 'KSQ qiymətləndirməsi uğurla yaradıldı',
      });

      queryClient.invalidateQueries({ queryKey: ['assessments'] });
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

      await assessmentService.createBSQ(createData);

      toast({
        title: 'Uğurlu',
        description: 'BSQ qiymətləndirməsi uğurla yaradıldı',
      });

      queryClient.invalidateQueries({ queryKey: ['assessments'] });
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

  // Reset functions
  const resetForm = () => {
    setCriteriaList([{ name: '', score: 0 }]);
    setStrengthsList(['']);
    setImprovementsList(['']);
    setRecommendationsList(['']);
    ksqForm.reset();
    bsqForm.reset();
  };

  const handleClose = () => {
    if (creating) {
      if (confirm('Qiymətləndirmə yaradılır. İptal etmək istədiyinizdən əminsiniz?')) {
        setCreating(false);
        onClose();
      }
    } else {
      resetForm();
      onClose();
    }
  };

  // Utility functions
  const calculatePercentage = (totalScore: number, maxScore: number) => {
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  };

  return {
    // State
    creating,
    selectedType,
    criteriaList,
    strengthsList,
    improvementsList,
    recommendationsList,
    
    // Data
    academicYears,
    institutions,
    activeAcademicYear,
    defaultInstitution,
    loadingAcademicYears,
    loadingInstitutions,
    
    // Forms
    ksqForm,
    bsqForm,
    
    // Actions
    setSelectedType,
    addCriteria,
    removeCriteria,
    updateCriteria,
    addListItem,
    removeListItem,
    updateListItem,
    onSubmitKSQ,
    onSubmitBSQ,
    handleClose,
    calculatePercentage,
    resetForm,
    setStrengthsList,
    setImprovementsList,
    setRecommendationsList
  };
};