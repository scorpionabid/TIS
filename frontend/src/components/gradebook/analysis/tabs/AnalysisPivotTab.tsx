import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus, X, GitCompare, BarChart3, ChevronDown,
  Download, ChevronLeft, ChevronRight, ChevronRight as CollapseIcon,
  BookOpen, Languages,
} from 'lucide-react';
import { gradeBookService } from '@/services/gradeBook';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PivotTabProps {
  institutionId?: number;
  academicYearIds: number[];
  subjectIds: number[];
  sectorIds: number[];
  schoolIds: number[];
  classLevels: number[];
  gradeIds: number[];
  teachingLanguages: string[];
  gender: string;
  groupBys: GroupBy[];
  viewMode: 'flat' | 'nested';
}

type NestedNode = {
  nodeId: string;
  label: string;
  type: string;
  level: number;
  parentId: string | null;
};

type GroupBy = 'class_level' | 'sector' | 'school' | 'grade' | 'subject' | 'language';

type AvailableColumn = {
  key: string;
  academic_year_id: number;
  year_name: string;
  semester: string;
  type_id: number;
  type_name: string;
  type_category: string;
};

type PivotRow = {
  id: number | string;
  name: number | string;
  type: string;
};

type CellData = {
  students: number;
  avg: number;
  min_score: number;
  max_score: number;
  journal_count: number;
  teacher_count: number;
  pass_rate: number;
  institution_count: number;
  male_avg: number;
  female_avg: number;
  male_pass_rate: number;
  female_pass_rate: number;
  r0_30:   { count: number; pct: number };
  r30_60:  { count: number; pct: number };
  r60_80:  { count: number; pct: number };
  r80_100: { count: number; pct: number };
};

// ─── Metric definitions ───────────────────────────────────────────────────────
type MetricKey =
  | 'students' | 'avg' | 'min_score' | 'max_score'
  | 'r0_30' | 'r30_60' | 'r60_80' | 'r80_100'
  | 'pass_rate' | 'teacher_count'
  | 'male_avg' | 'female_avg' | 'male_pass_rate' | 'female_pass_rate'
  | 'journal_count' | 'institution_count';

type MetricDef = { key: MetricKey; label: string; shortLabel: string; color: string; defaultOn: boolean };

const METRICS: MetricDef[] = [
  { key: 'students',         label: 'Şagird sayı',      shortLabel: 'Şag.',   color: 'text-slate-700',  defaultOn: true  },
  { key: 'avg',              label: 'Orta bal',          shortLabel: 'Ort.',   color: 'text-slate-800',  defaultOn: true  },
  { key: 'min_score',        label: 'Min. bal',          shortLabel: 'Min.',   color: 'text-blue-600',   defaultOn: false },
  { key: 'max_score',        label: 'Maks. bal',         shortLabel: 'Maks.', color: 'text-blue-600',   defaultOn: false },
  { key: 'r0_30',            label: '≤30 bal (%)',        shortLabel: '≤30',   color: 'text-red-500',    defaultOn: true  },
  { key: 'r30_60',           label: '31–60 bal (%)',      shortLabel: '31–60', color: 'text-orange-500', defaultOn: false },
  { key: 'r60_80',           label: '61–80 bal (%)',      shortLabel: '61–80', color: 'text-yellow-600', defaultOn: false },
  { key: 'r80_100',          label: '81+ bal (%)',        shortLabel: '81+',   color: 'text-green-600',  defaultOn: true  },
  { key: 'pass_rate',        label: 'Keçid faizi',        shortLabel: 'Keçid', color: 'text-slate-600',  defaultOn: true  },
  { key: 'teacher_count',    label: 'Müəllim sayı',       shortLabel: 'Müəl.', color: 'text-indigo-500', defaultOn: false },
  { key: 'male_avg',         label: 'Oğlan orta balı',    shortLabel: 'O.Bal', color: 'text-blue-600',   defaultOn: false },
  { key: 'female_avg',       label: 'Qız orta balı',      shortLabel: 'Q.Bal', color: 'text-pink-600',   defaultOn: false },
  { key: 'male_pass_rate',   label: 'Oğlan keçid %',      shortLabel: 'O.Keç', color: 'text-blue-500',   defaultOn: false },
  { key: 'female_pass_rate', label: 'Qız keçid %',        shortLabel: 'Q.Keç', color: 'text-pink-500',   defaultOn: false },
  { key: 'journal_count',    label: 'Jurnal sayı',         shortLabel: 'Jurn.', color: 'text-indigo-500', defaultOn: false },
  { key: 'institution_count',label: 'Məktəb sayı',        shortLabel: 'Məkt.', color: 'text-teal-600',   defaultOn: false },
];

const DEFAULT_METRICS = METRICS.filter((m) => m.defaultOn).map((m) => m.key);

const GROUP_LABELS: Record<GroupBy, string> = {
  class_level: 'Sinif səv.',
  sector:      'Sektor',
  school:      'Məktəb',
  grade:       'Sinif',
  subject:     'Fənn',
  language:    'Bölmə',
};

