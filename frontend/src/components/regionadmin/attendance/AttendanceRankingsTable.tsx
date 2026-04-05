import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Zap, AlertCircle, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SchoolRankingStat, RankingsSummary } from '@/services/regionalAttendance';
import { RankingBadge, SubmissionTimeBadge, StatusBadge, ShiftTypeBadge } from './RankingBadge';
import { CountdownTimer, DeadlineBadge } from './CountdownTimer';

interface AttendanceRankingsTableProps {
  data: SchoolRankingStat[];
  summary: RankingsSummary;
  loading: boolean;
  morningDeadline: string;
  eveningDeadline: string;
  date: string;
  startDate: string;
  endDate: string;
  shiftType: 'morning' | 'evening' | 'all';
  onSchoolClick?: (schoolId: string) => void;
}

export function AttendanceRankingsTable({
  data,
  summary,
  loading,
  morningDeadline,
  eveningDeadline,
  date,
  startDate,
  endDate,
  shiftType,
  onSchoolClick,
}: AttendanceRankingsTableProps) {
  const isMultipleDays = startDate !== endDate;
  if (loading) {
    return <RankingsTableSkeleton />;
  }

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <Trophy className="h-12 w-12 text-slate-300" />
            <div>
              <p className="text-slate-600 font-medium">Məlumat tapılmadı</p>
              <p className="text-sm text-slate-400">Seçilmiş tarix üçün davamiyyət məlumatı yoxdur</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Xülasə kartları */}
      <SummaryCards summary={summary} />

      {!isMultipleDays && (
        <DeadlineNotice
          morningDeadline={morningDeadline}
          eveningDeadline={eveningDeadline}
          shiftType={shiftType}
        />
      )}

      {/* Reytinq cədvəli */}
      <Card className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Davamiyyət Reytinqi
          </CardTitle>
          <CardDescription>
            {isMultipleDays ? `${startDate} - ${endDate} tarixləri üzrə ümumi xallar` : `${date} tarixi üzrə ən tez dolduran məktəblər`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-16 text-center">Reytinq</TableHead>
                  <TableHead>Məktəb</TableHead>
                  <TableHead className="text-center">Sektor</TableHead>
                  <TableHead className="text-center">Bal</TableHead>
                  <TableHead className="text-center">Növə</TableHead>
                  {!isMultipleDays && (
                    <>
                      <TableHead className="text-center">Deadline</TableHead>
                      <TableHead className="text-center">Doldurma Vaxtı</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Geri Sayım</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((school, index) => (
                  <RankingsTableRow
                    key={school.school_id}
                    school={school}
                    rank={index + 1}
                    morningDeadline={morningDeadline}
                    eveningDeadline={eveningDeadline}
                    isMultipleDays={isMultipleDays}
                    onClick={() => onSchoolClick?.(String(school.school_id))}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Açıqlama */}
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-green-500" />
              <span>Ən tez dolduranlar</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-red-500" />
              <span>Gecikmə ilə</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-slate-400" />
              <span>Doldurulmayıb</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Cədvəl sətri komponenti
interface RankingsTableRowProps {
  school: SchoolRankingStat;
  rank: number;
  morningDeadline: string;
  eveningDeadline: string;
  isMultipleDays?: boolean;
  onClick?: () => void;
}

function RankingsTableRow({ school, rank, morningDeadline, eveningDeadline, isMultipleDays, onClick }: RankingsTableRowProps) {
  const deadline = school.shift_type === 'morning' ? '10:00' : school.shift_type === 'evening' ? '15:00' : null;

  // Sətir stili - reytinqə görə
  const getRowClass = () => {
    if (rank <= 3) return 'bg-yellow-50/50';
    if (school.status === 'late') return 'bg-red-50/30';
    if (school.status === 'not_submitted') return 'bg-slate-50';
    return '';
  };

  return (
    <TableRow
      className={cn(
        'cursor-pointer hover:bg-slate-50 transition-colors',
        getRowClass()
      )}
      onClick={onClick}
    >
      {/* Reytinq */}
      <TableCell className="text-center">
        <RankingBadge rank={rank} isLate={school.status === 'late'} />
      </TableCell>

      {/* Məktəb adı */}
      <TableCell>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <div>
            <div className="font-medium text-sm">{school.name}</div>
            {school.classes_count > 0 && (
              <div className="text-xs text-slate-400">{school.classes_count} sinif</div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Sektor */}
      <TableCell className="text-center text-sm">
        {school.sector_name}
      </TableCell>

      {/* Bal */}
      <TableCell className="text-center">
        <Badge 
          variant="outline" 
          className={cn(
            "font-bold",
            school.score >= 0.8 ? "text-green-600 bg-green-50 border-green-200" :
            school.score >= 0.5 ? "text-amber-600 bg-amber-50 border-amber-200" :
            "text-red-600 bg-red-50 border-red-200"
          )}
        >
          {school.score.toFixed(2)}
        </Badge>
      </TableCell>

      {/* Növə tipi */}
      <TableCell className="text-center">
        <ShiftTypeBadge shiftType={school.shift_type} />
      </TableCell>

      {!isMultipleDays && (
        <>
          {/* Deadline */}
          <TableCell className="text-center">
            {deadline ? <DeadlineBadge deadline={deadline} /> : '-'}
          </TableCell>

          {/* Doldurma vaxtı */}
          <TableCell className="text-center">
            <SubmissionTimeBadge
              submittedAt={school.submitted_at}
              deadline={deadline}
              isLate={school.is_late}
              lateMinutes={school.late_minutes}
            />
          </TableCell>

          {/* Status */}
          <TableCell className="text-center">
            <StatusBadge
              status={school.status}
              lateMinutes={school.late_minutes}
            />
          </TableCell>

          {/* Geri Sayım */}
          <TableCell className="text-center">
            {deadline && (
              <CountdownTimer
                deadline={deadline}
                submittedAt={school.submitted_at}
                size="sm"
                showIcon={true}
              />
            )}
          </TableCell>
        </>
      )}
    </TableRow>
  );
}

// Xülasə kartları
interface SummaryCardsProps {
  summary: RankingsSummary;
}

function SummaryCards({ summary }: SummaryCardsProps) {
  const { total_schools, submitted_count, on_time_count, late_count, not_submitted_count } = summary;
  const notSubmitted = not_submitted_count || total_schools - submitted_count;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase">Ümumi məktəb</p>
              <p className="text-2xl font-bold text-blue-800">{total_schools}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase">Vaxtında</p>
              <p className="text-2xl font-bold text-green-800">{on_time_count}</p>
            </div>
            <Zap className="h-8 w-8 text-green-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600 uppercase">Gecikmə ilə</p>
              <p className="text-2xl font-bold text-red-800">{late_count}</p>
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
              <p className="text-2xl font-bold text-slate-800">{notSubmitted}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Deadline xəbərdarlığı
interface DeadlineNoticeProps {
  morningDeadline: string;
  eveningDeadline: string;
  shiftType: 'morning' | 'evening' | 'all';
}

function DeadlineNotice({ morningDeadline, eveningDeadline, shiftType }: DeadlineNoticeProps) {
  const showMorning = shiftType === 'morning' || shiftType === 'all';
  const showEvening = shiftType === 'evening' || shiftType === 'all';

  return (
    <div className="flex flex-wrap gap-3">
      {showMorning && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="text-blue-700">
            <strong>Səhər növbəsi:</strong> 10:00-a kimi doldurulmalıdır
          </span>
        </div>
      )}
      {showEvening && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg text-sm">
          <Clock className="h-4 w-4 text-orange-500" />
          <span className="text-orange-700">
            <strong>Günorta növbəsi:</strong> 15:00-a kimi doldurulmalıdır
          </span>
        </div>
      )}
    </div>
  );
}

// Loading skeleton
function RankingsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
