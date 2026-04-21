import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { gradeService, Grade } from '@/services/grades';
import { curriculumService } from '@/services/curriculumService';
import { academicYearService } from '@/services/academicYears';
import { schoolAdminService, SchoolTeacher } from '@/services/schoolAdmin';
import { useAuth } from '@/contexts/AuthContext';
import {
  BASE_DATA, SPLIT_KEYS, SUBJECT_IDS,
} from '@/components/curriculum/curriculumConstants';
import { GradeUpdateData } from '@/services/grades';

export interface GradeHours {
  plan: number;
  extra: number;
  indiv: number;
  home: number;
  special: number;
  club: number;
  split: number;
  total: number;
}

export interface LevelTotal {
  studentCount: number;
  classCount: number;
  plan: number;
  splitBySubject: Record<string, number>;
  split: number;
  extra: number;
  indiv: number;
  home: number;
  special: number;
  club: number;
  total: number;
}

export interface GrandTotal {
  studentCount: number;
  classCount: number;
  plan: number;
  split: number;
  extra: number;
  indiv: number;
  home: number;
  special: number;
  club: number;
  total: number;
}

export interface MpStats {
  cadvel2: number;
  cadvel3: number;
  cadvel4: number;
  cadvel5: number;
  cadvel6: number;
  dernek: number;
  total: number;
}

export interface VacantCategory {
  tot: number;
  ass: number;
}

export interface VacantStats {
  dernek: VacantCategory;
  c2: VacantCategory;
  c3: VacantCategory;
  c4: VacantCategory;
  c5: VacantCategory;
  c6: VacantCategory;
}

export interface CurriculumApproval {
  status: string;
  return_comment?: string;
  [key: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculates all hour types for a single grade
 */
export function calculateGradeHours(grade: Grade): GradeHours {
  const gs = grade.grade_subjects || [];

  const basePlan = gs.filter(i => {
    const ed = i.education_type?.toLowerCase() || '';
    const sid = Number(i.subject_id);
    return (ed === 'umumi' || ed === 'ümumi' || ed === '') && !i.is_extracurricular && sid !== SUBJECT_IDS.CLUB && !!i.is_teaching_activity;
  }).reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);

  const plan = grade.curriculum_hours != null ? Number(grade.curriculum_hours) : basePlan;

  const g = grade as any;

  const baseExtra = gs.filter(i => i.is_extracurricular && Number(i.subject_id) !== SUBJECT_IDS.CLUB)
    .reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);
  const extra = g.extra_hours != null ? Number(g.extra_hours) : baseExtra;

