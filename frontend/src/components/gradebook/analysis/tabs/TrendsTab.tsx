import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalysisFilters } from '../filters/AnalysisFilters';
import { gradeBookService } from '@/services/gradeBook';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendsTabProps {
  filters: AnalysisFilters;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

const LINE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16',
];

function scoreColor(v: number) {
  if (v >= 80) return 'text-green-600';
  if (v >= 60) return 'text-yellow-700';
  if (v >= 30) return 'text-orange-600';
  return 'text-red-600';
}

export function TrendsTab({ filters }: TrendsTabProps) {
  const [groupBy, setGroupBy] = useState<'semester' | 'assessment_type'>('semester');
  const [activeView, setActiveView] = useState<'overall' | 'class' | 'subject'>('overall');

  const params = useMemo(() => {
    const p: Record<string, number | string | number[] | string[]> = { group_by: groupBy };
    if (filters.institution_id)              p.institution_id      = filters.institution_id;
    if (filters.academic_year_ids?.length)   p.academic_year_ids   = filters.academic_year_ids!;
    if (filters.sector_ids?.length)          p.sector_ids          = filters.sector_ids!;
    if (filters.school_ids?.length)          p.school_ids          = filters.school_ids!;
    if (filters.class_levels?.length)        p.class_levels        = filters.class_levels!;
    if (filters.teaching_languages?.length)  p.teaching_languages  = filters.teaching_languages!;
    return p;
  }, [filters.institution_id, filters.academic_year_ids, filters.sector_ids, filters.school_ids,
      filters.class_levels, filters.teaching_languages, groupBy]);

  const { data, isLoading } = useQuery({
    queryKey: ['regionTrends', params],
    queryFn: () => gradeBookService.getRegionTrends(params as Parameters<typeof gradeBookService.getRegionTrends>[0]),
    staleTime: 5 * 60 * 1000,
  });

  const trendData     = data?.data?.trend_data    ?? [];
  const classTrends   = data?.data?.class_trends  ?? [];
  const subjectTrends = data?.data?.subject_trends ?? [];

  // Build chart data for class trends (pivot: period as X, class as line)
  const classTrendChart = useMemo(() => {
    const periods = [...new Set(classTrends.flatMap((c) => c.trend.map((t) => t.period)))].sort();
    return periods.map((period) => {
      const row: Record<string, string | number> = { period };
      classTrends.forEach((c) => {
        const point = c.trend.find((t) => t.period === period);
        if (point) row[c.label] = point.avg_score;
      });
      return row;
    });
  }, [classTrends]);

  // Build chart data for subject trends
  const subjectTrendChart = useMemo(() => {
    const periods = [...new Set(subjectTrends.flatMap((s) => s.trend.map((t) => t.period)))].sort();
    return periods.map((period) => {
      const row: Record<string, string | number> = { period };
      subjectTrends.forEach((s) => {
        const point = s.trend.find((t) => t.period === period);
        if (point) row[s.subject_name] = point.avg_score;
      });
      return row;
    });
  }, [subjectTrends]);

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!trendData.length) return (
    <div className="text-center py-16 text-slate-400">
      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p className="font-medium">Məlumat tapılmadı</p>
      <p className="text-sm mt-1">Tədris ili seçin və ya data daxil edilməsini gözləyin</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Group by toggle */}
        <div className="flex rounded-md border border-slate-200 overflow-hidden text-sm h-9">
          {(['semester', 'assessment_type'] as const).map((v) => (
            <button
              key={v}
              className={cn('px-3 py-1.5 transition-colors',
                groupBy === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
              onClick={() => setGroupBy(v)}
            >
              {v === 'semester' ? 'Semestr üzrə' : 'İmtahan növü üzrə'}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex rounded-md border border-slate-200 overflow-hidden text-sm h-9 ml-auto">
          {(['overall', 'class', 'subject'] as const).map((v) => (
            <button
              key={v}
              className={cn('px-3 py-1.5 transition-colors',
                activeView === v ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
              onClick={() => setActiveView(v)}
            >
              {v === 'overall' ? 'Ümumi' : v === 'class' ? 'Sinif' : 'Fənn'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary cards (overall period comparison) ── */}
      {trendData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {trendData.map((p) => (
            <Card key={p.period}>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-slate-500 mb-1 font-medium">{p.period}</p>
                <p className={cn('text-2xl font-bold', scoreColor(p.avg_score))}>{p.avg_score.toFixed(1)}</p>
                <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Şagird:</span><span className="font-medium">{p.student_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Keçid:</span>
                    <span className={cn('font-medium', p.pass_rate >= 70 ? 'text-green-600' : 'text-orange-600')}>
                      {p.pass_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>0–30 bal:</span>
                    <span className="font-medium text-red-600">{p.below_30_pct.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Overall: score distribution bar chart ── */}
      {activeView === 'overall' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Bal paylanması — {groupBy === 'semester' ? 'semestr' : 'imtahan növü'} üzrə (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Legend />
                <Bar dataKey="r0_30_pct"   name="≤30 bal"   stackId="a" fill="#EF4444" />
                <Bar dataKey="r30_60_pct"  name="31–60 bal" stackId="a" fill="#F97316" />
                <Bar dataKey="r60_80_pct"  name="61–80 bal" stackId="a" fill="#EAB308" />
                <Bar dataKey="r80_100_pct" name="81+ bal"   stackId="a" fill="#22C55E" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Overall: avg score line ── */}
      {activeView === 'overall' && trendData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Ortalama bal — dinamika</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => v.toFixed(1)} />
                <Legend />
                <Line dataKey="avg_score"  name="Ortalama bal" stroke="#3B82F6" strokeWidth={2} dot={{ r: 5 }} />
                <Line dataKey="pass_rate"  name="Keçid %" stroke="#22C55E" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 4 }} />
                <Line dataKey="below_30_pct" name="0–30 bal %" stroke="#EF4444" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Class level trends ── */}
      {activeView === 'class' && (
        <>
          {classTrendChart.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Sinif səviyyəsi üzrə ortalama bal dinamikası
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={classTrendChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => v?.toFixed(1)} />
                    <Legend />
                    {classTrends.map((c, i) => (
                      <Line
                        key={c.class_level}
                        dataKey={c.label}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm">Sinif trend məlumatı yoxdur</div>
          )}

          {/* Class level table */}
          {classTrends.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2.5 font-medium text-slate-600">Sinif</th>
                        {trendData.map((p) => (
                          <th key={p.period} className="text-right px-4 py-2.5 font-medium text-slate-600">{p.period}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classTrends.map((c, idx) => (
                        <tr key={c.class_level} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="px-4 py-2.5 font-medium">{c.label}</td>
                          {trendData.map((p) => {
                            const point = c.trend.find((t) => t.period === p.period);
                            return (
                              <td key={p.period} className="px-4 py-2.5 text-right">
                                {point ? (
                                  <span className={cn('font-semibold', scoreColor(point.avg_score))}>
                                    {point.avg_score.toFixed(1)}
                                  </span>
                                ) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Subject trends ── */}
      {activeView === 'subject' && (
        <>
          {subjectTrendChart.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Fənn üzrə ortalama bal dinamikası
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={subjectTrendChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => v?.toFixed(1)} />
                    <Legend />
                    {subjectTrends.slice(0, 8).map((s, i) => (
                      <Line
                        key={s.subject_id}
                        dataKey={s.subject_name}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm">Fənn trend məlumatı yoxdur</div>
          )}

          {/* Subject table */}
          {subjectTrends.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2.5 font-medium text-slate-600">Fənn</th>
                        {trendData.map((p) => (
                          <th key={p.period} className="text-right px-4 py-2.5 font-medium text-slate-600">{p.period}</th>
                        ))}
                        <th className="text-right px-4 py-2.5 font-medium text-slate-600">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectTrends.map((s, idx) => {
                        const first = s.trend[0]?.avg_score ?? 0;
                        const last  = s.trend[s.trend.length - 1]?.avg_score ?? 0;
                        const diff  = last - first;
                        return (
                          <tr key={s.subject_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="px-4 py-2.5 font-medium">{s.subject_name}</td>
                            {trendData.map((p) => {
                              const point = s.trend.find((t) => t.period === p.period);
                              return (
                                <td key={p.period} className="px-4 py-2.5 text-right">
                                  {point ? (
                                    <span className={cn('font-semibold', scoreColor(point.avg_score))}>
                                      {point.avg_score.toFixed(1)}
                                    </span>
                                  ) : '—'}
                                </td>
                              );
                            })}
                            <td className="px-4 py-2.5 text-right">
                              {s.trend.length > 1 ? (
                                <span className={cn('text-xs font-medium flex items-center justify-end gap-0.5',
                                  diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-slate-500')}>
                                  {diff > 0 ? '▲' : diff < 0 ? '▼' : '—'} {Math.abs(diff).toFixed(1)}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
