import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  Search,
  BookOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Users,
  ArrowRight,
  FileDown,
  School,
  AlertTriangle,
} from 'lucide-react';
import { gradeBookService, GradeBookSession, GradeBookTeacher } from '@/services/gradeBook';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextOptimized';
import { cn } from '@/lib/utils';
import { GradeBookView } from './GradeBookView';

type GradeGroup = {
  gradeDisplayName: string;
  gradeAcademicYearName?: string;
  items: GradeBookSession[];
};

type StatusFilter = '' | 'active' | 'archived';

interface GradeBookParams {
  institution_id?: number;
  academic_year_id?: number;
  grade_id?: number;
  status?: string;
}

interface GradeBookListProps {
  selectedGradeId?: number | null;
  institutionId?: number | null;
  institutionName?: string | null;
  selectedGradeLabel?: string | null;
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'Hamısı' },
  { value: 'active', label: 'Aktiv' },
  { value: 'archived', label: 'Arxiv' },
];

const getTeacherName = (t: GradeBookTeacher): string => {
  if (t.teacher) {
    return `${t.teacher.first_name} ${t.teacher.last_name}`.trim();
  }
  return '';
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':   return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'archived': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'closed':   return 'bg-rose-100 text-rose-700 border-rose-200';
    default:         return 'bg-blue-100 text-blue-700 border-blue-200';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active':   return 'Aktiv';
    case 'archived': return 'Arxiv';
    case 'closed':   return 'Bağlı';
    default:         return status;
  }
};

const getGradeDisplayName = (grade: GradeBookSession['grade']): string => {
  if (!grade) return 'Sinif adı yoxdur';
  const composite = grade.class_level && grade.name
    ? `${grade.class_level}${grade.name}`
    : grade.name;
  return composite || `Sinif ${grade.id}`;
};

