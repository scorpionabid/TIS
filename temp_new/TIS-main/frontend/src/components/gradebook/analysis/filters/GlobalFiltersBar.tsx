import React, { useState, useMemo, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, X, GraduationCap, Building2, School, BookOpen, Languages, Layers, Network, LayoutList } from 'lucide-react';
import { hierarchyService, HierarchyNode } from '@/services/hierarchy';
import { academicYearService, AcademicYear } from '@/services/academicYears';
import { subjectService, Subject } from '@/services/subjects';
import { gradeBookService } from '@/services/gradeBook';
import { cn } from '@/lib/utils';
import { type AnalysisFilters, type GroupBy } from './AnalysisFilters';

type InstitutionOption = { id: number; name: string; parentId?: number };
type AvailableGrade   = { id: number; name: string; class_level: number; full_name: string };

const CLASS_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const HIERARCHICAL_GROUPS: GroupBy[] = ['sector', 'school', 'class_level', 'grade', 'subject', 'language'];
const LANGUAGES = [
  { value: 'Azərbaycan', label: 'Azərbaycan' },
  { value: 'Rus',        label: 'Rus' },
  { value: 'Gürcü',      label: 'Gürcü' },
];

// Row-display options (what appears in table rows)
const ROW_OPTS: { value: GroupBy; label: string; icon: React.ElementType }[] = [
  { value: 'sector',      label: 'Sektor',      icon: Building2 },
  { value: 'school',      label: 'Məktəb',      icon: School },
  { value: 'class_level', label: 'Sinif səv.',   icon: GraduationCap },
  { value: 'grade',       label: 'Sinif',        icon: Layers },
  { value: 'subject',     label: 'Fənn',         icon: BookOpen },
  { value: 'language',    label: 'Bölmə',        icon: Languages },
];

function extractLevelNodes(nodes: HierarchyNode[], level: number): InstitutionOption[] {
  const result: InstitutionOption[] = [];
  const recurse = (ns: HierarchyNode[], pid?: number) => {
    for (const n of ns) {
      if (n.level === level) result.push({ id: Number(n.id), name: n.name, parentId: pid });
      if (n.children?.length) recurse(n.children, n.level === 3 ? Number(n.id) : pid);
    }
  };
  recurse(nodes, undefined);
  return result;
}

interface Props {
  filters: AnalysisFilters;
  onFiltersChange: (f: AnalysisFilters) => void;
  isSchoolAdmin?: boolean;
}

