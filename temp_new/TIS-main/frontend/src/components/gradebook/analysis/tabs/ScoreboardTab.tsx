import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  BarChart3, TrendingUp, TrendingDown, Users, School,
  Search, ChevronUp, ChevronDown as ChevronDownIcon, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { gradeBookService } from '@/services/gradeBook';
import { cn } from '@/lib/utils';
import { type AnalysisFilters } from '../filters/AnalysisFilters';

// ─── Types ────────────────────────────────────────────────────────────────────
type School = {
  rank: number;
  school_id: number;
  school_name: string;
  sector_id: number;
  sector_name: string;
  avg: number;
  pass_rate: number;
  r0_30_pct: number;
  r30_60_pct: number;
  r60_80_pct: number;
  r80_100_pct: number;
  student_count: number;
  journal_count: number;
  teacher_count: number;
  min_score: number;
  max_score: number;
};

type Sector = {
  sector_id: number;
  sector_name: string;
  avg: number;
  pass_rate: number;
  r0_30_pct: number;
  school_count: number;
  student_count: number;
};

type SortKey = 'rank' | 'avg' | 'pass_rate' | 'r0_30_pct' | 'student_count';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avgBadge(avg: number) {
  if (avg >= 70) return <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0 min-w-[42px] justify-center">{avg}</Badge>;
  if (avg >= 50) return <Badge className="bg-yellow-500 text-white text-[10px] px-1.5 py-0 min-w-[42px] justify-center">{avg}</Badge>;
  return <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 min-w-[42px] justify-center">{avg}</Badge>;
}

function pctColor(pct: number) {
  if (pct >= 70) return 'text-green-700 font-semibold';
  if (pct >= 50) return 'text-yellow-700 font-semibold';
  return 'text-red-600 font-semibold';
}