export function GradeBookList({
  selectedGradeId,
  institutionId,
  institutionName,
}: GradeBookListProps = {}) {
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const userInstitutionId = currentUser?.institution?.id;
  const effectiveInstitutionId = institutionId ?? userInstitutionId ?? null;

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [selectedJournalId, setSelectedJournalId] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('all');

  // Auto-expand selected grade
  useEffect(() => {
    if (selectedGradeId) {
      setExpandedGrades(prev => new Set([...prev, String(selectedGradeId)]));
    }
  }, [selectedGradeId]);

  // Reset filters when institution changes
  useEffect(() => {
    setStatusFilter('');
    setAcademicYearFilter('all');
  }, [effectiveInstitutionId]);

  const queryParams: GradeBookParams = useMemo(() => {
    const params: GradeBookParams = {};
    if (effectiveInstitutionId) params.institution_id = effectiveInstitutionId;
    if (statusFilter) params.status = statusFilter;
    if (selectedGradeId) params.grade_id = selectedGradeId;
    if (academicYearFilter && academicYearFilter !== 'all') {
      params.academic_year_id = Number(academicYearFilter);
    }
    return params;
  }, [effectiveInstitutionId, statusFilter, academicYearFilter]);

  const { data: gradeBooks = [], isLoading } = useQuery({
    queryKey: ['grade-books', queryParams],
    queryFn: async () => {
      const result = await gradeBookService.getGradeBooks(queryParams);
      return result.data;
    },
    enabled: !!effectiveInstitutionId,
  });

  // Auto-expand all grade groups after load
  useEffect(() => {
    if (gradeBooks.length > 0) {
      const allGradeKeys = new Set(
        gradeBooks.map(gb => gb.grade?.id).filter(Boolean).map(String)
      );
      setExpandedGrades(prev => new Set([...prev, ...allGradeKeys]));
    }
  }, [gradeBooks]);

  // Derive available academic years from loaded data
  const availableAcademicYears = useMemo(() => {
    const map = new Map<string, string>();
    gradeBooks.forEach(gb => {
      if (!gb.academic_year?.id) return;
      const key = String(gb.academic_year.id);
      if (!map.has(key)) map.set(key, gb.academic_year.name);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [gradeBooks]);

  const openJournal = (id: number) => {
    setSelectedJournalId(id);
    setIsSheetOpen(true);
  };

  const closeJournal = () => {
    setIsSheetOpen(false);
    setSelectedJournalId(null);
  };

  const groupedGradeBooks = useMemo(() => {
    const filteredByGrade = selectedGradeId
      ? gradeBooks.filter(gb => gb.grade?.id === selectedGradeId)
      : gradeBooks;

    const filtered = filteredByGrade.filter((gb) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        gb.title?.toLowerCase().includes(q) ||
        getGradeDisplayName(gb.grade).toLowerCase().includes(q) ||
        gb.subject?.name.toLowerCase().includes(q)
      );
    });

    const groups = filtered.reduce((acc: Record<string, GradeGroup>, gb) => {
      const gradeKey = gb.grade?.id ? String(gb.grade.id) : 'no-grade';
      if (!acc[gradeKey]) {
        acc[gradeKey] = {
          gradeDisplayName: getGradeDisplayName(gb.grade),
          gradeAcademicYearName: gb.academic_year?.name,
          items: [],
        };
      }
      acc[gradeKey].items.push(gb);
      return acc;
    }, {});

    // Sort journals within each group alphabetically by subject name
    Object.values(groups).forEach(group => {
      group.items.sort((a, b) =>
        (a.subject?.name ?? '').localeCompare(b.subject?.name ?? '', 'az')
      );
    });

    return groups;
  }, [gradeBooks, searchTerm, selectedGradeId]);

  const toggleGradeExpansion = (gradeKey: string) => {
    setExpandedGrades(prev => {
      const next = new Set(prev);
      if (next.has(gradeKey)) next.delete(gradeKey);
      else next.add(gradeKey);
      return next;
    });
  };

  const handleExportGrade = async (gradeKey: string, group: GradeGroup) => {
    try {
      toast({ title: 'Export başladı', description: `${group.gradeDisplayName} jurnalları export edilir...` });

      for (const gradeBook of group.items) {
        if (gradeBook.status === 'active') {
          try {
            const blob = await gradeBookService.exportGradeBook(gradeBook.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `jurnal_${gradeBook.grade?.name || group.gradeDisplayName}_${gradeBook.subject?.name || 'jurnal'}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          } catch (err) {
            console.error(`Failed to export journal ${gradeBook.id}:`, err);
          }
        }
      }

      toast({ title: 'Export tamamlandı', description: `${group.items.length} jurnal export edildi` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Export zamanı xəta baş verdi';
      toast({ title: 'Xəta', description: message, variant: 'destructive' });
    }
  };

  const selectedJournalInfo = useMemo(() => {
    if (!selectedJournalId) return null;
    const gb = gradeBooks.find(g => g.id === selectedJournalId);
    if (!gb) return null;
    return `${getGradeDisplayName(gb.grade)} - ${gb.subject?.name ?? ''}`;
  }, [selectedJournalId, gradeBooks]);

  return (
    <Card className="border-slate-200 flex flex-col min-h-[580px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <School className="w-4 h-4" />
          Jurnallar
        </CardTitle>
        <span
          className={cn('text-xs text-slate-500 truncate block', !institutionName && 'invisible')}
          title={institutionName || undefined}
        >
          {institutionName || 'Məktəb'}
        </span>

        {/* Search */}
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Jurnal axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 border-slate-200"
          />
        </div>

        {/* Status filter tabs + academic year */}
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {STATUS_TABS.map(tab => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </Button>
          ))}

          {availableAcademicYears.length > 1 && (
            <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
              <SelectTrigger className="h-7 text-xs ml-auto w-auto min-w-[110px]">
                <SelectValue placeholder="Tədris ili" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün illər</SelectItem>
                {availableAcademicYears.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-y-auto">
        {isLoading ? (
          /* Skeleton loading */
          <div className="space-y-3 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg opacity-70" />
                <Skeleton className="h-12 w-full rounded-lg opacity-50" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {Object.entries(groupedGradeBooks).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-slate-100 rounded-full mb-4">
                  <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Jurnal tapılmadı</h3>
                <p className="text-slate-500 max-w-sm">
                  Axtarış kriteriyalarına uyğun jurnal yoxdur.
                </p>
              </div>
            ) : (
              (Object.entries(groupedGradeBooks) as Array<[string, GradeGroup]>).map(([gradeKey, group]) => (
                <Card key={gradeKey} className="border-slate-200 shadow-sm overflow-hidden">
                  {/* Grade header */}
                  <div
                    className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleGradeExpansion(gradeKey)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-semibold text-slate-900">
                            {group.gradeDisplayName}
                          </h2>
                          <span className="text-sm text-slate-500">
                            {group.items.length} jurnal
                            {(group.items[0]?.grade?.real_student_count ?? 0) > 0 && (
                              <> • {group.items[0].grade!.real_student_count} şagird</>
                            )}
                          </span>
                          {/* Academic year badge */}
                          {group.gradeAcademicYearName && (
                            <Badge variant="outline" className="text-xs font-normal text-slate-500">
                              {group.gradeAcademicYearName}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-emerald-600 font-medium">
                        {group.items.filter(gb => gb.status === 'active').length} aktiv
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); handleExportGrade(gradeKey, group); }}
                        title="Bütün jurnalları export et"
                      >
                        <FileDown className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); toggleGradeExpansion(gradeKey); }}
                      >
                        {expandedGrades.has(gradeKey)
                          ? <ChevronDown className="w-5 h-5 text-slate-400" />
                          : <ChevronRight className="w-5 h-5 text-slate-400" />
                        }
                      </Button>
                    </div>
                  </div>

                  {/* Journals list */}
                  {expandedGrades.has(gradeKey) && (
                    <div className="divide-y divide-slate-100">
                      {group.items.map((gradeBook) => {
                        const hasNoTeacher = !gradeBook.teachers || gradeBook.teachers.length === 0;
                        const teachers = gradeBook.teachers ?? [];

                        return (
                          <div
                            key={gradeBook.id}
                            className="group flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => openJournal(gradeBook.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                <BookOpen className="w-5 h-5 text-indigo-600" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors text-base">
                                    {gradeBook.subject?.name}
                                  </h3>
                                  {/* No-teacher warning */}
                                  {hasNoTeacher && (
                                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Müəllim yoxdur
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                  <span>{gradeBook.academic_year?.name}</span>
                                  {!hasNoTeacher && (
                                    <>
                                      <span className="text-slate-400">•</span>
                                      {teachers.slice(0, 2).map((t, idx) => (
                                        <span key={t.id} className="text-slate-600">
                                          {getTeacherName(t)}
                                          {idx < Math.min(teachers.length, 2) - 1 && ', '}
                                        </span>
                                      ))}
                                      {teachers.length > 2 && (
                                        <span className="text-slate-400">+{teachers.length - 2}</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {!hasNoTeacher && (
                                <div className="flex items-center gap-1 text-sm text-slate-500 mr-2">
                                  <Users className="w-4 h-4" />
                                  <span>{teachers.length}</span>
                                </div>
                              )}
                              <Badge
                                variant="outline"
                                className={cn('text-xs font-medium', getStatusColor(gradeBook.status))}
                              >
                                {getStatusLabel(gradeBook.status)}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); openJournal(gradeBook.id); }}
                              >
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Journal drawer — 80vw via Tailwind */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent
            side="right"
            className="p-0 overflow-hidden w-[80vw] max-w-[80vw] [&>button:last-child]:hidden"
          >
            <div className="h-full flex flex-col">
              {/* Custom header with close button */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                <span className="text-sm font-medium text-slate-700 truncate max-w-[60%]">
                  {selectedJournalInfo || 'Jurnal'}
                </span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={closeJournal}>
                  <span className="text-slate-500 text-lg leading-none">✕</span>
                </Button>
              </div>
              <div className="flex-1 overflow-auto">
                {selectedJournalId ? (
                  <div className="h-full p-4">
                    <GradeBookView id={selectedJournalId} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    Jurnal yüklənir...
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}