  const baseIndiv = gs.filter(i => i.education_type?.toLowerCase() === 'ferdi')
    .reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);
  const indiv = g.individual_hours != null ? Number(g.individual_hours) : baseIndiv;

  const baseHome = gs.filter(i => i.education_type?.toLowerCase() === 'evde')
    .reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);
  const home = g.home_hours != null ? Number(g.home_hours) : baseHome;

  const baseSpecial = gs.filter(i => i.education_type?.toLowerCase() === 'xususi')
    .reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);
  const special = g.special_hours != null ? Number(g.special_hours) : baseSpecial;

  const baseClub = gs.filter(i => Number(i.subject_id) === SUBJECT_IDS.CLUB)
    .reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);
  const club = g.club_hours != null ? Number(g.club_hours) : baseClub;

  let split = 0;
  SPLIT_KEYS.forEach(k => {
    split += grade[k] != null ? Number(grade[k]) : 0;
  });

  return {
    plan, extra, indiv, home, special, club, split,
    total: plan + split + extra + indiv + home + special + club,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCurriculumPlanData(institutionId: number | undefined) {
  const { currentUser } = useAuth();

  // ─── Role Detection ────────────────────────────────────────────────────────
  const userRole = currentUser?.role as string | undefined;
  const isSchoolAdmin = userRole === 'schooladmin';
  const isSektorAdmin = userRole === 'sektoradmin';
  const isRegionAdmin = userRole === 'regionadmin' || userRole === 'superadmin';

  // ─── Academic Year ─────────────────────────────────────────────────────────
  const { data: activeYear } = useQuery({
    queryKey: ['activeAcademicYear'],
    queryFn: () => academicYearService.getActive(),
    staleTime: 5 * 60 * 1000,
  });

  const [academicYearId, setAcademicYearId] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (activeYear?.id) setAcademicYearId(activeYear.id);
  }, [activeYear]);

  // ─── Master Plan ───────────────────────────────────────────────────────────
  const {
    data: masterPlanData,
    isLoading: isLoadingMasterPlan,
    refetch: refetchMasterPlan,
  } = useQuery({
    queryKey: ['masterPlan', institutionId, academicYearId],
    queryFn: () => curriculumService.getMasterPlan(institutionId!, academicYearId!),
    enabled: !!institutionId && !!academicYearId,
    placeholderData: (prev) => prev,
  });

  const masterPlan: unknown[] = masterPlanData?.items || [];
  const assignedHours: unknown[] = masterPlanData?.assignedHours || [];
  const approval: CurriculumApproval = masterPlanData?.approval || { status: 'draft' };
  const deadline: string | undefined = masterPlanData?.deadline;

  // ─── Region Settings ───────────────────────────────────────────────────────
  const { data: regionSettings } = useQuery({
    queryKey: ['curriculumSettings'],
    queryFn: () => curriculumService.getSettings(),
    staleTime: 2 * 60 * 1000,
  });

  // ─── Locking Logic ─────────────────────────────────────────────────────────
  const isLocked = useMemo(() => {
    if (isRegionAdmin) return false;
    // SECURITY: While settings are loading, assume locked to prevent race condition/bypass
    if (!regionSettings) return true;
    if (isSektorAdmin && !regionSettings.can_sektor_edit) return true;
    if (approval.status === 'approved') return true;
    if (isSchoolAdmin && approval.status === 'submitted') return true;
    return false;
  }, [approval.status, isSchoolAdmin, isRegionAdmin, isSektorAdmin, regionSettings]);

  // ─── Approval Workflow ─────────────────────────────────────────────────────
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  const handleWorkflowAction = useCallback(async (
    action: 'submit' | 'approve' | 'return' | 'reset',
    comment?: string,
  ) => {
    if (!institutionId || !academicYearId) return;
    setIsProcessingApproval(true);
    try {
      if (action === 'submit') await curriculumService.submitPlan(institutionId, academicYearId);
      else if (action === 'approve') await curriculumService.approvePlan(institutionId, academicYearId);
      else if (action === 'return') await curriculumService.returnPlan(institutionId, academicYearId, comment || '');
      else if (action === 'reset') await curriculumService.resetPlan(institutionId, academicYearId);

      toast.success(
        action === 'submit' ? 'Təsdiqə göndərildi' :
        action === 'approve' ? 'Təsdiq edildi' :
        action === 'return' ? 'Geri qaytarıldı' : 'Sıfırlandı (Açıldı)',
      );
      refetchMasterPlan();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Xəta baş verdi';
      toast.error(msg);
      throw e;
    } finally {
      setIsProcessingApproval(false);
    }
  }, [institutionId, academicYearId, refetchMasterPlan]);

  // ─── Teachers ──────────────────────────────────────────────────────────────
  const { data: teachers = [], isLoading: loadingTeachers } = useQuery<SchoolTeacher[]>({
    queryKey: ['teachers', 'workload', institutionId, academicYearId],
    queryFn: () => schoolAdminService.getTeachers({
      institution_id: institutionId,
      academic_year_id: academicYearId,
      per_page: 500,
    } as Parameters<typeof schoolAdminService.getTeachers>[0]),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // ─── Grades ────────────────────────────────────────────────────────────────
  const {
    data: grades = [],
    isLoading: loadingGrades,
    refetch: refetchGrades,
  } = useQuery<Grade[]>({
    queryKey: ['grades', 'active', institutionId, academicYearId, 'with_subjects'],
    queryFn: async () => {
      const res = await gradeService.get({
        institution_id: institutionId!,
        academic_year_id: academicYearId!,
        is_active: true,
        per_page: 100,
        include: 'grade_subjects',
      });
      return res.items || [];
    },
    enabled: !!institutionId && !!academicYearId,
  });

  // ─── Grade Overrides + Debounced Save ──────────────────────────────────────
  const [overrides, setOverrides] = useState<Record<number, Partial<GradeUpdateData>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const refetchRef = useRef(refetchGrades);
  useEffect(() => { refetchRef.current = refetchGrades; }, [refetchGrades]);

  const handleUpdateGrade = useCallback((gradeId: number, data: Partial<GradeUpdateData>) => {
    setOverrides(prev => ({
      ...prev,
      [gradeId]: { ...(prev[gradeId] || {}), ...data },
    }));
  }, []);

  useEffect(() => {
    if (Object.keys(overrides).length === 0) return;
    const timer = setTimeout(async () => {
      setIsSaving(true);
      const toSave = { ...overrides };
      try {
        for (const [gid, data] of Object.entries(toSave)) {
          try {
            await gradeService.updateGrade(Number(gid), data);
          } catch (e) {
            console.error('Save error for grade', gid, e);
            toast.error(`Xəta: ${gid} nömrəli sinif yadda qalmadı`);
          }
        }
        await refetchRef.current();
        setOverrides(prev => {
          const next = { ...prev };
          Object.keys(toSave).forEach(key => { delete next[key]; });
          return next;
        });
      } finally {
        setIsSaving(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [overrides]);

  // ─── Reactive Grades (overrides merged) ────────────────────────────────────
  const reactiveGrades = useMemo<Grade[]>(() => {
    return grades.map(g => {
      const ovr = overrides[g.id];
      return ovr ? { ...g, ...ovr } as Grade : g;
    });
  }, [grades, overrides]);

  // ─── Active Levels ─────────────────────────────────────────────────────────
  const activeLevels = useMemo(() => {
    const levels = new Set<number>();
    grades.forEach(g => levels.add(g.class_level));
    return BASE_DATA
      .filter(b => levels.has(b.level))
      .map(b => ({ level: b.level, name: b.label }));
  }, [grades]);

  // ─── Level Totals ──────────────────────────────────────────────────────────
  const levelTotals = useMemo<Record<number, LevelTotal>>(() => {
    const totals: Record<number, LevelTotal> = {};
    activeLevels.forEach(lvl => {
      const levelGrades = reactiveGrades.filter(g => g.class_level === lvl.level);
      const studentCount = levelGrades.reduce((sum, g) => sum + (g.real_student_count || g.student_count || 0), 0);
      const classCount = levelGrades.length;

      let planHours = 0;
      const splitBySubject: Record<string, number> = {};
      SPLIT_KEYS.forEach(k => { splitBySubject[k] = 0; });
      let extraHours = 0;
      let indivHours = 0;
      let homeHours = 0;
      let specialHours = 0;
      let clubHours = 0;
      let splitTotal = 0;

      levelGrades.forEach(g => {
        const gh = calculateGradeHours(g);
        planHours += gh.plan;
        extraHours += gh.extra;
        indivHours += gh.indiv;
        homeHours += gh.home;
        specialHours += gh.special;
        clubHours += gh.club;
        splitTotal += gh.split;

        SPLIT_KEYS.forEach(k => {
          splitBySubject[k] += g[k] != null ? Number(g[k]) : 0;
        });
      });

      totals[lvl.level] = {
        studentCount, classCount, plan: planHours, splitBySubject,
        split: splitTotal, extra: extraHours, indiv: indivHours,
        home: homeHours, special: specialHours, club: clubHours,
        total: planHours + splitTotal + extraHours + indivHours + homeHours + specialHours + clubHours,
      };
    });
    return totals;
  }, [reactiveGrades, activeLevels]);

  // ─── Grand Total ───────────────────────────────────────────────────────────
  const grandTotal = useMemo<GrandTotal>(() => {
    const res: GrandTotal = { studentCount: 0, classCount: 0, plan: 0, split: 0, extra: 0, indiv: 0, home: 0, special: 0, club: 0, total: 0 };
    Object.values(levelTotals).forEach(lt => {
      res.studentCount += lt.studentCount;
      res.classCount += lt.classCount;
      res.plan += lt.plan;
      res.split += lt.split;
      res.extra += lt.extra;
      res.indiv += lt.indiv;
      res.home += lt.home;
      res.special += lt.special;
      res.club += lt.club || 0;
      res.total += lt.total;
    });
    return res;
  }, [levelTotals]);

  // ─── Master Plan Stats ─────────────────────────────────────────────────────
  const mpStats = useMemo<MpStats>(() => {
    const s: MpStats = { cadvel2: 0, cadvel3: 0, cadvel4: 0, cadvel5: 0, cadvel6: 0, dernek: 0, total: 0 };

    // Deduplicate to prevent double counting across sections
    const rowMap: Record<string, Record<string, unknown>> = {};
    (masterPlan as Record<string, unknown>[]).forEach(item => {
      const key = `${item.class_level}_${item.subject_id}_${item.education_type}_${item.is_extra ? '1' : '0'}`;
      rowMap[key] = item;
    });

    Object.values(rowMap).forEach(item => {
      const h = Number(item.hours) || 0;
      const gc = Number(item.group_count) || 1;
      const totalH = h * gc;
      const sid = Number(item.subject_id);
      const ed = (item.education_type as string)?.toLowerCase() || '';

      if (sid === SUBJECT_IDS.EXTRACURRICULAR) s.cadvel3 += totalH;
      else if (sid === SUBJECT_IDS.CLUB) s.dernek += totalH;
      else if (ed === 'umumi') s.cadvel2 += totalH;
      else if (ed === 'ferdi') s.cadvel4 += totalH;
      else if (ed === 'evde') s.cadvel5 += totalH;
      else if (ed === 'xususi') s.cadvel6 += totalH;
    });

    s.total = s.cadvel2 + s.cadvel3 + s.cadvel4 + s.cadvel5 + s.cadvel6 + s.dernek;
    return s;
  }, [masterPlan]);

  // ─── Vacant Stats ──────────────────────────────────────────────────────────
  const vacantStats = useMemo<VacantStats>(() => {
    const res: VacantStats = {
      dernek: { tot: mpStats.dernek, ass: 0 },
      c2: { tot: mpStats.cadvel2, ass: 0 },
      c3: { tot: mpStats.cadvel3, ass: 0 },
      c4: { tot: mpStats.cadvel4, ass: 0 },
      c5: { tot: mpStats.cadvel5, ass: 0 },
      c6: { tot: mpStats.cadvel6, ass: 0 },
    };

    (assignedHours as Record<string, unknown>[]).forEach(it => {
      const val = Number(it.total_assigned) || 0;
      const sid = Number(it.subject_id);
      const ed = it.education_type as string;
      const isExtra = it.is_extracurricular;

      if (sid === SUBJECT_IDS.CLUB) res.dernek.ass += val;
      else if (isExtra) res.c3.ass += val;
      else if (ed === 'umumi') res.c2.ass += val;
      else if (ed === 'ferdi') res.c4.ass += val;
      else if (ed === 'evde') res.c5.ass += val;
      else if (ed === 'xususi') res.c6.ass += val;
    });
    return res;
  }, [mpStats, assignedHours]);

  const vacantTotal = useMemo(() => ({
    tot: vacantStats.c2.tot + vacantStats.c3.tot + vacantStats.c4.tot + vacantStats.c5.tot + vacantStats.c6.tot + vacantStats.dernek.tot,
    ass: vacantStats.c2.ass + vacantStats.c3.ass + vacantStats.c4.ass + vacantStats.c5.ass + vacantStats.c6.ass + vacantStats.dernek.ass,
  }), [vacantStats]);

  // ─── Category Limits ───────────────────────────────────────────────────────
  const categoryLimits = useMemo<Record<number, Record<string, number>>>(() => {
    const limits: Record<number, Record<string, number>> = {};
    (masterPlan as Record<string, unknown>[]).forEach(item => {
      const lvl = Number(item.class_level);
      if (!limits[lvl]) limits[lvl] = { umumi: 0, ferdi: 0, evde: 0, xususi: 0, extra: 0, dernek: 0 };
      const val = (Number(item.hours) || 0) * (Number(item.group_count) || 1);
      const sid = Number(item.subject_id);
      const ed = item.education_type as string;
      const isExtra = item.is_extracurricular;
      if (sid === SUBJECT_IDS.CLUB) limits[lvl].dernek += val;
      else if (isExtra) limits[lvl].extra += val;
      else if (ed === 'umumi') limits[lvl].umumi += val;
      else if (ed === 'ferdi') limits[lvl].ferdi += val;
      else if (ed === 'evde') limits[lvl].evde += val;
      else if (ed === 'xususi') limits[lvl].xususi += val;
    });
    return limits;
  }, [masterPlan]);

  // ─── Derived stats (grades-based) ─────────────────────────────────────────
  const gradeStats = useMemo(() => ({
    umumi: grandTotal.plan + grandTotal.split,
    ferdi: grandTotal.indiv,
    evde: grandTotal.home,
    xususi: grandTotal.special,
    extra: grandTotal.extra,
    dernek: grandTotal.club,
    total: grandTotal.total,
  }), [grandTotal]);

  return {
    // identity
    userRole,
    isSchoolAdmin,
    isSektorAdmin,
    isRegionAdmin,
    // academic year
    activeYear,
    academicYearId,
    // master plan
    masterPlan,
    assignedHours,
    approval,
    deadline,
    isLoadingMasterPlan,
    refetchMasterPlan,
    // settings / locking
    isLocked,
    // approval workflow
    isProcessingApproval,
    handleWorkflowAction,
    // teachers
    teachers,
    loadingTeachers,
    // grades
    grades,
    reactiveGrades,
    loadingGrades,
    handleUpdateGrade,
    isSaving,
    // calculated
    activeLevels,
    levelTotals,
    grandTotal,
    mpStats,
    vacantStats,
    vacantTotal,
    categoryLimits,
    gradeStats,
  };
}
