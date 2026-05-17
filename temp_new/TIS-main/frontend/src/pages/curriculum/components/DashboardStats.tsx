import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  AlertCircle,
  TrendingDown,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  schools: any[];
  onStatClick?: (statId: string) => void;
  activeStat?: string | null;
  isLoading?: boolean;
}

const safeNum = (val: any): number => {
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
};

export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  schools = [], 
  onStatClick,
  activeStat,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-2 w-16 bg-slate-100 rounded animate-pulse" />
                <div className="h-8 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-8 w-8 bg-slate-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-2 w-full bg-slate-50 rounded animate-pulse mt-auto" />
          </div>
        ))}
      </div>
    );
  }

  const safeSchools = Array.isArray(schools) ? schools : [];

  const activeSchools = safeSchools.filter(s => {
    const main = safeNum(s.curriculum_main_hours);
    const club = safeNum(s.curriculum_club_hours);
    return (main + club) > 0;
  });

  const approvedCount = activeSchools.filter(s => (s.curriculum_status || 'draft') === 'approved').length;
  const submittedCount = activeSchools.filter(s => (s.curriculum_status || 'draft') === 'submitted').length;
  const totalCount = activeSchools.length;
  const absoluteTotalCount = safeSchools.length;

  const mainHoursTotal = activeSchools.reduce((acc, s) => acc + safeNum(s.curriculum_main_hours), 0);
  const clubHoursTotal = activeSchools.reduce((acc, s) => acc + safeNum(s.curriculum_club_hours), 0);
  const mainVacTotal = activeSchools.reduce((acc, s) => acc + safeNum(s.curriculum_main_vacancies), 0);
  const clubVacTotal = activeSchools.reduce((acc, s) => acc + safeNum(s.curriculum_club_vacancies), 0);

  const totalHoursSum = mainHoursTotal + clubHoursTotal;
  const totalVacSum = mainVacTotal + clubVacTotal;

  // Completion rate (approved / total)
  const completionPct = absoluteTotalCount > 0 ? Math.round((approvedCount / absoluteTotalCount) * 100) : 0;

  const stats = [
    {
      id: 'approved',
      label: 'Tamamlanma',
      value: `${approvedCount} / ${totalCount} / ${absoluteTotalCount}`,
      customContent: (
        <div className="flex items-end gap-2 mb-1">
           <span className="text-3xl font-black text-emerald-600 leading-none">{approvedCount}</span>
           <span className="text-sm font-semibold text-emerald-700/60 leading-none pb-0.5">/ {absoluteTotalCount}</span>
           <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-auto">
             {completionPct}%
           </span>
        </div>
      ),
      sub: totalCount > 0 ? `${totalCount} məktəb aktiv işləyir` : 'Aktiv plan yoxdur',
      icon: CheckCircle2,
      progressPct: completionPct,
      progressColor: 'bg-emerald-400',
      trackColor: 'bg-emerald-100',
      border: 'border-l-emerald-400',
      bg: 'bg-emerald-50/60',
      iconBg: 'bg-emerald-500',
      labelColor: 'text-emerald-700',
      activeRing: 'ring-2 ring-emerald-400 ring-offset-2 shadow-md',
    },
    {
      id: 'submitted',
      label: 'Gözləmədə',
      value: submittedCount, // kept for compatibility if needed
      customContent: (
        <div className="flex items-end gap-2 mb-1">
           <span className="text-3xl font-black text-blue-600 leading-none">{submittedCount}</span>
           <span className="text-sm font-semibold text-blue-700/60 leading-none pb-0.5">/ {absoluteTotalCount}</span>
        </div>
      ),
      sub: submittedCount > 0 ? 'Sektor təsdiqi gözlənir' : 'Gözləyən plan yoxdur',
      icon: Clock,
      progressPct: totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0,
      progressColor: 'bg-blue-400',
      trackColor: 'bg-blue-100',
      border: 'border-l-blue-400',
      bg: 'bg-blue-50/60',
      iconBg: 'bg-blue-500',
      labelColor: 'text-blue-700',
      activeRing: 'ring-2 ring-blue-400 ring-offset-2 shadow-md',
    },
    {
      id: 'total',
      label: 'Plan Saatları',
      value: totalHoursSum.toFixed(1),
      customContent: (
        <div className="flex items-end gap-2 mb-1">
           <span className="text-3xl font-black text-violet-600 leading-none">{totalHoursSum.toFixed(1)}</span>
           <span className="text-sm font-semibold text-violet-700/60 leading-none pb-0.5">saat</span>
        </div>
      ),
      sub: clubHoursTotal > 0 ? `Daxildir: ${clubHoursTotal.toFixed(1)} dərnək · ${totalCount} məktəb` : `${totalCount} məktəb üzrə`,
      subHighlight: clubHoursTotal > 0,
      icon: BookOpen,
      progressPct: null,
      progressColor: 'bg-violet-400',
      trackColor: 'bg-violet-100',
      border: 'border-l-violet-400',
      bg: 'bg-violet-50/60',
      iconBg: 'bg-violet-500',
      labelColor: 'text-violet-700',
      activeRing: 'ring-2 ring-violet-400 ring-offset-2 shadow-md',
    },
    {
      id: 'vacancies',
      label: 'Vakansiya',
      value: mainVacTotal.toFixed(1),
      customContent: (
        <div className="flex items-end gap-2 mb-1">
           <span className="text-3xl font-black text-rose-600 leading-none">{(mainVacTotal + clubVacTotal).toFixed(1)}</span>
           <span className="text-sm font-semibold text-rose-700/60 leading-none pb-0.5">vakant</span>
        </div>
      ),
      sub: clubVacTotal > 0 ? `Daxildir: ${clubVacTotal.toFixed(1)} dərnək · ${totalCount} məktəb` : `${totalCount} məktəb üzrə`,
      subHighlight: clubVacTotal > 0,
      icon: AlertCircle,
      progressPct: null,
      progressColor: (mainVacTotal + clubVacTotal) > 0 ? 'bg-rose-400' : 'bg-slate-300',
      trackColor: 'bg-rose-100',
      border: (mainVacTotal + clubVacTotal) > 0 ? 'border-l-rose-400' : 'border-l-slate-200',
      bg: (mainVacTotal + clubVacTotal) > 0 ? 'bg-rose-50/60' : 'bg-slate-50/60',
      iconBg: (mainVacTotal + clubVacTotal) > 0 ? 'bg-rose-500' : 'bg-slate-400',
      labelColor: (mainVacTotal + clubVacTotal) > 0 ? 'text-rose-600' : 'text-slate-500',
      activeRing: 'ring-2 ring-rose-400 ring-offset-2 shadow-md',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeStat === stat.id;
        return (
          <div
            key={stat.id}
            onClick={() => onStatClick?.(stat.id)}
            className={cn(
              'flex flex-col justify-between p-4 rounded-xl border border-transparent border-l-4 cursor-pointer transition-all select-none',
              'bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5',
              stat.border,
              isActive ? stat.activeRing : ''
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className={cn('text-[11px] font-semibold uppercase tracking-wider mb-1', stat.labelColor)}>
                  {stat.label}
                </p>
                {(stat as any).customContent ? (
                  (stat as any).customContent
                ) : (
                  <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">
                    {stat.value}
                  </p>
                )}
              </div>
              <div className={cn('p-2 rounded-lg shrink-0', stat.iconBg)}>
                <Icon size={16} className="text-white" />
              </div>
            </div>

            {/* Progress bar (for approved / submitted) */}
            {stat.progressPct !== null && (
              <div className={cn('w-full h-1 rounded-full mb-2', stat.trackColor)}>
                <div
                  className={cn('h-full rounded-full transition-all', stat.progressColor)}
                  style={{ width: `${stat.progressPct}%` }}
                />
              </div>
            )}

            <p className={cn(
              'text-[11px] leading-none',
              stat.subHighlight ? (stat.id === 'vacancies' ? 'text-rose-400' : 'text-violet-500') : 'text-slate-400'
            )}>
              {stat.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
};