export function GlobalFiltersBar({ filters, onFiltersChange, isSchoolAdmin = false }: Props) {
  const [sectorOptions,  setSectorOptions]  = useState<InstitutionOption[]>([]);
  const [schoolOptions,  setSchoolOptions]  = useState<InstitutionOption[]>([]);
  const [gradeOptions,   setGradeOptions]   = useState<AvailableGrade[]>([]);
  const [academicYears,  setAcademicYears]  = useState<AcademicYear[]>([]);
  const [subjects,       setSubjects]       = useState<Subject[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [loadingOptions,   setLoadingOptions]   = useState(true);

  // Derived
  const sectorIds          = filters.sector_ids         ?? [];
  const schoolIds          = filters.school_ids         ?? [];
  const classLevels        = filters.class_levels       ?? [];
  const gradeIds           = filters.grade_ids          ?? [];
  const teachingLanguages  = filters.teaching_languages ?? [];
  const gender             = filters.gender;
  const groupBys           = filters.group_by           ?? ['class_level'];
  const viewMode           = filters.view_mode          ?? 'flat';
  const academicYearIds    = filters.academic_year_ids  ?? [];
  const subjectIds         = filters.subject_ids        ?? [];

  // Can show nested toggle only when 2+ hierarchical group_bys selected
  const hierarchicalSelected = groupBys.filter(g => HIERARCHICAL_GROUPS.includes(g));
  const canNest = hierarchicalSelected.length >= 2;

  useEffect(() => {
    if (isSchoolAdmin) { setLoadingHierarchy(false); return; }
    setLoadingHierarchy(true);
    hierarchyService.getHierarchy()
      .then((res) => {
        const allSectors = extractLevelNodes(res.data ?? [], 3);
        const excludedKeywords = ['Tədrisin Keyfiyyəti', 'Maliyyə İqtisadiyyat', 'İnzibati Təşkilat', 'Rəhbərlik'];
        setSectorOptions(allSectors.filter(s => !excludedKeywords.some(kw => s.name.includes(kw))));
        setSchoolOptions(extractLevelNodes(res.data ?? [], 4));
      })
      .catch(() => {})
      .finally(() => setLoadingHierarchy(false));
  }, [isSchoolAdmin]);

  useEffect(() => {
    setLoadingOptions(true);
    Promise.all([
      academicYearService.getAllForDropdown().then(setAcademicYears),
      subjectService.getAll().then(setSubjects),
    ]).catch(() => {}).finally(() => setLoadingOptions(false));
  }, []);

  // Load available grades from grade_book_sessions scope (not just grades table)
  useEffect(() => {
    const params: { institution_id?: number; sector_ids?: number[]; school_ids?: number[] } = {};
    if (filters.institution_id) params.institution_id = filters.institution_id;
    if (filters.sector_ids?.length) params.sector_ids = filters.sector_ids;
    if (filters.school_ids?.length) params.school_ids = filters.school_ids;
    gradeBookService.getAvailableGrades(params)
      .then((r) => setGradeOptions(r.data ?? []))
      .catch(() => setGradeOptions([]));
  }, [filters.institution_id, filters.sector_ids, filters.school_ids]);

  const filteredSchoolOptions = useMemo(() => {
    if (!sectorIds.length) return schoolOptions;
    return schoolOptions.filter((s) => s.parentId !== undefined && sectorIds.includes(s.parentId));
  }, [schoolOptions, sectorIds]);

  const set = (patch: Partial<AnalysisFilters>) => onFiltersChange({ ...filters, ...patch });

  // ── Toggle helpers ──────────────────────────────────────────────────────────
  const toggleNum = (arr: number[], id: number): number[] =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

  const toggleStr = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const fbtn = (active: boolean) => cn(
    'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border transition-colors select-none cursor-pointer whitespace-nowrap',
    active
      ? 'bg-blue-50 border-blue-400 text-blue-700 hover:bg-blue-100'
      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50',
  );

  const badge = (n: number) => (
    <span className="ml-0.5 bg-blue-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full font-semibold">{n}</span>
  );

  // Academic year display label
  const yearLabel = academicYearIds.length === 0
    ? 'Tədris ili'
    : academicYearIds.length === 1
      ? (academicYears.find(y => y.id === academicYearIds[0])?.name ?? 'Tədris ili')
      : `Tədris ili`;

  // Subject display label
  const subjectLabel = subjectIds.length === 0
    ? 'Fənn'
    : subjectIds.length === 1
      ? (subjects.find(s => s.id === subjectIds[0])?.name ?? 'Fənn')
      : 'Fənn';

  // Language display label
  const langLabel = teachingLanguages.length === 0
    ? 'Bölmə'
    : teachingLanguages.length === 1
      ? `Bölmə: ${teachingLanguages[0]}`
      : 'Bölmə';

  return (
    <div className="space-y-2">

      {/* ══ Row 1: Məlumat filtrləri ══════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1">Filtr:</span>

        {/* Tədris ili — multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={fbtn(academicYearIds.length > 0)}>
              {yearLabel}
              {academicYearIds.length > 1 && badge(academicYearIds.length)}
              {academicYearIds.length > 0
                ? <span role="button" onClick={(e) => { e.stopPropagation(); set({ academic_year_ids: [] }); }} className="opacity-60 hover:opacity-100 ml-0.5"><X className="w-3 h-3" /></span>
                : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Tədris ili</p>
              {academicYearIds.length > 0 && <button onClick={() => set({ academic_year_ids: [] })} className="text-xs text-blue-500">Sil</button>}
            </div>
            {loadingOptions
              ? <p className="text-xs text-slate-400 text-center py-3">Yüklənir...</p>
              : <div className="space-y-1 max-h-52 overflow-y-auto">
                  {academicYears.map(y => (
                    <label key={y.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                      <Checkbox
                        checked={academicYearIds.includes(y.id)}
                        onCheckedChange={() => set({ academic_year_ids: toggleNum(academicYearIds, y.id) })}
                      />
                      <span className="text-xs text-slate-700 flex-1">{y.name}</span>
                      {y.is_active && <span className="text-[10px] text-green-600 font-medium">aktiv</span>}
                    </label>
                  ))}
                </div>
            }
          </PopoverContent>
        </Popover>

        {!isSchoolAdmin && <div className="h-4 w-px bg-slate-200" />}

        {/* Sektorlar — yalnız region/sektor/superadmin üçün */}
        {!isSchoolAdmin && (
          <Popover>
            <PopoverTrigger asChild>
              <button className={fbtn(sectorIds.length > 0)}>
                Sektorlar {sectorIds.length > 0 && badge(sectorIds.length)}
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-600">Sektorlar</p>
                {sectorIds.length > 0 && <button onClick={() => set({ sector_ids: [], school_ids: [] })} className="text-xs text-blue-500">Sil</button>}
              </div>
              {loadingHierarchy
                ? <p className="text-xs text-slate-400 text-center py-3">Yüklənir...</p>
                : <div className="space-y-1 max-h-48 overflow-y-auto">
                    {sectorOptions.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                        <Checkbox checked={sectorIds.includes(s.id)}
                          onCheckedChange={(c) => set({ sector_ids: c ? [...sectorIds, s.id] : sectorIds.filter((x) => x !== s.id), school_ids: [] })} />
                        <span className="text-xs text-slate-700">{s.name}</span>
                      </label>
                    ))}
                  </div>
              }
            </PopoverContent>
          </Popover>
        )}

        {/* Məktəblər — yalnız region/sektor/superadmin üçün */}
        {!isSchoolAdmin && (
          <Popover>
            <PopoverTrigger asChild>
              <button className={fbtn(schoolIds.length > 0)}>
                Məktəblər {schoolIds.length > 0 && badge(schoolIds.length)}
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-600">Məktəblər</p>
                {schoolIds.length > 0 && <button onClick={() => set({ school_ids: [] })} className="text-xs text-blue-500">Sil</button>}
              </div>
              {loadingHierarchy
                ? <p className="text-xs text-slate-400 text-center py-3">Yüklənir...</p>
                : filteredSchoolOptions.length === 0
                  ? <p className="text-xs text-slate-400 text-center py-3">{sectorIds.length > 0 ? 'Məktəb tapılmadı' : 'Əvvəlcə sektor seçin'}</p>
                  : <div className="space-y-1 max-h-52 overflow-y-auto">
                      {filteredSchoolOptions.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                          <Checkbox checked={schoolIds.includes(s.id)}
                            onCheckedChange={(c: boolean | 'indeterminate') => set({ school_ids: c === true ? [...schoolIds, s.id] : schoolIds.filter((x) => x !== s.id) })} />
                          <span className="text-xs text-slate-700">{s.name}</span>
                        </label>
                      ))}
                    </div>
              }
            </PopoverContent>
          </Popover>
        )}

        {/* Sinif səviyyəsi */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={fbtn(classLevels.length > 0)}>
              Sinif səv.
              {classLevels.length > 0 && <span className="ml-0.5 bg-blue-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full font-semibold">{[...classLevels].sort((a,b)=>a-b).join(',')}</span>}
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-3" align="start">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Sinif səviyyəsi</p>
              {classLevels.length > 0 && <button onClick={() => set({ class_levels: [] })} className="text-xs text-blue-500">Sil</button>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CLASS_LEVELS.map((lvl) => (
                <button key={lvl}
                  onClick={() => set({ class_levels: classLevels.includes(lvl) ? classLevels.filter((x) => x !== lvl) : [...classLevels, lvl] })}
                  className={cn('w-9 h-9 rounded-md text-xs font-semibold border transition-colors',
                    classLevels.includes(lvl) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
                  {lvl}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Siniflər — grouped by class_level */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={fbtn(gradeIds.length > 0)}>
              Siniflər {gradeIds.length > 0 && badge(gradeIds.length)}
              {gradeIds.length > 0
                ? <span role="button" onClick={(e) => { e.stopPropagation(); set({ grade_ids: [] }); }} className="opacity-60 hover:opacity-100 ml-0.5"><X className="w-3 h-3" /></span>
                : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Siniflər</p>
              {gradeIds.length > 0 && <button onClick={() => set({ grade_ids: [] })} className="text-xs text-blue-500">Sil</button>}
            </div>
            {gradeOptions.length === 0
              ? <p className="text-xs text-slate-400 text-center py-3">Məlumat tapılmadı</p>
              : (() => {
                  // Group by class_level
                  const byLevel = gradeOptions.reduce<Record<number, AvailableGrade[]>>((acc, g) => {
                    (acc[g.class_level] ??= []).push(g);
                    return acc;
                  }, {});
                  return (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {Object.entries(byLevel).sort(([a],[b]) => Number(a)-Number(b)).map(([lvl, grades]) => (
                        <div key={lvl}>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{lvl}-ci sinif</p>
                          <div className="flex flex-wrap gap-1">
                            {grades.map((g) => (
                              <button key={g.id}
                                onClick={() => set({ grade_ids: toggleNum(gradeIds, g.id) })}
                                className={cn('px-2 py-0.5 rounded text-xs font-medium border transition-colors',
                                  gradeIds.includes(g.id)
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400')}>
                                {g.full_name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
            }
          </PopoverContent>
        </Popover>

        {/* Fənn — multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={fbtn(subjectIds.length > 0)}>
              {subjectLabel}
              {subjectIds.length > 1 && badge(subjectIds.length)}
              {subjectIds.length > 0
                ? <span role="button" onClick={(e) => { e.stopPropagation(); set({ subject_ids: [] }); }} className="opacity-60 hover:opacity-100 ml-0.5"><X className="w-3 h-3" /></span>
                : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Fənn</p>
              {subjectIds.length > 0 && <button onClick={() => set({ subject_ids: [] })} className="text-xs text-blue-500">Sil</button>}
            </div>
            {loadingOptions
              ? <p className="text-xs text-slate-400 text-center py-3">Yüklənir...</p>
              : <div className="space-y-1 max-h-56 overflow-y-auto">
                  {subjects.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                      <Checkbox
                        checked={subjectIds.includes(s.id)}
                        onCheckedChange={() => set({ subject_ids: toggleNum(subjectIds, s.id) })}
                      />
                      <span className="text-xs text-slate-700">{s.name}</span>
                    </label>
                  ))}
                </div>
            }
          </PopoverContent>
        </Popover>

        {/* Bölmə — multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={fbtn(teachingLanguages.length > 0)}>
              {langLabel}
              {teachingLanguages.length > 1 && badge(teachingLanguages.length)}
              {teachingLanguages.length > 0
                ? <span role="button" onClick={(e) => { e.stopPropagation(); set({ teaching_languages: [] }); }} className="opacity-60 hover:opacity-100 ml-0.5"><X className="w-3 h-3" /></span>
                : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-3" align="start">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Tədris bölməsi</p>
              {teachingLanguages.length > 0 && <button onClick={() => set({ teaching_languages: [] })} className="text-xs text-blue-500">Sil</button>}
            </div>
            <div className="space-y-1">
              {LANGUAGES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                  <Checkbox
                    checked={teachingLanguages.includes(value)}
                    onCheckedChange={() => set({ teaching_languages: toggleStr(teachingLanguages, value) })}
                  />
                  <span className="text-xs text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Cins */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={fbtn(!!gender)}>
              {gender === 'male' ? 'Cins: Oğlan' : gender === 'female' ? 'Cins: Qız' : 'Cins'}
              {gender
                ? <span role="button" onClick={(e) => { e.stopPropagation(); set({ gender: undefined }); }} className="opacity-60 hover:opacity-100"><X className="w-3 h-3" /></span>
                : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-3" align="start">
            <p className="text-xs font-semibold text-slate-600 mb-2">Cins</p>
            <div className="space-y-1">
              {[{ v: '', l: 'Hamısı' }, { v: 'male', l: 'Oğlan' }, { v: 'female', l: 'Qız' }].map(({ v, l }) => (
                <button key={v}
                  onClick={() => set({ gender: (v as 'male' | 'female') || undefined })}
                  className={cn('w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    (gender ?? '') === v ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100')}>
                  {l}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* ══ Row 2: Cədvəl sırası seçimi (multi-select) + görünüş rejimi ═══════ */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1">Sıralar:</span>
        {ROW_OPTS.map(({ value, label, icon: Icon }) => {
          const active = groupBys.includes(value);
          return (
            <button
              key={value}
              onClick={() => {
                const next = active
                  ? groupBys.filter(g => g !== value).length > 0
                    ? groupBys.filter(g => g !== value)
                    : groupBys
                  : [...groupBys, value];
                // Reset nested mode if selected group_bys no longer support nesting
                const newHierarchical = next.filter(g => HIERARCHICAL_GROUPS.includes(g));
                const newViewMode = newHierarchical.length >= 2 ? viewMode : 'flat';
                set({ group_by: next, view_mode: newViewMode });
              }}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border transition-colors',
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}

        {/* View mode toggle — only when 2+ hierarchical group_bys selected */}
        {canNest && (
          <>
            <div className="h-4 w-px bg-slate-300 mx-1" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Görünüş:</span>
            <button
              onClick={() => set({ view_mode: 'flat' })}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border transition-colors',
                viewMode === 'flat'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600',
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Ayrı-ayrı
            </button>
            <button
              onClick={() => set({ view_mode: 'nested' })}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border transition-colors',
                viewMode === 'nested'
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600',
              )}
            >
              <Network className="w-3.5 h-3.5" />
              İç-içə
            </button>
          </>
        )}

        {groupBys.length > 1 && viewMode === 'flat' && (
          <span className="text-[11px] text-slate-400 ml-1">({groupBys.length} seçildi — alt-alta)</span>
        )}
      </div>
    </div>
  );
}
