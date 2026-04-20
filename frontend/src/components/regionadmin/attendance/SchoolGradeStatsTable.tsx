import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, Search, X, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '-';
  return `${Number(value).toFixed(1)}%`;
};

const getRomanNumeral = (level: number): string => {
  if (level === 0) return '0';
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  return numerals[level - 1] || String(level);
};

interface SchoolGradeStat {
  id: number;
  name: string;
  grades: (number | null)[];
  isMain?: boolean;
  hasWeekly?: boolean;
  isWeekly?: boolean;
  isSecondary?: boolean;
  parentId?: number;
}

interface SchoolGradeStatsTableProps {
  schools: SchoolGradeStat[];
  regionalAverages: (number | null)[];
  loading: boolean;
  onExport?: () => void;
  exportDisabled?: boolean;
}

export function SchoolGradeStatsTable({
  schools,
  regionalAverages,
  loading,
  onExport,
  exportDisabled
}: SchoolGradeStatsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSchools, setExpandedSchools] = useState<Record<number, boolean>>({});

  const toggleExpand = (id: number) => {
    setExpandedSchools(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredSchools = useMemo(() => {
    let list = schools || [];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(lower) || s.isWeekly || s.isSecondary);
    }
    
    // Filter out weekly rows if their parent is not expanded
    return list.filter(s => {
      if (s.isWeekly && s.parentId !== undefined) {
        return !!expandedSchools[s.parentId];
      }
      return true;
    });
  }, [schools, searchTerm, expandedSchools]);

  const gradeLevels = Array.from({ length: 12 }, (_, i) => i); // 0-11

  return (
    <Card className="shadow-lg border-slate-200 overflow-hidden rounded-3xl">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-6 bg-slate-50/50 border-b border-slate-100">
        <div>
          <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            Sinif Statistikaları
            <span className="text-xs bg-white text-slate-500 px-3 py-1 rounded-full font-bold border border-slate-200 shadow-sm">
              {schools.filter(s => s.isMain).length} məktəb
            </span>
          </CardTitle>
          <p className="text-sm text-slate-500 font-medium mt-1 ml-12">
            Hər sinif səviyyəsi üzrə davamiyyət faizləri və həftəlik dinamika
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder="Məktəb axtar..."
              className="pl-10 pr-8 h-10 rounded-2xl border-slate-200 text-sm focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-400 transition-all shadow-sm bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          {onExport && (
            <Button
              variant="outline"
              onClick={onExport}
              disabled={exportDisabled}
              className="h-10 px-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 text-sm font-bold shadow-sm hover:bg-slate-50 hover:border-slate-200 transition-all"
            >
              <FileDown className="mr-2 h-4 w-4 text-indigo-600" />
              Eksport
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-full inline-block align-middle">
              <Table className="border-collapse">
                <TableHeader className="bg-white">
                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                    <TableHead className="sticky left-0 z-30 bg-white min-w-[280px] font-extrabold text-slate-600 border-r border-slate-50 py-5">
                      STRUKTUR VƏ DÖVR
                    </TableHead>
                    {gradeLevels.map(level => (
                      <TableHead key={`head-${level}`} className="text-center font-bold text-slate-500 min-w-[65px] py-5">
                        {getRomanNumeral(level)}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-bold text-white min-w-[90px] bg-indigo-600/90 sticky right-0 z-30 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] py-5">
                      ORTALAMA
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.length > 0 ? (
                    <>
                      {filteredSchools.map((school) => {
                        const validGrades = school.grades.filter(g => g !== null);
                        const schoolAvg = validGrades.length > 0
                          ? validGrades.reduce((a, b) => (a || 0) + (b || 0), 0) / validGrades.length
                          : null;

                        const isExpanded = !!expandedSchools[school.id];

                        return (
                          <TableRow 
                            key={`school-row-${school.id}`} 
                            className={`
                              transition-all duration-200
                              ${school.isMain ? 'bg-white hover:bg-indigo-50/30' : ''}
                              ${school.isWeekly ? 'bg-slate-50/50 hover:bg-indigo-50/40 italic' : ''}
                              ${school.isSecondary ? 'bg-indigo-50/20 font-bold border-t-2 border-indigo-100/50' : ''}
                              ${school.id < 0 && !school.isWeekly ? 'bg-slate-50/80 italic text-indigo-700' : ''}
                            `}
                          >
                            <TableCell className={`
                              sticky left-0 z-10 font-semibold text-sm border-r border-slate-100 py-4
                              ${school.isWeekly ? 'pl-10 text-slate-500' : 'pl-4'}
                              ${school.isMain ? 'text-slate-800' : ''}
                              ${school.isSecondary ? 'text-indigo-800' : ''}
                              bg-inherit
                            `}>
                              <div className="flex items-center gap-2">
                                {school.isMain && school.hasWeekly && (
                                  <button 
                                    onClick={() => toggleExpand(school.id)}
                                    className="p-1 hover:bg-indigo-100 rounded-md transition-colors text-indigo-600"
                                  >
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                )}
                                {school.isWeekly && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2" />}
                                {school.name}
                                {school.isMain && school.hasWeekly && !isExpanded && (
                                  <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-md ml-2 font-bold animate-pulse">
                                    Həftəlik bax
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            {gradeLevels.map((level) => {
                              const rate = school.grades[level]; // 0-11 mapping exactly to indices 0-11
                              return (
                                <TableCell key={`rate-${school.id}-${level}`} className="text-center text-sm py-4">
                                  <span className={`
                                    ${rate === null ? 'text-slate-300' : 
                                      rate >= 95 ? 'text-emerald-600 font-bold' : 
                                      rate >= 85 ? 'text-amber-600 font-semibold' : 
                                      'text-rose-600 font-extrabold'}
                                  `}>
                                    {formatPercent(rate)}
                                  </span>
                                </TableCell>
                              );
                            })}
                            <TableCell className={`
                              text-center text-sm font-black py-4 sticky right-0 z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.03)]
                              ${school.isMain ? 'bg-indigo-50/50' : 'bg-inherit'}
                              ${school.isSecondary ? 'bg-indigo-100/50' : ''}
                              border-l border-slate-100
                            `}>
                              <div className={`
                                py-1 rounded-lg
                                ${schoolAvg === null ? 'text-slate-300' : 
                                  schoolAvg >= 95 ? 'text-emerald-700' : 
                                  schoolAvg >= 85 ? 'text-amber-700' : 
                                  'text-rose-700'}
                              `}>
                                {formatPercent(schoolAvg)}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-20 text-slate-400 italic">
                        Məlumat tapılmadı.
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
