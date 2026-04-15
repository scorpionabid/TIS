import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, Search, X } from 'lucide-react';
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
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Məktəb + Sinif statistikası
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium border border-slate-200">
              {schools.filter(s => s.id > 0).length} məktəb
            </span>
          </CardTitle>
          <p className="text-sm text-slate-500 font-medium">
            Məktəblər üzrə hər sinif səviyyəsinin davamiyyət faizləri
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Məktəb axtar..."
              className="pl-9 pr-8 h-9 rounded-xl border-slate-200 text-xs focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
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
                    <TableHead className="text-center font-bold text-indigo-700 min-w-[70px] bg-indigo-50/50 sticky right-0 z-30 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l border-slate-200">
                      Orta
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.length > 0 ? (
                    <>
                      {filteredSchools.map((school) => {
                        const schoolAvg = school.grades.filter(g => g !== null).length > 0
                          ? school.grades.filter(g => g !== null).reduce((a, b) => (a || 0) + (b || 0), 0) / school.grades.filter(g => g !== null).length
                          : null;

                        return (
                          <TableRow key={`school-row-${school.id}`} className="hover:bg-indigo-50/30 transition-colors group">
                            <TableCell className={`sticky left-0 z-10 font-medium text-sm border-r border-slate-200 ${school.id < 0 ? 'bg-slate-50 text-indigo-700 italic' : 'bg-white text-slate-700'}`}>
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
                            <TableCell className="text-center text-sm font-bold bg-indigo-50/30 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l border-slate-200">
                              <span className={
                                schoolAvg === null ? 'text-slate-300' :
                                schoolAvg >= 95 ? 'text-emerald-700' :
                                schoolAvg >= 85 ? 'text-amber-700' :
                                'text-red-700'
                              }>
                                {formatPercent(schoolAvg)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Regional Averages Row */}
                      {regionalAverages && regionalAverages.length > 0 && (
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
                          <TableCell className="text-center text-indigo-900 bg-indigo-50 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l border-slate-200">
                            {(() => {
                              const validReg = (regionalAverages || []).filter(g => g !== null);
                              const regAvg = validReg.length > 0 ? validReg.reduce((a, b) => (a || 0) + (b || 0), 0) / validReg.length : null;
                              return formatPercent(regAvg);
                            })()}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-10 text-slate-400 italic">
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
