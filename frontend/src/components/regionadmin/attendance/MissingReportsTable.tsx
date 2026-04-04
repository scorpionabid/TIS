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
  reported_days: number;
  missing_days: number;
  baseline_days: number;
  is_six_day?: boolean;
}

interface MissingReportsTableProps {
  schools: School[];
  loading: boolean;
  startDate: string;
  endDate: string;
  onExport: () => void;
  exportDisabled: boolean;
  baselineDays: number;
}

export function MissingReportsTable({
  schools,
  loading,
  startDate,
  endDate,
  onExport,
  exportDisabled,
  baselineDays
}: MissingReportsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
        <div>
          <CardTitle>Hesabatı tamamlamayan məktəblər</CardTitle>
          <p className="text-sm text-muted-foreground">
            {baselineDays > 0 ? (
              <>Region üzrə standart doldurulma: <strong>{baselineDays} gün</strong></>
            ) : (
              "Seçilmiş dövr üzrə hesabat tapılmadı"
            )}
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
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Məktəb</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Sektor</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Doldurulub</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Təqdim edilməyən gün</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((school) => {
                  return (
                    <TableRow key={school.school_id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium flex items-center gap-2 text-sm">
                          <SchoolIcon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="truncate max-w-[200px]">{school.name}</span>
                            {school.is_six_day && (
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit mt-0.5 uppercase tracking-wider">
                                6-günlük rejim
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] h-5">
                          {school.sector_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <span className="text-slate-600 font-medium text-xs">
                          {school.reported_days} / {school.baseline_days} gün
                        </span>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <span className="text-red-600 font-bold text-xs">{school.missing_days} gün</span>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {school.reported_days === 0 ? (
                          <Badge variant="destructive" className="text-[10px] h-5 px-1.5 py-0">
                            Hesabat yoxdur
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px] h-5">
                            Natamam
                          </Badge>
                        )}
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

        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
            Hesablama Metodu (İzah)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
            <div className="space-y-2">
              <p>
                <strong>Baza Günü:</strong> Məktəbin iş rejiminə uyğun olaraq təqvim günləri əsasında hesablanır.
              </p>
              <p>
                <strong>5-günlük məktəblər:</strong> Baza günləri yalnız Bazar ertəsi - Cümə günlərini əhtiva edir.
              </p>
            </div>
            <div className="space-y-2">
              <p>
                <strong>6-günlük məktəblər:</strong> Baza günləri 5-günlük rejimə əlavə olaraq Şənbə günlərini də əhatə edir.
              </p>
              <p>
                <strong>Qeyri-iş günləri:</strong> Region üzrə heç bir məktəbin hesabat vermədiyi günlər (bayramlar) avtomatik istisna edilir.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
