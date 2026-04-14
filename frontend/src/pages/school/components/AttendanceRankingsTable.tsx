import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Clock, Zap, Loader2 } from 'lucide-react';
import { SchoolRanking } from '../hooks/useSchoolAttendanceData';
import { format } from 'date-fns';

interface AttendanceRankingsTableProps {
  data: SchoolRanking[];
  loading: boolean;
  startDate: string;
  endDate: string;
  mySchoolRank: any;
}

export function AttendanceRankingsTable({
  data,
  loading,
  startDate,
  endDate,
  mySchoolRank
}: AttendanceRankingsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <Card className="bg-white rounded-2xl shadow-[0_1px_12px_rgba(0,0,0,0.08)] border-0 overflow-hidden">
      <CardHeader className="border-b border-slate-50 pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Məktəb Reytinqi
        </CardTitle>
        <CardDescription className="text-xs font-medium text-slate-500">
          {startDate === endDate 
            ? `${startDate} tarixi üzrə` 
            : `${startDate} - ${endDate} dövrü üzrə`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                <TableHead className="w-16 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sıra</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Məktəb</TableHead>
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Növə</TableHead>
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Deadline</TableHead>
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">İLK QEYDİYYAT</TableHead>
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">SON QEYDİYYAT</TableHead>
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bal</TableHead>
                <TableHead className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(data) && data.length > 0 ? (
                data.map((school, index) => {
                  const rank = index + 1;
                  const isMySchool = mySchoolRank?.data?.school_id === school.school_id;

                return (
                  <TableRow
                    key={school.school_id}
                    className={`${isMySchool ? 'bg-indigo-50/40 font-semibold' : ''} ${rank <= 3 ? 'bg-amber-50/20' : ''} border-b border-slate-50 hover:bg-slate-50/80 transition-colors`}
                  >
                    <TableCell className="text-center py-4">
                      <div className="flex justify-center">
                        {rank === 1 ? (
                          <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 shadow-sm">🥇</div>
                        ) : rank === 2 ? (
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm">🥈</div>
                        ) : rank === 3 ? (
                          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shadow-sm">🥉</div>
                        ) : (
                          <span className="text-sm font-bold text-slate-400"># {rank}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={`text-sm ${isMySchool ? 'text-indigo-900 font-bold' : 'text-slate-700 font-medium'}`}>
                          {school.name}
                        </span>
                        {isMySchool && (
                          <span className="text-[10px] text-indigo-600 font-black tracking-tighter uppercase mt-0.5 bg-indigo-100/50 px-1.5 py-0.5 rounded w-fit">SİZİN MƏKTƏB</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {school.shift_type === 'morning' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">Səhər</span>
                      ) : school.shift_type === 'evening' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700">Günorta</span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-medium text-slate-600">{school.deadline_time || '-'}</span>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      {school.first_submission_at ? (
                        <span className="text-sm font-medium text-slate-600">
                          {format(new Date(school.first_submission_at.replace(/-/g, '/')), 'HH:mm')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Gözləyir</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className="flex flex-col items-center gap-1">
                        {school.submitted_at ? (
                          <span className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {format(new Date(school.submitted_at.replace(/-/g, '/')), 'HH:mm')}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                        {school.is_late && school.late_minutes > 0 && (
                          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">+{school.late_minutes} dəq</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className="flex flex-col items-center">
                        <span className={`text-sm font-black ${
                          school.score_percent >= 90 ? 'text-emerald-600' : 
                          school.score_percent >= 70 ? 'text-amber-600' : 
                          'text-rose-600'
                        }`}>
                          {school.score_percent}%
                        </span>
                        <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${
                              school.score_percent >= 90 ? 'bg-emerald-500' : 
                              school.score_percent >= 70 ? 'bg-amber-500' : 
                              'bg-rose-500'
                            }`}
                            style={{ width: `${school.score_percent}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {school.status === 'on_time' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-tighter">VAXTINDA</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-tighter">GECİKMƏ</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-slate-400 italic">
                  Məlumat tapılmadı
                </TableCell>
              </TableRow>
            )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
