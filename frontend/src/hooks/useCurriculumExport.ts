import { useCallback } from 'react';
import { SchoolTeacher } from '@/services/schoolAdmin';
import { Grade } from '@/services/grades';
import { curriculumService } from '@/services/curriculumService';
import {
  BASE_DATA, SPLIT_KEYS, SPLIT_LABELS, SUBJECT_IDS,
} from '@/components/curriculum/curriculumConstants';
import {
  exportToExcelUniversal,
  exportMultipleSheets,
  ExportMetadata,
  SheetConfig,
} from '@/utils/curriculumExport';
import { LevelTotal, GrandTotal } from './useCurriculumPlanData';

interface ExportDeps {
  currentUser: {
    region?: { name?: string };
    institution?: { name?: string };
  } | null;
  activeYear: { name?: string } | undefined;
  teachers: SchoolTeacher[];
  reactiveGrades: Grade[];
  activeLevels: { level: number; name: string }[];
  levelTotals: Record<number, LevelTotal>;
  grandTotal: GrandTotal;
  masterPlan: unknown[];
  assignedHours: unknown[];
  institutionId: number | undefined;
  academicYearId: number | undefined;
}

type TabKey = 'stats' | 'yigim' | 'subjects' | 'workload' | 'class_subject' | 'grades';

