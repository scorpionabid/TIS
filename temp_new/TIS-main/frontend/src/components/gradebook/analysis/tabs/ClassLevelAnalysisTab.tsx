import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, BarChart3, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { gradeBookService } from '@/services/gradeBook';
import { cn } from '@/lib/utils';

interface ClassLevelAnalysisTabProps {
  institutionId?: number;
  academicYearId?: number;
}

const RANGE_COLORS = {
  '0–30':  '#EF4444',
  '30–60': '#F97316',
  '60–80': '#EAB308',
  '80+':   '#22C55E',
};

const RANGE_BG = {
  '0–30':  'bg-red-500',
  '30–60': 'bg-orange-500',
  '60–80': 'bg-yellow-500',
  '80+':   'bg-green-500',
};

const RANGE_TEXT = {
  '0–30':  'text-red-600',
  '30–60': 'text-orange-600',
  '60–80': 'text-yellow-700',
  '80+':   'text-green-600',
};

function scoreColor(avg: number) {
  if (avg >= 80) return 'text-green-600';
  if (avg >= 60) return 'text-yellow-700';
  if (avg >= 30) return 'text-orange-600';
  return 'text-red-600';
}

export function ClassLevelAnalysisTab({ institutionId, academicYearId }: ClassLevelAnalysisTabProps) {
  const [filterClassLevel, setFilterClassLevel] = useState<string>('all');
  const [filterSubject, setFilterSubject]       = useState<string>('all');
  const [filterAssessType, setFilterAssessType] = useState<string>('all');
  const [filterSemester, setFilterSemester]     = useState<string>('all');
  const [chartMode, setChartMode]               = useState<'avg' | 'dist'>('dist');
  const [exporting, setExporting]               = useState(false);

  const params = useMemo(() => {
    const p: Record<string, number | string> = {};
    if (institutionId)     p.institution_id      = institutionId;
    if (academicYearId)    p.academic_year_id     = academicYearId;
    if (filterClassLevel !== 'all') p.class_level = Number(filterClassLevel);
    if (filterSubject    !== 'all') p.subject_id  = Number(filterSubject);
    if (filterAssessType !== 'all') p.assessment_type_id = Number(filterAssessType);
    if (filterSemester   !== 'all') p.semester    = filterSemester;
    return p;
  }, [institutionId, academicYearId, filterClassLevel, filterSubject, filterAssessType, filterSemester]);

  const { data, isLoading } = useQuery({
    queryKey: ['classLevelSubjectAnalysis', params],
    queryFn: () => gradeBookService.getClassLevelSubjectAnalysis(params),
    staleTime: 5 * 60 * 1000,
  });

  const rows             = data?.data?.rows            ?? [];
  const classLevels      = data?.data?.class_levels    ?? [];
  const subjects         = data?.data?.subjects        ?? [];
  const assessmentTypes  = data?.data?.assessment_types ?? [];

  // Summary totals across filtered rows
  const summary = useMemo(() => {
    if (!rows.length) return null;
    const totalStudents = rows.reduce((s, r) => s + r.student_count, 0);
    const totalScores   = rows.reduce((s, r) => s + r.total_scores, 0);
    const avgScore      = totalScores > 0
      ? rows.reduce((s, r) => s + r.avg_score * r.total_scores, 0) / totalScores
      : 0;
    const below30       = rows.reduce((s, r) => s + r.below_30_count, 0);
    const passCount     = rows.reduce((s, r) => s + r.ranges[1].count + r.ranges[2].count + r.ranges[3].count, 0);
    return {
      totalStudents,
      totalScores,
      avgScore: Math.round(avgScore * 10) / 10,
      below30,
      below30Pct: totalScores > 0 ? Math.round((below30 / totalScores) * 1000) / 10 : 0,
      passRate:   totalScores > 0 ? Math.round((passCount / totalScores) * 1000) / 10 : 0,
    };
  }, [rows]);

  // Chart data — by class level
  const chartData = useMemo(() => {
    const byLevel = new Map<number, Record<string, number>>();
    rows.forEach((r) => {
      if (!byLevel.has(r.class_level)) byLevel.set(r.class_level, { class_level: r.class_level });
      const entry = byLevel.get(r.class_level)!;
      if (chartMode === 'avg') {
        // Weighted average across subjects per level
        const prev = entry[r.subject_name] ?? 0;
        entry[r.subject_name] = prev > 0 ? Math.round((prev + r.avg_score) / 2 * 10) / 10 : r.avg_score;
      } else {
        // Stacked distribution
        r.ranges.forEach((range) => {
          entry[range.label] = (entry[range.label] ?? 0) + range.count;
        });
      }
    });
    return Array.from(byLevel.values()).sort((a, b) => a.class_level - b.class_level);
  }, [rows, chartMode]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const p: Record<string, number> = {};
      if (institutionId)  p.institution_id  = institutionId;
      if (academicYearId) p.academic_year_id = academicYearId;
      const blob = await gradeBookService.exportComprehensive(p);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sinif_analizi_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } finally { setExporting(false); }
  };

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  if (rows.length === 0) return (
    <div className="text-center py-16 text-slate-400">
      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p className="font-medium">Məlumat tapılmadı</p>
      <p className="text-sm mt-1">Filtrlər dəyişdirib yenidən yoxlayın</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Class level */}
        <Select value={filterClassLevel} onValueChange={setFilterClassLevel}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Sinif səv." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün sinif</SelectItem>
            {classLevels.map((lvl) => (
              <SelectItem key={lvl} value={String(lvl)}>{lvl}-ci sinif</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subject */}
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="Fənn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün fənnlər</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assessment type */}
        <Select value={filterAssessType} onValueChange={setFilterAssessType}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="İmtahan növü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün imtahanlar</SelectItem>
            {assessmentTypes.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Semester */}
        <div className="flex rounded-md border border-slate-200 overflow-hidden text-sm h-9">
          {(['all', 'I', 'II'] as const).map((v) => (
            <button
              key={v}
              className={cn('px-3 py-1.5 transition-colors',
                filterSemester === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
              onClick={() => setFilterSemester(v)}
            >
              {v === 'all' ? 'Hər iki semestr' : `${v} Semestr`}
            </button>
          ))}
        </div>

        {/* Chart mode */}
        <div className="flex rounded-md border border-slate-200 overflow-hidden text-sm h-9 ml-auto">
          {(['dist', 'avg'] as const).map((v) => (
            <button
              key={v}
              className={cn('px-3 py-1.5 transition-colors',
                chartMode === v ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
              onClick={() => setChartMode(v)}
            >
              {v === 'dist' ? 'Paylanma' : 'Ortalama'}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <FileDown className="w-4 h-4 mr-1.5" />
          {exporting ? 'Yüklənir...' : 'Excel'}
        </Button>
      </div>

      {/* ── Summary cards ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ümumi bal', value: summary.totalScores.toLocaleString(), icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Orta bal', value: summary.avgScore.toFixed(1), icon: TrendingUp, color: scoreColor(summary.avgScore), bg: 'bg-slate-50' },
            { label: '0–30 bal', value: `${summary.below30} (${summary.below30Pct}%)`, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Keçid faizi', value: `${summary.passRate}%`, icon: Users, color: summary.passRate >= 70 ? 'text-green-600' : 'text-orange-600', bg: summary.passRate >= 70 ? 'bg-green-50' : 'bg-orange-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('p-1.5 rounded-lg', bg)}>
                    <Icon className={cn('w-4 h-4', color)} />
                  </div>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
                <p className={cn('text-xl font-bold', color)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Score range legend ── */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(RANGE_COLORS).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-slate-600">{label} bal</span>
          </span>
        ))}
      </div>

      {/* ── Chart ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            {chartMode === 'dist'
              ? 'Sinif səviyyəsinə görə bal paylanması (şagird sayı)'
              : 'Sinif səviyyəsinə görə fənn üzrə ortalama bal'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="class_level" tickFormatter={(v) => `${v}-ci`} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {chartMode === 'dist'
                ? Object.entries(RANGE_COLORS).map(([label, color]) => (
                    <Bar key={label} dataKey={label} stackId="a" fill={color} radius={label === '80+' ? [3, 3, 0, 0] : [0, 0, 0, 0]} maxBarSize={48} />
                  ))
                : subjects.slice(0, 8).map((s, i) => (
                    <Bar key={s.id} dataKey={s.name} fill={['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899','#84CC16'][i % 8]} radius={[3,3,0,0]} maxBarSize={28} />
                  ))
              }
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-16">Sinif</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Fənn</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-600">Şagird</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-600">Ort.bal</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-600 hidden sm:table-cell">Min</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-600 hidden sm:table-cell">Max</th>
                  {/* Range columns */}
                  <th className="text-right px-3 py-2.5 font-medium text-red-600">0–30</th>
                  <th className="text-right px-3 py-2.5 font-medium text-orange-600">30–60</th>
                  <th className="text-right px-3 py-2.5 font-medium text-yellow-700 hidden md:table-cell">60–80</th>
                  <th className="text-right px-3 py-2.5 font-medium text-green-600 hidden md:table-cell">80+</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-600">Keçid%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.class_level}-${row.subject_id}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-xs font-medium">{row.class_level}-ci</Badge>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{row.subject_name}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{row.student_count}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn('font-semibold', scoreColor(row.avg_score))}>{row.avg_score.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-500 hidden sm:table-cell">{row.min_score.toFixed(0)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500 hidden sm:table-cell">{row.max_score.toFixed(0)}</td>
                    {/* Range cells */}
                    {row.ranges.map((range) => (
                      <td
                        key={range.label}
                        className={cn(
                          'px-3 py-2.5 text-right',
                          range.label === '60–80' || range.label === '80+' ? 'hidden md:table-cell' : ''
                        )}
                      >
                        {range.count > 0 ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className={cn('font-medium text-xs', RANGE_TEXT[range.label as keyof typeof RANGE_TEXT])}>
                              {range.count}
                            </span>
                            <span className="text-slate-400 text-xs">{range.pct.toFixed(0)}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn('font-medium text-xs', row.pass_rate >= 80 ? 'text-green-600' : row.pass_rate >= 60 ? 'text-yellow-700' : 'text-red-600')}>
                        {row.pass_rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {summary && (
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
                    <td colSpan={2} className="px-4 py-2.5 text-slate-700">Cəmi / Ortalama</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{summary.totalStudents}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn(scoreColor(summary.avgScore))}>{summary.avgScore.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell" />
                    <td className="px-3 py-2.5 hidden sm:table-cell" />
                    <td className="px-3 py-2.5 text-right text-red-600">{summary.below30}</td>
                    <td colSpan={2} className="hidden md:table-cell" />
                    <td className="hidden md:table-cell" />
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn(summary.passRate >= 70 ? 'text-green-600' : 'text-orange-600')}>{summary.passRate.toFixed(1)}%</span>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
