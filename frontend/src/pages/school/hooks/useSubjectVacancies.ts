import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subjectService } from '@/services/subjects';
import { curriculumService } from '@/services/curriculumService';
import { academicYearService } from '@/services/academicYears';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export type EducationType = 'umumi' | 'ferdi' | 'evde' | 'xususi';
export type TabType = EducationType | 'statistika';

export interface SubjectRow {
  id: string;
  subjectId: number;
  subjectName: string;
  educationType: EducationType;
  hours: Record<string, number | ''>;
  assignedHours: number;
  groupCount: number;
  isExtra: boolean;
}

export const CLASS_LEVELS = ['MH', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export const SPEC_IDS = {
  EXTRACURRICULAR: 56,
  CLUB: 57
};

interface UseSubjectVacanciesProps {
  institutionId?: number;
  academicYearId?: number;
  masterPlan?: any[];
  assignedHours?: any[];
  isLocked?: boolean;
}

export function useSubjectVacancies({
  institutionId: propId,
  academicYearId: propYearId,
  masterPlan: propMasterPlan,
  assignedHours: propAssignedHours,
  isLocked = false
}: UseSubjectVacanciesProps) {
  const { currentUser } = useAuth();
  const { institutionId: urlId } = useParams();
  const instId = propId || (urlId ? parseInt(urlId) : currentUser?.institution?.id);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('umumi');
  const currentEducationType: EducationType = activeTab === 'statistika' ? 'umumi' : activeTab;
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { data: allSubjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectService.getAll(),
  });

  const { data: activeYear } = useQuery({
    queryKey: ['activeAcademicYear'],
    queryFn: () => academicYearService.getActive(),
    enabled: !propYearId,
  });

  const academicYearId = propYearId || activeYear?.id;

  const { data: masterPlanData, isLoading: isLoadingPlan } = useQuery({
    queryKey: ['masterPlan', instId, academicYearId],
    queryFn: () => curriculumService.getMasterPlan(instId!, academicYearId!),
    enabled: !!instId && !!academicYearId && !propMasterPlan,
  });

  const effectiveMasterPlan = propMasterPlan || masterPlanData?.items || [];

  useEffect(() => {
    if ((effectiveMasterPlan.length > 0 || propMasterPlan) && isInitialLoad && allSubjects.length > 0) {
      const rowMap: Record<string, SubjectRow> = {};

      effectiveMasterPlan.forEach((it: any) => {
        const isExtra = !!it.is_extra;
        const key = `${it.subject_id}_${it.education_type}`;
        if (!rowMap[key]) {
          rowMap[key] = {
            id: Math.random().toString(36).substr(2, 9),
            subjectId: it.subject_id,
            subjectName: it.subject_name || allSubjects.find(s => s.id === it.subject_id)?.name || 'Unknown',
            educationType: it.education_type as EducationType,
            hours: {},
            assignedHours: 0,
            groupCount: Number(it.group_count) || 1,
            isExtra: isExtra
          };
        }
        const gCnt = Number(it.group_count) || 1;
        const levelKey = it.class_level === 0 || it.class_level === '0' ? 'MH' : it.class_level;
        const currentHours = Number(rowMap[key].hours[levelKey]) || 0;
        rowMap[key].hours[levelKey] = currentHours + (it.hours * gCnt);
      });

      const assigned = masterPlanData?.assignedHours || [];
      assigned.forEach((as: any) => {
        Object.values(rowMap).forEach(row => {
          if (row.subjectId === as.subject_id && row.educationType === as.education_type && !row.isExtra) {
            row.assignedHours = Number(as.total_assigned) || 0;
          }
        });
      });

      setRows(Object.values(rowMap));
      setIsInitialLoad(false);
    }
  }, [effectiveMasterPlan, allSubjects, isInitialLoad, masterPlanData]);

  const rowsWithAssigned = useMemo(() => {
    const dataSources = propAssignedHours || masterPlanData?.assignedHours || [];
    const normalizeEdu = (type?: string | null) => {
      const t = type?.toLowerCase() || '';
      return (t === 'umumi' || t === 'ümumi' || t === '') ? 'umumi' : t;
    };

    return rows.map(r => {
      const rEdu = normalizeEdu(r.educationType);
      const relevantAssignments = dataSources.filter((as: any) => 
        as.subject_id === r.subjectId && normalizeEdu(as.education_type) === rEdu
      );
      const totalAssigned = relevantAssignments.reduce((sum, as) => sum + (Number(as.total_assigned) || 0), 0);
      return { ...r, assignedHours: totalAssigned };
    });
  }, [rows, masterPlanData, propAssignedHours]);

  const getRowSum = useCallback((row: SubjectRow): number => {
    return Object.values(row.hours).reduce<number>((acc, val) => {
      const num = Number(val) || 0;
      return acc + num;
    }, 0);
  }, []);

  const getFilteredRows = useMemo(() => {
    if (currentEducationType === 'umumi') {
      return rowsWithAssigned.filter(r => 
        r.educationType === currentEducationType && 
        r.subjectId !== SPEC_IDS.CLUB && 
        r.subjectId !== SPEC_IDS.EXTRACURRICULAR
      );
    }
    return rowsWithAssigned.filter(r => r.educationType === currentEducationType);
  }, [rowsWithAssigned, currentEducationType]);

  const specialtyRows = useMemo(() => {
    if (currentEducationType !== 'umumi') return [];
    return rowsWithAssigned.filter(r => 
      r.educationType === 'umumi' && 
      (r.subjectId === SPEC_IDS.CLUB || r.subjectId === SPEC_IDS.EXTRACURRICULAR)
    ).sort((a,b) => a.subjectId - b.subjectId);
  }, [rowsWithAssigned, currentEducationType]);

  const stats = useMemo(() => {
    const allTabRows = [...getFilteredRows, ...specialtyRows];
    const totalSelected = allTabRows.reduce((acc, r) => acc + getRowSum(r), 0);
    const totalAssigned = allTabRows.reduce((acc, r) => acc + r.assignedHours, 0);
    const vacancy = totalSelected - totalAssigned;
    const clubR = allTabRows.filter(r => r.subjectId === SPEC_IDS.CLUB);
    const cVac = clubR.reduce((acc, r) => acc + (getRowSum(r) - r.assignedHours), 0);
    return { totalSelected, totalAssigned, vacancy, clubVacancy: cVac };
  }, [getFilteredRows, specialtyRows, getRowSum]);

  const grandStats = useMemo(() => {
    const totalSelected = rowsWithAssigned.reduce((acc, r) => acc + getRowSum(r), 0);
    const totalAssigned = propAssignedHours 
      ? propAssignedHours.reduce((acc, as) => acc + (Number(as.total_assigned) || 0), 0)
      : rowsWithAssigned.reduce((acc, r) => acc + r.assignedHours, 0);

    const vacancy = totalSelected - totalAssigned;
    const clubR = rowsWithAssigned.filter(r => r.subjectId === SPEC_IDS.CLUB);
    const cVac = clubR.reduce((acc, r) => acc + (getRowSum(r) - r.assignedHours), 0);
    return { totalSelected, totalAssigned, vacancy, clubVacancy: cVac };
  }, [rowsWithAssigned, propAssignedHours, getRowSum]);

  const displayStats = activeTab === 'statistika' ? grandStats : stats;

  const handleAddSubject = (subjectId: number) => {
    const subject = allSubjects.find(s => s.id === subjectId);
    if (!subject) return;

    if (rows.some(r => r.subjectId === subjectId && r.educationType === currentEducationType)) {
      toast({ title: 'Xəta', description: 'Bu fənn artıq əlavə edilib', variant: 'destructive' });
      return;
    }

    const newRow: SubjectRow = {
      id: Math.random().toString(36).substr(2, 9),
      subjectId: subject.id,
      subjectName: subject.name,
      educationType: currentEducationType,
      hours: {},
      assignedHours: 0,
      groupCount: 1,
      isExtra: false
    };

    setRows([...rows, newRow]);
  };

  const handleCellChange = (rowId: string, level: number | string, value: string) => {
    const num: number | '' = value === '' ? '' : Math.max(0, parseFloat(value));
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, hours: { ...r.hours, [level]: num } } : r));
  };

  const handleDeleteRow = async (row: SubjectRow) => {
    try {
      if (masterPlanData) {
        await curriculumService.deleteMasterPlanSubject(instId!, academicYearId!, row.subjectId, row.educationType);
      }
      setRows(prev => prev.filter(r => r.id !== row.id));
      toast({ title: 'Uğurlu', description: 'Fənn silindi' });
    } catch (error) {
      toast({ title: 'Xəta', description: 'Fənn silinərkən xəta baş verdi', variant: 'destructive' });
    }
  };

  const handleSave = useCallback(async (rowsToSaveList?: SubjectRow[]) => {
    if (!instId || !academicYearId) return;

    setIsSaving(true);
    const sourceRows = rowsToSaveList || rows;
    const itemsToSave: any[] = [];
    sourceRows.forEach(r => {
      Object.entries(r.hours).forEach(([level, hours]) => {
        const hVal = (hours === '' || hours === null || hours === undefined) ? 0 : Number(hours);
        itemsToSave.push({
          subject_id: r.subjectId,
          education_type: r.educationType,
          class_level: level === 'MH' ? 0 : Number(level),
          hours: hVal
        });
      });
    });

    try {
      if (itemsToSave.length > 0) {
        await curriculumService.saveMasterPlan(instId, academicYearId, itemsToSave);
        setLastSaved(new Date());
        queryClient.invalidateQueries({ queryKey: ['masterPlan', instId, academicYearId] });
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [instId, academicYearId, rows, queryClient]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isInitialLoad || isLocked) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [rows, handleSave, isInitialLoad, isLocked]);

  return {
    activeTab,
    setActiveTab,
    currentEducationType,
    rows: rowsWithAssigned,
    getFilteredRows,
    specialtyRows,
    displayStats,
    isSaving,
    lastSaved,
    allSubjects,
    isLoading: isLoadingPlan || isLoadingSubjects,
    handleAddSubject,
    handleCellChange,
    handleDeleteRow,
    handleSave,
    getRowSum
  };
}
