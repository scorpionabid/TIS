import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, School, Users, FileText, TrendingUp, Trophy, CheckCircle, Clock, AlertCircle, Zap, Calendar, RefreshCw } from 'lucide-react';
import { useSchoolAttendanceData, GradeStat, SchoolRanking } from './hooks/useSchoolAttendanceData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';

interface SchoolAttendanceReportsProps {
  activeTab?: 'schoolGrade' | 'rankings';
}

export default function SchoolAttendanceReports({ activeTab = 'schoolGrade' }: SchoolAttendanceReportsProps) {
  const {
    hasAccess,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    datePreset,
    selectedShiftType,
    setSelectedShiftType,
    // Grade Stats
    gradeStatsData,
    gradeStatsLoading,
    gradeStatsError,
    refetchGradeStats,
    // Rankings
    rankingsData,
    rankingsLoading,
    rankingsError,
    refetchRankings,
    // Actions
    handlePresetChange,
  } = useSchoolAttendanceData();

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">Bu bölməni görmək üçün Davamiyyət icazəsi tələb olunur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Filters */}
      <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filterlər</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchGradeStats();
                  refetchRankings();
                }}
                className="h-9 px-3 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Yenilə
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Başlanğıc tarixi</label>
              <input
                type="date"
                value={startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm w-full px-3"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Son tarix</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm w-full px-3"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Növə</label>
              <select
                value={selectedShiftType}
                onChange={(e) => setSelectedShiftType(e.target.value as 'morning' | 'evening' | 'all')}
                className="h-10 rounded-xl border-[1.4px] border-slate-200 text-slate-700 text-sm w-full px-3 bg-white"
              >
                <option value="all">Hər iki növə</option>
                <option value="morning">Səhər növbəsi (10:00)</option>
                <option value="evening">Günorta növbəsi (14:30)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                {(['today', 'thisWeek', 'thisMonth'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetChange(preset)}
                    className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                      datePreset === preset
                        ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(30,41,59,0.25)]'
                        : 'text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                    }`}
                  >
                    {preset === 'today' ? 'Gün' : preset === 'thisWeek' ? 'Həftə' : 'Ay'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === 'schoolGrade' && (
        <SchoolGradeStatsTable
          data={gradeStatsData?.data?.grades || []}
          summary={gradeStatsData?.data?.summary || { total_grades: 0, total_students: 0, total_records: 0, average_attendance_rate: 0 }}
          loading={gradeStatsLoading}
          schoolName={gradeStatsData?.data?.school_name || ''}
        />
      )}

      {activeTab === 'rankings' && (
        <SchoolRankingsTable
          data={rankingsData?.data?.schools || []}
          summary={rankingsData?.data?.summary || { total_schools: 0, submitted_count: 0, on_time_count: 0, late_count: 0, not_submitted_count: 0 }}
          mySchoolRank={rankingsData?.data?.my_school_rank || null}
          loading={rankingsLoading}
          morningDeadline={rankingsData?.data?.morning_deadline || '10:00'}
          eveningDeadline={rankingsData?.data?.evening_deadline || '14:30'}
          date={rankingsData?.data?.date || startDate}
          shiftType={selectedShiftType}
        />
      )}
    </div>
  );
}

// School Grade Stats Component
interface SchoolGradeStatsTableProps {
  data: GradeStat[];
  summary: {
    total_grades: number;
    total_students: number;
    total_records: number;
    average_attendance_rate: number;
  };
  loading: boolean;
  schoolName: string;
}

