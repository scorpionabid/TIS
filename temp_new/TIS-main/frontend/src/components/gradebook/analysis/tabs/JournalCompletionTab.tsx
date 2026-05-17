import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, Search, CheckCircle2, Clock, AlertCircle, BookOpen } from 'lucide-react';
import { gradeBookService } from '@/services/gradeBook';
import { cn } from '@/lib/utils';

interface JournalCompletionTabProps {
  institutionId?: number;
  academicYearId?: number;
}

function getRateColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-600';
  if (rate >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

function getRateBg(rate: number): string {
  if (rate >= 80) return 'bg-emerald-500';
  if (rate >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getRateBadge(rate: number): { label: string; cls: string } {
  if (rate >= 80) return { label: 'Yaxşı', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (rate >= 50) return { label: 'Orta', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (rate >= 1) return { label: 'Zəif', cls: 'bg-rose-100 text-rose-700 border-rose-200' };
  return { label: 'Boş', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
}

export function JournalCompletionTab({ institutionId, academicYearId }: JournalCompletionTabProps) {
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, number> = {};
    if (institutionId) p.institution_id = institutionId;
    if (academicYearId) p.academic_year_id = academicYearId;
    return p;
  }, [institutionId, academicYearId]);

  const { data, isLoading } = useQuery({
    queryKey: ['journalCompletion', params],
    queryFn: () => gradeBookService.getJournalCompletion(params),
    staleTime: 5 * 60 * 1000,
  });

  const rows = data?.data?.rows ?? [];
  const summary = data?.data?.summary;

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.institution_name.toLowerCase().includes(q) ||
      r.sector_name.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await gradeBookService.exportComprehensive(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jurnal_doldurulusu_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Məlumat tapılmadı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Cəmi məktəb', value: summary.total_institutions, icon: BookOpen, cls: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Yaxşı (≥80%)', value: summary.full_count, icon: CheckCircle2, cls: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Orta (1-79%)', value: summary.partial_count, icon: Clock, cls: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Boş (0%)', value: summary.empty_count, icon: AlertCircle, cls: 'text-rose-600', bg: 'bg-rose-50' },
          ].map(({ label, value, icon: Icon, cls, bg }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2">
                  <div className={cn('p-1.5 rounded-lg', bg)}>
                    <Icon className={cn('w-4 h-4', cls)} />
                  </div>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
                <p className={cn('text-2xl font-bold mt-1', cls)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ort. dolduruluş */}
      {summary && (
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Ümumi ortalama dolduruluş</p>
              <span className={cn('text-lg font-bold', getRateColor(summary.avg_fill_rate))}>
                {summary.avg_fill_rate}%
              </span>
            </div>
            <Progress value={summary.avg_fill_rate} className="h-2.5" />
          </CardContent>
        </Card>
      )}

      {/* Search + Export */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Məktəb və ya sektor axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="ml-auto">
          <FileDown className="w-4 h-4 mr-2" />
          {exporting ? 'Yüklənir...' : 'Excel Export'}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Məktəb</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600 hidden sm:table-cell">Sektor</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Cəmi</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 hidden md:table-cell">Aktiv</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 hidden md:table-cell">Dolu</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 hidden md:table-cell">Boş</th>
                  <th className="px-4 py-2 font-medium text-slate-600 min-w-[160px]">Dolduruluş</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600 hidden lg:table-cell">Son giriş</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const badge = getRateBadge(row.fill_rate);
                  return (
                    <tr key={row.institution_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-4 py-2.5 font-medium max-w-[200px] truncate" title={row.institution_name}>
                        {row.institution_name}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{row.sector_name}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{row.total_journals}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600 hidden md:table-cell">{row.active_journals}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-medium hidden md:table-cell">{row.journals_with_data}</td>
                      <td className="px-4 py-2.5 text-right text-rose-500 hidden md:table-cell">{row.journals_empty}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[80px]">
                            <div
                              className={cn('h-2 rounded-full transition-all', getRateBg(row.fill_rate))}
                              style={{ width: `${Math.min(row.fill_rate, 100)}%` }}
                            />
                          </div>
                          <span className={cn('text-xs font-semibold w-12 text-right', getRateColor(row.fill_rate))}>
                            {row.fill_rate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500 text-xs hidden lg:table-cell">
                        {row.last_entry_date ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={cn('text-xs', badge.cls)}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && (
            <p className="text-center py-6 text-slate-400 text-sm">Nəticə tapılmadı</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
