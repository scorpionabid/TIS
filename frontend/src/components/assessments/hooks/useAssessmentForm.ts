import { useState, useEffect } from 'react';
import { CreateAssessmentTypeData, AssessmentType } from '@/services/assessmentTypes';

interface CriteriaEntry {
  name: string;
  weight: number;
}

interface UseAssessmentFormProps {
  assessmentType?: AssessmentType;
  mode: 'basic' | 'enhanced';
}

export function useAssessmentForm({ assessmentType, mode }: UseAssessmentFormProps) {
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

  // Criteria management
  const [criteriaEntries, setCriteriaEntries] = useState<CriteriaEntry[]>([]);
  const [newCriteriaName, setNewCriteriaName] = useState('');
  const [newCriteriaWeight, setNewCriteriaWeight] = useState<number>(0);

  // Scheduling state
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [notificationDays, setNotificationDays] = useState(7);

  // Load form data when editing
  useEffect(() => {
    if (assessmentType) {
      setFormData({
        name: assessmentType.name,
        description: assessmentType.description || '',
        category: assessmentType.category,
        is_active: assessmentType.is_active,
        criteria: assessmentType.criteria || {},
        max_score: assessmentType.max_score,
        scoring_method: assessmentType.scoring_method,
        grade_levels: assessmentType.grade_levels || [],
        subjects: assessmentType.subjects || [],
        institution_id: assessmentType.institution_id,
      });

      // Set criteria list
      if (assessmentType.criteria && typeof assessmentType.criteria === 'object') {
        const criteria = Object.entries(assessmentType.criteria).map(([name, weight]) => ({
          name,
          weight: Number(weight)
        }));
        setCriteriaEntries(criteria);
      }
    } else {
      resetForm();
    }
  }, [assessmentType, mode]);

  const resetForm = () => {
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
      institution_id: null,
    });
    setCriteriaEntries([]);
    setNewCriteriaName('');
    setNewCriteriaWeight(0);
    setDueDate('');
    setIsRecurring(false);
    setRecurringFrequency('monthly');
    setNotificationDays(7);
  };

  const addCriteria = () => {
    if (newCriteriaName.trim() && newCriteriaWeight > 0) {
      const newEntry = { name: newCriteriaName.trim(), weight: newCriteriaWeight };
      setCriteriaEntries(prev => [...prev, newEntry]);
      setNewCriteriaName('');
      setNewCriteriaWeight(0);
    }
  };

  const removeCriteria = (index: number) => {
    setCriteriaEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateFormData = (field: keyof CreateAssessmentTypeData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Prepare final form data with criteria
  const getFinalFormData = () => {
    const criteria = criteriaEntries.reduce((acc, entry) => {
      acc[entry.name] = entry.weight;
      return acc;
    }, {} as Record<string, number>);

    return {
      ...formData,
      criteria,
    };
  };

  return {
    formData,
    setFormData,
    updateFormData,
    criteriaEntries,
    setCriteriaEntries,
    newCriteriaName,
    setNewCriteriaName,
    newCriteriaWeight,
    setNewCriteriaWeight,
    dueDate,
    setDueDate,
    isRecurring,
    setIsRecurring,
    recurringFrequency,
    setRecurringFrequency,
    notificationDays,
    setNotificationDays,
    addCriteria,
    removeCriteria,
    resetForm,
    getFinalFormData,
  };
}