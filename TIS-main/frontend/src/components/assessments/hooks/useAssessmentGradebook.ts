import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolAdminService, schoolAdminKeys, Assessment, AssessmentGrade } from '@/services/schoolAdmin';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CreateAssessmentData {
  title: string;
  type: string;
  subject_id: number;
  class_id: number;
  max_score: number;
  due_date: string;
  description?: string;
}

export interface NewAssessmentData {
  title: string;
  subject: string;
  assessment_type: string;
  total_points: string;
  date: string;
}

export interface GradeData {
  points: string;
  comments: string;
}

export const useAssessmentGradebook = () => {
  const queryClient = useQueryClient();
  
  // State
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'assessments' | 'grades' | 'create'>('assessments');
  const [gradeData, setGradeData] = useState<Record<number, GradeData>>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAssessment, setNewAssessment] = useState<NewAssessmentData>({
    title: '',
    subject: '',
    assessment_type: '',
    total_points: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  // Fetch classes
  const { 
    data: classes 
  } = useQuery({
    queryKey: schoolAdminKeys.classes(),
    queryFn: () => schoolAdminService.getClasses(),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch assessments for selected class
  const { 
    data: assessments,
    isLoading: assessmentsLoading,
    refetch: refetchAssessments 
  } = useQuery({
    queryKey: schoolAdminKeys.assessments(selectedClassId),
    queryFn: () => selectedClassId ? schoolAdminService.getAssessments(selectedClassId) : Promise.resolve([]),
    enabled: !!selectedClassId,
    refetchOnWindowFocus: false,
  });

  // Fetch students for selected class
  const { 
    data: students 
  } = useQuery({
    queryKey: schoolAdminKeys.students(),
    queryFn: () => selectedClassId ? schoolAdminService.getStudentsByClass(selectedClassId) : Promise.resolve([]),
    enabled: !!selectedClassId,
    refetchOnWindowFocus: false,
  });

  // Fetch grades for selected assessment
  const { 
    data: grades,
    isLoading: gradesLoading,
    refetch: refetchGrades 
  } = useQuery({
    queryKey: schoolAdminKeys.grades(selectedAssessmentId),
    queryFn: () => selectedAssessmentId ? schoolAdminService.getGrades(selectedAssessmentId) : Promise.resolve([]),
    enabled: !!selectedAssessmentId,
    refetchOnWindowFocus: false,
  });

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: (data: CreateAssessmentData) => schoolAdminService.createAssessment(data),
    onSuccess: () => {
      toast.success('Qiymətləndirmə yaradıldı');
      refetchAssessments();
      setCreateModalOpen(false);
      setNewAssessment({
        title: '',
        subject: '',
        assessment_type: '',
        total_points: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
    },
    onError: () => {
      toast.error('Qiymətləndirmə yaradıla bilmədi');
    },
  });

  // Save grades mutation
  const saveGradesMutation = useMutation({
    mutationFn: ({ assessmentId, grades }: { assessmentId: number; grades: any[] }) =>
      schoolAdminService.saveGrades(assessmentId, grades),
    onSuccess: () => {
      toast.success('Qiymətlər saxlanıldı');
      refetchGrades();
    },
    onError: () => {
      toast.error('Qiymətlər saxlanıla bilmədi');
    },
  });

  // Submit assessment mutation
  const submitAssessmentMutation = useMutation({
    mutationFn: (assessmentId: number) => schoolAdminService.submitAssessment(assessmentId),
    onSuccess: () => {
      toast.success('Qiymətləndirmə təqdim edildi');
      refetchAssessments();
    },
    onError: () => {
      toast.error('Qiymətləndirmə təqdim edilə bilmədi');
    },
  });

  // Event handlers
  const handleCreateAssessment = () => {
    if (!selectedClassId) {
      toast.error('Əvvəlcə sinif seçin');
      return;
    }

    if (!newAssessment.title || !newAssessment.total_points) {
      toast.error('Zəruri sahələri doldurun');
      return;
    }

    const assessmentData = {
      ...newAssessment,
      class_id: selectedClassId,
      total_points: parseInt(newAssessment.total_points),
    };

    createAssessmentMutation.mutate(assessmentData);
  };

  const handleSaveGrades = () => {
    if (!selectedAssessmentId || !students) return;

    const gradesToSave = students
      .map(student => {
        const grade = gradeData[student.id];
        if (!grade?.points) return null;

        return {
          student_id: student.id,
          points: parseFloat(grade.points),
          comments: grade.comments || '',
        };
      })
      .filter(Boolean);

    if (gradesToSave.length === 0) {
      toast.error('Heç bir qiymət daxil edilməyib');
      return;
    }

    saveGradesMutation.mutate({
      assessmentId: selectedAssessmentId,
      grades: gradesToSave,
    });
  };

  const handleSubmitAssessment = (assessmentId: number) => {
    submitAssessmentMutation.mutate(assessmentId);
  };

  const updateGrade = (studentId: number, field: 'points' | 'comments', value: string) => {
    setGradeData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      }
    }));
  };

  // Utility functions
  const getAssessmentTypeText = (type: string) => {
    const types: Record<string, string> = {
      'quiz': 'Sınaq',
      'exam': 'İmtahan',
      'homework': 'Ev tapşırığı',
      'project': 'Layihə',
      'presentation': 'Təqdimat',
      'lab': 'Laboratoriya',
      'midterm': 'Ara imtahan',
      'final': 'Yekun imtahan',
    };
    return types[type] || type;
  };

  const getGradeColor = (points: number, totalPoints: number) => {
    const percentage = (points / totalPoints) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeLetter = (points: number, totalPoints: number) => {
    const percentage = (points / totalPoints) * 100;
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const calculateClassAverage = (assessment: Assessment) => {
    if (!assessment.grades || assessment.grades.length === 0) return 0;
    const total = assessment.grades.reduce((sum, grade) => sum + grade.points, 0);
    return total / assessment.grades.length;
  };

  const getSelectedAssessment = () => {
    return assessments?.find(a => a.id === selectedAssessmentId) || null;
  };

  return {
    // State
    selectedClassId,
    selectedAssessmentId,
    viewMode,
    gradeData,
    createModalOpen,
    newAssessment,
    
    // Data
    classes,
    assessments,
    students,
    grades,
    assessmentsLoading,
    gradesLoading,
    
    // Mutations
    createAssessmentMutation,
    saveGradesMutation,
    submitAssessmentMutation,
    
    // Actions
    setSelectedClassId,
    setSelectedAssessmentId,
    setViewMode,
    setGradeData,
    setCreateModalOpen,
    setNewAssessment,
    refetchAssessments,
    refetchGrades,
    
    // Event handlers
    handleCreateAssessment,
    handleSaveGrades,
    handleSubmitAssessment,
    updateGrade,
    
    // Utilities
    getAssessmentTypeText,
    getGradeColor,
    getGradeLetter,
    calculateClassAverage,
    getSelectedAssessment
  };
};