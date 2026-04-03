import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronDown, ChevronRight, Loader2, Download, Briefcase, Clock, CalendarRange, Calendar, Search, LayoutDashboard, Database, ArrowLeft, Send, CheckSquare, Unlock, RotateCcw, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { gradeService, Grade } from '@/services/grades';
import { useAuth } from '@/contexts/AuthContext';
import { curriculumService } from '@/services/curriculumService';
import { academicYearService } from '@/services/academicYears';
import { schoolAdminService, SchoolTeacher } from '@/services/schoolAdmin';
import { TeacherScheduleStats } from '@/components/teachers/TeacherScheduleStats';
import FennlerVakantlar from './FennlerVakantlar';
import { GradeManager } from '@/components/grades/GradeManager';
import { curriculumGradeEntityConfig } from '@/components/grades/configurations/gradeConfig';
import { TeacherWorkloadDetailTable } from '@/components/teachers/TeacherWorkloadDetailTable';
import { GradeUpdateData } from '@/services/grades';
import { EditableNumber } from '@/components/curriculum/EditableNumber';
import {
  BASE_DATA, GRADE_GROUPS, SPLIT_KEYS, SPLIT_LABELS, SUBJECT_IDS,
  SplitHours, n, nn,
} from '@/components/curriculum/curriculumConstants';
import { exportToExcelUniversal, exportMultipleSheets, ExportMetadata, SheetConfig } from '@/utils/curriculumExport';
import { workloadColumns } from '@/components/teachers/configurations/teacherConfig';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeacherWorkloadPanel } from '@/components/teachers/TeacherWorkloadPanel';
import { TeacherWorkloadStats } from '@/components/teachers/TeacherWorkloadStats';
import { AvailabilityManager } from '@/components/teachers/AvailabilityManager';
import { CurriculumSummaryTiles } from '@/components/curriculum/CurriculumSummaryTiles';
import { CurriculumStatsCharts } from '@/components/curriculum/CurriculumStatsCharts';
import { CurriculumYigimTable } from '@/components/curriculum/CurriculumYigimTable';
import { CurriculumApprovalToolbar, CurriculumApproval } from '@/components/curriculum/CurriculumApprovalToolbar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Premium Animation Variants ──────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.1, duration: 0.4 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function CurriculumPlan() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'stats' | 'yigim' | 'subjects' | 'workload' | 'class_subject' | 'grades') ?? 'stats';
  const setActiveTab = useCallback((tab: 'stats' | 'yigim' | 'subjects' | 'workload' | 'class_subject' | 'grades') => {
    setSearchParams({ tab });
  }, [setSearchParams]);
  const [localStats, setLocalStats] = useState({ umumi: 0, ferdi: 0, evde: 0, xususi: 0, total: 0 });

  const { institutionId: urlId } = useParams();
  const institutionId = urlId ? parseInt(urlId) : currentUser?.institution?.id;

  const [workloadDrawerOpen, setWorkloadDrawerOpen] = React.useState(false);
  const [workloadDrawerTeacher, setWorkloadDrawerTeacher] = React.useState<SchoolTeacher | null>(null);
  const [workloadSearch, setWorkloadSearch] = React.useState('');
  const [drawerShiftConfig, setDrawerShiftConfig] = React.useState<any>({
    shift1: { name: 'I NÖVBƏ', lessonCount: 6, lessonDuration: 45, startTime: '08:00', color: 'blue', enabled: true, breaks: { smallBreakDuration: 10, bigBreakDuration: 20, bigBreakAfterLesson: 2 } },
    shift2: { name: 'II NÖVBƏ', lessonCount: 6, lessonDuration: 45, startTime: '14:00', color: 'orange', enabled: false, breaks: { smallBreakDuration: 10, bigBreakDuration: 20, bigBreakAfterLesson: 2 } },
  });

  // Active academic year (currentUser.academic_year_id does not exist — fetch from API)
  const { data: activeYear } = useQuery({
    queryKey: ['activeAcademicYear'],
    queryFn: () => academicYearService.getActive(),
    staleTime: 5 * 60 * 1000,
  });

  const [academicYearId, setAcademicYearId] = useState<number | undefined>(undefined);
  useEffect(() => { if (activeYear?.id) setAcademicYearId(activeYear.id); }, [activeYear]);

  // Master plan data for statistics and table
  const { data: masterPlanData, isLoading: isLoadingMasterPlan, refetch: refetchMasterPlan } = useQuery({
    queryKey: ['masterPlan', institutionId, academicYearId],
    queryFn: () => curriculumService.getMasterPlan(institutionId!, academicYearId!),
    enabled: !!institutionId && !!academicYearId,
    placeholderData: (prev) => prev,
  });


  const masterPlan = masterPlanData?.items || [];
  const assignedHours = masterPlanData?.assignedHours || [];
  const approval = masterPlanData?.approval || { status: 'draft' };
  const deadline = masterPlanData?.deadline;

  // ─── Region Settings (can_sektor_edit, is_locked) ────────────────────────
  const { data: regionSettings } = useQuery({
    queryKey: ['curriculumSettings'],
    queryFn: () => curriculumService.getSettings(),
    staleTime: 2 * 60 * 1000,
  });

  // ─── Locking Logic ──────────────────────────────────────────────────────────
  const userRole = currentUser?.role as any;
  const isSchoolAdmin = userRole === 'schooladmin';
  const isSektorAdmin = userRole === 'sektoradmin';
  const isRegionAdmin = userRole === 'regionadmin' || userRole === 'superadmin';

  // Check if current user can edit
  const isLocked = useMemo(() => {
    if (isRegionAdmin) return false;
    
    // SECURITY: While settings are loading, assume locked to prevent race condition/bypass
    if (!regionSettings) return true;

    // Sector admin: blocked if region admin disabled sector editing
    if (isSektorAdmin && !regionSettings.can_sektor_edit) return true;

    if (approval.status === 'approved') return true;
    if (isSchoolAdmin && approval.status === 'submitted') return true;
    return false;
  }, [approval.status, isSchoolAdmin, isRegionAdmin, isSektorAdmin, regionSettings]);

  // Handle Workflow Actions
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  const handleWorkflowAction = async (action: 'submit' | 'approve' | 'return' | 'reset', comment?: string) => {
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
        action === 'return' ? 'Geri qaytarıldı' : 'Sıfırlandı (Açıldı)'
      );
      refetchMasterPlan();
    } catch (e: any) {
      toast.error(e.message || 'Xəta baş verdi');
      throw e; // Re-throw so caller knows it failed
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const { data: teachers = [], isLoading: loadingTeachers } = useQuery<SchoolTeacher[]>({
    queryKey: ['teachers', 'workload', institutionId, academicYearId],
    queryFn: () => schoolAdminService.getTeachers({ institution_id: institutionId, academic_year_id: academicYearId, per_page: 500 } as any),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // ─── Fetch Classes ───────────────────────────────────────────────────────────
  const { data: grades = [], isLoading: loadingGrades, refetch } = useQuery<Grade[]>({
    queryKey: ['grades', 'active', institutionId, academicYearId, 'with_subjects'],
    queryFn: async () => {
      const res = await gradeService.get({
        institution_id: institutionId!,
        academic_year_id: academicYearId!,
        is_active: true,
        per_page: 100,
        include: 'grade_subjects'
      });
      return res.items || [];
    },
    enabled: !!institutionId && !!academicYearId,
  });

  const activeLevels = useMemo(() => {
    const levels = new Set<number>();
    grades.forEach(g => levels.add(g.class_level));
    return BASE_DATA.filter(b => levels.has(b.level)).map(b => ({
      level: b.level,
      name: b.label,
    }));
  }, [grades]);

  const [overrides, setOverrides] = useState<Record<number, Partial<GradeUpdateData>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const refetchRef = React.useRef(refetch);
  React.useEffect(() => { refetchRef.current = refetch; }, [refetch]);

  const handleUpdateGrade = (gradeId: number, data: Partial<GradeUpdateData>) => {
    setOverrides(prev => ({
      ...prev,
      [gradeId]: { ...(prev[gradeId] || {}), ...data }
    }));
  };

  // Debounced save for each grade
  React.useEffect(() => {
    if (Object.keys(overrides).length === 0) return;
    const timer = setTimeout(async () => {
      setIsSaving(true);
      const toSave = { ...overrides };
      const entries = Object.entries(toSave);

      try {
        for (const [gid, data] of entries) {
          try {
            await gradeService.updateGrade(Number(gid), data);
          } catch (e) {
            console.error("Save error for grade", gid, e);
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

  const reactiveGrades = useMemo(() => {
    return grades.map(g => {
      const ovr = overrides[g.id];
      let nextG = { ...g };
      if (ovr) nextG = { ...nextG, ...ovr };
      return nextG as Grade;
    });
  }, [grades, overrides]);

  const levelTotals = useMemo(() => {
    const totals: any = {};
    activeLevels.forEach(lvl => {
      const levelGrades = reactiveGrades.filter(g => g.class_level === lvl.level);
      const studentCount = levelGrades.reduce((sum, g) => sum + (g.student_count || 0), 0);
      const classCount = levelGrades.length;

      let planHours = 0;
      const splitBySubject: any = {};
      SPLIT_KEYS.forEach(k => splitBySubject[k] = 0);
      let extraHours = 0;
      let indivHours = 0;
      let homeHours = 0;
      let specialHours = 0;
      let clubHours = 0;
      let splitTotal = 0;

      levelGrades.forEach(g => {
        const gs = g.grade_subjects || [];

        // 1. Plan Hours (STRICTLY FROM GRADE_SUBJECTS)
        const gPlan = gs.filter(i => {
           const ed = i.education_type?.toLowerCase() || '';
           const sid = Number(i.subject_id);
           return (ed === 'umumi' || ed === 'ümumi' || ed === '') && !i.is_extracurricular && sid !== SUBJECT_IDS.CLUB && !!i.is_teaching_activity;
        }).reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);
        planHours += gPlan;

        // 2. Extra (STRICTLY FROM GRADE_SUBJECTS)
        const extra = gs.filter(i => i.is_extracurricular && Number(i.subject_id) !== SUBJECT_IDS.CLUB).reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);
        extraHours += extra;

        const indiv = gs.filter(i => i.education_type?.toLowerCase() === 'ferdi').reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);
        indivHours += indiv;

        const home = gs.filter(i => i.education_type?.toLowerCase() === 'evde').reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);
        homeHours += home;

        const special = gs.filter(i => i.education_type?.toLowerCase() === 'xususi').reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);
        specialHours += special;

        const club = gs.filter(i => Number(i.subject_id) === SUBJECT_IDS.CLUB).reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);
        clubHours += club;

        SPLIT_KEYS.forEach(k => {
          const val = g[k] !== null && g[k] !== undefined ? Number(g[k]) : 0;
          splitBySubject[k] += val;
          splitTotal += val;
        });
      });

      totals[lvl.level] = {
        studentCount, classCount, plan: planHours, splitBySubject,
        split: splitTotal, extra: extraHours, indiv: indivHours,
        home: homeHours, special: specialHours, club: clubHours,
        total: planHours + splitTotal + extraHours + indivHours + homeHours + specialHours + clubHours
      };
    });
    return totals;
  }, [reactiveGrades, activeLevels]);

  const grandTotal = useMemo(() => {
    const res = { studentCount: 0, classCount: 0, plan: 0, split: 0, extra: 0, indiv: 0, home: 0, special: 0, club: 0, total: 0 };
    Object.values(levelTotals).forEach((lt: any) => {
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

  // ─── Calculations for Summary ───────────────────────────────────────────────
  const mpStats = useMemo(() => {
    const s = {
      cadvel2: 0, // Umumi (not 56, 57)
      cadvel3: 0, // Extra (56)
      cadvel4: 0, // Ferdi
      cadvel5: 0, // Evde
      cadvel6: 0, // Xususi
      dernek: 0,  // Dernek (57)
      total: 0
    };

    // Deduplicate Master Plan by (class_level, subject_id, education_type, is_extra) to prevent double counting across sections
    const rowMap: Record<string, any> = {};
    masterPlan.forEach((item: any) => {
      const key = `${item.class_level}_${item.subject_id}_${item.education_type}_${item.is_extra ? '1' : '0'}`;
      rowMap[key] = item;
    });

    Object.values(rowMap).forEach((item: any) => {
      const h = Number(item.hours) || 0;
      const gc = Number(item.group_count) || 1;
      const totalH = h * gc;
      const sid = Number(item.subject_id);
      const ed = item.education_type?.toLowerCase() || '';

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

  const stats = useMemo(() => ({
    umumi: grandTotal.plan + grandTotal.split,
    ferdi: grandTotal.indiv,
    evde: grandTotal.home,
    xususi: grandTotal.special,
    extra: grandTotal.extra,
    dernek: grandTotal.club,
    total: grandTotal.total
  }), [grandTotal]);

  const vacantStats = useMemo(() => {
    const res = {
      dernek: { tot: mpStats.dernek, ass: 0 },
      c2: { tot: mpStats.cadvel2, ass: 0 },
      c3: { tot: mpStats.cadvel3, ass: 0 },
      c4: { tot: mpStats.cadvel4, ass: 0 },
      c5: { tot: mpStats.cadvel5, ass: 0 },
      c6: { tot: mpStats.cadvel6, ass: 0 },
    };

    assignedHours.forEach((it: any) => {
      const val = Number(it.total_assigned) || 0;
      const sid = Number(it.subject_id);
      const ed = it.education_type;
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

  const categoryLimits = useMemo(() => {
    const limits: Record<number, Record<string, number>> = {};
    masterPlan.forEach((item: any) => {
      const lvl = Number(item.class_level);
      if (!limits[lvl]) limits[lvl] = { umumi: 0, ferdi: 0, evde: 0, xususi: 0, extra: 0, dernek: 0 };
      const val = (Number(item.hours) || 0) * (Number(item.group_count) || 1);
      const sid = Number(item.subject_id);
      const ed = item.education_type;
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

  const displayStats = useMemo(() => (activeTab === 'subjects' ? localStats : stats), [activeTab, localStats, stats]);

  // Level Expand state
  const [levelExpanded, setLevelExpanded] = useState<Set<number>>(new Set());

  const toggleLevel = (lvl: number) => {
    setLevelExpanded(prev => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  };

  // ─── Data Extraction from API ────────────────────────────────────────────────
  const getSubjTotal = (cls: Grade, matchers: string[], exclude?: string[]) => {
    if (!cls.grade_subjects) return 0;
    return cls.grade_subjects
      .filter(s => {
        const name = s.subject_name?.toLowerCase() || '';
        const edType = s.education_type?.toLowerCase() || '';
        const isUmumi = edType === 'umumi' || edType === 'ümumi';
        const matches = matchers.some(m => name.includes(m.toLowerCase()));
        const excluded = exclude && exclude.some(e => name.includes(e.toLowerCase()));
        return isUmumi && matches && !excluded;
      })
      .reduce((sum, s) => sum + (Number(s.weekly_hours) || 0), 0);
  };

  const getSplit = (cls: Grade, level: number): SplitHours => {
    const empty = BASE_DATA.find(b => b.level === level)?.defaultSplit || {
      split_foreign_lang_1: 0, split_foreign_lang_2: 0, split_physical_ed: 0,
      split_informatics: 0, split_technology: 0, split_state_lang: 0,
      split_steam: 0, split_digital_skills: 0,
    };

    // Grade modelindəki split_* field-lər backend tərəfindən saxlanılıbsa — birbaşa istifadə et
    const hasSavedSplits = SPLIT_KEYS.some(k => cls[k] != null && Number(cls[k]) > 0);
    if (hasSavedSplits) {
      return {
        split_foreign_lang_1: Number(cls.split_foreign_lang_1 ?? 0),
        split_foreign_lang_2: Number(cls.split_foreign_lang_2 ?? 0),
        split_physical_ed:    Number(cls.split_physical_ed    ?? 0),
        split_informatics:    Number(cls.split_informatics     ?? 0),
        split_technology:     Number(cls.split_technology      ?? 0),
        split_state_lang:     Number(cls.split_state_lang      ?? 0),
        split_steam:          Number(cls.split_steam           ?? 0),
        split_digital_skills: Number(cls.split_digital_skills  ?? 0),
      };
    }

    // Fallback: grade_subjects-dən ad əsaslı hesabla (köhnə davranış)
    if (!cls.grade_subjects || cls.grade_subjects.length === 0) return empty;

    return {
      split_foreign_lang_1: getSubjTotal(cls, ['xarici dil', 'ingilis', 'rus dili', 'fransız', 'alman'], ['ikinci']),
      split_foreign_lang_2: getSubjTotal(cls, ['ikinci xarici dil', '2-ci xarici', 'ii xarici']),
      split_physical_ed:    getSubjTotal(cls, ['fiziki tərbiyə', 'fiziki terbiyə']),
      split_informatics:    getSubjTotal(cls, ['informatika']),
      split_technology:     getSubjTotal(cls, ['texnologiya']),
      split_state_lang:     getSubjTotal(cls, ['dövlət dili']),
      split_steam:          getSubjTotal(cls, ['steam']),
      split_digital_skills: getSubjTotal(cls, ['rəqəmsal', 'rəqəmsal bacarıq']),
    };
  };

  const getExtraOrIndiv = (cls: Grade, type: 'extra'|'indiv'|'home'|'special') => {
    if (!cls.grade_subjects) return 0;
    const typeMap = { extra: 'extra', indiv: 'ferdi', home: 'evde', special: 'xususi' };
    return cls.grade_subjects
      .filter(s => s.education_type?.toLowerCase() === typeMap[type])
      .reduce((sum, s) => sum + (Number(s.weekly_hours) || 0), 0);
  };

  const masterPlanByGrade = useMemo(() => {
    const map: Record<number, any[]> = {};
    masterPlan.forEach((item: any) => {
      const gid = Number(item.grade_id);
      if (!map[gid]) map[gid] = [];
      map[gid].push(item);
    });
    return map;
  }, [masterPlan]);

  const handleExportYigim = async () => {
    const director = teachers.find(t => t.position_type === 'direktor');
    const metadata: ExportMetadata = {
      regionalName: currentUser?.region?.name || 'Regional Təhsil İdarəsi',
      schoolName: currentUser?.institution?.name || 'Ümumtəhsil Məktəbi',
      academicYear: activeYear?.name || '',
      directorName: director ? `${director.last_name} ${director.first_name} ${(director as any).patronymic || ''}` : ''
    };

    const headers = [
      ['№', 'Siniflər', 'Şagird sayı', 'Sinif sayı', 'Tədris planı üzrə saat', 'Bölünən dərslərin sayı', '', '', '', '', '', '', '', 'Bölünən cəmi', 'YEKUN CƏMİ', 'Dərsdənkənar məşğələ', 'Məktəbdə fərdi təhsil', 'Evdə təhsil', 'Xüsusi təhsil', 'ÜMUMİ SAATLARIN CƏMİ'],
      ['', '', '', '', '', ...SPLIT_LABELS.map(l => l.join(' ')), '', '', '', '', '', '']
    ];

    const exportData: any[][] = [];
    BASE_DATA.forEach(b => {
      const clsList = (reactiveGrades.filter(c => c.class_level === b.level) || []).sort((a,b)=>a.name.localeCompare(b.name));
      if (clsList.length === 0) return;

      const lt = levelTotals[b.level];
      // Level row
      exportData.push([
        '',
        `${b.label} SİNİF KOMPLEKTLƏRİ`,
        lt.studentCount, lt.classCount, lt.plan,
        ...SPLIT_KEYS.map(k => lt.splitBySubject?.[k] || 0),
        lt.split, (lt.plan + lt.split).toFixed(1),
        lt.extra, lt.indiv, lt.home, lt.special, lt.club, lt.total.toFixed(1)
      ]);

      // Class rows
      clsList.forEach((c, cidx) => {
        const gs = c.grade_subjects || [];
        const planRaw = gs.filter(i => {
          const ed = i.education_type?.toLowerCase() || '';
          const sid = Number(i.subject_id);
          return (ed === 'umumi' || ed === 'ümumi') && !i.is_extracurricular && sid !== 57;
        }).reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const plan = c.curriculum_hours !== null && c.curriculum_hours !== undefined ? Number(c.curriculum_hours) : planRaw;
        const splSum = SPLIT_KEYS.reduce((sum, k) => sum + (Number(c[k]) || 0), 0);
        const extraRaw = gs.filter(i => i.is_extracurricular && Number(i.subject_id) !== SUBJECT_IDS.CLUB).reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const extra = c.extra_hours !== null && c.extra_hours !== undefined ? Number(c.extra_hours) : extraRaw;
        const indivRaw = gs.filter(i => i.education_type?.toLowerCase() === 'ferdi').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const indiv = c.individual_hours !== null && c.individual_hours !== undefined ? Number(c.individual_hours) : indivRaw;
        const homeRaw = gs.filter(i => i.education_type?.toLowerCase() === 'evde').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const home = c.home_hours !== null && c.home_hours !== undefined ? Number(c.home_hours) : homeRaw;
        const specialRaw = gs.filter(i => i.education_type?.toLowerCase() === 'xususi').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const special = c.special_hours !== null && c.special_hours !== undefined ? Number(c.special_hours) : specialRaw;
        const clubRaw = gs.filter(i => Number(i.subject_id) === SUBJECT_IDS.CLUB).reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const club = c.club_hours !== null && c.club_hours !== undefined ? Number(c.club_hours) : clubRaw;

        exportData.push([
          cidx + 1, `${c.class_level > 0 ? c.class_level : 'MH'} ${c.name}`,
          c.real_student_count || c.student_count || 0, 1, plan,
          ...SPLIT_KEYS.map(k => Number(c[k]) || 0),
          splSum, (plan + splSum).toFixed(1),
          extra, indiv, home, special, club, (plan + splSum + extra + indiv + home + special + club).toFixed(1)
        ]);
      });
    });

    // Grand total
    exportData.push([
      '', 'YEKUN', grandTotal.studentCount, grandTotal.classCount, grandTotal.plan,
      ...SPLIT_KEYS.map(k => (Object.values(levelTotals) as any[]).reduce((a, b) => a + (b.splitBySubject?.[k] || 0), 0)),
      grandTotal.split, (grandTotal.plan + grandTotal.split).toFixed(1),
      grandTotal.extra, grandTotal.indiv, grandTotal.home, grandTotal.special, grandTotal.club, grandTotal.total.toFixed(1)
    ]);

    const merges = [
      'A5:A6', 'B5:B6', 'C5:C6', 'D5:D6', 'E5:E6',
      'F5:M5', // Bölünən dərslərin sayı
      'N5:N6', 'O5:O6', 'P5:P6', 'Q5:Q6', 'R5:R6', 'S5:S6', 'T5:T6'
    ];

    await exportToExcelUniversal('Yigim_Cedveli', 'Yığım Cədvəli', headers, exportData, metadata, [5, 25, 10, 8, 12, 6, 6, 6, 6, 6, 6, 6, 6, 10, 12, 12, 12, 12, 12, 15], merges);
  };

  const handleExportWorkload = async () => {
    const director = teachers.find(t => t.position_type === 'direktor');
    const metadata: ExportMetadata = {
      regionalName: currentUser?.region?.name || 'Regional Təhsil İdarəsi',
      schoolName: currentUser?.institution?.name || 'Ümumtəhsil Məktəbi',
      academicYear: activeYear?.name || '',
      directorName: director ? `${director.last_name} ${director.first_name} ${(director as any).patronymic || ''}` : ''
    };

    const headers = [
      ['№', 'Müəllimin S.A.A.', 'Vəzifəsi', 'UTİS kodu', 'İxtisas', 'Qiymətl. növü', 'Qiymətl. balı', 'Ümumi təhsil', 'Fərdi (məktəbdə)', 'Evdə təhsil', 'Xüsusi təhsil', 'Dərsdənkənar', 'Dərnək', 'Cəmi']
    ];

    const exportData = teachers.map((t, i) => [
      i + 1,
      `${t.last_name} ${t.first_name} ${(t as any).patronymic || ''}`,
      t.position_type || '—',
      t.employee_id || '—',
      t.specialty || '—',
      (t as any).assessment_type || '—',
      (t as any).assessment_score ?? '—',
      t.workload_teaching_hours || 0,
      (t as any).workload_individual_school || 0,
      (t as any).workload_home_education || 0,
      (t as any).workload_special_education || 0,
      t.workload_extracurricular_hours || 0,
      t.workload_club_hours || 0,
      t.workload_total_hours || 0
    ]);

    await exportToExcelUniversal('Ders_Bolgusu', 'Dərs Bölgüsü', headers, exportData, metadata, [5, 30, 20, 15, 20, 15, 10, 10, 10, 10, 10, 10, 10, 10]);
  };

  const handleGlobalExport = async (mode: 'all' | 'active') => {
    const director = teachers.find(t => t.position_type === 'direktor');
    const metadata: ExportMetadata = {
      regionalName: currentUser?.region?.name || 'Regional Təhsil İdarəsi',
      schoolName: currentUser?.institution?.name || 'Ümumtəhsil Məktəbi',
      academicYear: activeYear?.name || '',
      directorName: director ? `${director.last_name} ${director.first_name} ${(director as any).patronymic || ''}` : ''
    };

    const sheets: SheetConfig[] = [];

    // --- Tab 1: Yığım Cədvəli & Statistika ---
    if (mode === 'all' || activeTab === 'yigim' || activeTab === 'stats') {
      const hYigim = [
        ['№', 'Siniflər', 'Şagird sayı', 'Sinif sayı', 'Tədris planı üzrə saat', 'Bölünən dərslərin sayı', '', '', '', '', '', '', '', 'Bölünən cəmi', 'YEKUN CƏMİ', 'Dərsdənkənar məşğələ', 'Məktəbdə fərdi təhsil', 'Evdə təhsil', 'Xüsusi təhsil', 'ÜMUMİ SAATLARIN CƏMİ'],
        ['', '', '', '', '', ...SPLIT_LABELS.map(l => l.join(' ')), '', '', '', '', '', '']
      ];
      const dYigim: any[][] = [];
      BASE_DATA.forEach(b => {
        const clsList = (reactiveGrades.filter(c => c.class_level === b.level) || []).sort((a,b)=>a.name.localeCompare(b.name));
        if (clsList.length === 0) return;
        const lt = levelTotals[b.level];
        dYigim.push(['', `${b.label} SİNİF KOMPLEKTLƏRİ`, lt.studentCount, lt.classCount, lt.plan, ...SPLIT_KEYS.map(k => lt.splitBySubject?.[k] || 0), lt.split, (lt.plan + lt.split).toFixed(1), lt.extra, lt.indiv, lt.home, lt.special, lt.club, lt.total.toFixed(1)]);
        clsList.forEach((c, cidx) => {
          const gs = c.grade_subjects || [];
          const pRaw = gs.filter(i => (i.education_type?.toLowerCase() || '') === 'umumi').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
          const plan = c.curriculum_hours !== null && c.curriculum_hours !== undefined ? Number(c.curriculum_hours) : pRaw;
          const spl = SPLIT_KEYS.reduce((sum, k) => sum + (Number(c[k]) || 0), 0);
          const extra = c.extra_hours ?? gs.filter(i => i.is_extracurricular && Number(i.subject_id) !== SUBJECT_IDS.CLUB).reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
          const indiv = c.individual_hours ?? gs.filter(i => i.education_type?.toLowerCase() === 'ferdi').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
          const home = c.home_hours ?? gs.filter(i => i.education_type?.toLowerCase() === 'evde').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
          const special = c.special_hours ?? gs.filter(i => i.education_type?.toLowerCase() === 'xususi').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
          const club = c.club_hours ?? gs.filter(i => Number(i.subject_id) === SUBJECT_IDS.CLUB).reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
          dYigim.push([cidx + 1, `${c.class_level > 0 ? c.class_level : 'MH'} ${c.name}`, c.real_student_count || c.student_count || 0, 1, plan, ...SPLIT_KEYS.map(k => Number(c[k]) || 0), spl, (plan + spl).toFixed(1), extra, indiv, home, special, club, (plan + spl + extra + indiv + home + special).toFixed(1)]);
        });
      });
      dYigim.push(['', 'YEKUN', grandTotal.studentCount, grandTotal.classCount, grandTotal.plan, ...SPLIT_KEYS.map(k => (Object.values(levelTotals) as any[]).reduce((a, b) => a + (b.splitBySubject?.[k] || 0), 0)), grandTotal.split, (grandTotal.plan + grandTotal.split).toFixed(1), grandTotal.extra, grandTotal.indiv, grandTotal.home, grandTotal.special, grandTotal.club, grandTotal.total.toFixed(1)]);
      sheets.push({ sheetName: 'Yığım Cədvəli', headers: hYigim, data: dYigim, merges: ['A5:A6', 'B5:B6', 'C5:C6', 'D5:D6', 'E5:E6', 'F5:M5', 'N5:N6', 'O5:O6', 'P5:P6', 'Q5:Q6', 'R5:R6', 'S5:S6', 'T5:T6'], columnWidths: [5, 25, 10, 8, 12, 6, 6, 6, 6, 6, 6, 6, 6, 10, 12, 12, 12, 12, 12, 15] });
    }

    // --- Tab 2: Fənn və Vakansiyalar (Master Plan) ---
    if (mode === 'all' || activeTab === 'subjects') {
      const LEVELS_XLSX = [
        { key: 'mh', label: 'Mh', level: 0 }, { key: '1',  label: 'I',  level: 1 }, { key: '2',  label: 'II', level: 2 },
        { key: '3',  label: 'III',level: 3 }, { key: '4',  label: 'IV', level: 4 }, { key: '5',  label: 'V',  level: 5 },
        { key: '6',  label: 'VI', level: 6 }, { key: '7',  label: 'VII',level: 7 }, { key: '8',  label: 'VIII',level:8 },
        { key: '9',  label: 'IX', level: 9 }, { key: '10', label: 'X',  level: 10 }, { key: '11', label: 'XI', level: 11 },
      ];
      const hMaster = [['№', 'Fənn', 'Təhsil Növü', ...LEVELS_XLSX.map(l => l.label), 'Cəmi', 'Təyin edilib', 'Vakant']];

      const groups: Record<string, any[]> = {};
      masterPlan.forEach((item: any) => {
        const key = `${item.subject_id}_${item.education_type}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      const dMaster = Object.entries(groups).map(([key, items], idx) => {
        const [subjId, edType] = key.split('_');
        const hMap: Record<string, number> = {};
        items.forEach(it => {
          const lKey = LEVELS_XLSX.find(l => l.level === it.class_level)?.key;
          if (lKey) hMap[lKey] = Number(it.hours) || 0;
        });

        const total = LEVELS_XLSX.reduce((s, l) => s + (hMap[l.key] || 0), 0);
        const assigned = assignedHours.find((a: any) => a.subject_id === Number(subjId) && a.education_type === edType)?.total_assigned || 0;

        return [
          idx + 1, items[0].subject?.name || '—', edType.toUpperCase(),
          ...LEVELS_XLSX.map(l => hMap[l.key] || 0),
          total, assigned, total - assigned
        ];
      });
      sheets.push({ sheetName: 'Fənn və Vakansiyalar', headers: hMaster, data: dMaster, columnWidths: [5, 25, 12, ...LEVELS_XLSX.map(() => 6), 10, 10, 10] });
    }

    // --- Tab 3: Sinif Tədris Planı (Grades) ---
    if (mode === 'all' || activeTab === 'grades') {
      const hGrades = [['№', 'Sinif', 'Şagird Sayı', 'Tədris Planı (Saat)', 'Bölünən (Cəmi)', 'Dərsdənkənar', 'Fərdi', 'Evdə', 'Xüsusi', 'Dərnək', 'Toplam']];
      const dGrades = reactiveGrades.map((g, i) => {
        const spl = SPLIT_KEYS.reduce((s, k) => s + (Number(g[k]) || 0), 0);
        const gs = g.grade_subjects || [];
        const p = g.curriculum_hours ?? gs.filter(it => (it.education_type?.toLowerCase() || '') === 'umumi').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const ex = g.extra_hours ?? gs.filter(it => it.is_extracurricular && Number(it.subject_id) !== SUBJECT_IDS.CLUB).reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const ind = g.individual_hours ?? gs.filter(it => it.education_type?.toLowerCase() === 'ferdi').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const hom = g.home_hours ?? gs.filter(it => it.education_type?.toLowerCase() === 'evde').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const spc = g.special_hours ?? gs.filter(it => it.education_type?.toLowerCase() === 'xususi').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const clb = g.club_hours ?? gs.filter(it => Number(it.subject_id) === SUBJECT_IDS.CLUB).reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        return [i + 1, `${g.class_level}${g.name}`, g.student_count || 0, p, spl, ex, ind, hom, spc, clb, p + spl + ex + ind + hom + spc + clb];
      });
      sheets.push({ sheetName: 'Sinif Tədris Planı', headers: hGrades, data: dGrades, columnWidths: [5, 15, 12, 15, 15, 15, 12, 12, 12, 12, 15] });
    }

    // --- Tab 4: Dərs Bölgüsü ---
    if (mode === 'all' || activeTab === 'workload') {
      const hWorkload = [['№', 'Müəllimin S.A.A.', 'Vəzifəsi', 'UTİS kodu', 'İxtisas', 'Ümumi təhsil', 'Fərdi (məktəbdə)', 'Evdə təhsil', 'Xüsusi təhsil', 'Dərsdənkənar', 'Dərnək', 'Cəmi']];
      const dWorkload = teachers.map((t, i) => [i + 1, `${t.last_name} ${t.first_name} ${(t as any).patronymic || ''}`, t.position_type || '—', t.employee_id || '—', t.specialty || '—', t.workload_teaching_hours || 0, (t as any).workload_individual_school || 0, (t as any).workload_home_education || 0, (t as any).workload_special_education || 0, t.workload_extracurricular_hours || 0, t.workload_club_hours || 0, t.workload_total_hours || 0]);
      sheets.push({ sheetName: 'Dərs Bölgüsü', headers: hWorkload, data: dWorkload, columnWidths: [5, 30, 20, 15, 20, 10, 10, 10, 10, 10, 10, 10] });
    }

    // --- Tab 5: Dərs Bölgüsü Detallı ---
    if (mode === 'all' || activeTab === 'class_subject') {
      try {
        const resp = await curriculumService.getDetailedWorkload(institutionId!, academicYearId!);
        const detailData = resp || [];
        const hDetail = [['№', 'Müəllim S.A.A.', 'Vəzifəsi', 'UTİS kodu', 'İxtisas', 'Sinif', 'Fənn', 'Ümumi', 'Fərdi', 'Evdə', 'Xüsusi', 'Dərsdənkənar', 'Dərnək', 'Cəmi']];
        const dDetail = detailData.map((row: any, idx: number) => [
          idx + 1, `${row.last_name} ${row.first_name} ${row.patronymic || ''}`, row.position_type || '—', row.employee_id || '—', row.specialty || '—',
          `${row.grade_level}${row.section}`, row.subject_name || '—', row.umumi_hours || 0, row.individual_school_hours || 0, row.home_education_hours || 0,
          row.special_education_hours || 0, row.extracurricular_hours || 0, row.club_hours || 0, row.total_hours || 0
        ]);
        sheets.push({ sheetName: 'Dərs Bölgüsü Detallı', headers: hDetail, data: dDetail, columnWidths: [5, 25, 20, 15, 20, 10, 20, 8, 8, 8, 8, 10, 8, 10] });
      } catch (e) {
        console.error("Detailed workload fetch failed", e);
      }
    }

    await exportMultipleSheets(mode === 'all' ? 'Tedris_Plani_Butun' : `Export_${activeTab}`, sheets, metadata);
  };

  if (loadingGrades && grades.length === 0) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-[1600px] mx-auto space-y-6"
        >
          {/* Return Comment Alert for School */}
          {approval.status === 'returned' && approval.return_comment && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Alert className='bg-amber-50 border-amber-200 text-amber-900 rounded-2xl p-4 shadow-sm mb-6'>
                <Info className='h-5 w-5 text-amber-600' />
                <AlertTitle className='text-sm font-black uppercase tracking-tighter mb-1'>Düzəliş tələb olunur</AlertTitle>
                <AlertDescription className='text-sm font-medium'>
                  Plan sektor tərəfindən geri qaytarılıb. Səbəb: <span className='font-bold underline decoration-amber-300 decoration-2'>{approval.return_comment}</span>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Deadline Warning for School Admin */}
          {isSchoolAdmin && deadline && (approval.status === 'draft' || approval.status === 'returned') && 
            new Date(deadline).getTime() - new Date().getTime() > 0 &&
            new Date(deadline).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Alert className="bg-rose-50 border-rose-200 text-rose-900 rounded-2xl p-4 shadow-sm border-2 animate-pulse mb-6">
                <Clock className="h-5 w-5 text-rose-600" />
                <AlertTitle className="text-sm font-black uppercase tracking-tighter mb-1">Diqqət: Vaxt az qalır!</AlertTitle>
                <AlertDescription className="text-sm font-medium">
                  Təsdiqə göndərmək üçün <span className="font-bold underline">24 saatdan az</span> vaxtınız qalıb. Zəhmət olmasa planı tamamlayın və göndərin.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Premium High-Impact Header Section */}
          <header className={cn(
            "flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-10 rounded-[3rem] border transition-all duration-500",
            isSchoolAdmin 
              ? "bg-white border-slate-200 shadow-2xl shadow-slate-200/50 mb-10" 
              : "bg-white/60 backdrop-blur-xl border-white"
          )}>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex items-center gap-4">
                {urlId && (
                  <button 
                    onClick={() => navigate('/curriculum/dashboard')}
                    className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center justify-center group"
                    title="Siyahıya qayıt"
                  >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  </button>
                )}
                <div className={cn(
                  "w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all shrink-0",
                  isSchoolAdmin 
                    ? "bg-gradient-to-br from-indigo-600 to-blue-700 shadow-indigo-200/50" 
                    : "bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-300/40"
                )}>
                  <BookOpen className="text-white h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase italic leading-none">
                    {isSchoolAdmin ? "Dərs yükü və Vakansiya" : "Kurikulum Planı"}
                    {isSaving && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1.5 text-[10px] text-amber-600 font-black bg-amber-50 px-3 py-0.5 rounded-full border border-amber-100 uppercase italic shadow-sm"
                      >
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Autosave
                      </motion.span>
                    )}
                  </h1>
                  <p className="text-xs text-slate-400 font-black italic uppercase tracking-[0.2em] mt-2 leading-none">
                    {activeYear?.name || '---'} ÜZRƏ İDARƏETMƏ PANELİ
                  </p>
                </div>
              </div>

              {/* Integrated Actions (Status, Toolbar & Export) */}
              <div className="flex flex-col lg:flex-row items-center gap-6 ml-auto">
                <CurriculumApprovalToolbar 
                  approval={approval}
                  userRole={userRole}
                  deadline={deadline}
                  onSubmit={() => handleWorkflowAction('submit')}
                  onApprove={() => handleWorkflowAction('approve')}
                  onReturn={(comment) => handleWorkflowAction('return', comment)}
                  onReset={() => handleWorkflowAction('reset')}
                  isProcessing={isProcessingApproval}
                  isMinimal={true}
                />
              </div>
            </div>

            {/* Premium Export Actions */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <button 
                  className="flex items-center gap-3 px-8 py-5 rounded-[1.5rem] text-[11px] font-black transition-all shadow-xl border bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 hover:shadow-emerald-200/50 uppercase tracking-[0.2em]"
                >
                  <Download size={18} className="stroke-[3px]" /> EKSPORT
                </button>
                  <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
                    <div className="p-2 space-y-1">
                      <button 
                        onClick={() => handleGlobalExport('active')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <LayoutDashboard size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">Cari Görünüş</p>
                          <p className="text-[9px] text-slate-400 font-bold tracking-tight">Yalnız bu tabı yüklə</p>
                        </div>
                      </button>
                      <div className="h-px bg-slate-100 mx-2"></div>
                      <button 
                        onClick={() => handleGlobalExport('all')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-600 group/item text-left transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                          <Database size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-800 group-hover/item:text-white uppercase tracking-tighter text-indigo-900">Bütün Plan</p>
                          <p className="text-[9px] text-slate-400 group-hover/item:text-indigo-100 font-bold tracking-tight">Vahid Excel Faylı</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          </header>



          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="flex items-center gap-1 p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-2xl w-fit border border-slate-200/50 mb-8 overflow-x-auto no-scrollbar">
              <TabsTrigger value="stats" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                STATİSTİKA
              </TabsTrigger>
              <TabsTrigger value="yigim" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                YIĞIM CƏDVƏLİ
              </TabsTrigger>
              <TabsTrigger value="subjects" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                FƏNN VƏ VAKANSİYALAR
              </TabsTrigger>
              <TabsTrigger value="grades" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                SİNİF TƏDRİS PLANI
              </TabsTrigger>
              <TabsTrigger value="workload" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                DƏRS BÖLGÜSÜ
              </TabsTrigger>
              <TabsTrigger value="class_subject" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                DƏRS BÖLGÜSÜ DETALLI
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'stats' && (
                  <div className="space-y-8">
                    <CurriculumSummaryTiles
                      stats={mpStats}
                      vacantStats={vacantStats}
                      grandTotal={grandTotal}
                    />
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <CurriculumYigimTable
                        title="CƏDVƏL 1 (YIĞIM MÜQAYİSƏSİ)"
                        headers={["MÜVAFİQ CƏDVƏLLƏR ÜZRƏ", "ÜMUMİ SAAT", "PLAN (FAKT)", "FƏRQ"]}
                        rows={[
                          { label: 'I - XI siniflər üzrə dərs saatları', master: mpStats.cadvel2, cadvel: grandTotal.plan + grandTotal.split },
                          { label: 'Dərsdənkənar məşğələlər', master: mpStats.cadvel3, cadvel: grandTotal.extra },
                          { label: 'Məktəbdə fərdi təhsil', master: mpStats.cadvel4, cadvel: grandTotal.indiv },
                          { label: 'Evdə təhsil', master: mpStats.cadvel5, cadvel: grandTotal.home },
                          { label: 'Xüsusi təhsil', master: mpStats.cadvel6, cadvel: grandTotal.special },
                          { label: 'Dərnək məşğələləri', master: mpStats.dernek, cadvel: grandTotal.club },
                        ]}
                        totalMaster={mpStats.total}
                        totalFact={grandTotal.total}
                      />

                      <CurriculumYigimTable
                        title="CƏDVƏL 2 (VAKANSİYA STATİSTİKASI)"
                        headers={["FƏALİYYƏT / VAKANSİYA", "ÜMUMİ SAAT", "TƏYİN EDİLDİ", "VAKANSİYA"]}
                        rows={[
                          { label: "I - XI siniflər üzrə dərs saatları", master: vacantStats.c2.tot, cadvel: vacantStats.c2.ass },
                          { label: "Dərsdənkənar məşğələlər", master: vacantStats.c3.tot, cadvel: vacantStats.c3.ass },
                          { label: "Məktəbdə fərdi təhsil", master: vacantStats.c4.tot, cadvel: vacantStats.c4.ass },
                          { label: "Evdə təhsil", master: vacantStats.c5.tot, cadvel: vacantStats.c5.ass },
                          { label: "Xüsusi təhsil", master: vacantStats.c6.tot, cadvel: vacantStats.c6.ass },
                          { label: "Dərnək məşğələləri", master: vacantStats.dernek.tot, cadvel: vacantStats.dernek.ass },
                        ]}
                        totalMaster={vacantTotal.tot}
                        totalFact={vacantTotal.ass}
                      />
                    </div>
                  </div>
                )}

                {activeTab === "yigim" && (
                  <div className="bg-white rounded-3xl shadow-premium overflow-hidden border border-slate-200/60 transition-all">
                    <div className="overflow-x-auto relative scrollbar-premium">
                      <table className="w-full text-xs border-collapse whitespace-nowrap">
                        <thead className="sticky top-0 z-30 shadow-sm border-b border-slate-200">
                          <tr className="bg-slate-50/90 backdrop-blur-md text-slate-600 font-bold uppercase tracking-wider h-16">
                            <th rowSpan={2} className="px-5 text-center border-r border-slate-100 sticky left-0 z-30 bg-slate-50/90" style={{width: 50}}>№</th>
                            <th rowSpan={2} className="px-8 text-left border-r border-slate-100 sticky left-[50px] z-30 bg-slate-50/90 shadow-[2px_0_15px_rgba(0,0,0,0.05)] font-black text-slate-800" style={{minWidth: 260}}>Siniflər</th>
                            <th rowSpan={2} className="px-5 text-center border-r border-slate-100">Şagird<br/>Sayı</th>
                            <th rowSpan={2} className="px-5 text-center border-r border-slate-100">Sinif<br/>Sayı</th>
                            <th rowSpan={2} className="px-8 text-center border-r border-slate-100 bg-indigo-50/50 text-indigo-950/80 font-black">Tədris Planı<br/>Üzrə Saat</th>
                            <th colSpan={8} className="px-5 text-center bg-slate-100/50 border-b border-slate-100 font-black text-[10px] tracking-widest text-slate-500">Bölünən dərslərin sayı</th>
                            <th rowSpan={2} className="px-8 text-center border-x border-slate-100 bg-indigo-50/50 text-indigo-950/80 font-black">Bölünən<br/>Cəmi</th>
                            <th rowSpan={2} className="px-8 text-center bg-indigo-600 text-white font-black shadow-lg shadow-indigo-100">Yekun<br/>Cəmi</th>
                            <th rowSpan={2} className="px-5 text-center border-r border-slate-100 text-slate-600 font-bold">Dərsdənkənar</th>
                            <th rowSpan={2} className="px-5 text-center border-r border-slate-100 text-slate-600 font-bold">Fərdi</th>
                            <th rowSpan={2} className="px-5 text-center border-r border-slate-100 text-slate-600 font-bold">Evdə</th>
                            <th rowSpan={2} className="px-5 text-center border-r border-slate-100 text-slate-600 font-bold">Xüsusi</th>
                            <th rowSpan={2} className="px-5 text-center border-r border-slate-100 text-slate-600 font-bold">Dərnək</th>
                            <th rowSpan={2} className="px-8 text-center bg-slate-900 text-white font-black">Cəmi Saat</th>
                          </tr>
                          <tr className="bg-slate-50/50 text-slate-400 text-[9px] h-12">
                            {SPLIT_LABELS.map((lbl, idx) => (
                              <th key={idx} className="px-2 text-center border-r border-slate-100 min-w-[50px] font-medium">
                                {lbl[0]}<br/>{lbl[1]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {BASE_DATA.map((b, bidx) => {
                            const clsList = (reactiveGrades.filter(c => c.class_level === b.level) || []).sort((a,b)=>a.name.localeCompare(b.name));
                            const count = clsList.length;
                            if (count === 0) return null;

                            const isLvlExp = levelExpanded.has(b.level);
                            const lt = levelTotals[b.level] || { studentCount: 0, classCount: 0, plan: 0, splitBySubject: {}, split: 0, extra: 0, indiv: 0, home: 0, special: 0, club: 0, total: 0 };

                            return (
                              <React.Fragment key={b.level}>
                                <tr
                                  className={cn(
                                    "cursor-pointer transition-all h-11",
                                    isLvlExp ? "bg-indigo-50/50" : "bg-slate-50 hover:bg-slate-100/80"
                                  )}
                                  onClick={() => toggleLevel(b.level)}
                                >
                                  <td className="px-4 text-center font-bold text-slate-400 border-r border-slate-100/50 sticky left-0 z-20 bg-slate-50/50">{bidx + 1}</td>
                                  <td className="px-6 text-[11px] font-black text-slate-700 flex items-center gap-3 sticky left-[40px] z-20 bg-slate-50/50 border-r border-slate-100 shadow-[1px_0_10px_rgba(0,0,0,0.03)]">
                                    <div className={cn("p-1 transition-transform duration-300", isLvlExp ? "text-slate-800 rotate-180" : "text-slate-300")}>
                                      <ChevronDown size={14}/>
                                    </div>
                                    {b.label} SİNİF KOMPLEKTLƏRİ
                                  </td>
                                  <td className="px-4 text-center font-bold text-slate-500 bg-slate-50/20">{lt.studentCount}</td>
                                  <td className="px-4 text-center font-bold text-slate-500 bg-slate-50/20">{lt.classCount}</td>
                                  <td className="px-6 text-center font-black text-slate-800 bg-slate-50/20 tabular-nums">{n(lt.plan)}</td>
                                  {SPLIT_KEYS.map(k => <td key={k} className="px-2 text-center text-slate-400 font-medium tabular-nums">{nn(lt.splitBySubject?.[k] || 0)}</td>)}
                                  <td className="px-6 text-center font-black text-slate-800 bg-slate-50/20 tabular-nums">{nn(lt.split)}</td>
                                  <td className="px-6 text-center font-black text-slate-900 bg-slate-100 tabular-nums">{(lt.plan + lt.split).toFixed(1)}</td>
                                  <td className="px-4 text-center font-bold text-slate-500 tabular-nums">{nn(lt.extra)}</td>
                                  <td className="px-4 text-center font-bold text-slate-500 tabular-nums">{nn(lt.indiv)}</td>
                                  <td className="px-4 text-center font-bold text-slate-500 tabular-nums">{nn(lt.home)}</td>
                                  <td className="px-4 text-center font-bold text-slate-500 tabular-nums">{nn(lt.special)}</td>
                                  <td className="px-4 text-center font-bold text-slate-500 tabular-nums">{nn(lt.club)}</td>
                                  <td className="px-6 text-center font-black text-white bg-slate-700 tabular-nums">{lt.total.toFixed(1)}</td>
                                </tr>

                                {isLvlExp && clsList.map((c, cidx) => {
                                  const gs = c.grade_subjects || [];

                                  const plan = gs.filter(i => {
                                     const ed = i.education_type?.toLowerCase() || '';
                                     const sid = Number(i.subject_id);
                                     return (ed === 'umumi' || ed === 'ümumi' || ed === '') && !i.is_extracurricular && sid !== SUBJECT_IDS.CLUB && !!i.is_teaching_activity;
                                  }).reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);

                                  const splSum = SPLIT_KEYS.reduce((sum, k) => sum + (Number(c[k]) || 0), 0);

                                  const extra = gs.filter(i => i.is_extracurricular && Number(i.subject_id) !== SUBJECT_IDS.CLUB).reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);

                                  const indiv = gs.filter(i => i.education_type?.toLowerCase() === 'ferdi').reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);

                                  const home = gs.filter(i => i.education_type?.toLowerCase() === 'evde').reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);

                                  const special = gs.filter(i => i.education_type?.toLowerCase() === 'xususi').reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);

                                  const club = gs.filter(i => Number(i.subject_id) === SUBJECT_IDS.CLUB).reduce((a, b) => a + ((Number(b.weekly_hours) || 0) * (Number(b.group_count) || 1)), 0);

                                  const total = plan + splSum + extra + indiv + home + special + club;

                                  return (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors h-11 border-b border-slate-50">
                                      <td className="px-4 text-center font-medium text-slate-400 border-r border-slate-50 sticky left-0 z-10 bg-white">{cidx + 1}</td>
                                      <td className="px-6 text-[11px] font-bold text-slate-600 pl-12 border-r border-slate-50 sticky left-[40px] z-10 bg-white shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                                        {c.class_level > 0 ? c.class_level : 'MH'} {c.name}
                                      </td>
                                      <td className="px-4 text-center font-medium text-slate-500 tabular-nums">{c.real_student_count || c.student_count || 0}</td>
                                      <td className="px-4 text-center font-medium text-slate-500 tabular-nums">1</td>
                                      <td className="px-6 text-center tabular-nums bg-indigo-50/20">
                                        <EditableNumber
                                          value={c.curriculum_hours}
                                          placeholder={plan.toString()}
                                          onChange={(val) => !isLocked && handleUpdateGrade(c.id, { curriculum_hours: val })}
                                          disabled={isLocked}
                                        />
                                      </td>
                                      {SPLIT_KEYS.map((k) => (
                                        <td key={k} className="px-2 text-center tabular-nums">
                                          <EditableNumber
                                            value={c[k]}
                                            onChange={(val) => !isLocked && handleUpdateGrade(c.id, { [k]: val })}
                                            placeholder="0"
                                            disabled={isLocked}
                                          />
                                        </td>
                                      ))}
                                      <td className="px-6 text-center font-bold text-indigo-600/70 tabular-nums bg-indigo-50/20">{nn(splSum)}</td>
                                      <td className="px-6 text-center font-bold text-indigo-700 bg-indigo-100/50 tabular-nums">{n(plan + splSum)}</td>
                                      <td className="px-4 text-center">
                                        <EditableNumber 
                                          value={(c as any).extra_hours} 
                                          placeholder={extra.toString()} 
                                          onChange={(val) => !isLocked && handleUpdateGrade(c.id, { extra_hours: val })} 
                                          disabled={isLocked}
                                        />
                                      </td>
                                      <td className="px-4 text-center">
                                        <EditableNumber 
                                          value={(c as any).individual_hours} 
                                          placeholder={indiv.toString()} 
                                          onChange={(val) => !isLocked && handleUpdateGrade(c.id, { individual_hours: val })} 
                                          disabled={isLocked}
                                        />
                                      </td>
                                      <td className="px-4 text-center">
                                        <EditableNumber 
                                          value={(c as any).home_hours} 
                                          placeholder={home.toString()} 
                                          onChange={(val) => !isLocked && handleUpdateGrade(c.id, { home_hours: val })} 
                                          disabled={isLocked}
                                        />
                                      </td>
                                      <td className="px-4 text-center">
                                        <EditableNumber 
                                          value={(c as any).special_hours} 
                                          placeholder={special.toString()} 
                                          onChange={(val) => !isLocked && handleUpdateGrade(c.id, { special_hours: val })} 
                                          disabled={isLocked}
                                        />
                                      </td>
                                      <td className="px-4 text-center">
                                        <EditableNumber 
                                          value={(c as any).club_hours} 
                                          placeholder={club.toString()} 
                                          onChange={(val) => !isLocked && handleUpdateGrade(c.id, { club_hours: val })} 
                                          disabled={isLocked}
                                        />
                                      </td>
                                      <td className="px-6 text-center font-bold text-emerald-600 bg-emerald-50 tabular-nums">{total.toFixed(1)}</td>
                                    </tr>
                                  );
                                })}

                                {GRADE_GROUPS.map((group, groupIdx) => {
                                  if (group.levels[group.levels.length-1] === b.level) {
                                    const gt: any = { studentCount: 0, classCount: 0, plan: 0, splitBySubject: {}, split: 0, extra: 0, indiv: 0, home: 0, special: 0, club: 0, total: 0 };
                                    SPLIT_KEYS.forEach(k => gt.splitBySubject[k] = 0);
                                    group.levels.forEach(l => {
                                      const levelTot = levelTotals[l];
                                      if (levelTot) {
                                        gt.studentCount += levelTot.studentCount; gt.classCount += levelTot.classCount; gt.plan += levelTot.plan;
                                        gt.split += levelTot.split; gt.extra += levelTot.extra; gt.indiv += levelTot.indiv;
                                        gt.home += levelTot.home; gt.special += levelTot.special; gt.club += levelTot.club || 0; gt.total += levelTot.total;
                                        SPLIT_KEYS.forEach(k => gt.splitBySubject[k] += levelTot.splitBySubject?.[k] || 0);
                                      }
                                    });
                                    return (
                                      <tr key={`group-${groupIdx}`} className="bg-slate-50 text-slate-700 h-10 border-b border-slate-200 text-xs font-semibold">
                                        <td colSpan={2} className="px-8 text-left sticky left-0 z-20 bg-slate-50">{group.label} SİNİF KOMPLEKTLƏRİ ÜZRƏ:</td>
                                        <td className="px-4 text-center tabular-nums text-slate-500">{gt.studentCount}</td>
                                        <td className="px-4 text-center tabular-nums text-slate-500">{gt.classCount}</td>
                                        <td className="px-6 text-center tabular-nums text-slate-900">{n(gt.plan)}</td>
                                        {SPLIT_KEYS.map(k => <td key={k} className="px-2 text-center tabular-nums text-slate-400">{n(gt.splitBySubject?.[k])}</td>)}
                                        <td className="px-6 text-center tabular-nums text-slate-900">{n(gt.split)}</td>
                                        <td className="px-6 text-center tabular-nums bg-slate-200/50">{(gt.plan + gt.split).toFixed(1)}</td>
                                        <td className="px-4 text-center tabular-nums text-slate-500 opacity-70">{n(gt.extra)}</td>
                                        <td className="px-4 text-center tabular-nums text-slate-500 opacity-70">{n(gt.indiv)}</td>
                                        <td className="px-4 text-center tabular-nums text-slate-500 opacity-70">{n(gt.home)}</td>
                                        <td className="px-4 text-center tabular-nums text-slate-500 opacity-70">{n(gt.special)}</td>
                                        <td className="px-4 text-center tabular-nums text-slate-500 opacity-70">{n(gt.club)}</td>
                                        <td className="px-6 text-center tabular-nums font-bold text-indigo-700 bg-indigo-50/50">{gt.total.toFixed(1)}</td>
                                      </tr>
                                    );
                                  }
                                  return null;
                                })}
                              </React.Fragment>
                            );
                          })}

                          {/* 1. CƏMİ (Dərnəksiz) */}
                          <tr className="bg-slate-100/80 text-slate-800 h-12 font-bold border-t-2 border-slate-200">
                            <td colSpan={2} className="px-8 text-left text-sm sticky left-0 z-30 bg-slate-100/80">CƏMİ (Dərnəksiz):</td>
                            <td className="px-4 text-center tabular-nums">{grandTotal.studentCount}</td>
                            <td className="px-4 text-center tabular-nums">{grandTotal.classCount}</td>
                            <td className="px-6 text-center tabular-nums">{n(grandTotal.plan)}</td>
                            {SPLIT_KEYS.map((k, idx) => {
                              const groupSplit = (Object.values(levelTotals) as any[]).reduce((a, b) => a + (b.splitBySubject?.[k] || 0), 0);
                              return <td key={idx} className="px-2 text-center tabular-nums opacity-50">{n(groupSplit)}</td>;
                            })}
                            <td className="px-6 text-center tabular-nums">{nn(grandTotal.split)}</td>
                            <td className="px-6 text-center tabular-nums">{ (grandTotal.plan + grandTotal.split).toFixed(1) }</td>
                            <td className="px-4 text-center tabular-nums">{n(grandTotal.extra)}</td>
                            <td className="px-4 text-center tabular-nums">{n(grandTotal.indiv)}</td>
                            <td className="px-4 text-center tabular-nums">{n(grandTotal.home)}</td>
                            <td className="px-4 text-center tabular-nums">{n(grandTotal.special)}</td>
                            <td className="px-4 text-center tabular-nums">—</td>
                            <td className="px-6 text-center text-base bg-slate-200/50 text-slate-900 tabular-nums font-bold">{(grandTotal.total - (grandTotal.club || 0)).toFixed(1)}</td>
                          </tr>

                          {/* 2. DƏRNƏK SAATLARI */}
                          <tr className="bg-amber-50/80 text-amber-800 h-10 font-medium border-t border-amber-100">
                            <td colSpan={2} className="px-8 text-left text-xs sticky left-0 z-30 bg-amber-50/80">Dərnək məşğələləri:</td>
                            <td className="px-4 text-center opacity-30">—</td>
                            <td className="px-4 text-center opacity-30">—</td>
                            <td className="px-6 text-center opacity-30">—</td>
                            {SPLIT_KEYS.map((_, idx) => <td key={idx} className="px-2 text-center opacity-30">—</td>)}
                            <td className="px-6 text-center opacity-30">—</td>
                            <td className="px-6 text-center opacity-30">—</td>
                            <td className="px-4 text-center opacity-30">—</td>
                            <td className="px-4 text-center opacity-30">—</td>
                            <td className="px-4 text-center opacity-30">—</td>
                            <td className="px-4 text-center opacity-30">—</td>
                            <td className="px-4 text-center font-semibold tabular-nums border-x border-amber-200 bg-amber-100/50">{n(grandTotal.club)}</td>
                            <td className="px-6 text-center text-sm bg-amber-100 text-amber-900 tabular-nums font-bold">{n(grandTotal.club)}</td>
                          </tr>

                          {/* 3. ÜMUMİ YEKUN CƏM */}
                          <tr className="bg-slate-800 text-white h-14 shadow-lg relative z-20 font-bold tracking-wide">
                            <td colSpan={2} className="px-8 text-left text-sm sticky left-0 z-30 bg-slate-800 border-r border-slate-700">ÜMUMİ YEKUN CƏM:</td>
                            <td className="px-4 text-center text-lg tabular-nums">{grandTotal.studentCount}</td>
                            <td className="px-4 text-center text-lg tabular-nums">{grandTotal.classCount}</td>
                            <td className="px-6 text-center text-lg tabular-nums opacity-90">{n(grandTotal.plan)}</td>
                            {SPLIT_KEYS.map((k, idx) => {
                              const groupSplit = (Object.values(levelTotals) as any[]).reduce((a, b) => a + (b.splitBySubject?.[k] || 0), 0);
                              return <td key={idx} className="px-2 text-center tabular-nums opacity-50">{n(groupSplit)}</td>;
                            })}
                            <td className="px-6 text-center tabular-nums opacity-75">{nn(grandTotal.split)}</td>
                            <td className="px-6 text-center tabular-nums opacity-80">{(grandTotal.plan + grandTotal.split).toFixed(1)}</td>
                            <td className="px-4 text-center tabular-nums opacity-60">{n(grandTotal.extra)}</td>
                            <td className="px-4 text-center tabular-nums opacity-60">{n(grandTotal.indiv)}</td>
                            <td className="px-4 text-center tabular-nums opacity-60">{n(grandTotal.home)}</td>
                            <td className="px-4 text-center tabular-nums opacity-60">{n(grandTotal.special)}</td>
                            <td className="px-4 text-center tabular-nums opacity-60">{n(grandTotal.club)}</td>
                            <td className="px-6 text-center text-2xl bg-indigo-600 text-white tabular-nums font-black shadow-inner border-l border-indigo-500/50">{grandTotal.total.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      {!loadingGrades && reactiveGrades.length === 0 && (
                        <div className="p-12 text-center text-slate-400 bg-slate-50/30">
                          <Database className="mx-auto h-12 w-12 mb-4 opacity-20" />
                          <p className="text-sm font-medium">Məlumat tapılmadı</p>
                          <p className="text-xs mt-1">Bu təhsil ili üçün sinif tədris planı yaradılmayıb</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'subjects' && (
                  <FennlerVakantlar
                    institutionId={institutionId}
                    academicYearId={academicYearId!}
                    masterPlan={masterPlan}
                    assignedHours={assignedHours}
                    isLocked={isLocked}
                  />
                )}

                {activeTab === 'grades' && (
                  <GradeManager
                    baseConfig={curriculumGradeEntityConfig}
                    initialFilters={{
                      institution_id: institutionId,
                      academic_year_id: academicYearId,
                      include: 'grade_subjects,homeroom_teacher,academic_year,institution'
                    }}
                    masterPlan={masterPlan}
                    categoryLimits={categoryLimits}
                    isLocked={isLocked}
                  />
                )}

                {activeTab === 'workload' && (
                  <div className="bg-white rounded-3xl shadow-premium overflow-hidden border border-slate-200/60 p-1">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Müəllim axtar (ad, soyad, ixtisas...)"
                          value={workloadSearch}
                          onChange={(e) => setWorkloadSearch(e.target.value)}
                          className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                        />
                      </div>
                    </div>

                    {loadingTeachers ? (
                      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                        <p className="text-xs font-bold uppercase tracking-widest">Müəllim siyahısı yüklənir...</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[calc(100vh-350px)] scrollbar-premium">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="sticky top-0 z-10 bg-white shadow-sm">
                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                              <th className="p-5 text-center w-16">№</th>
                              {workloadColumns.map((col) => (
                                <th key={String(col.key)} className="p-5">{col.label}</th>
                              ))}
                              <th className="p-5 text-center">Əməliyyat</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {teachers.filter(t => {
                              if (!workloadSearch) return true;
                              const search = workloadSearch.toLowerCase();
                              return (
                                t.first_name?.toLowerCase().includes(search) ||
                                t.last_name?.toLowerCase().includes(search) ||
                                (t as any).patronymic?.toLowerCase().includes(search) ||
                                (t as any).specialty?.toLowerCase().includes(search) ||
                                t.email?.toLowerCase().includes(search) ||
                                (t as any).employee_id?.toLowerCase().includes(search)
                              );
                            }).map((t, i) => (
                              <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="p-5 text-center text-slate-400 font-bold">{i + 1}</td>
                                {workloadColumns.map((col) => (
                                  <td key={String(col.key)} className="p-5 text-slate-600 font-medium">
                                    {col.render ? col.render(t, (t as any)[col.key as string]) : String((t as any)[col.key as string] ?? '')}
                                  </td>
                                ))}
                                <td className="p-5 text-center">
                                  <button
                                    onClick={() => { setWorkloadDrawerTeacher(t); setWorkloadDrawerOpen(true); }}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-indigo-600 text-[11px] font-black border border-indigo-100 shadow-sm hover:bg-indigo-600 hover:text-white transition-all transform group-hover:scale-105"
                                  >
                                    <Clock size={14} className="stroke-[3px]" />
                                    DƏRS YÜKÜ
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-100/90 font-bold text-slate-950 border-t-2 border-slate-300 h-14">
                              <td className="p-4 text-center text-slate-500 font-black text-sm">#</td>
                              <td colSpan={1} className="p-4 font-black text-sm">YEKUN CƏM:</td>
                              {workloadColumns.length > 2 && workloadColumns.slice(1).map((col, idx) => {
                                const filteredTeachers = teachers.filter(t => {
                                  if (!workloadSearch) return true;
                                  const search = workloadSearch.toLowerCase();
                                  return (
                                    t.first_name?.toLowerCase().includes(search) ||
                                    t.last_name?.toLowerCase().includes(search) ||
                                    (t as any).patronymic?.toLowerCase().includes(search) ||
                                    (t as any).specialty?.toLowerCase().includes(search) ||
                                    t.email?.toLowerCase().includes(search) ||
                                    (t as any).employee_id?.toLowerCase().includes(search)
                                  );
                                });
                                // Identify numeric columns
                                const isWeight = typeof (filteredTeachers[0] as any)?.[col.key as string] === 'number';
                                if (isWeight) {
                                  const total = filteredTeachers.reduce((acc, current) => acc + (Number((current as any)[col.key as string]) || 0), 0);
                                  return (
                                    <td key={idx} className="p-4 tabular-nums text-indigo-700 font-black text-sm">
                                      {total % 1 === 0 ? total.toString() : total.toFixed(1)}
                                    </td>
                                  );
                                }
                                return <td key={idx} className="p-4"></td>;
                              })}
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'class_subject' && (
                  <TeacherWorkloadDetailTable institutionId={institutionId} academicYearId={academicYearId} />
                )}
              </motion.div>
            </AnimatePresence>
          </Tabs>

          <Sheet open={workloadDrawerOpen} onOpenChange={setWorkloadDrawerOpen}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[1600px] p-0 border-l-0 shadow-2xl">
              <div className="h-full flex flex-col bg-white">
                <SheetHeader className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                      <Clock className="text-white h-6 w-6" />
                    </div>
                    <div>
                      <SheetTitle className="text-xl font-black text-slate-900">
                        {workloadDrawerTeacher?.first_name
                          ? `${workloadDrawerTeacher.first_name} ${workloadDrawerTeacher.last_name}`
                          : 'Müəllim Detalları'}
                      </SheetTitle>
                      <SheetDescription className="text-slate-500 font-medium">Dərs yükü və iş vaxtı idarəetməsi</SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                {workloadDrawerTeacher && (
                  <div className="flex-1 overflow-y-auto p-8 scrollbar-premium">
                    <Tabs defaultValue="workload" className="w-full space-y-8">
                      <TabsList className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/50">
                        <TabsTrigger value="workload" className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                          <Briefcase className="h-4 w-4 mr-2" /> DƏRS YÜKÜ
                        </TabsTrigger>
                        <TabsTrigger value="schedule" className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                          <Clock className="h-4 w-4 mr-2" /> İŞ VAXTI
                        </TabsTrigger>
                        <TabsTrigger value="timetable" className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium">
                          <CalendarRange className="h-4 w-4 mr-2" /> DƏRS CƏDVƏLİ
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="workload" className="mt-0 focus-visible:outline-none">
                        <div className="grid grid-cols-12 gap-8">
                          <div className="col-span-12 lg:col-span-4 space-y-6">
                            <TeacherWorkloadStats teacherId={workloadDrawerTeacher.id} />
                          </div>
                          <div className="col-span-12 lg:col-span-8">
                            <TeacherWorkloadPanel
                              teacherId={workloadDrawerTeacher.id}
                              teacherName={`${workloadDrawerTeacher.first_name} ${workloadDrawerTeacher.last_name}`}
                              institutionId={institutionId}
                              academicYearId={academicYearId}
                              isLocked={isLocked}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="schedule" className="mt-0 focus-visible:outline-none">
                        <div className="grid grid-cols-12 gap-8">
                          <div className="col-span-12 lg:col-span-4 space-y-6">
                            <TeacherScheduleStats teacherId={workloadDrawerTeacher.id} shifts={drawerShiftConfig} />
                          </div>
                          <div className="col-span-12 lg:col-span-8">
                            <Card className="rounded-[2rem] border-slate-200/60 shadow-premium overflow-hidden">
                              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-800">
                                  <Calendar className="h-4 w-4 text-indigo-500" /> İŞ VAXTI QRAFİKİ
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-6">
                                <AvailabilityManager
                                  teacherId={workloadDrawerTeacher.id}
                                  externalShifts={drawerShiftConfig}
                                  onShiftsChange={setDrawerShiftConfig}
                                  isLocked={isLocked}
                                />
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="timetable" className="mt-0 focus-visible:outline-none">
                        <Card className="rounded-[2rem] border-dashed border-2 border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-20">
                          <Calendar className="h-12 w-12 text-slate-300 mb-4" />
                          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Dərs cədvəli tezliklə əlavə olunacaq</p>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
