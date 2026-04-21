import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { gradeService } from '@/services/grades';
import { teacherService } from '@/services/teachers';
import { workloadService } from '@/services/workload';
import { curriculumService } from '@/services/curriculumService';
import { EducationType } from '@/types/curriculum';

interface UseAddWorkloadProps {
  teacherId: number;
  teacherName: string;
  institutionId?: number;
  academicYearId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function useAddWorkload({
  teacherId,
  teacherName,
  institutionId,
  academicYearId,
  isOpen,
  onClose,
  onSuccess
}: UseAddWorkloadProps) {
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>('');
  const [weeklyHours, setWeeklyHours] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoSelectedInfo, setAutoSelectedInfo] = useState<string | null>(null);

  const selectedSubject = selectedSubjectKey ? parseInt(selectedSubjectKey.split('_')[0]) : null;
  const selectedEducationType = selectedSubjectKey ? selectedSubjectKey.split('_').slice(1).join('_') : null;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: masterPlanResponse, isLoading: masterPlanLoading } = useQuery({
    queryKey: ['curriculum-plan-master', institutionId, academicYearId],
    queryFn: () => curriculumService.getMasterPlan(institutionId!, academicYearId!),
    enabled: isOpen && !!institutionId && !!academicYearId,
  });

  const { data: filteredGradesResponse, isLoading: filteredGradesLoading } = useQuery({
    queryKey: ['grades-by-subject', institutionId, academicYearId, selectedSubjectKey],
    queryFn: () => gradeService.getGrades({
      institution_id: institutionId,
      academic_year_id: academicYearId,
      is_active: true,
      subject_id: selectedSubject!,
      education_type: selectedEducationType || 'umumi',
      per_page: 500,
    }),
    enabled: isOpen && !!institutionId && !!selectedSubject,
  });

  const { data: teacherSubjects, isLoading: teacherSubjectsLoading } = useQuery({
    queryKey: ['teacher-subjects', teacherId],
    queryFn: () => teacherService.getTeacherSubjects(teacherId),
    enabled: isOpen && teacherId > 0,
  });

  const { data: gradeSubjectsResponse, isLoading: gradeSubjectsLoading } = useQuery({
    queryKey: ['grade-subjects', selectedClass],
    queryFn: () => workloadService.getGradeSubjects(selectedClass!),
    enabled: selectedClass !== null && selectedClass > 0,
  });

  const { data: existingLoadsResponse } = useQuery({
    queryKey: ['teaching-loads', teacherId],
    queryFn: () => workloadService.getTeacherWorkload(teacherId),
    enabled: isOpen && teacherId > 0,
  });

  const { data: classLoadsResponse } = useQuery({
    queryKey: ['class-teaching-loads', selectedClass],
    queryFn: () => workloadService.getTeachingLoadsForClass(selectedClass!),
    enabled: selectedClass !== null && selectedClass > 0,
  });

  // Derived State
  const gradeSubjects = useMemo(() => gradeSubjectsResponse?.data || [], [gradeSubjectsResponse]);
  const existingLoads = useMemo(() => existingLoadsResponse?.data?.loads || [], [existingLoadsResponse]);
  const classLoads = useMemo(() => (classLoadsResponse?.data || []) as any[], [classLoadsResponse]);

  const isSubjectAlreadyAssigned = useMemo(() => {
    if (!selectedClass || !selectedSubjectKey) return false;
    return existingLoads.some(
      (load: any) => load.class_id === selectedClass && `${load.subject_id}_${load.education_type || 'umumi'}` === selectedSubjectKey
    );
  }, [existingLoads, selectedClass, selectedSubjectKey]);

  const relevantExistingLoads = useMemo(() => {
    if (!selectedSubject || !selectedEducationType) return existingLoads;
    return existingLoads.filter(
      (load: any) => load.subject_id === selectedSubject && (load.education_type || 'umumi') === selectedEducationType
    );
  }, [existingLoads, selectedSubject, selectedEducationType]);

  const allSchoolSubjects = useMemo(() => {
    const items = masterPlanResponse?.items || [];
    const subjectsMap = new Map();
    items.forEach((item: any) => {
      if (!item.subject_id || !item.has_grade_subjects) return;
      const key = `${item.subject_id}_${item.education_type || 'umumi'}`;
      if (!subjectsMap.has(key)) {
        subjectsMap.set(key, {
            subject_id: item.subject_id,
            subject_name: item.subject?.name || 'Fənn',
            education_type: item.education_type || 'umumi',
            weekly_hours: item.hours
        });
      }
    });
    return Array.from(subjectsMap.values());
  }, [masterPlanResponse]);

  const teacherSubjectIds = useMemo(() => new Set((teacherSubjects || []).map((ts: any) => ts.subject_id)), [teacherSubjects]);

  const { teacherSubjectsList, otherSubjectsList } = useMemo(() => {
    const teacherList: any[] = [];
    const otherList: any[] = [];
    allSchoolSubjects.forEach((gs: any) => {
      if (teacherSubjectIds.has(gs.subject_id)) teacherList.push(gs);
      else otherList.push(gs);
    });
    return { teacherSubjectsList: teacherList, otherSubjectsList: otherList };
  }, [allSchoolSubjects, teacherSubjectIds]);

  const availableGrades = useMemo(() => {
    if (!selectedSubjectKey) return [];
    const responseData = filteredGradesResponse?.data;
    if (!responseData) return [];
    if (Array.isArray(responseData)) return responseData;
    const nested = (responseData as any)?.grades || (responseData as any)?.data;
    return Array.isArray(nested) ? nested : [];
  }, [filteredGradesResponse, selectedSubjectKey]);

  // Effects
  useEffect(() => {
    if (selectedClass && selectedSubjectKey && !gradeSubjectsLoading && gradeSubjects.length > 0) {
       const [sIdStr, eType] = selectedSubjectKey.split('_');
       const sId = parseInt(sIdStr);
       const gs = gradeSubjects.find((g: any) => g.subject_id === sId && (g.education_type || 'umumi') === eType);
       if (gs) {
           setWeeklyHours(gs.weekly_hours);
           const totalPlanned = gs.weekly_hours * (gs.is_split_groups ? gs.group_count : 1);
           const assignedToThisSubject = classLoads
             .filter((l: any) => l.subject_id === gs.subject_id && l.education_type === gs.education_type)
             .reduce((sum: number, l: any) => sum + Number(l.weekly_hours || 0), 0);
           const remaining = Math.max(0, totalPlanned - assignedToThisSubject);
           if (remaining <= 0) setAutoSelectedInfo(`DİQQƏT: Tədris planına əsasən bu sinifdə "${gs.subject_name}" üçün fənn yükü limit dolub!`);
           else setAutoSelectedInfo(`Sinifdə bu fənn üçün tədris planında ${remaining} saat boş fənn yükü var.`);
       } else {
           setWeeklyHours(0);
           setAutoSelectedInfo(`DİQQƏT: Tədris planında bu sinif üçün seçilən fənn təyin olunmayıb!`);
       }
    } else if (selectedSubjectKey && !selectedClass) {
        setWeeklyHours(0);
        setAutoSelectedInfo('Seçilmiş fənnə uyğun təyin etmək istədikdə, sadəcə aşağıdan dəstəklənən siyahıdan sinif seçin.');
    }
  }, [selectedClass, selectedSubjectKey, gradeSubjectsLoading, gradeSubjects, classLoads]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedClass(null);
      setSelectedSubjectKey('');
      setWeeklyHours(0);
      setAutoSelectedInfo(null);
      setSubmitError(null);
    }
  }, [isOpen]);

  // Handlers
  const handleSubjectChange = (value: string) => {
    setSelectedSubjectKey(value);
    setSubmitError(null);
    setSelectedClass(null);
    setWeeklyHours(0);
    setAutoSelectedInfo(null);
  };

  const handleClassChange = (value: string) => {
    setSelectedClass(parseInt(value));
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!selectedClass || !selectedSubjectKey || weeklyHours <= 0) {
      setSubmitError('Zəhmət olmasa sinif və fənn seçin.');
      return;
    }
    if (isSubjectAlreadyAssigned) {
      setSubmitError('Bu fənn artıq bu sinifdə bu müəllimə təyin edilib.');
      return;
    }

    setIsSubmitting(true);
    try {
      await workloadService.createTeachingLoad({
        teacher_id: teacherId,
        subject_id: selectedSubject!,
        education_type: selectedEducationType || 'umumi',
        class_id: selectedClass,
        weekly_hours: weeklyHours,
        academic_year_id: academicYearId || 1
      } as any);

      toast({ title: 'Uğurla Əlavə Edildi', description: `${teacherName} üçün dərs yükü əlavə edildi` });
      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
      queryClient.invalidateQueries({ queryKey: ['class-teaching-loads', selectedClass] });
      queryClient.invalidateQueries({ queryKey: ['workload-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['curriculum-plan-master'] });

      onSuccess();
      onClose();
    } catch (error: any) {
      const resp = error?.response?.data;
      let errMsg = 'Dərs yükü əlavə edilərkən xəta baş verdi.';
      if (resp?.message) errMsg = resp.message;
      else if (resp?.errors) {
        const firstKey = Object.keys(resp.errors)[0];
        if (firstKey) errMsg = Array.isArray(resp.errors[firstKey]) ? resp.errors[firstKey][0] : resp.errors[firstKey];
      }
      setSubmitError(errMsg);
    } finally { setIsSubmitting(false); }
  };

  return {
    selectedClass,
    selectedSubjectKey,
    weeklyHours,
    isSubmitting,
    submitError,
    autoSelectedInfo,
    masterPlanLoading,
    filteredGradesLoading,
    teacherSubjects,
    teacherSubjectsLoading,
    teacherSubjectsList,
    otherSubjectsList,
    availableGrades,
    relevantExistingLoads,
    isSubjectAlreadyAssigned,
    existingLoads,
    handleSubjectChange,
    handleClassChange,
    handleSubmit
  };
}