export function useCurriculumExport(deps: ExportDeps) {
  const {
    currentUser, activeYear, teachers, reactiveGrades,
    activeLevels, levelTotals, grandTotal, masterPlan, assignedHours,
    institutionId, academicYearId,
  } = deps;

  const buildMetadata = useCallback((): ExportMetadata => {
    const director = teachers.find(t => t.position_type === 'direktor');
    return {
      regionalName: currentUser?.region?.name || 'Regional Təhsil İdarəsi',
      schoolName: currentUser?.institution?.name || 'Ümumtəhsil Məktəbi',
      academicYear: activeYear?.name || '',
      directorName: director
        ? `${director.last_name} ${director.first_name} ${(director as Record<string, unknown>).patronymic || ''}`
        : '',
    };
  }, [currentUser, activeYear, teachers]);

  // ─── Yığım Cədvəli row builder (shared by single and global export) ────────
  const buildYigimData = useCallback((): { headers: unknown[][]; data: unknown[][]; merges: string[] } => {
    const headers = [
      ['№', 'Siniflər', 'Şagird sayı', 'Sinif sayı', 'Tədris planı üzrə saat', 'Bölünən dərslərin sayı', '', '', '', '', '', '', '', 'Bölünən cəmi', 'YEKUN CƏMİ', 'Dərsdənkənar məşğələ', 'Məktəbdə fərdi təhsil', 'Evdə təhsil', 'Xüsusi təhsil', 'ÜMUMİ SAATLARIN CƏMİ'],
      ['', '', '', '', '', ...SPLIT_LABELS.map((l: string[]) => l.join(' ')), '', '', '', '', '', ''],
    ];

    const data: unknown[][] = [];
    BASE_DATA.forEach(b => {
      const clsList = reactiveGrades
        .filter(c => c.class_level === b.level)
        .sort((a, bGrade) => a.name.localeCompare(bGrade.name));
      if (clsList.length === 0) return;

      const lt = levelTotals[b.level];
      data.push([
        '', `${b.label} SİNİF KOMPLEKTLƏRİ`,
        lt.studentCount, lt.classCount, lt.plan,
        ...SPLIT_KEYS.map(k => lt.splitBySubject?.[k] || 0),
        lt.split, (lt.plan + lt.split).toFixed(1),
        lt.extra, lt.indiv, lt.home, lt.special, lt.club, lt.total.toFixed(1),
      ]);

      clsList.forEach((c, cidx) => {
        const gs = c.grade_subjects || [];
        const planRaw = gs.filter(i => {
          const ed = i.education_type?.toLowerCase() || '';
          const sid = Number(i.subject_id);
          return (ed === 'umumi' || ed === 'ümumi') && !i.is_extracurricular && sid !== 57;
        }).reduce((a, bItem) => a + (Number(bItem.weekly_hours) || 0), 0);

        const plan = c.curriculum_hours != null ? Number(c.curriculum_hours) : planRaw;
        const splSum = SPLIT_KEYS.reduce((sum, k) => sum + (Number(c[k]) || 0), 0);

        const extraRaw = gs.filter(i => i.is_extracurricular && Number(i.subject_id) !== SUBJECT_IDS.CLUB)
          .reduce((a, bItem) => a + (Number(bItem.weekly_hours) || 0), 0);
        const extra = (c as Record<string, unknown>).extra_hours != null ? Number((c as Record<string, unknown>).extra_hours) : extraRaw;

        const indivRaw = gs.filter(i => i.education_type?.toLowerCase() === 'ferdi')
          .reduce((a, bItem) => a + (Number(bItem.weekly_hours) || 0), 0);
        const indiv = (c as Record<string, unknown>).individual_hours != null ? Number((c as Record<string, unknown>).individual_hours) : indivRaw;

        const homeRaw = gs.filter(i => i.education_type?.toLowerCase() === 'evde')
          .reduce((a, bItem) => a + (Number(bItem.weekly_hours) || 0), 0);
        const home = (c as Record<string, unknown>).home_hours != null ? Number((c as Record<string, unknown>).home_hours) : homeRaw;

        const specialRaw = gs.filter(i => i.education_type?.toLowerCase() === 'xususi')
          .reduce((a, bItem) => a + (Number(bItem.weekly_hours) || 0), 0);
        const special = (c as Record<string, unknown>).special_hours != null ? Number((c as Record<string, unknown>).special_hours) : specialRaw;

        const clubRaw = gs.filter(i => Number(i.subject_id) === SUBJECT_IDS.CLUB)
          .reduce((a, bItem) => a + (Number(bItem.weekly_hours) || 0), 0);
        const club = (c as Record<string, unknown>).club_hours != null ? Number((c as Record<string, unknown>).club_hours) : clubRaw;

        data.push([
          cidx + 1, `${c.class_level > 0 ? c.class_level : 'MH'} ${c.name}`,
          c.real_student_count || c.student_count || 0, 1, plan,
          ...SPLIT_KEYS.map(k => Number(c[k]) || 0),
          splSum, (plan + splSum).toFixed(1),
          extra, indiv, home, special, club,
          (plan + splSum + extra + indiv + home + special + club).toFixed(1),
        ]);
      });
    });

    data.push([
      '', 'YEKUN',
      grandTotal.studentCount, grandTotal.classCount, grandTotal.plan,
      ...SPLIT_KEYS.map(k => (Object.values(levelTotals) as LevelTotal[]).reduce((a, lt) => a + (lt.splitBySubject?.[k] || 0), 0)),
      grandTotal.split, (grandTotal.plan + grandTotal.split).toFixed(1),
      grandTotal.extra, grandTotal.indiv, grandTotal.home, grandTotal.special, grandTotal.club,
      grandTotal.total.toFixed(1),
    ]);

    const merges = [
      'A5:A6', 'B5:B6', 'C5:C6', 'D5:D6', 'E5:E6',
      'F5:M5', 'N5:N6', 'O5:O6', 'P5:P6', 'Q5:Q6', 'R5:R6', 'S5:S6', 'T5:T6',
    ];

    return { headers, data, merges };
  }, [reactiveGrades, activeLevels, levelTotals, grandTotal]);

  // ─── Single-tab exports ────────────────────────────────────────────────────
  const handleExportYigim = useCallback(async () => {
    const metadata = buildMetadata();
    const { headers, data, merges } = buildYigimData();
    await exportToExcelUniversal(
      'Yigim_Cedveli', 'Yığım Cədvəli', headers, data, metadata,
      [5, 25, 10, 8, 12, 6, 6, 6, 6, 6, 6, 6, 6, 10, 12, 12, 12, 12, 12, 15],
      merges,
    );
  }, [buildMetadata, buildYigimData]);

  const handleExportWorkload = useCallback(async () => {
    const metadata = buildMetadata();
    const headers = [
      ['№', 'Müəllimin S.A.A.', 'Vəzifəsi', 'UTİS kodu', 'İxtisas', 'Qiymətl. növü', 'Qiymətl. balı',
        'Ümumi təhsil', 'Fərdi (məktəbdə)', 'Evdə təhsil', 'Xüsusi təhsil', 'Dərsdənkənar', 'Dərnək', 'Cəmi'],
    ];
    const data = teachers.map((t, i) => [
      i + 1,
      `${t.last_name} ${t.first_name} ${(t as Record<string, unknown>).patronymic || ''}`,
      t.position_type || '—',
      t.employee_id || '—',
      t.specialty || '—',
      (t as Record<string, unknown>).assessment_type || '—',
      (t as Record<string, unknown>).assessment_score ?? '—',
      t.workload_teaching_hours || 0,
      (t as Record<string, unknown>).workload_individual_school || 0,
      (t as Record<string, unknown>).workload_home_education || 0,
      (t as Record<string, unknown>).workload_special_education || 0,
      t.workload_extracurricular_hours || 0,
      t.workload_club_hours || 0,
      t.workload_total_hours || 0,
    ]);
    await exportToExcelUniversal(
      'Ders_Bolgusu', 'Dərs Bölgüsü', headers, data, metadata,
      [5, 30, 20, 15, 20, 15, 10, 10, 10, 10, 10, 10, 10, 10],
    );
  }, [buildMetadata, teachers]);

  // ─── Global multi-sheet export ─────────────────────────────────────────────
  const handleGlobalExport = useCallback(async (mode: 'all' | 'active', activeTab: TabKey) => {
    const metadata = buildMetadata();
    const sheets: SheetConfig[] = [];

    const LEVELS_XLSX = [
      { key: 'mh', label: 'Mh', level: 0 }, { key: '1', label: 'I', level: 1 },
      { key: '2', label: 'II', level: 2 }, { key: '3', label: 'III', level: 3 },
      { key: '4', label: 'IV', level: 4 }, { key: '5', label: 'V', level: 5 },
      { key: '6', label: 'VI', level: 6 }, { key: '7', label: 'VII', level: 7 },
      { key: '8', label: 'VIII', level: 8 }, { key: '9', label: 'IX', level: 9 },
      { key: '10', label: 'X', level: 10 }, { key: '11', label: 'XI', level: 11 },
    ];

    if (mode === 'all' || activeTab === 'yigim' || activeTab === 'stats') {
      const { headers, data, merges } = buildYigimData();
      sheets.push({
        sheetName: 'Yığım Cədvəli', headers, data, merges,
        columnWidths: [5, 25, 10, 8, 12, 6, 6, 6, 6, 6, 6, 6, 6, 10, 12, 12, 12, 12, 12, 15],
      });
    }

    if (mode === 'all' || activeTab === 'subjects') {
      const hMaster = [['№', 'Fənn', 'Təhsil Növü', ...LEVELS_XLSX.map(l => l.label), 'Cəmi', 'Təyin edilib', 'Vakant']];
      const groups: Record<string, Record<string, unknown>[]> = {};
      (masterPlan as Record<string, unknown>[]).forEach(item => {
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
        const assigned = (assignedHours as Record<string, unknown>[]).find(
          a => a.subject_id === Number(subjId) && a.education_type === edType,
        );
        const assignedVal = Number((assigned as Record<string, unknown> | undefined)?.total_assigned) || 0;
        return [
          idx + 1,
          (items[0].subject as Record<string, unknown>)?.name || '—',
          edType.toUpperCase(),
          ...LEVELS_XLSX.map(l => hMap[l.key] || 0),
          total, assignedVal, total - assignedVal,
        ];
      });
      sheets.push({
        sheetName: 'Fənn və Vakansiyalar', headers: hMaster, data: dMaster,
        columnWidths: [5, 25, 12, ...LEVELS_XLSX.map(() => 6), 10, 10, 10],
      });
    }

    if (mode === 'all' || activeTab === 'grades') {
      const hGrades = [['№', 'Sinif', 'Şagird Sayı', 'Tədris Planı (Saat)', 'Bölünən (Cəmi)', 'Dərsdənkənar', 'Fərdi', 'Evdə', 'Xüsusi', 'Dərnək', 'Toplam']];
      const dGrades = reactiveGrades.map((g, i) => {
        const spl = SPLIT_KEYS.reduce((s, k) => s + (Number(g[k]) || 0), 0);
        const gs = g.grade_subjects || [];
        const p = g.curriculum_hours ?? gs.filter(it => (it.education_type?.toLowerCase() || '') === 'umumi').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const ex = (g as Record<string, unknown>).extra_hours ?? gs.filter(it => it.is_extracurricular && Number(it.subject_id) !== SUBJECT_IDS.CLUB).reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const ind = (g as Record<string, unknown>).individual_hours ?? gs.filter(it => it.education_type?.toLowerCase() === 'ferdi').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const hom = (g as Record<string, unknown>).home_hours ?? gs.filter(it => it.education_type?.toLowerCase() === 'evde').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const spc = (g as Record<string, unknown>).special_hours ?? gs.filter(it => it.education_type?.toLowerCase() === 'xususi').reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        const clb = (g as Record<string, unknown>).club_hours ?? gs.filter(it => Number(it.subject_id) === SUBJECT_IDS.CLUB).reduce((a, b) => a + (Number(b.weekly_hours) || 0), 0);
        return [i + 1, `${g.class_level}${g.name}`, g.student_count || 0, p, spl, ex, ind, hom, spc, clb, Number(p) + spl + Number(ex) + Number(ind) + Number(hom) + Number(spc) + Number(clb)];
      });
      sheets.push({ sheetName: 'Sinif Tədris Planı', headers: hGrades, data: dGrades, columnWidths: [5, 15, 12, 15, 15, 15, 12, 12, 12, 12, 15] });
    }

    if (mode === 'all' || activeTab === 'workload') {
      const hWorkload = [['№', 'Müəllimin S.A.A.', 'Vəzifəsi', 'UTİS kodu', 'İxtisas', 'Ümumi təhsil', 'Fərdi (məktəbdə)', 'Evdə təhsil', 'Xüsusi təhsil', 'Dərsdənkənar', 'Dərnək', 'Cəmi']];
      const dWorkload = teachers.map((t, i) => [
        i + 1,
        `${t.last_name} ${t.first_name} ${(t as Record<string, unknown>).patronymic || ''}`,
        t.position_type || '—', t.employee_id || '—', t.specialty || '—',
        t.workload_teaching_hours || 0,
        (t as Record<string, unknown>).workload_individual_school || 0,
        (t as Record<string, unknown>).workload_home_education || 0,
        (t as Record<string, unknown>).workload_special_education || 0,
        t.workload_extracurricular_hours || 0,
        t.workload_club_hours || 0,
        t.workload_total_hours || 0,
      ]);
      sheets.push({ sheetName: 'Dərs Bölgüsü', headers: hWorkload, data: dWorkload, columnWidths: [5, 30, 20, 15, 20, 10, 10, 10, 10, 10, 10, 10] });
    }

    if (mode === 'all' || activeTab === 'class_subject') {
      try {
        const resp = await curriculumService.getDetailedWorkload(institutionId!, academicYearId!);
        const detailData = (resp || []) as Record<string, unknown>[];
        const hDetail = [['№', 'Müəllim S.A.A.', 'Vəzifəsi', 'UTİS kodu', 'İxtisas', 'Sinif', 'Fənn', 'Ümumi', 'Fərdi', 'Evdə', 'Xüsusi', 'Dərsdənkənar', 'Dərnək', 'Cəmi']];
        const dDetail = detailData.map((row, idx) => [
          idx + 1,
          `${row.last_name} ${row.first_name} ${row.patronymic || ''}`,
          row.position_type || '—', row.employee_id || '—', row.specialty || '—',
          `${row.grade_level}${row.section}`, row.subject_name || '—',
          row.umumi_hours || 0, row.individual_school_hours || 0, row.home_education_hours || 0,
          row.special_education_hours || 0, row.extracurricular_hours || 0,
          row.club_hours || 0, row.total_hours || 0,
        ]);
        sheets.push({ sheetName: 'Dərs Bölgüsü Detallı', headers: hDetail, data: dDetail, columnWidths: [5, 25, 20, 15, 20, 10, 20, 8, 8, 8, 8, 10, 8, 10] });
      } catch (e) {
        console.error('Detailed workload fetch failed', e);
      }
    }

    const fileName = mode === 'all' ? 'Tedris_Plani_Butun' : `Export_${activeTab}`;
    await exportMultipleSheets(fileName, sheets, metadata);
  }, [buildMetadata, buildYigimData, reactiveGrades, teachers, masterPlan, assignedHours, institutionId, academicYearId]);

  return { handleExportYigim, handleExportWorkload, handleGlobalExport };
}
