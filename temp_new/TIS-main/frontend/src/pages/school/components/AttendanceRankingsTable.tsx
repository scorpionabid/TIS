import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Clock, Loader2, CheckCircle2, XCircle, AlertCircle, Building2 } from 'lucide-react';
import { SchoolRanking, RankingsSummary } from '../hooks/useSchoolAttendanceData';
import { format } from 'date-fns';

interface AttendanceRankingsTableProps {
  data: SchoolRanking[];
  loading: boolean;
  startDate: string;
  endDate: string;
  mySchoolRank: {
    rank: number;
    total_schools: number;
    region_rank: number | null;
    region_total: number;
    data: SchoolRanking;
  } | null;
  summary: RankingsSummary | null;
}

// -----------------------------------------------------------------------
// My School banner
// -----------------------------------------------------------------------

function MySchoolBanner({
  mySchoolRank,
}: {
  mySchoolRank: NonNullable<AttendanceRankingsTableProps['mySchoolRank']>;
}) {
  const { rank, total_schools, region_rank, region_total, data } = mySchoolRank;
  const isOnTime = data.status === 'on_time';
  const isLate = data.status === 'late';
  const notSubmitted = data.status === 'not_submitted';

  const statusColor = isOnTime
    ? 'from-emerald-500 to-emerald-600'
    : isLate
    ? 'from-amber-500 to-amber-600'
    : 'from-slate-400 to-slate-500';

  return (
    <Card className="relative overflow-hidden rounded-2xl border-0 shadow-[0_2px_16px_rgba(99,102,241,0.18)]">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500" />
      <CardContent className="relative z-10 p-5">
        {/* School name row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-indigo-200 text-[9px] font-black uppercase tracking-widest">Mənim Məktəbim</p>
            <p className="text-white font-bold text-sm leading-tight">{data.name}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sektor rank */}
          <div className="flex flex-col items-center bg-white/15 rounded-xl px-4 py-2.5 min-w-[80px]">
            <span className="text-white/60 text-[9px] font-bold uppercase tracking-wider mb-0.5">Sektor üzrə</span>
            <span className="text-white text-2xl font-black leading-none">#{rank}</span>
            <span className="text-white/50 text-[9px] mt-0.5">/ {total_schools} məktəb</span>
          </div>

          {/* Region rank */}
          <div className="flex flex-col items-center bg-white/15 rounded-xl px-4 py-2.5 min-w-[80px]">
            <span className="text-white/60 text-[9px] font-bold uppercase tracking-wider mb-0.5">Region üzrə</span>
            {region_rank ? (
              <>
                <span className="text-white text-2xl font-black leading-none">#{region_rank}</span>
                <span className="text-white/50 text-[9px] mt-0.5">/ {region_total} məktəb</span>
              </>
            ) : (
              <span className="text-white/40 text-xs italic mt-1">Hesablanır</span>
            )}
          </div>

          {/* Score */}
          <div className="flex flex-col items-center bg-white/15 rounded-xl px-4 py-2.5 min-w-[80px]">
            <span className="text-white/60 text-[9px] font-bold uppercase tracking-wider mb-0.5">Xal</span>
            <span className="text-white text-2xl font-black leading-none">{data.score_percent}%</span>
            <div className="w-10 h-1 bg-white/20 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${data.score_percent}%` }} />
            </div>
          </div>

          {/* Status */}
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r ${statusColor} ml-auto`}>
            {isOnTime && <CheckCircle2 className="h-4 w-4 text-white" />}
            {isLate && <Clock className="h-4 w-4 text-white" />}
            {notSubmitted && <XCircle className="h-4 w-4 text-white" />}
            <span className="text-white text-xs font-black uppercase tracking-tight">
              {isOnTime ? 'Vaxtında' : isLate ? `Gecikən (+${data.late_minutes} dəq)` : 'Göndərilməyib'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------
// Summary stat cards
// -----------------------------------------------------------------------

function SummaryCards({ summary }: { summary: RankingsSummary }) {
  const cards = [
    {
      label: 'Cəmi Məktəb',
      value: summary.total_schools,
      icon: <Building2 className="h-4 w-4" />,
      color: 'text-slate-700',
      bg: 'bg-slate-100',
      border: 'border-slate-200',
    },
    {
      label: 'Vaxtında',
      value: summary.on_time_count,
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Gecikən',
      value: summary.late_count,
      icon: <Clock className="h-4 w-4" />,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: 'Göndərməyən',
      value: summary.not_submitted_count,
      icon: <AlertCircle className="h-4 w-4" />,
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border ${c.border} ${c.bg} px-4 py-3 flex items-center gap-3`}
        >
          <div className={`${c.color} opacity-70`}>{c.icon}</div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{c.label}</p>
            <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------
// Rank cell
// -----------------------------------------------------------------------

function RankCell({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center shadow-sm text-base">🥇</div>;
  if (rank === 2) return <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shadow-sm text-base">🥈</div>;
  if (rank === 3) return <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shadow-sm text-base">🥉</div>;
  return <span className="text-sm font-bold text-slate-400">#{rank}</span>;
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

export function AttendanceRankingsTable({
  data,
  loading,
  startDate,
  endDate,
  mySchoolRank,
  summary,
}: AttendanceRankingsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isMultipleDays = startDate !== endDate;

  // School admin sees only their own row; rank position comes from the banner above
  const tableData = mySchoolRank
    ? data.filter((s) => s.school_id === mySchoolRank.data.school_id)
    : data;

  return (
    <div className="space-y-4">
      {/* My School banner */}
      {mySchoolRank && <MySchoolBanner mySchoolRank={mySchoolRank} />}

      {/* Summary cards */}
      {summary && <SummaryCards summary={summary} />}

      {/* Rankings table */}
      <Card className="bg-white rounded-2xl shadow-[0_1px_12px_rgba(0,0,0,0.08)] border-0 overflow-hidden">
        <CardHeader className="border-b border-slate-50 pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Sektordakı Məktəblər Reytinqi
          </CardTitle>
          <CardDescription className="text-xs font-medium text-slate-500">
            {isMultipleDays
              ? `${startDate} – ${endDate} dövrü üzrə ümumi xallar`
              : `${startDate} tarixi üzrə`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                  <TableHead className="w-14 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sıra</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Məktəb</TableHead>
                  <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Növbə</TableHead>
                  <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Deadline</TableHead>
                  <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">İlk Qeydiyyat</TableHead>
                  <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Son Qeydiyyat</TableHead>
                  <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Xal</TableHead>
                  <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(tableData) && tableData.length > 0 ? (
                  tableData.map((school) => {
                    const rank = mySchoolRank?.rank ?? (data.findIndex((s) => s.school_id === school.school_id) + 1);
                    const isMySchool = true;

                    return (
                      <TableRow
                        key={school.school_id}
                        className={[
                          'border-b border-slate-50 transition-colors hover:bg-slate-50/80',
                          isMySchool ? 'bg-indigo-50/60 font-semibold ring-1 ring-inset ring-indigo-200' : '',
                          rank <= 3 && !isMySchool ? 'bg-amber-50/20' : '',
                        ].join(' ')}
                      >
                        <TableCell className="text-center py-3">
                          <div className="flex justify-center">
                            <RankCell rank={rank} />
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className={`text-sm ${isMySchool ? 'text-indigo-900 font-bold' : 'text-slate-700 font-medium'}`}>
                              {school.name}
                            </span>
                            {isMySchool && (
                              <span className="text-[9px] text-indigo-600 font-black tracking-tighter uppercase mt-0.5 bg-indigo-100/60 px-1.5 py-0.5 rounded w-fit">
                                SİZİN MƏKTƏB
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center py-3">
                          {school.shift_type === 'morning' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">Səhər</span>
                          ) : school.shift_type === 'evening' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700">Günorta</span>
                          ) : (
                            <span className="text-slate-400 text-xs">–</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center py-3">
                          <span className="text-xs font-medium text-slate-600">{school.deadline_time || '–'}</span>
                        </TableCell>

                        <TableCell className="text-center py-3">
                          {school.first_submission_at ? (
                            <span className="text-sm font-medium text-slate-600">
                              {format(new Date(school.first_submission_at.replace(/-/g, '/')), 'HH:mm')}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Gözləyir</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center py-3">
                          <div className="flex flex-col items-center gap-0.5">
                            {school.submitted_at ? (
                              <span className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {format(new Date(school.submitted_at.replace(/-/g, '/')), 'HH:mm')}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">–</span>
                            )}
                            {school.is_late && school.late_minutes > 0 && (
                              <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                                +{school.late_minutes} dəq
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center py-3">
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-sm font-black ${
                                school.score_percent >= 90
                                  ? 'text-emerald-600'
                                  : school.score_percent >= 70
                                  ? 'text-amber-600'
                                  : 'text-rose-600'
                              }`}
                            >
                              {school.score_percent}%
                            </span>
                            <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full ${
                                  school.score_percent >= 90
                                    ? 'bg-emerald-500'
                                    : school.score_percent >= 70
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${school.score_percent}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center py-3">
                          {school.status === 'on_time' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-tight">
                              <CheckCircle2 className="h-3 w-3" />VAXTINDA
                            </span>
                          ) : school.status === 'late' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-tight">
                              <Clock className="h-3 w-3" />GECİKMƏ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-tight">
                              <XCircle className="h-3 w-3" />GÖNDƏRİLMƏYİB
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-slate-400 italic">
                      Bu dövr üçün məlumat tapılmadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