function barColor(avg: number) {
  if (avg >= 70) return '#16a34a';
  if (avg >= 50) return '#ca8a04';
  return '#dc2626';
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon: Icon, color }: {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sort header ──────────────────────────────────────────────────────────────
function SortTh({ label, sortKey, current, dir, onSort }: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className={cn(
        'px-2 py-2 text-center text-[11px] font-semibold cursor-pointer select-none whitespace-nowrap',
        active ? 'text-blue-700 bg-blue-50' : 'text-slate-500 hover:text-slate-700',
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active
          ? dir === 'desc'
            ? <ChevronDownIcon className="w-3 h-3" />
            : <ChevronUp className="w-3 h-3" />
          : <ChevronUp className="w-3 h-3 opacity-20" />
        }
      </span>
    </th>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props { filters: AnalysisFilters }

export function ScoreboardTab({ filters }: Props) {
  const [search,  setSearch]  = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const params = useMemo(() => {
    const p: Record<string, string | number | number[] | string[]> = {};
    if (filters.institution_id)          p.institution_id      = filters.institution_id;
    if (filters.academic_year_ids?.length) p.academic_year_ids = filters.academic_year_ids;
    if (filters.subject_ids?.length)     p.subject_ids         = filters.subject_ids;
    if (filters.sector_ids?.length)      p.sector_ids          = filters.sector_ids;
    if (filters.school_ids?.length)      p.school_ids          = filters.school_ids;
    if (filters.class_levels?.length)    p.class_levels        = filters.class_levels;
    if (filters.grade_ids?.length)       p.grade_ids           = filters.grade_ids;
    if (filters.teaching_languages?.length) p.teaching_languages = filters.teaching_languages;
    if (filters.gender)                  p.gender              = filters.gender;
    return p;
  }, [filters]);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['scoreboard', params],
    queryFn:  () => gradeBookService.getScoreboardData(params as Parameters<typeof gradeBookService.getScoreboardData>[0]),
    staleTime: 5 * 60 * 1000,
  });

  const result = raw?.data;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' ? 'asc' : 'desc');
    }
  };

  const filteredSchools = useMemo(() => {
    const schools: School[] = result?.schools ?? [];
    const term = search.toLowerCase();
    const filtered = term
      ? schools.filter(s =>
          s.school_name.toLowerCase().includes(term) ||
          s.sector_name.toLowerCase().includes(term)
        )
      : schools;

    return [...filtered].sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      return (a[sortKey] - b[sortKey]) * mul;
    });
  }, [result?.schools, search, sortKey, sortDir]);

  const summary = result?.summary;
  const sectors: Sector[] = result?.sectors ?? [];

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!result || filteredSchools.length === 0 && !search) {
    return (
      <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-lg">
        <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium text-sm">Məlumat tapılmadı</p>
        <p className="text-xs mt-1">Tədris ilini seçin və ya filtrləri dəyişin</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          title="Region orta balı"
          value={<span className={cn(
            'text-2xl font-bold',
            (summary?.region_avg ?? 0) >= 70 ? 'text-green-700' :
            (summary?.region_avg ?? 0) >= 50 ? 'text-yellow-700' : 'text-red-600'
          )}>{summary?.region_avg ?? '—'}</span>}
          icon={BarChart3}
          color="bg-blue-600"
        />
        <KpiCard
          title="Orta keçid faizi"
          value={`${summary?.region_pass_rate ?? '—'}%`}
          icon={TrendingUp}
          color="bg-emerald-600"
        />
        <KpiCard
          title="Ən yaxşı məktəb"
          value={summary?.best_school?.avg ?? '—'}
          sub={summary?.best_school?.name}
          icon={TrendingUp}
          color="bg-green-600"
        />
        <KpiCard
          title="Ən zəif məktəb"
          value={summary?.worst_school?.avg ?? '—'}
          sub={summary?.worst_school?.name}
          icon={TrendingDown}
          color="bg-red-500"
        />
      </div>

      {/* ── Sector bar chart ── */}
      {sectors.length > 1 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-700">Sektorlar üzrə orta bal</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={Math.max(120, sectors.length * 36)}>
              <BarChart
                layout="vertical"
                data={sectors}
                margin={{ top: 0, right: 40, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="sector_name"
                  width={140}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}`, 'Orta bal']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11 }}>
                  {sectors.map((s) => (
                    <Cell key={s.sector_id} fill={barColor(s.avg)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── School ranking table ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Məktəb reytinqi
              <Badge variant="secondary" className="ml-2 text-[10px]">{summary?.total_schools} məktəb</Badge>
            </CardTitle>
            <div className="relative w-52">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Məktəb axtar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSchools.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">Nəticə tapılmadı</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <SortTh label="#"          sortKey="rank"         current={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500">Məktəb</th>
                    <th className="px-2 py-2 text-left text-[11px] font-semibold text-slate-500">Sektor</th>
                    <SortTh label="Ort.bal"    sortKey="avg"          current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="Keçid%"     sortKey="pass_rate"    current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label="≤30%"       sortKey="r0_30_pct"    current={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500">31-60%</th>
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500">61-80%</th>
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500">81+%</th>
                    <SortTh label="Şagird"     sortKey="student_count" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500">Jurnal</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchools.map((sc, idx) => (
                    <tr
                      key={sc.school_id}
                      className={cn(
                        'border-b border-slate-100 hover:bg-slate-50 transition-colors',
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40',
                      )}
                    >
                      {/* Rank */}
                      <td className="px-2 py-2 text-center font-bold text-slate-500 text-[11px]">
                        {sc.rank <= 3 ? (
                          <span className={cn(
                            'inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold',
                            sc.rank === 1 ? 'bg-yellow-500' : sc.rank === 2 ? 'bg-slate-400' : 'bg-amber-700',
                          )}>
                            {sc.rank}
                          </span>
                        ) : (
                          <span className="text-slate-400">{sc.rank}</span>
                        )}
                      </td>
                      {/* School name */}
                      <td className="px-3 py-2 font-medium text-slate-700 max-w-[180px] truncate">
                        {sc.avg < 50 && (
                          <AlertTriangle className="inline w-3 h-3 text-red-500 mr-1 shrink-0" />
                        )}
                        {sc.school_name}
                      </td>
                      {/* Sector */}
                      <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{sc.sector_name}</td>
                      {/* Avg */}
                      <td className="px-2 py-2 text-center">{avgBadge(sc.avg)}</td>
                      {/* Pass rate */}
                      <td className={cn('px-2 py-2 text-center', pctColor(sc.pass_rate))}>
                        {sc.pass_rate.toFixed(0)}%
                      </td>
                      {/* Score bands */}
                      <td className={cn('px-2 py-2 text-center', sc.r0_30_pct > 20 ? 'text-red-600 font-semibold' : 'text-slate-500')}>
                        {sc.r0_30_pct.toFixed(0)}%
                      </td>
                      <td className="px-2 py-2 text-center text-orange-600">{sc.r30_60_pct.toFixed(0)}%</td>
                      <td className="px-2 py-2 text-center text-yellow-700">{sc.r60_80_pct.toFixed(0)}%</td>
                      <td className={cn('px-2 py-2 text-center', sc.r80_100_pct > 30 ? 'text-green-700 font-semibold' : 'text-slate-500')}>
                        {sc.r80_100_pct.toFixed(0)}%
                      </td>
                      {/* Students */}
                      <td className="px-2 py-2 text-center text-slate-600">{sc.student_count}</td>
                      {/* Journals */}
                      <td className="px-2 py-2 text-center text-indigo-600">{sc.journal_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sector summary table ── */}
      {sectors.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-700">Sektorlar üzrə icmal</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500">Sektor</th>
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500">Ort.bal</th>
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500">Keçid%</th>
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500">≤30%</th>
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500">Məktəb</th>
                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500">Şagird</th>
                  </tr>
                </thead>
                <tbody>
                  {sectors.map((sec, idx) => (
                    <tr key={sec.sector_id} className={cn(
                      'border-b border-slate-100',
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40',
                    )}>
                      <td className="px-3 py-2 font-medium text-slate-700">{sec.sector_name}</td>
                      <td className="px-2 py-2 text-center">{avgBadge(sec.avg)}</td>
                      <td className={cn('px-2 py-2 text-center', pctColor(sec.pass_rate))}>
                        {sec.pass_rate.toFixed(0)}%
                      </td>
                      <td className={cn('px-2 py-2 text-center', sec.r0_30_pct > 20 ? 'text-red-600 font-semibold' : 'text-slate-500')}>
                        {sec.r0_30_pct.toFixed(0)}%
                      </td>
                      <td className="px-2 py-2 text-center text-slate-600">
                        <span className="inline-flex items-center gap-1"><School className="w-3 h-3" />{sec.school_count}</span>
                      </td>
                      <td className="px-2 py-2 text-center text-slate-600">
                        <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{sec.student_count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
