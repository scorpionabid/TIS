import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Search,
  BookOpen,
  Filter,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Calendar,
  Users,
  ArrowRight,
  X,
  FileDown
} from 'lucide-react';
import { gradeBookService, GradeBookSession } from '@/services/gradeBook';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextOptimized';
import { cn } from '@/lib/utils';
import { GradeBookView } from './GradeBookView';

type GradeGroup = {
  gradeDisplayName: string;
  gradeAcademicYearName?: string;
  items: GradeBookSession[];
};

export function GradeBookList() {
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // Auto-detect institution for school users
  const userInstitutionId = currentUser?.institution_id || currentUser?.institution?.id;

  const [gradeBooks, setGradeBooks] = useState<GradeBookSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [selectedJournalId, setSelectedJournalId] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    academic_year_id: '',
    institution_id: userInstitutionId ? String(userInstitutionId) : '',
  });

  const openJournal = (id: number) => {
    setSelectedJournalId(id);
    setIsSheetOpen(true);
  };

  const closeJournal = () => {
    setIsSheetOpen(false);
    setSelectedJournalId(null);
  };

  useEffect(() => {
    loadGradeBooks();
  }, [filters]);

  const loadGradeBooks = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.academic_year_id) params.academic_year_id = filters.academic_year_id;
      if (filters.institution_id) params.institution_id = filters.institution_id;

      const result = await gradeBookService.getGradeBooks(params);

      // Handle different response formats from gradeBookService
      let gradeBooksData: GradeBookSession[] = [];

      if (Array.isArray(result)) {
        // Direct array response
        gradeBooksData = result;
      } else if (result.data && Array.isArray(result.data)) {
        // { data: [...], meta: ... } format
        gradeBooksData = result.data;
      } else if (result.data && typeof result.data === 'object') {
        // Nested: { data: { data: [...] } } format
        gradeBooksData = (result.data as any).data || [];
      }

      setGradeBooks(gradeBooksData);

      // Auto-expand all grades on initial load
      const allGrades = new Set(gradeBooksData.map(gb => gb.grade?.id).filter(Boolean).map(String));
      setExpandedGrades(allGrades);
    } catch (error: any) {
      console.error('Failed to load grade books:', error);
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Jurnallar yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Group grade books by grade/class
  const groupedGradeBooks = useMemo(() => {
    const filtered = gradeBooks.filter((gb) => {
      const gradeDisplayName = gb.grade?.full_name || `${gb.grade?.class_level || ''}-${gb.grade?.name || ''}`.replace(/^\-/, '');
      const matchesSearch = searchTerm === '' ||
        gb.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (gradeDisplayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        gb.subject?.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGrade = selectedGrade === 'all' || String(gb.grade?.id) === selectedGrade;

      return matchesSearch && matchesGrade;
    });

    return filtered.reduce((acc: Record<string, GradeGroup>, gb) => {
      const gradeKey = gb.grade?.id ? String(gb.grade.id) : 'Sinifsiz';
      const gradeDisplayName = gb.grade?.full_name || `${gb.grade?.class_level || ''}-${gb.grade?.name || ''}`.replace(/^\-/, '');
      if (!acc[gradeKey]) {
        acc[gradeKey] = {
          gradeDisplayName: gradeDisplayName || 'Sinifsiz',
          gradeAcademicYearName: gb.academic_year?.name,
          items: [],
        };
      }
      acc[gradeKey].items.push(gb);
      return acc;
    }, {});
  }, [gradeBooks, searchTerm, selectedGrade]);

  // Get unique grades for filter
  const availableGrades = useMemo(() => {
    const map = new Map<string, string>();
    gradeBooks.forEach((gb) => {
      if (!gb.grade?.id) return;
      const key = String(gb.grade.id);
      const label = gb.grade?.full_name || `${gb.grade?.class_level || ''}-${gb.grade?.name || ''}`.replace(/^\-/, '');
      if (!map.has(key)) {
        map.set(key, label || key);
      }
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [gradeBooks]);

  const toggleGradeExpansion = (gradeName: string) => {
    setExpandedGrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gradeName)) {
        newSet.delete(gradeName);
      } else {
        newSet.add(gradeName);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'archived':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'closed':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'archived': return 'Arxiv';
      case 'closed': return 'Bağlı';
      default: return status;
    }
  };

  const handleExportGrade = async (gradeKey: string, group: GradeGroup) => {
    try {
      toast({
        title: 'Export başladı',
        description: `${group.gradeDisplayName} üçün jurnallar export edilir...`,
      });

      // Export each journal in the grade
      for (const gradeBook of group.items) {
        if (gradeBook.status === 'active') {
          try {
            const blob = await gradeBookService.exportGradeBook(gradeBook.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const gradeName = gradeBook.grade?.name || group.gradeDisplayName;
            const subjectName = gradeBook.subject?.name || 'jurnal';
            a.download = `jurnal_${gradeName}_${subjectName}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          } catch (err) {
            console.error(`Failed to export journal ${gradeBook.id}:`, err);
          }
        }
      }

      toast({
        title: 'Export tamamlandı',
        description: `${group.items.length} jurnal export edildi`,
      });
    } catch (error: any) {
      console.error('Export failed:', error);
      toast({
        title: 'Xəta',
        description: error.message || 'Export zamanı xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header - Minimal */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Sinif Jurnalları</h1>
      </div>

      {/* Filters - Minimal */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Jurnal axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 border-slate-200"
          />
        </div>

        {/* Grade Filter */}
        <Select
          value={selectedGrade}
          onValueChange={setSelectedGrade}
        >
          <SelectTrigger className="w-full sm:w-[160px] h-9 border-slate-200">
            <GraduationCap className="w-4 h-4 mr-2 text-slate-500" />
            <SelectValue placeholder="Sinif" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün siniflər</SelectItem>
            {availableGrades.map((grade) => (
              <SelectItem key={grade.value} value={grade.value}>
                {grade.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}
        >
          <SelectTrigger className="w-full sm:w-[140px] h-9 border-slate-200">
            <Filter className="w-4 h-4 mr-2 text-slate-500" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="archived">Arxiv</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-slate-600">Yüklənir...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedGradeBooks).length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-slate-100 rounded-full mb-4">
                  <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  Jurnal tapılmadı
                </h3>
                <p className="text-slate-500 max-w-sm">
                  Axtarış kriteriyalarına uyğun jurnal yoxdur.
                </p>
              </CardContent>
            </Card>
          ) : (
            (Object.entries(groupedGradeBooks) as Array<[string, GradeGroup]>).map(([gradeKey, group]) => (
              <Card
                key={gradeKey}
                className="border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Grade Header - Minimal */}
                <div
                  className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleGradeExpansion(gradeKey)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">
                          {group.gradeDisplayName}
                        </h2>
                        <span className="text-sm text-slate-500">
                          ({group.items.length} fənn)
                        </span>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportGrade(gradeKey, group);
                      }}
                      title="Bütün jurnalları export et"
                    >
                      <FileDown className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGradeExpansion(gradeKey);
                      }}
                    >
                      {expandedGrades.has(gradeKey) ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Journals List */}
                {expandedGrades.has(gradeKey) && (
                  <div className="divide-y divide-slate-100">
                    {group.items.map((gradeBook) => (
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
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors text-base">
                                {gradeBook.subject?.name}
                              </h3>
                              {gradeBook.teachers && gradeBook.teachers.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-slate-50">
                                  <Users className="w-3 h-3 mr-1" />
                                  {gradeBook.teachers.length}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                              <span>{gradeBook.academic_year?.name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {gradeBook.teachers && gradeBook.teachers.length > 0 && (
                            <div className="flex items-center gap-1 text-sm text-slate-500 mr-2">
                              <Users className="w-4 h-4" />
                              <span>{gradeBook.teachers.length}</span>
                            </div>
                          )}

                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs font-medium',
                              getStatusColor(gradeBook.status)
                            )}
                          >
                            {getStatusLabel(gradeBook.status)}
                          </Badge>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              openJournal(gradeBook.id);
                            }}
                          >
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Journal Drawer - 80% width from right */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="right"
          className="p-0 overflow-hidden"
          style={{ width: '80vw', maxWidth: '80vw' }}
        >
          <div className="h-full flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Sinif Jurnalı</h2>
                <p className="text-sm text-slate-500">
                  {selectedJournalId && (() => {
                    const gb = gradeBooks.find(g => g.id === selectedJournalId);
                    const gradeDisplayName = gb?.grade?.full_name || `${gb?.grade?.class_level || ''}-${gb?.grade?.name || ''}`.replace(/^\-/, '');
                    return `${gradeDisplayName} - ${gb?.subject?.name || ''}`;
                  })()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeJournal}
                className="h-8 w-8 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Drawer Content */}
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
    </div>
  );
}
