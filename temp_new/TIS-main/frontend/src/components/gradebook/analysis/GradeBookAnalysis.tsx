import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Target, GraduationCap, BookOpen, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGradeBookRole } from '@/contexts/GradeBookRoleContext';
import { cn } from '@/lib/utils';
import { OverviewTab } from './tabs/OverviewTab';
import { TrendsTab } from './tabs/TrendsTab';
import { DeepDiveTab } from './tabs/DeepDiveTab';
import { AnalysisPivotTab } from './tabs/AnalysisPivotTab';
import { JournalCompletionTab } from './tabs/JournalCompletionTab';
import { ScoreboardTab } from './tabs/ScoreboardTab';
import { type AnalysisFilters } from './filters/AnalysisFilters';
import { GlobalFiltersBar } from './filters/GlobalFiltersBar';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'class-level', label: 'Sinif Müqayisəsi', description: 'Pivot cədvəl',        icon: GraduationCap, color: 'blue'    },
  { id: 'scoreboard',  label: 'Reytinq',           description: 'Məktəb sıralaması',   icon: Trophy,        color: 'amber'   },
  { id: 'overview',    label: 'Ümumi Baxış',       description: 'Ümumi statistika',    icon: BarChart3,     color: 'indigo'  },
  { id: 'deep-dive',   label: 'Dərin Təhlil',       description: 'Siniflər üzrə analiz',icon: Target,       color: 'violet'  },
  { id: 'trends',      label: 'Tendensiyalar',      description: 'Dinamika & trend',    icon: TrendingUp,    color: 'emerald' },
  { id: 'completion',  label: 'Jurnal Dolduruluşu', description: 'Tamamlanma faizi',   icon: BookOpen,      color: 'teal'    },
] as const;

type TabId = (typeof TABS)[number]['id'];

const COLOR_MAP: Record<string, { active: string; hover: string; icon: string }> = {
  blue:    { active: 'bg-blue-600 text-white shadow-blue-200',      hover: 'hover:bg-blue-50 hover:text-blue-700',       icon: 'text-blue-500'    },
  amber:   { active: 'bg-amber-500 text-white shadow-amber-200',    hover: 'hover:bg-amber-50 hover:text-amber-700',     icon: 'text-amber-500'   },
  indigo:  { active: 'bg-indigo-600 text-white shadow-indigo-200',  hover: 'hover:bg-indigo-50 hover:text-indigo-700',   icon: 'text-indigo-500'  },
  violet:  { active: 'bg-violet-600 text-white shadow-violet-200',  hover: 'hover:bg-violet-50 hover:text-violet-700',   icon: 'text-violet-500'  },
  emerald: { active: 'bg-emerald-600 text-white shadow-emerald-200',hover: 'hover:bg-emerald-50 hover:text-emerald-700', icon: 'text-emerald-500' },
  teal:    { active: 'bg-teal-600 text-white shadow-teal-200',      hover: 'hover:bg-teal-50 hover:text-teal-700',       icon: 'text-teal-500'    },
};

const noopSetLoading = () => undefined;

// ─── Main Component ───────────────────────────────────────────────────────────
export function GradeBookAnalysis() {
  const { currentUser } = useAuth();
  const { isSchoolAdmin } = useGradeBookRole();
  const [activeTab, setActiveTab] = useState<TabId>('class-level');
  const [filters, setFilters] = useState<AnalysisFilters>({ status: 'all' });

  // Auto-set institution_id from user context
  useEffect(() => {
    if (currentUser?.institution?.id) {
      setFilters((prev) => ({ ...prev, institution_id: currentUser.institution!.id }));
    }
  }, [currentUser?.institution?.id]);

  const activeTabDef = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-3">
      {/* ── Filters (data + row display) ── */}
      <GlobalFiltersBar filters={filters} onFiltersChange={setFilters} isSchoolAdmin={isSchoolAdmin} />

      {/* ── Top Navigation Tabs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const cls = COLOR_MAP[tab.color];
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-all duration-150',
                isActive ? `${cls.active} border-transparent shadow-md` : `bg-white border-slate-200 text-slate-600 ${cls.hover}`,
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-white/90' : cls.icon)} />
              <span className={cn('text-sm font-semibold leading-tight', isActive ? 'text-white' : '')}>{tab.label}</span>
              <span className={cn('text-[11px] leading-tight', isActive ? 'text-white/75' : 'text-slate-400')}>{tab.description}</span>
            </button>
          );
        })}
      </div>

      {/* ── Active tab indicator ── */}
      <div className={cn('h-1 rounded-full',
        activeTabDef.color === 'blue'    ? 'bg-blue-600'    :
        activeTabDef.color === 'amber'   ? 'bg-amber-500'   :
        activeTabDef.color === 'indigo'  ? 'bg-indigo-600'  :
        activeTabDef.color === 'violet'  ? 'bg-violet-600'  :
        activeTabDef.color === 'emerald' ? 'bg-emerald-600' :
        'bg-teal-600')} />

      {/* ── Content ── */}
      <div>
        {activeTab === 'scoreboard' && <ScoreboardTab filters={filters} />}
        {activeTab === 'class-level' && (
          <AnalysisPivotTab
            institutionId={filters.institution_id}
            academicYearIds={filters.academic_year_ids ?? []}
            subjectIds={filters.subject_ids ?? []}
            sectorIds={filters.sector_ids ?? []}
            schoolIds={filters.school_ids ?? []}
            classLevels={filters.class_levels ?? []}
            gradeIds={filters.grade_ids ?? []}
            teachingLanguages={filters.teaching_languages ?? []}
            gender={filters.gender ?? ''}
            groupBys={filters.group_by ?? ['class_level']}
            viewMode={filters.view_mode ?? 'flat'}
          />
        )}
        {activeTab === 'overview'  && <OverviewTab filters={filters} />}
        {activeTab === 'deep-dive' && <DeepDiveTab filters={filters} />}
        {activeTab === 'trends'    && <TrendsTab   filters={filters} loading={false} setLoading={noopSetLoading} />}
        {activeTab === 'completion' && (
          <JournalCompletionTab
            institutionId={filters.institution_id}
            academicYearId={filters.academic_year_ids?.[0]}
          />
        )}
      </div>
    </div>
  );
}
