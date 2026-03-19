import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown } from 'lucide-react';

const numberFormatter = new Intl.NumberFormat('az');

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

interface GradeLevel {
  class_level: number;
  class_level_display: string;
  student_count: number;
  school_count: number;
  average_attendance_rate: number;
  uniform_compliance_rate: number;
}

interface GradeLevelStatsTableProps {
  gradeLevels: GradeLevel[];
  loading: boolean;
  onExport: () => void;
  exportDisabled: boolean;
}

export function GradeLevelStatsTable({
  gradeLevels,
  loading,
  onExport,
  exportDisabled
}: GradeLevelStatsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
        <div>
          <CardTitle>Siniflər üzrə statistika</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sinif səviyyələri üzrə davamiyyət və məktəbli forma statistikası
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onExport}
          disabled={exportDisabled}
          className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
        >
          <FileDown className="mr-1.5 h-4 w-4" />
          Eksport (Excel)
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : gradeLevels?.length ? (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Sinif</TableHead>
                  <TableHead className="text-center">Şagird sayı</TableHead>
                  <TableHead className="text-center">Məktəb sayı</TableHead>
                  <TableHead className="text-center">Orta davamiyyət</TableHead>
                  <TableHead className="text-center">Məktəbli forma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradeLevels
                  .filter(gl => gl.student_count > 0)
                  .map((gradeLevel) => (
                  <TableRow key={`grade-${gradeLevel.class_level}`}>
                    <TableCell className="text-center">
                      <div className="font-bold text-lg">{gradeLevel.class_level_display}</div>
                      <p className="text-xs text-muted-foreground">{gradeLevel.class_level_display} sinif</p>
                    </TableCell>
                    <TableCell className="text-center">
                      {numberFormatter.format(gradeLevel.student_count)}
                    </TableCell>
                    <TableCell className="text-center">
                      {numberFormatter.format(gradeLevel.school_count)}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      <span className={
                        gradeLevel.average_attendance_rate >= 95
                          ? 'text-emerald-600'
                          : gradeLevel.average_attendance_rate >= 85
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }>
                        {formatPercent(gradeLevel.average_attendance_rate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      <span className={
                        gradeLevel.uniform_compliance_rate >= 95
                          ? 'text-emerald-600'
                          : gradeLevel.uniform_compliance_rate >= 85
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }>
                        {formatPercent(gradeLevel.uniform_compliance_rate)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sinif statistikası tapılmadı.</p>
        )}
      </CardContent>
    </Card>
  );
}
