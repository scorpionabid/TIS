import { useState, useEffect } from 'react';
import { 
  AssessmentType, 
  CreateAssessmentTypeData, 
  UpdateAssessmentTypeData,
  assessmentTypeService 
} from '../../services/assessmentTypes';
import { institutionService } from '../../services/institutions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CriteriaEntry {
  name: string;
  weight: number;
}

interface Institution {
  id: number;
  name: string;
  type: string;
  level: number;
  district?: string;
  region?: string;
  student_count?: number;
  is_active: boolean;
}

export const useAssessmentTypeForm = (
  assessmentType?: AssessmentType,
  onSuccess?: () => void,
  onClose?: () => void
) => {
  const { toast } = useToast();
  const { currentUser, hasRole } = useAuth();
  const isRegionAdmin = hasRole(['regionadmin']);
  
  const [loading, setLoading] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<number[]>([]);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('basic');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [notificationDays, setNotificationDays] = useState(7);
  const [criteria, setCriteria] = useState<CriteriaEntry[]>([{ name: '', weight: 0 }]);
  
  // Form state
  const [formData, setFormData] = useState<CreateAssessmentTypeData>({
    name: '',
    description: '',
    category: 'custom',
    is_active: true,
    criteria: {},
    max_score: 100,
    scoring_method: 'percentage',
    grade_levels: [],
    subjects: [],
    institution_id: null,
  });

useEffect(() => {
  let isMounted = true;

  const initializeCreateForm = () => {
    setSelectedTab('basic');
    const defaultInstitutions = isRegionAdmin && currentUser?.institution?.id
      ? [currentUser.institution.id]
      : [];

    setFormData({
      name: '',
      description: '',
      category: 'custom',
      is_active: true,
      criteria: {},
      max_score: 100,
      scoring_method: 'percentage',
      grade_levels: [],
      subjects: [],
      institution_id: isRegionAdmin ? (currentUser?.institution?.id ?? null) : null,
    });
    setCriteria([{ name: '', weight: 0 }]);
    setSelectedInstitutions(defaultInstitutions);
  };

  const initializeEditForm = async () => {
    if (!assessmentType) return;

    setSelectedTab('basic');

    try {
      const detail = await assessmentTypeService.getAssessmentType(assessmentType.id);
      if (!isMounted) return;

      setFormData({
        name: detail.name,
        description: detail.description || '',
        category: detail.category,
        is_active: detail.is_active,
        criteria: detail.criteria || {},
        max_score: detail.max_score || 100,
        scoring_method: detail.scoring_method || 'percentage',
        grade_levels: detail.grade_levels || [],
        subjects: detail.subjects || [],
        institution_id: detail.institution_id,
      });

      if (detail.criteria && typeof detail.criteria === 'object' && Object.keys(detail.criteria).length > 0) {
        const criteriaEntries = Object.entries(detail.criteria).map(([name, weight]) => ({
          name,
          weight: Number(weight)
        }));
        setCriteria(criteriaEntries);
      } else {
        setCriteria([{ name: '', weight: 0 }]);
      }

      const assigned = (detail.assigned_institutions ?? detail.assignedInstitutions ?? [])
        .map((inst: any) => inst.id)
        .filter((id: number | undefined) => !!id) as number[];

      if (detail.institution_id && !assigned.includes(detail.institution_id)) {
        assigned.push(detail.institution_id);
      }

      setSelectedInstitutions(assigned);
    } catch (error) {
      console.error('Failed to load assessment type details:', error);
      if (!isMounted) return;

      setFormData({
        name: assessmentType.name,
        description: assessmentType.description || '',
        category: assessmentType.category,
        is_active: assessmentType.is_active,
        criteria: assessmentType.criteria || {},
        max_score: assessmentType.max_score || 100,
        scoring_method: assessmentType.scoring_method || 'percentage',
        grade_levels: assessmentType.grade_levels || [],
        subjects: assessmentType.subjects || [],
        institution_id: assessmentType.institution_id,
      });

      if (assessmentType.criteria && typeof assessmentType.criteria === 'object') {
        const criteriaEntries = Object.entries(assessmentType.criteria).map(([name, weight]) => ({
          name,
          weight: Number(weight)
        }));
        setCriteria(criteriaEntries.length > 0 ? criteriaEntries : [{ name: '', weight: 0 }]);
      }

      const fallbackAssigned: number[] = [];
      if (assessmentType.institution_id) {
        fallbackAssigned.push(assessmentType.institution_id);
      }
      setSelectedInstitutions(fallbackAssigned);
    }
  };

  if (assessmentType) {
    initializeEditForm();
  } else {
    initializeCreateForm();
  }

  return () => {
    isMounted = false;
  };
}, [assessmentType, isRegionAdmin, currentUser?.institution?.id]);

  // Load institutions
  useEffect(() => {
    const loadInstitutions = async () => {
      setLoadingInstitutions(true);
      try {
        const response = await institutionService.getAll({
          per_page: 1000,
          include_trashed: false,
        });
        const institutionsData = response?.data?.data || response?.data || response || [];
        setInstitutions(Array.isArray(institutionsData) ? institutionsData : []);
      } catch (error) {
        console.error('❌ Failed to load institutions:', error);
        setInstitutions([]); // Ensure it's always an array
      } finally {
        setLoadingInstitutions(false);
      }
    };

    loadInstitutions();
  }, []);

  const addCriteria = () => {
    setCriteria([...criteria, { name: '', weight: 0 }]);
  };

  const removeCriteria = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriteria = (index: number, field: keyof CriteriaEntry, value: string | number) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setCriteria(newCriteria);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Xəta",
        description: "Qiymətləndirmə növünün adı məcburidir",
        variant: "destructive",
      });
      return;
    }

    // Prepare criteria object
    const criteriaObject: { [key: string]: number } = {};
    criteria.forEach(criterion => {
      if (criterion.name.trim()) {
        criteriaObject[criterion.name.trim()] = criterion.weight;
      }
    });

    const submitData: CreateAssessmentTypeData | UpdateAssessmentTypeData = {
      ...formData,
      criteria: criteriaObject,
    };

    (submitData as any).institution_assignments = selectedInstitutions;

    if (!assessmentType && isRegionAdmin) {
      submitData.institution_id = currentUser?.institution?.id ?? submitData.institution_id;
    }

    if (isRegionAdmin && !submitData.institution_id) {
      toast({
        title: 'Xəta',
        description: 'Qiymətləndirmə növü üçün təşkilat seçilməlidir',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (assessmentType) {
        await assessmentTypeService.updateAssessmentType(assessmentType.id, submitData as UpdateAssessmentTypeData);
        toast({
          title: "Uğurlu",
          description: "Qiymətləndirmə növü yeniləndi",
        });
      } else {
        await assessmentTypeService.createAssessmentType(submitData as CreateAssessmentTypeData);
        toast({
          title: "Uğurlu", 
          description: "Qiymətləndirmə növü yaradıldı",
        });
      }
      
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast({
        title: "Xəta",
        description: "Əməliyyat zamanı xəta baş verdi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInstitutions = (institutions || []).filter(institution =>
    institution.name.toLowerCase().includes(institutionSearch.toLowerCase())
  );

  return {
    // State
    loading,
    loadingInstitutions,
    institutions,
    selectedInstitutions,
    setSelectedInstitutions,
    institutionSearch,
    setInstitutionSearch,
    selectedTab,
    setSelectedTab,
    dueDate,
    setDueDate,
    isRecurring,
    setIsRecurring,
    recurringFrequency,
    setRecurringFrequency,
    notificationDays,
    setNotificationDays,
    criteria,
    setCriteria,
    formData,
    setFormData,
    
    // Computed
    filteredInstitutions,
    
    // Actions
    addCriteria,
    removeCriteria,
    updateCriteria,
    handleSubmit,
  };
};
