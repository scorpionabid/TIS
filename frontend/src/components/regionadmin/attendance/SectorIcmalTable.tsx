import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

const numberFormatter = new Intl.NumberFormat('az');

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

interface Sector {
  sector_id: number;
  name: string;
  reported_days: number;
  school_count: number;
  reported_school_count: number;
  total_students: number;
  attending_students: number;
  average_attendance_rate: number;
  uniform_compliance_rate?: number;
}

interface SectorIcmalTableProps {
  sectors: Sector[];
  loading: boolean;
  isFetching: boolean;
}

export function SectorIcmalTable({ sectors, loading, isFetching }: SectorIcmalTableProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Sektor icmalı</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isFetching && !sectors.length ? (
          <Skeleton className="h-40 w-full" />
        ) : sectors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Seçilmiş filterlər üçün sektor tapılmadı.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sektor</TableHead>
                <TableHead className="text-center">Məktəb</TableHead>
                <TableHead className="text-center">Şagird</TableHead>
                <TableHead className="text-center">Orta davamiyyət</TableHead>
                <TableHead className="text-center">Məktəbli forma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectors.map((sector) => (
                <TableRow key={sector.sector_id}>
                  <TableCell>
                    <div className="font-medium">{sector.name}</div>
                    <p className="text-xs text-muted-foreground">
                      {sector.reported_days} hesabat günü
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-semibold text-slate-700">{sector.reported_school_count}</div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">/ {sector.school_count} məktəb</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div>{numberFormatter.format(sector.attending_students)}</div>
                    <div className="text-[10px] text-muted-foreground">/ {numberFormatter.format(sector.total_students)}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-3 justify-center min-w-[120px]">
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            sector.average_attendance_rate >= 95
                              ? 'bg-emerald-500'
                              : sector.average_attendance_rate >= 85
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(sector.average_attendance_rate, 100)}%` }}
                        />
                      </div>
                      <span className={`font-bold whitespace-nowrap ${
                        sector.average_attendance_rate >= 95
                          ? 'text-emerald-600'
                          : sector.average_attendance_rate >= 85
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {formatPercent(sector.average_attendance_rate)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {formatPercent(sector.uniform_compliance_rate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
