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
  total_students: number;
  average_attendance_rate: number;
  uniform_compliance_rate: number;
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
                  <TableCell className="text-center">{sector.school_count}</TableCell>
                  <TableCell className="text-center">
                    {numberFormatter.format(sector.total_students)}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {formatPercent(sector.average_attendance_rate)}
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