function SchoolGradeStatsTable({ data, summary, loading, schoolName }: SchoolGradeStatsTableProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-slate-500">
            <p>Məlumat tapılmadı</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase">Sinif sayı</p>
                <p className="text-2xl font-bold text-blue-800">{summary.total_grades}</p>
              </div>
              <School className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 uppercase">Şagird sayı</p>
                <p className="text-2xl font-bold text-green-800">{summary.total_students}</p>
              </div>
              <Users className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-600 uppercase">Qeyd sayı</p>
                <p className="text-2xl font-bold text-indigo-800">{summary.total_records}</p>
              </div>
              <FileText className="h-8 w-8 text-indigo-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase">Orta davamiyyət</p>
                <p className="text-2xl font-bold text-amber-800">%{summary.average_attendance_rate}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Siniflər üzrə statistika</CardTitle>
          <CardDescription>{schoolName} - {data.length} sinif</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Sinif</TableHead>
                  <TableHead className="text-center">Şagird sayı</TableHead>
                  <TableHead className="text-center">Qeyd sayı</TableHead>
                  <TableHead className="text-center">Dərsdə</TableHead>
                  <TableHead className="text-center">Çatışmazlıq</TableHead>
                  <TableHead className="text-center">Davamiyyət %</TableHead>
                  <TableHead className="text-center">Forma pozuntusu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((grade) => (
                  <TableRow key={grade.grade_id}>
                    <TableCell className="font-medium">{grade.grade_name}</TableCell>
                    <TableCell className="text-center">{grade.total_students}</TableCell>
                    <TableCell className="text-center">{grade.record_count}</TableCell>
                    <TableCell className="text-center text-green-600">{grade.total_present}</TableCell>
                    <TableCell className="text-center text-red-600">{grade.total_absent}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${grade.average_attendance_rate >= 90 ? 'text-green-600' : grade.average_attendance_rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                        %{grade.average_attendance_rate}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {grade.uniform_violations > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          {grade.uniform_violations}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// School Rankings Component
interface SchoolRankingsTableProps {
  data: SchoolRanking[];
  summary: {
    total_schools: number;
    submitted_count: number;
    on_time_count: number;
    late_count: number;
    not_submitted_count: number;
  };
  mySchoolRank: {
    rank: number;
    total_schools: number;
    data: SchoolRanking;
  } | null;
  loading: boolean;
  morningDeadline: string;
  eveningDeadline: string;
  date: string;
  shiftType: 'morning' | 'evening' | 'all';
}

function SchoolRankingsTable({
  data,
  summary,
  mySchoolRank,
  loading,
  morningDeadline,
  eveningDeadline,
  date,
  shiftType,
}: SchoolRankingsTableProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-slate-500">
            <p>Məlumat tapılmadı</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* My School Rank Card */}
      {mySchoolRank && (
        <Card className={`${mySchoolRank.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' : mySchoolRank.data.status === 'on_time' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                  mySchoolRank.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                  mySchoolRank.rank === 2 ? 'bg-slate-300 text-slate-700' :
                  mySchoolRank.rank === 3 ? 'bg-amber-600 text-white' :
                  mySchoolRank.data.status === 'on_time' ? 'bg-green-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  #{mySchoolRank.rank}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Sizin məktəbinizin sıralaması</p>
                  <p className="text-xl font-bold">{mySchoolRank.data.name}</p>
                  <p className="text-sm">
                    {mySchoolRank.data.status === 'on_time' ? (
                      <span className="text-green-600 font-medium">✓ Vaxtında doldurulub</span>
                    ) : mySchoolRank.data.status === 'late' ? (
                      <span className="text-red-600 font-medium">🕐 {mySchoolRank.data.lateMinutes} dəq gecikmə</span>
                    ) : (
                      <span className="text-slate-500">Gözləyir...</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{mySchoolRank.rank} <span className="text-lg text-slate-400">/ {mySchoolRank.total_schools}</span></p>
                <p className="text-sm text-slate-500">Sektor sıralaması</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase">Ümumi məktəb</p>
                <p className="text-2xl font-bold text-blue-800">{summary.total_schools}</p>
              </div>
              <School className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 uppercase">Vaxtında</p>
                <p className="text-2xl font-bold text-green-800">{summary.on_time_count}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 uppercase">Gecikmə ilə</p>
                <p className="text-2xl font-bold text-red-800">{summary.late_count}</p>
              </div>
              <Clock className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Gözləyir</p>
                <p className="text-2xl font-bold text-slate-800">{summary.not_submitted_count}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deadline Notice */}
      <div className="flex flex-wrap gap-3">
        {(shiftType === 'morning' || shiftType === 'all') && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-blue-700">
              <strong>Səhər:</strong> 10:00-a kimi
            </span>
          </div>
        )}
        {(shiftType === 'evening' || shiftType === 'all') && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg text-sm">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-orange-700">
              <strong>Günorta:</strong> 14:30-a kimi
            </span>
          </div>
        )}
      </div>

      {/* Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Sektor reytinqi
          </CardTitle>
          <CardDescription>{date} tarixi üzrə</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-16 text-center">Sıra</TableHead>
                  <TableHead>Məktəb</TableHead>
                  <TableHead className="text-center">Növə</TableHead>
                  <TableHead className="text-center">Deadline</TableHead>
                  <TableHead className="text-center">Doldurma vaxtı</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((school, index) => {
                  const rank = index + 1;
                  const isMySchool = mySchoolRank?.data.school_id === school.school_id;

                  return (
                    <TableRow
                      key={school.school_id}
                      className={`${isMySchool ? 'bg-blue-50/50 font-medium' : ''} ${rank <= 3 ? 'bg-yellow-50/30' : ''}`}
                    >
                      <TableCell className="text-center">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                      </TableCell>
                      <TableCell>
                        {school.name}
                        {isMySchool && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            Siz
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {school.shift_type === 'morning' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Səhər</span>
                        ) : school.shift_type === 'evening' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Günorta</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {school.deadline_time ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            school.shift_type === 'morning' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {school.deadline_time}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {school.submitted_at ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            school.status === 'on_time' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {school.status === 'on_time' ? <Zap className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {new Date(school.submitted_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                            {school.is_late && <span className="text-red-500">(+{school.lateMinutes} dəq)</span>}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                            Gözləyir
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {school.status === 'on_time' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            <Trophy className="h-3 w-3 mr-1" />
                            Vaxtında
                          </span>
                        ) : school.status === 'late' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Gecikmə
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                            Gözləyir
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
