import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, School as SchoolIcon, Target } from 'lucide-react';

interface School {
  school_id: number;
  name: string;
  sector_name: string;
}

interface MissingReportsTableProps {
  schools: School[];
  loading: boolean;
  startDate: string;
  endDate: string;
  onExport: () => void;
  exportDisabled: boolean;
  schoolDays: number;
}

export function MissingReportsTable({
  schools,
  loading,
  startDate,
  endDate,
  onExport,
  exportDisabled,
  schoolDays
}: MissingReportsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
        <div>
          <CardTitle>Hesabat göndərməyən məktəblər</CardTitle>
          <p className="text-sm text-muted-foreground">
            Hesabat dövrü: {startDate} - {endDate}
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
        ) : schools && schools.length > 0 ? (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Məktəb</TableHead>
                  <TableHead className="text-center">Sektor</TableHead>
                  <TableHead className="text-center">Hesabat günləri</TableHead>
                  <TableHead className="text-center">Təqdim edilməyən gün</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((school) => {
                  const missingDays = schoolDays; // All days are missing since no reports
                  return (
                    <TableRow key={school.school_id}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          <SchoolIcon className="h-4 w-4 text-muted-foreground" />
                          {school.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          {school.sector_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-slate-600 font-medium">{schoolDays} gün</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-600 font-bold">{missingDays} gün</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">
                          Hesabat yoxdur
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <Target className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-lg font-semibold text-slate-700">Bütün məktəblər hesabat göndərib!</p>
            <p className="text-sm text-slate-500 mt-1">
              Seçilmiş tarix aralığında bütün məktəblər hesabat təqdim edib.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
