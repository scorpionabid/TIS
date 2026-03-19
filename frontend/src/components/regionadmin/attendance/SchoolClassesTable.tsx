import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, School as SchoolIcon } from 'lucide-react';

const numberFormatter = new Intl.NumberFormat('az');

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

interface ClassStat {
  grade_id?: number | string;
  class_level: number;
  name: string;
  student_count: number;
  reported_days: number;
  expected_school_days: number;
  average_attendance_rate: number;
  uniform_compliance_rate: number;
  warnings?: string[];
}

interface SchoolClassesTableProps {
  classes: ClassStat[];
  loading: boolean;
  schoolName: string;
}

export function SchoolClassesTable({ classes, loading, schoolName }: SchoolClassesTableProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold text-slate-900">
              Siniflər üzrə hesabat
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {schoolName}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : classes?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sinif</TableHead>
                <TableHead className="text-center">Şagird</TableHead>
                <TableHead className="text-center">Hesabat günləri</TableHead>
                <TableHead className="text-center">Orta davamiyyət</TableHead>
                <TableHead className="text-center">Məktəbli forma</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((classStat) => (
                <TableRow key={classStat.grade_id ?? `${classStat.class_level}-${classStat.name}`}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                      <SchoolIcon className="h-4 w-4 text-muted-foreground" />
                      {classStat.class_level}-{classStat.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {numberFormatter.format(classStat.student_count)}
                  </TableCell>
                  <TableCell className="text-center">
                    {classStat.reported_days}/{classStat.expected_school_days}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {formatPercent(classStat.average_attendance_rate)}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {formatPercent(classStat.uniform_compliance_rate)}
                  </TableCell>
                  <TableCell className="text-center">
                    {classStat.warnings?.length ? (
                      <Badge variant="destructive">
                        {classStat.warnings.includes('reports_missing')
                          ? 'Hesabat yoxdur'
                          : 'Aşağı davamiyyət'}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Normal</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Sinif məlumatı tapılmadı.</p>
        )}
      </CardContent>
    </Card>
  );
}