const SECTION_COLORS: Record<GroupBy, string> = {
  sector:      'bg-violet-600',
  school:      'bg-teal-600',
  class_level: 'bg-blue-600',
  grade:       'bg-indigo-600',
  subject:     'bg-emerald-600',
  language:    'bg-amber-600',
};

const HIERARCHICAL_GROUP_BYS = ['sector', 'school', 'class_level', 'grade', 'subject', 'language'] as const;

const NODE_LEVEL_STYLES: Record<number, { row: string; label: string; indent: string }> = {
  0: { row: 'bg-violet-50 border-l-4 border-l-violet-500',       label: 'font-bold text-violet-800 text-xs',       indent: 'pl-2'  },
  1: { row: 'bg-teal-50/60 border-l-4 border-l-teal-400',        label: 'font-semibold text-teal-700 text-xs',     indent: 'pl-6'  },
  2: { row: 'bg-indigo-50/50 border-l-4 border-l-indigo-300',    label: 'font-medium text-indigo-700 text-xs',     indent: 'pl-10' },
  3: { row: 'bg-white border-l-4 border-l-slate-200',            label: 'font-medium text-slate-600 text-xs',      indent: 'pl-14' },
  4: { row: 'bg-emerald-50/30 border-l-4 border-l-emerald-200',  label: 'font-medium text-emerald-700 text-xs',    indent: 'pl-20' },
  5: { row: 'bg-amber-50/30 border-l-4 border-l-amber-200',      label: 'font-medium text-amber-700 text-xs',      indent: 'pl-24' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avgBg(avg: number): string {
  if (avg > 80) return 'bg-green-100 text-green-800';
  if (avg > 60) return 'bg-yellow-50 text-yellow-800';
  if (avg > 30) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

function pctColor(pct: number): string {
  if (pct > 60) return 'text-green-700';
  if (pct > 30) return 'text-yellow-700';
  return 'text-red-600';
}

const TYPE_COLORS: Record<string, string> = {
  ksq: 'bg-blue-600', bsq: 'bg-violet-600', diagnostic: 'bg-teal-600',
  monitoring: 'bg-cyan-600', national: 'bg-amber-600', custom: 'bg-slate-500',
};
const colBadgeCls = (cat: string) => TYPE_COLORS[cat] ?? TYPE_COLORS.custom;

function shortLabel(col: AvailableColumn) {
  return `${col.type_name.split(' ')[0]} · ${col.semester} · ${col.year_name.slice(-4)}`;
}

function rowLabel(row: PivotRow, groupBy: GroupBy): React.ReactNode {
  if (groupBy === 'class_level') return <Badge variant="outline" className="font-semibold">{row.name}-ci sinif</Badge>;
  return <span className="text-xs leading-tight">{String(row.name)}</span>;
}

// ─── Cell value extractor ─────────────────────────────────────────────────────
function getCellValue(cell: CellData, metric: MetricKey): string {
  switch (metric) {
    case 'students':          return String(cell.students);
    case 'avg':               return cell.avg.toFixed(1);
    case 'min_score':         return cell.min_score.toFixed(0);
    case 'max_score':         return cell.max_score.toFixed(0);
    case 'r0_30':             return `${cell.r0_30.pct.toFixed(0)}%`;
    case 'r30_60':            return `${cell.r30_60.pct.toFixed(0)}%`;
    case 'r60_80':            return `${cell.r60_80.pct.toFixed(0)}%`;
    case 'r80_100':           return `${cell.r80_100.pct.toFixed(0)}%`;
    case 'pass_rate':         return `${cell.pass_rate.toFixed(0)}%`;
    case 'teacher_count':     return String(cell.teacher_count);
    case 'male_avg':          return cell.male_avg > 0 ? cell.male_avg.toFixed(1) : '—';
    case 'female_avg':        return cell.female_avg > 0 ? cell.female_avg.toFixed(1) : '—';
    case 'male_pass_rate':    return cell.male_pass_rate > 0 ? `${cell.male_pass_rate.toFixed(0)}%` : '—';
    case 'female_pass_rate':  return cell.female_pass_rate > 0 ? `${cell.female_pass_rate.toFixed(0)}%` : '—';
    case 'journal_count':     return String(cell.journal_count);
    case 'institution_count': return String(cell.institution_count);
  }
}

function getCellCls(cell: CellData, metric: MetricKey): string {
  switch (metric) {
    case 'avg':           return cn('font-bold text-xs', avgBg(cell.avg));
    case 'male_avg':      return cell.male_avg > 0 ? cn('text-xs font-bold', avgBg(cell.male_avg)) : 'text-xs text-slate-300';
    case 'female_avg':    return cell.female_avg > 0 ? cn('text-xs font-bold', avgBg(cell.female_avg)) : 'text-xs text-slate-300';
    case 'r0_30':         return cn('text-xs', cell.r0_30.pct > 20 ? 'text-red-600 font-semibold' : 'text-slate-500');
    case 'r30_60':        return 'text-xs text-orange-600';
    case 'r60_80':        return 'text-xs text-yellow-700';
    case 'r80_100':       return cn('text-xs', cell.r80_100.pct > 30 ? 'text-green-700 font-semibold' : 'text-slate-500');
    case 'pass_rate':     return cn('text-xs font-semibold', pctColor(cell.pass_rate));
    case 'male_pass_rate':   return cn('text-xs font-semibold', cell.male_pass_rate > 0 ? pctColor(cell.male_pass_rate) : 'text-slate-300');
    case 'female_pass_rate': return cn('text-xs font-semibold', cell.female_pass_rate > 0 ? pctColor(cell.female_pass_rate) : 'text-slate-300');
    case 'teacher_count': return 'text-xs text-indigo-600';
    default:              return 'text-xs text-slate-700';
  }
}

// ─── PivotCell component ──────────────────────────────────────────────────────
function PivotCell({ cell, activeMetrics }: {
  cell: CellData | undefined;
  activeMetrics: MetricKey[];
}) {
  if (!cell) {
    return (
      <td colSpan={activeMetrics.length} className="px-2 py-2 text-center text-slate-300 text-xs border-r-2 border-slate-200">
        —
      </td>
    );
  }
  return (
    <>
      {activeMetrics.map((metric, idx) => {
        const isLast = idx === activeMetrics.length - 1;
        return (
          <td
            key={metric}
            className={cn(
              'px-1.5 py-2 text-center',
              isLast ? 'border-r-2 border-slate-300' : 'border-r border-slate-100',
              getCellCls(cell, metric),
            )}
          >
            {getCellValue(cell, metric)}
          </td>
        );
      })}
    </>
  );
}

// ─── Totals computation ───────────────────────────────────────────────────────
function computeTotals(
  tableRows: PivotRow[],
  activeCols: AvailableColumn[],
  cells: Record<string, CellData>,
): Record<string, CellData | undefined> {
  const out: Record<string, CellData | undefined> = {};
  for (const col of activeCols) {
    const relevant = tableRows
      .map((row) => cells[`${row.id}|${col.key}`])
      .filter(Boolean) as CellData[];
    if (!relevant.length) continue;
    const totalStudents = relevant.reduce((s, c) => s + c.students, 0);
    const totalScores   = relevant.reduce((s, c) => s + c.r0_30.count + c.r30_60.count + c.r60_80.count + c.r80_100.count, 0);
    const pct = (n: number) => totalScores > 0 ? Math.round((n / totalScores) * 1000) / 10 : 0;
    const r0  = relevant.reduce((s, c) => s + c.r0_30.count, 0);
    const r30 = relevant.reduce((s, c) => s + c.r30_60.count, 0);
    const r60 = relevant.reduce((s, c) => s + c.r60_80.count, 0);
    const r80 = relevant.reduce((s, c) => s + c.r80_100.count, 0);
    const nonZeroMaleAvg   = relevant.filter((c) => c.male_avg > 0);
    const nonZeroFemaleAvg = relevant.filter((c) => c.female_avg > 0);
    const nonZeroMalePR    = relevant.filter((c) => c.male_pass_rate > 0);
    const nonZeroFemalePR  = relevant.filter((c) => c.female_pass_rate > 0);
    out[col.key] = {
      students:          totalStudents,
      avg:               totalStudents > 0
        ? Math.round((relevant.reduce((s, c) => s + c.avg * c.students, 0) / totalStudents) * 10) / 10 : 0,
      min_score:         relevant.length ? Math.min(...relevant.map((c) => c.min_score)) : 0,
      max_score:         relevant.length ? Math.max(...relevant.map((c) => c.max_score)) : 0,
      journal_count:     relevant.reduce((s, c) => s + c.journal_count, 0),
      teacher_count:     relevant.reduce((s, c) => s + c.teacher_count, 0),
      pass_rate:         pct(r30 + r60 + r80),
      institution_count: relevant.reduce((s, c) => s + c.institution_count, 0),
      male_avg:          nonZeroMaleAvg.length
        ? Math.round((nonZeroMaleAvg.reduce((s, c) => s + c.male_avg, 0) / nonZeroMaleAvg.length) * 10) / 10 : 0,
      female_avg: nonZeroFemaleAvg.length
        ? Math.round((nonZeroFemaleAvg.reduce((s, c) => s + c.female_avg, 0) / nonZeroFemaleAvg.length) * 10) / 10 : 0,
      male_pass_rate: nonZeroMalePR.length
        ? Math.round(nonZeroMalePR.reduce((s, c) => s + c.male_pass_rate, 0) / nonZeroMalePR.length * 10) / 10 : 0,
      female_pass_rate: nonZeroFemalePR.length
        ? Math.round(nonZeroFemalePR.reduce((s, c) => s + c.female_pass_rate, 0) / nonZeroFemalePR.length * 10) / 10 : 0,
      r0_30:   { count: r0,  pct: pct(r0)  },
      r30_60:  { count: r30, pct: pct(r30) },
      r60_80:  { count: r60, pct: pct(r60) },
      r80_100: { count: r80, pct: pct(r80) },
    };
  }
  return out;
}

// ─── Export to Excel ──────────────────────────────────────────────────────────
function exportToExcel(
  sections: { groupBy: GroupBy; tableRows: PivotRow[]; cells: Record<string, CellData> }[],
  activeCols: AvailableColumn[],
  orderedMetrics: MetricKey[],
) {
  const metricDefs = METRICS.filter((m) => orderedMetrics.includes(m.key));
  const h1: string[] = ['Qrup', 'Sıra'];
  const h2: string[] = ['', ''];
  const h3: string[] = ['', ''];
  for (const col of activeCols) {
    for (let i = 0; i < orderedMetrics.length; i++) {
      h1.push(i === 0 ? col.year_name : '');
      h2.push(i === 0 ? `${col.type_name} · ${col.semester} Semestr` : '');
      h3.push(metricDefs.find((m) => m.key === orderedMetrics[i])?.shortLabel ?? '');
    }
  }
  const dataRows: string[][] = [];
  for (const sec of sections) {
    dataRows.push([GROUP_LABELS[sec.groupBy], '─────────']);
    for (const row of sec.tableRows) {
      const r: string[] = [GROUP_LABELS[sec.groupBy], String(row.name)];
      for (const col of activeCols) {
        const cell = sec.cells[`${row.id}|${col.key}`];
        for (const mk of orderedMetrics) {
          r.push(cell ? getCellValue(cell, mk) : '—');
        }
      }
      dataRows.push(r);
    }
  }
  const ws = XLSX.utils.aoa_to_sheet([h1, h2, h3, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pivot Analiz');
  XLSX.writeFile(wb, `pivot_analiz_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AnalysisPivotTab({
  institutionId,
  academicYearIds,
  subjectIds,
  sectorIds,
  schoolIds,
  classLevels,
  gradeIds,
  teachingLanguages,
  gender,
  groupBys,
  viewMode,
}: PivotTabProps) {
  const [selectedCols, setSelectedCols]       = useState<string[]>([]);
  const [activeMetrics, setActiveMetrics]     = useState<MetricKey[]>(DEFAULT_METRICS);
  const [compareMode, setCompareMode]         = useState(false);
  const [compareItems, setCompareItems]       = useState<string[]>([]);
  const [colPickerOpen, setColPickerOpen]     = useState(false);
  const [metricPickerOpen, setMetricPickerOpen] = useState(false);
  const [expandedNodes, setExpandedNodes]     = useState<Set<string>>(new Set());

  // Nested mode: only when viewMode='nested' AND groupBys contains 2+ hierarchical types
  const hierarchicalSelected = groupBys.filter(g => (HIERARCHICAL_GROUP_BYS as readonly string[]).includes(g));
  const isNestedMode = viewMode === 'nested' && hierarchicalSelected.length >= 2;

  // ── Base params (no group_by) ────────────────────────────────────────────
  const baseParams = useMemo(() => {
    const p: Record<string, string | number | number[] | string[]> = {};
    if (institutionId)           p.institution_id      = institutionId;
    if (academicYearIds.length)  p.academic_year_ids   = academicYearIds;
    if (subjectIds.length)       p.subject_ids         = subjectIds;
    if (sectorIds.length)        p.sector_ids          = sectorIds;
    if (schoolIds.length)        p.school_ids          = schoolIds;
    if (classLevels.length)      p.class_levels        = classLevels;
    if (gradeIds.length)         p.grade_ids           = gradeIds;
    if (teachingLanguages.length) p.teaching_languages = teachingLanguages;
    if (gender)                  p.gender              = gender;
    return p;
  }, [institutionId, academicYearIds, subjectIds, sectorIds, schoolIds,
      classLevels, gradeIds, teachingLanguages, gender]);

  // ── One query per groupBy (flat mode) ───────────────────────────────────
  const queryResults = useQueries({
    queries: groupBys.map((gb) => ({
      queryKey: ['pivotAnalysis', { ...baseParams, group_by: gb }],
      queryFn: () => gradeBookService.getPivotAnalysis({ ...baseParams, group_by: gb } as Parameters<typeof gradeBookService.getPivotAnalysis>[0]),
      staleTime: 5 * 60 * 1000,
      enabled: !isNestedMode,
    })),
  });

  // ── Nested query (nested mode only) ──────────────────────────────────────
  const nestedQuery = useQuery({
    queryKey: ['pivotNested', { ...baseParams, group_bys: hierarchicalSelected }],
    queryFn: () => gradeBookService.getNestedPivotAnalysis({
      ...baseParams,
      group_bys: hierarchicalSelected,
    } as Parameters<typeof gradeBookService.getNestedPivotAnalysis>[0]),
    staleTime: 5 * 60 * 1000,
    enabled: isNestedMode,
  });

  const isLoading = isNestedMode
    ? (nestedQuery.isLoading || nestedQuery.isFetching)
    : queryResults.some((r) => r.isLoading || r.isFetching);

  // Available columns
  const availableCols: AvailableColumn[] = useMemo(() => {
    if (isNestedMode) return (nestedQuery.data?.data?.available_columns ?? []) as AvailableColumn[];
    for (const r of queryResults) {
      const cols = r.data?.data?.available_columns ?? [];
      if (cols.length > 0) return cols;
    }
    return [];
  }, [isNestedMode, nestedQuery.data, queryResults]);

  // Flat sections (only used in flat mode)
  const sections = useMemo(() =>
    groupBys.map((gb, i) => ({
      groupBy: gb,
      tableRows: (queryResults[i]?.data?.data?.rows ?? []) as PivotRow[],
      cells:     (queryResults[i]?.data?.data?.cells ?? {}) as Record<string, CellData>,
    })),
  [groupBys, queryResults]);

  // Nested data
  const nestedNodes: NestedNode[] = useMemo(() =>
    (nestedQuery.data?.data?.nodes ?? []) as NestedNode[],
  [nestedQuery.data]);

  const nestedCells = useMemo(() =>
    (nestedQuery.data?.data?.cells ?? {}) as Record<string, CellData>,
  [nestedQuery.data]);

  const hasAnyData = isNestedMode
    ? nestedNodes.length > 0
    : sections.some((s) => s.tableRows.length > 0);

  // Expand all L0 nodes by default when nested data loads
  useEffect(() => {
    if (isNestedMode && nestedNodes.length > 0) {
      setExpandedNodes(new Set(nestedNodes.filter(n => n.level === 0).map(n => n.nodeId)));
    }
  }, [isNestedMode, nestedNodes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  }, []);

  // Build children map for nested tree
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, NestedNode[]>();
    for (const node of nestedNodes) {
      const key = node.parentId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(node);
    }
    return map;
  }, [nestedNodes]);

  // ── Auto-select columns ──────────────────────────────────────────────────
  useEffect(() => {
    if (availableCols.length > 0 && selectedCols.length === 0) {
      setSelectedCols(availableCols.slice(0, 2).map((c) => c.key));
    }
  }, [availableCols]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when groupBys changes
  useEffect(() => {
    setCompareMode(false);
    setCompareItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const cols = availableCols;
    setSelectedCols(cols.length > 0 ? cols.slice(0, 2).map((c) => c.key) : []);
  }, [groupBys]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Column management ────────────────────────────────────────────────────
  const activeCols = useMemo(
    () => selectedCols.map((k) => availableCols.find((c) => c.key === k)).filter(Boolean) as AvailableColumn[],
    [availableCols, selectedCols],
  );

  const toggleCol = useCallback((key: string) => {
    setSelectedCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const moveCol = useCallback((key: string, dir: -1 | 1) => {
    setSelectedCols((prev) => {
      const idx = prev.indexOf(key);
      if (idx === -1) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  // ── Metric management ────────────────────────────────────────────────────
  const toggleMetric = useCallback((key: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const orderedMetrics = useMemo(
    () => METRICS.filter((m) => activeMetrics.includes(m.key)).map((m) => m.key),
    [activeMetrics],
  );

  // ── Compare items toggle (max 4) ─────────────────────────────────────────
  const toggleCompareItem = useCallback((key: string) => {
    setCompareItems((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, key];
    });
  }, []);

  // On entering compare mode, auto-select first 3 (or fewer if not available)
  const enterCompareMode = useCallback(() => {
    setCompareMode(true);
    setCompareItems(activeCols.slice(0, Math.min(3, activeCols.length)).map((c) => c.key));
  }, [activeCols]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Column picker */}
          <Popover open={colPickerOpen} onOpenChange={setColPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Plus className="w-4 h-4" />
                İmtahan əlavə et
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <p className="text-xs font-semibold text-slate-600 mb-2">İmtahan sütunlarını seç:</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {availableCols.map((col) => (
                  <label key={col.key} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-slate-50 cursor-pointer">
                    <Checkbox
                      checked={selectedCols.includes(col.key)}
                      onCheckedChange={() => toggleCol(col.key)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-[10px] text-white px-1.5 py-0.5 rounded font-semibold', colBadgeCls(col.type_category))}>
                          {col.type_name.split(' ')[0].toUpperCase()}
                        </span>
                        <span className="text-xs font-medium text-slate-700">{col.semester} Semestr</span>
                        <span className="text-xs text-slate-500">{col.year_name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{col.type_name}</p>
                    </div>
                  </label>
                ))}
                {availableCols.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Mövcud imtahan yoxdur</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* RIGHT: Parametr, Müqayisə, Export */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Metric picker */}
          <Popover open={metricPickerOpen} onOpenChange={setMetricPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Plus className="w-4 h-4" />
                Parametr
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <p className="text-xs font-semibold text-slate-600 mb-2">Göstəriləcək parametrlər:</p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {METRICS.map((m) => (
                  <label key={m.key} className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
                    <Checkbox
                      checked={activeMetrics.includes(m.key)}
                      onCheckedChange={() => toggleMetric(m.key)}
                    />
                    <span className={cn('text-xs font-medium', m.color)}>{m.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Compare mode button */}
          {activeCols.length >= 2 && (
            <Button
              variant={compareMode ? 'default' : 'outline'}
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => {
                if (compareMode) {
                  setCompareMode(false);
                  setCompareItems([]);
                } else {
                  enterCompareMode();
                }
              }}
            >
              <GitCompare className="w-4 h-4" />
              Müqayisə
            </Button>
          )}

          {/* Export */}
          {activeCols.length > 0 && orderedMetrics.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => exportToExcel(sections, activeCols, orderedMetrics)}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* ── Active column chips (with reorder) ── */}
      {activeCols.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeCols.map((col, idx) => (
            <span
              key={col.key}
              className={cn(
                'inline-flex items-center gap-0.5 text-[11px] text-white px-1.5 py-1 rounded-full font-medium',
                colBadgeCls(col.type_category),
                compareMode && compareItems.includes(col.key) ? 'ring-2 ring-white ring-offset-1' : '',
              )}
            >
              {idx > 0 && (
                <button onClick={() => moveCol(col.key, -1)} className="opacity-70 hover:opacity-100 p-0.5" title="Sola köçür">
                  <ChevronLeft className="w-3 h-3" />
                </button>
              )}
              <span className="px-1">{shortLabel(col)}</span>
              {idx < activeCols.length - 1 && (
                <button onClick={() => moveCol(col.key, 1)} className="opacity-70 hover:opacity-100 p-0.5" title="Sağa köçür">
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
              <button onClick={() => toggleCol(col.key)} className="opacity-70 hover:opacity-100 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Active metric chips ── */}
      {orderedMetrics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {orderedMetrics.map((key) => {
            const def = METRICS.find((m) => m.key === key)!;
            return (
              <span key={key} className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {def.shortLabel}
                <button onClick={() => toggleMetric(key)} className="opacity-50 hover:opacity-100 ml-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* ── Loading / Empty states ── */}
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      )}
      {!isLoading && !hasAnyData && (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-lg">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-sm">Məlumat tapılmadı</p>
          <p className="text-xs mt-1">Tədris ilini seçin və ya filtrləri dəyişin</p>
        </div>
      )}
      {!isLoading && hasAnyData && activeCols.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
          Yuxarıdan imtahan seçin
        </div>
      )}
      {!isLoading && hasAnyData && activeCols.length > 0 && orderedMetrics.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
          Ən azı 1 parametr seçin
        </div>
      )}

      {/* ── Compare mode: column selector (toggle, max 4) ── */}
      {compareMode && activeCols.length >= 2 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-blue-700">Müqayisə üçün seç (maks. 4):</span>
              {activeCols.map((col) => {
                const sel = compareItems.includes(col.key);
                return (
                  <button
                    key={col.key}
                    onClick={() => toggleCompareItem(col.key)}
                    disabled={!sel && compareItems.length >= 4}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium border transition-colors',
                      sel
                        ? cn('text-white border-transparent', colBadgeCls(col.type_category))
                        : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300',
                      !sel && compareItems.length >= 4 ? 'opacity-40 cursor-not-allowed' : '',
                    )}
                  >
                    {sel && <span className="text-[10px] opacity-80">{compareItems.indexOf(col.key) + 1}.</span>}
                    {shortLabel(col)}
                  </button>
                );
              })}
              {compareItems.length >= 2 && (
                <span className="text-[11px] text-blue-600 font-medium ml-auto">{compareItems.length} imtahan seçildi</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Nested tree pivot table ── */}
      {!isLoading && hasAnyData && activeCols.length > 0 && orderedMetrics.length > 0 && !compareMode && isNestedMode && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th rowSpan={3} className="text-left px-4 py-2 bg-slate-100 font-semibold text-slate-700 border-r-2 border-slate-300 sticky left-0 z-10 min-w-[200px]">
                      Sıra
                    </th>
                    {Object.entries(
                      activeCols.reduce<Record<string, number>>((acc, c) => {
                        acc[c.year_name] = (acc[c.year_name] ?? 0) + orderedMetrics.length;
                        return acc;
                      }, {}),
                    ).map(([year, span]) => (
                      <th key={year} colSpan={span} className="text-center py-1.5 bg-slate-50 font-semibold text-slate-600 border-r-2 border-slate-300">
                        {year}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-200">
                    {activeCols.map((col) => (
                      <th key={col.key} colSpan={orderedMetrics.length}
                        className={cn('text-center py-1.5 text-white font-semibold border-r-2 border-slate-300', colBadgeCls(col.type_category))}>
                        {col.type_name.split(' ')[0]} · {col.semester} Semestr
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b-2 border-slate-300 bg-slate-50">
                    {activeCols.map((col) => (
                      <React.Fragment key={col.key}>
                        {orderedMetrics.map((mk, idx) => {
                          const def = METRICS.find((m) => m.key === mk)!;
                          return (
                            <th key={mk}
                              className={cn('px-1.5 py-1.5 text-center font-medium', def.color,
                                idx === orderedMetrics.length - 1 ? 'border-r-2 border-slate-300' : 'border-r border-slate-100')}>
                              {def.shortLabel}
                            </th>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(function renderNodes(parentId: string | null): React.ReactNode {
                    return (childrenMap.get(parentId) ?? []).map((node) => {
                      const style = NODE_LEVEL_STYLES[node.level] ?? NODE_LEVEL_STYLES[2];
                      const children = childrenMap.get(node.nodeId) ?? [];
                      const hasChildren = children.length > 0;
                      const isExpanded = expandedNodes.has(node.nodeId);
                      return (
                        <React.Fragment key={node.nodeId}>
                          <tr className={cn('border-b border-slate-100', style.row)}>
                            <td className={cn('py-2 pr-3 border-r-2 border-slate-300 sticky left-0 z-10 bg-inherit', style.indent)}>
                              <div className="flex items-center gap-1">
                                {hasChildren && (
                                  <button
                                    onClick={() => toggleNode(node.nodeId)}
                                    className="shrink-0 w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-transform"
                                  >
                                    <CollapseIcon className={cn('w-3 h-3 transition-transform', isExpanded ? 'rotate-90' : '')} />
                                  </button>
                                )}
                                {!hasChildren && <span className="w-4 shrink-0" />}
                                <span className={style.label}>
                                  {node.type === 'class_level'
                                    ? <Badge variant="outline" className="font-semibold text-[10px] py-0">{node.label}-ci sinif</Badge>
                                    : node.type === 'grade'
                                    ? <Badge variant="outline" className="font-bold text-[10px] py-0">{node.label}</Badge>
                                    : node.type === 'subject'
                                    ? <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3 shrink-0 opacity-60" />{node.label}</span>
                                    : node.type === 'language'
                                    ? <span className="inline-flex items-center gap-1"><Languages className="w-3 h-3 shrink-0 opacity-60" />{node.label}</span>
                                    : node.label}
                                </span>
                              </div>
                            </td>
                            {activeCols.map((col) => (
                              <PivotCell key={col.key} cell={nestedCells[`${node.nodeId}|${col.key}`]} activeMetrics={orderedMetrics} />
                            ))}
                          </tr>
                          {isExpanded && hasChildren && renderNodes(node.nodeId)}
                        </React.Fragment>
                      );
                    });
                  })(null)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Normal pivot table (flat mode) ── */}
      {!isLoading && hasAnyData && activeCols.length > 0 && orderedMetrics.length > 0 && !compareMode && !isNestedMode && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  {/* Row 1: year groups */}
                  <tr className="border-b border-slate-200">
                    <th rowSpan={3} className="text-left px-4 py-2 bg-slate-100 font-semibold text-slate-700 border-r-2 border-slate-300 sticky left-0 z-10 min-w-[160px]">
                      Sıra
                    </th>
                    {Object.entries(
                      activeCols.reduce<Record<string, number>>((acc, c) => {
                        acc[c.year_name] = (acc[c.year_name] ?? 0) + orderedMetrics.length;
                        return acc;
                      }, {}),
                    ).map(([year, span]) => (
                      <th key={year} colSpan={span} className="text-center py-1.5 bg-slate-50 font-semibold text-slate-600 border-r-2 border-slate-300">
                        {year}
                      </th>
                    ))}
                  </tr>
                  {/* Row 2: exam type + semester */}
                  <tr className="border-b border-slate-200">
                    {activeCols.map((col) => (
                      <th key={col.key} colSpan={orderedMetrics.length}
                        className={cn('text-center py-1.5 text-white font-semibold border-r-2 border-slate-300', colBadgeCls(col.type_category))}>
                        {col.type_name.split(' ')[0]} · {col.semester} Semestr
                      </th>
                    ))}
                  </tr>
                  {/* Row 3: metric headers */}
                  <tr className="border-b-2 border-slate-300 bg-slate-50">
                    {activeCols.map((col) => (
                      <React.Fragment key={col.key}>
                        {orderedMetrics.map((mk, idx) => {
                          const def = METRICS.find((m) => m.key === mk)!;
                          const isLast = idx === orderedMetrics.length - 1;
                          return (
                            <th key={mk}
                              className={cn('px-1.5 py-1.5 text-center font-medium', def.color,
                                isLast ? 'border-r-2 border-slate-300' : 'border-r border-slate-100')}>
                              {def.shortLabel}
                            </th>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sections.map((sec) => (
                    <React.Fragment key={sec.groupBy}>
                      {/* Section header row (only shown when multiple groupBys) */}
                      {groupBys.length > 1 && (
                        <tr>
                          <td
                            colSpan={1 + activeCols.length * orderedMetrics.length}
                            className={cn('px-4 py-1.5 text-[11px] font-bold text-white', SECTION_COLORS[sec.groupBy])}
                          >
                            {GROUP_LABELS[sec.groupBy]}
                          </td>
                        </tr>
                      )}
                      {sec.tableRows.length === 0 && (
                        <tr>
                          <td colSpan={1 + activeCols.length * orderedMetrics.length}
                            className="px-4 py-3 text-xs text-slate-400 text-center italic">
                            Bu qrup üçün məlumat yoxdur
                          </td>
                        </tr>
                      )}
                      {sec.tableRows.map((row, idx) => {
                        const totals = computeTotals(sec.tableRows, activeCols, sec.cells);
                        return (
                          <tr key={`${sec.groupBy}-${row.id}`} className={cn('border-b border-slate-100', idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
                            <td className="px-3 py-2 font-semibold text-slate-700 border-r-2 border-slate-300 sticky left-0 bg-inherit z-10">
                              {rowLabel(row, sec.groupBy)}
                            </td>
                            {activeCols.map((col) => (
                              <PivotCell key={col.key} cell={sec.cells[`${row.id}|${col.key}`]} activeMetrics={orderedMetrics} />
                            ))}
                          </tr>
                        );
                      })}
                      {/* Totals row per section */}
                      {sec.tableRows.length > 0 && (() => {
                        const totals = computeTotals(sec.tableRows, activeCols, sec.cells);
                        return (
                          <tr className="border-t-2 border-slate-400 bg-slate-100 font-semibold">
                            <td className="px-3 py-2 text-slate-700 text-xs font-bold border-r-2 border-slate-300 sticky left-0 bg-slate-100 z-10">
                              {groupBys.length > 1 ? `${GROUP_LABELS[sec.groupBy]} Ümumi` : 'Ümumi'}
                            </td>
                            {activeCols.map((col) => (
                              <PivotCell key={col.key} cell={totals[col.key]} activeMetrics={orderedMetrics} />
                            ))}
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Compare View (N columns, max 4) ── */}
      {!isLoading && compareMode && compareItems.length >= 2 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-left px-4 py-2.5 bg-slate-100 font-semibold text-slate-700 border-r-2 border-slate-300 sticky left-0 z-10 min-w-[160px]">
                      Sıra
                    </th>
                    {compareItems.map((ck, ci) => {
                      const col = activeCols.find((c) => c.key === ck);
                      if (!col) return null;
                      const bgClasses = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600'];
                      return (
                        <th key={ck} colSpan={orderedMetrics.length}
                          className={cn('text-center py-2 text-white font-semibold border-r-2 border-slate-300', bgClasses[ci % 4])}>
                          {ci + 1}. {shortLabel(col)}
                        </th>
                      );
                    })}
                    <th className="text-center py-2 bg-slate-700 text-white font-semibold px-3 whitespace-nowrap">
                      Maks↔Min fərqi
                    </th>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="border-r-2 border-slate-300" />
                    {compareItems.map((ck) =>
                      orderedMetrics.map((mk, idx) => {
                        const def = METRICS.find((m) => m.key === mk)!;
                        const isLast = idx === orderedMetrics.length - 1;
                        return (
                          <th key={`${ck}-${mk}`}
                            className={cn('px-1.5 py-1.5 text-center font-medium', def.color,
                              isLast ? 'border-r-2 border-slate-300' : 'border-r border-slate-200')}>
                            {def.shortLabel}
                          </th>
                        );
                      })
                    )}
                    <th className="px-2 py-1.5 text-center font-medium text-slate-600">Ort.</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.flatMap((sec) =>
                    sec.tableRows.length === 0 ? [] :
                    [
                      groupBys.length > 1 ? (
                        <tr key={`cmp-hdr-${sec.groupBy}`}>
                          <td colSpan={2 + compareItems.length * orderedMetrics.length}
                            className={cn('px-4 py-1.5 text-[11px] font-bold text-white', SECTION_COLORS[sec.groupBy])}>
                            {GROUP_LABELS[sec.groupBy]}
                          </td>
                        </tr>
                      ) : null,
                      ...sec.tableRows.map((row, idx) => {
                        const avgs = compareItems.map((ck) => sec.cells[`${row.id}|${ck}`]?.avg ?? null);
                        const validAvgs = avgs.filter((v): v is number => v !== null);
                        const diff = validAvgs.length >= 2
                          ? Math.round((Math.max(...validAvgs) - Math.min(...validAvgs)) * 10) / 10
                          : null;
                        return (
                          <tr key={`${sec.groupBy}-${row.id}`} className={cn('border-b border-slate-100', idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
                            <td className="px-3 py-2 font-semibold text-slate-700 border-r-2 border-slate-300 sticky left-0 bg-inherit z-10">
                              {rowLabel(row, sec.groupBy)}
                            </td>
                            {compareItems.map((ck) => (
                              <PivotCell key={ck} cell={sec.cells[`${row.id}|${ck}`]} activeMetrics={orderedMetrics} />
                            ))}
                            <td className={cn('px-2 py-2 text-center font-bold text-xs',
                              diff === null ? 'text-slate-300' : diff > 5 ? 'text-red-600' : diff > 2 ? 'text-orange-500' : 'text-green-700')}>
                              {diff === null ? '—' : diff === 0 ? '=' : `${diff}`}
                            </td>
                          </tr>
                        );
                      }),
                    ].filter(Boolean)
                  )}
                </tbody>
                <tfoot>
                  {sections.filter((s) => s.tableRows.length > 0).map((sec) => {
                    const totals = computeTotals(sec.tableRows, activeCols, sec.cells);
                    return (
                      <tr key={`tot-${sec.groupBy}`} className="border-t-2 border-slate-400 bg-slate-100 font-semibold">
                        <td className="px-3 py-2 text-slate-700 text-xs font-bold border-r-2 border-slate-300 sticky left-0 bg-slate-100 z-10">
                          Ümumi
                        </td>
                        {compareItems.map((ck) => (
                          <PivotCell key={ck} cell={totals[ck]} activeMetrics={orderedMetrics} />
                        ))}
                        <td className="px-2 py-2 text-center text-slate-400 text-xs">—</td>
                      </tr>
                    );
                  })}
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {compareMode && compareItems.length < 2 && hasAnyData && activeCols.length >= 2 && (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-blue-200 rounded-lg bg-blue-50/30">
          Müqayisə üçün ən azı 2 imtahan seçin (yuxarıdan)
        </div>
      )}
    </div>
  );
}
