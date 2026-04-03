import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SchoolGradeStat } from '@/services/regionalAttendance';

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '-';
  return `${Number(value).toFixed(1)}%`;
};

const getRomanNumeral = (level: number): string => {
  if (level === 0) return '0';
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  return numerals[level - 1] || String(level);
};

interface SchoolGradeStatsTableProps {
  schools: SchoolGradeStat[];
  regionalAverages: (number | null)[];
  loading: boolean;
  onExport: () => void;
  exportDisabled: boolean;
}

export function SchoolGradeStatsTable({
  schools,
  regionalAverages,
  loading,
  onExport,
  exportDisabled
}: SchoolGradeStatsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSchools = useMemo(() => {
    if (!searchTerm) return schools || [];
    const lower = searchTerm.toLowerCase();
    return (schools || []).filter(s => s.name.toLowerCase().includes(lower));
  }, [schools, searchTerm]);

  const gradeLevels = Array.from({ length: 12 }, (_, i) => i);

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-bold text-slate-800">Məktəb + Sinif statistikası</CardTitle>
          <p className="text-sm text-slate-500 font-medium">
            Məktəblər üzrə hər sinif səviyyəsinin davamiyyət faizləri
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Məktəb axtar..."
              className="pl-9 h-9 rounded-xl border-slate-200 text-xs focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={onExport}
            disabled={exportDisabled}
            className="h-9 px-4 rounded-xl border-[1.4px] border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300"
          >
            <FileDown className="mr-1.5 h-4 w-4 text-indigo-600" />
            Eksport (Excel)
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
              <Table className="border-collapse">
                <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm border-b border-slate-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky left-0 z-30 bg-slate-100 min-w-[250px] font-bold text-slate-700 border-r border-slate-200">
                      Məktəb adı
                    </TableHead>
                    {gradeLevels.map(level => (
                      <TableHead key={`head-${level}`} className="text-center font-bold text-slate-700 min-w-[60px]">
                        {getRomanNumeral(level)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.length > 0 ? (
                    <>
                      {filteredSchools.map((school) => (
                        <TableRow key={`school-row-${school.id}`} className="hover:bg-indigo-50/30 transition-colors">
                          <TableCell className="sticky left-0 z-10 bg-white font-medium text-slate-700 text-sm border-r border-slate-200">
                            {school.name}
                          </TableCell>
                          {school.grades.map((rate, idx) => (
                            <TableCell key={`rate-${school.id}-${idx}`} className="text-center text-sm">
                              <span className={
                                rate === null ? 'text-slate-300' :
                                rate >= 95 ? 'text-emerald-600 font-semibold' :
                                rate >= 85 ? 'text-amber-600 font-medium' :
                                'text-red-600 font-semibold'
                              }>
                                {formatPercent(rate)}
                              </span>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {/* Regional Averages Row */}
                      <TableRow className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                        <TableCell className="sticky left-0 z-10 bg-slate-50 font-bold text-slate-900 border-r border-slate-200">
                          Orta (Region)
                        </TableCell>
                        {gradeLevels.map((idx) => {
                          const rate = regionalAverages?.[idx];
                          return (
                            <TableCell key={`avg-${idx}`} className="text-center text-slate-900">
                              {formatPercent(rate)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-10 text-slate-400 italic">
                        Məktəb tapılmadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
