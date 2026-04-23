import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye,
  Search,
  ArrowRight,
  RotateCcw,
  TrendingDown,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardTableProps {
  schools: any[];
  isLoading: boolean;
  isError?: boolean;
  isRegionAdmin: boolean;
  isSektorAdmin: boolean;
  sectorsMap?: Record<string, string>;
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    approved: {
      label: 'Təsdiqlənib',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 size={11} className="shrink-0" />,
    },
    submitted: {
      label: 'Gözləyir',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Clock size={11} className="shrink-0" />,
    },
    returned: {
      label: 'Geri qaytarıldı',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <RotateCcw size={11} className="shrink-0" />,
    },
    draft: {
      label: 'Qaralama',
      className: 'bg-slate-50 text-slate-500 border-slate-200',
      icon: <Clock size={11} className="shrink-0 opacity-50" />,
    },
  };
  const config = map[status] || map.draft;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold whitespace-nowrap',
      config.className
    )}>
      {config.icon}
      {config.label}
    </span>
  );
};

const HoursCell = ({ main, club }: { main: number; club: number }) => {
  const total = main + club;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-base font-bold text-slate-800 tabular-nums">{total > 0 ? total.toFixed(1) : '—'}</span>
      {club > 0 && (
        <span className="text-xs text-slate-400 tabular-nums">
          {main.toFixed(1)} + <span className="text-violet-500">{club.toFixed(1)} dər.</span>
        </span>
      )}
    </div>
  );
};

const VacancyCell = ({ main, club }: { main: number; club: number }) => {
  const total = main + club;
  const isHighVacancy = main >= 50;
  const isMediumVacancy = main >= 20 && main < 50;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={cn(
        'text-base font-bold tabular-nums',
        isHighVacancy ? 'text-rose-500' : isMediumVacancy ? 'text-amber-500' : total > 0 ? 'text-slate-600' : 'text-slate-300'
      )}>
        {total > 0 ? total.toFixed(1) : '—'}
      </span>
      {club > 0 && (
        <span className="text-xs text-slate-400 tabular-nums">
          {main.toFixed(1)} + <span className="text-violet-400">{club.toFixed(1)} dər.</span>
        </span>
      )}
    </div>
  );
};

export const DashboardTable: React.FC<DashboardTableProps> = ({
  schools = [],
  isLoading,
  isRegionAdmin,
  isSektorAdmin,
  sectorsMap = {},
  isError,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-14 bg-slate-100/70 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-rose-100 shadow-sm">
        <div className="p-5 bg-rose-50 rounded-2xl mb-4 text-rose-300">
          <AlertCircle size={36} />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-1">Məlumatları yükləmək mümkün olmadı</h3>
        <p className="text-sm text-slate-400">Zəhmət olmasa səhifəni yeniləyin və ya bir az sonra təkrar yoxlayın.</p>
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 bg-slate-50 rounded-2xl mb-4 text-slate-300">
          <Search size={36} />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-1">Məktəb tapılmadı</h3>
        <p className="text-sm text-slate-400">Seçdiyiniz filtrlərə uyğun məlumat yoxdur</p>
      </div>
    );
  }

  const showSectorCol = isRegionAdmin;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className={cn(
        'grid items-center bg-slate-50 border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider',
        showSectorCol
          ? 'grid-cols-[2.5rem_1fr_10rem_8rem_8rem_8rem_7rem]'
          : 'grid-cols-[2.5rem_1fr_8rem_8rem_8rem_7rem]'
      )}>
        <span className="text-center">#</span>
        <span>Müəssisə</span>
        {showSectorCol && <span>Sektor</span>}
        <span className="text-center">Status</span>
        <span className="text-right">Plan (Saat)</span>
        <span className="text-right">Vakansiya</span>
        <span className="text-right">Əməliyyat</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {schools.map((school: any, idx: number) => {
          const status = school.curriculum_status || 'draft';
          const mainHours = parseFloat(school.curriculum_main_hours) || 0;
          const clubHours = parseFloat(school.curriculum_club_hours) || 0;
          const mainVac = parseFloat(school.curriculum_main_vacancies) || 0;
          const clubVac = parseFloat(school.curriculum_club_vacancies) || 0;
          const totalHours = mainHours + clubHours;
          const sectorName = sectorsMap[school.parent_id] || school.parent?.name || school.sector?.name || null;

          // Completion progress: how much of the plan is filled (assigned / total plan)
          const totalVacancy = mainVac + clubVac;
          const assigned = totalHours - totalVacancy;
          const fillPct = totalHours > 0 ? Math.max(0, Math.min(100, Math.round((assigned / totalHours) * 100))) : 0;

          return (
            <div
              key={school.id}
              className={cn(
                'grid items-center px-4 py-3 gap-2 hover:bg-slate-50/80 transition-colors group',
                'border-l-4',
                status === 'approved' ? 'border-l-emerald-400' :
                status === 'submitted' ? 'border-l-blue-400' :
                status === 'returned' ? 'border-l-rose-400' : 'border-l-transparent',
                showSectorCol
                  ? 'grid-cols-[2.5rem_1fr_10rem_8rem_8rem_8rem_7rem]'
                  : 'grid-cols-[2.5rem_1fr_8rem_8rem_8rem_7rem]'
              )}
            >
              {/* Index */}
              <span className="text-center text-sm text-slate-400 font-semibold">{idx + 1}</span>

              {/* School Name */}
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug truncate">
                  {school.name}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-400">
                    UTİS: <span className="font-medium">{school.utis_code || '—'}</span>
                  </span>
                  {/* Progress bar */}
                  {totalHours > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            fillPct >= 80 ? 'bg-emerald-400' :
                            fillPct >= 40 ? 'bg-amber-400' : 'bg-slate-300'
                          )}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{fillPct}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sector Column - RegionAdmin only */}
              {showSectorCol && (
                <div className="min-w-0">
                  {sectorName ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-full">
                      <Building2 size={10} className="shrink-0 text-slate-400" />
                      <span className="truncate">{sectorName}</span>
                    </span>
                  ) : (
                    <span className="text-slate-300 text-sm">—</span>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="flex justify-center">
                <StatusBadge status={status} />
              </div>

              {/* Hours */}
              <div className="flex justify-end">
                <HoursCell main={mainHours} club={clubHours} />
              </div>

              {/* Vacancy */}
              <div className="flex justify-end">
                <VacancyCell main={mainVac} club={clubVac} />
              </div>

              {/* Action */}
              <div className="flex justify-end">
                <button
                  onClick={() => navigate(`/curriculum/plan/${school.id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-sm font-semibold transition-all active:scale-95 shadow-sm"
                >
                  Giriş <ArrowRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">{schools.length} məktəb göstərilir</span>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 bg-emerald-400 rounded-full inline-block" /> Təsdiqlənib
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 bg-blue-400 rounded-full inline-block" /> Gözləyir
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 bg-rose-400 rounded-full inline-block" /> Geri qaytarıldı
          </span>
        </div>
      </div>
    </div>
  );
};
