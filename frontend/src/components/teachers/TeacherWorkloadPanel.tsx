import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workloadService, type GradeSubject } from '@/services/workload';
import { teacherService, type TeacherSubject } from '@/services/teachers';
import { gradeService } from '@/services/grades';
import { academicYearService } from '@/services/academicYears';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, AlertCircle, CheckCircle2, Loader2, Search, Filter, BookOpen, Users, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeacherWorkloadPanelProps {
  teacherId: number;
  teacherName: string;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'substitute' | 'mentor' | 'practitioner';
}

interface WorkloadItem {
  id: number;
  class_id: number;
  grade_id?: number;
  subject_id?: number;
  class_name: string;
  subject_name: string;
  weekly_hours: number;
  academic_year_id: number;
  is_teaching_activity?: boolean;
  is_extracurricular?: boolean;
  is_club?: boolean;
  education_program?: string;
  class_profile?: string;
}

// Employment type based max hours
const MAX_HOURS_BY_TYPE: Record<string, number> = {
  full_time: 24,      // Əsas ştat
  part_time: 12,      // Yarım ştat
  contract: 20,       // Müqavilə
  substitute: 18,     // Əvəzçi
  mentor: 15,         // Təcrübəçi rəhbəri
  practitioner: 25,   // Praktik müəllim
};

// Get warning threshold (90% of max)
const getWarningThreshold = (maxHours: number) => Math.floor(maxHours * 0.9);

export const TeacherWorkloadPanel: React.FC<TeacherWorkloadPanelProps> = ({ 
  teacherId, 
  teacherName,
  employmentType = 'full_time'
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]); // Bulk selection
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchClass, setSearchClass] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);

  // Queries
  const { data: workloadData, isLoading: workloadLoading } = useQuery({
    queryKey: ['teacher-workload', teacherId],
    queryFn: () => workloadService.getTeacherWorkload(teacherId),
    enabled: !!teacherId,
  });

  const { data: gradesResponse, isLoading: gradesLoading, error: gradesError } = useQuery({
    queryKey: ['school-grades-v2'],
    queryFn: () => gradeService.get({ is_active: true, per_page: 100 }),
  });

  const { data: teacherSubjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['teacher-subjects', teacherId],
    queryFn: () => teacherService.getTeacherSubjects(teacherId),
    enabled: !!teacherId,
  });

  const { data: gradeSubjectsResponse, isLoading: gradeSubjectsLoading } = useQuery({
    queryKey: ['grade-subjects', selectedClass],
    queryFn: () => workloadService.getGradeSubjects(selectedClass!),
    enabled: selectedClass !== null && selectedClass > 0,
  });

  // Get active academic year for proper duplicate checking
  const { data: academicYearsData } = useQuery({
    queryKey: ['academic-years-active'],
    queryFn: () => academicYearService.getActive(),
    staleTime: Infinity,
  });
  const activeAcademicYearId = academicYearsData?.id;

  // Process data
  const grades = useMemo(() => {
    
    if (!gradesResponse) {
      return [];
    }
    
    // Handle different response formats
    if (Array.isArray(gradesResponse)) {
      return gradesResponse;
    }
    
    if (gradesResponse.items && Array.isArray(gradesResponse.items)) {
      return gradesResponse.items;
    }
    
    if (gradesResponse.data && Array.isArray(gradesResponse.data)) {
      return gradesResponse.data;
    }
    
    if (gradesResponse.data && gradesResponse.data.grades && Array.isArray(gradesResponse.data.grades)) {
      return gradesResponse.data.grades;
    }
    
    return [];
  }, [gradesResponse, gradesError]);

  const gradeSubjects = useMemo(() => {
    const responseData = gradeSubjectsResponse?.data;
    if (Array.isArray(responseData)) return responseData;
    if (responseData && typeof responseData === 'object') {
      const nested = (responseData as any)?.subjects || (responseData as any)?.data;
      if (Array.isArray(nested)) return nested;
    }
    return [];
  }, [gradeSubjectsResponse]);

  const workload = workloadData?.data;
  const rawLoads: WorkloadItem[] = workload?.loads || [];
  const loads = rawLoads.filter(l => l.weekly_hours > 0);

  // Group loads by class_name for card-based display
  const groupedLoads = useMemo(() => {
    const groups: Record<string, WorkloadItem[]> = {};
    loads.forEach((load) => {
      const className = load.class_name || 'Unknown';
      if (!groups[className]) {
        groups[className] = [];
      }
      groups[className].push(load);
    });
    return groups;
  }, [loads]);

  // Filter subjects - exclude already assigned subjects for selected class
  const availableSubjects = useMemo(() => {
    if (!gradeSubjects.length) return [];
    
    // Base subjects - either from teacher subjects or all grade subjects
    const base = (!teacherSubjects || teacherSubjects.length === 0)
      ? gradeSubjects
      : gradeSubjects.filter((gs: GradeSubject) =>
          teacherSubjects.some((ts: TeacherSubject) => ts.subject_id === gs.subject_id)
        );

    if (!selectedClass) return base;

    // Filter out already assigned subjects for this class
    return base.filter((gs: GradeSubject) => {
      // If it's a split-groups subject, it can be assigned multiple times (e.g. boys/girls or different levels)
      if (gs.is_split_groups) {
        return true;
      }

      // If NOT split groups, hide if it's already assigned TO ANYONE anywhere in the class
      return !gs.is_assigned;
    });
  }, [gradeSubjects, teacherSubjects, selectedClass, loads, grades]);

  // Auto-select subject when class changes
  React.useEffect(() => {
    if (selectedClass && availableSubjects.length > 0) {
      setSelectedSubject(availableSubjects[0].subject_id);
    } else {
      setSelectedSubject(null);
    }
  }, [selectedClass, availableSubjects]);

  // Get weekly hours for selected subject
  const weeklyHours = useMemo(() => {
    if (!selectedSubject) return 0;
    const subject = availableSubjects.find((s: GradeSubject) => s.subject_id === selectedSubject);
    return subject?.weekly_hours || 0;
  }, [selectedSubject, availableSubjects]);

  // Calculate max hours based on employment type
  const maxHours = MAX_HOURS_BY_TYPE[employmentType] || 24;
  const warningThreshold = getWarningThreshold(maxHours);
  const currentTotal = workload?.total_hours || 0;
  const projectedTotal = currentTotal + weeklyHours;
  const wouldExceedLimit = projectedTotal > maxHours;
  const isNearLimit = (currentTotal / maxHours) >= 0.9;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { class_id: number; subject_id: number; weekly_hours: number }) => {
      const selectedGrade = grades.find((g: any) => g.id === data.class_id);
      const academicYearId = selectedGrade?.academic_year_id || activeAcademicYearId || 1;
      
      return workloadService.createTeachingLoad({
        teacher_id: teacherId,
        class_id: data.class_id,
        subject_id: data.subject_id,
        weekly_hours: data.weekly_hours,
        academic_year_id: academicYearId,
      });
    },
    onSuccess: () => {
      // Invalidate workload queries to refresh stats and table
      queryClient.invalidateQueries({ queryKey: ['teacher-workload', teacherId] });
      // Also invalidate ALL grade-subjects to refresh is_assigned flags across all teachers
      queryClient.invalidateQueries({ queryKey: ['grade-subjects'] });
      toast({ title: 'Dərs yükü əlavə edildi' });
      setSelectedSubject(null);
    },
    onError: (error: any) => {
      console.error('❌ Create mutation error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Dərs yükü əlavə edilə bilmədi';
      toast({ 
        title: 'Xəta', 
        description: errorMessage,
        variant: 'destructive' 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => workloadService.deleteTeachingLoad(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-workload', teacherId] });
      // Also invalidate grade-subjects to refresh is_assigned flags
      queryClient.invalidateQueries({ queryKey: ['grade-subjects'] });
      toast({ title: 'Dərs yükü silindi' });
    },
  });

  const handleAdd = () => {
    
    if (!selectedClass || !selectedSubject || weeklyHours === 0) {
      return;
    }
    
    // Get academic year for duplicate check - use active academic year
    const selectedGrade = grades.find((g: any) => g.id === selectedClass);
    const academicYearId = selectedGrade?.academic_year_id || activeAcademicYearId || 1;
    
    // Client-side duplicate check - backend returns class_id
    const isDuplicate = loads.some((load: any) => {
      const matchesClass = load.class_id === selectedClass;
      const matchesSubject = load.subject_id === selectedSubject;
      const matchesYear = (load.academic_year_id || 1) === academicYearId;
      return matchesClass && matchesSubject && matchesYear;
    });
    
    if (isDuplicate) {
      toast({
        title: 'Təkrar təyinat!',
        description: 'Bu sinif və fənn kombinasiyası artıq təyin edilib.',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate workload limit before adding
    if (wouldExceedLimit) {
      toast({
        title: 'Limit Aşılacaq!',
        description: `Bu təyinat müəllimin həftəlik limitini (${maxHours} saat) aşacaq. Mövcud: ${currentTotal} saat + Yeni: ${weeklyHours} saat = ${projectedTotal} saat`,
        variant: 'destructive'
      });
      return;
    }
    
    
    createMutation.mutate({
      class_id: selectedClass,
      subject_id: selectedSubject,
      weekly_hours: weeklyHours,
    });
  };

  const selectedClassName = grades.find((g: any) => g.id === selectedClass)?.display_name || 
                            grades.find((g: any) => g.id === selectedClass)?.full_name || 
                            grades.find((g: any) => g.id === selectedClass)?.name || '';
  const selectedSubjectName = availableSubjects.find((s: GradeSubject) => s.subject_id === selectedSubject)?.subject_name || '';

  if (workloadLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Dərs Yükü</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Dərs Yükü
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold">{workload?.total_hours || 0}</span>
                <span className="text-sm text-muted-foreground">/ {maxHours} saat</span>
                {workload && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    wouldExceedLimit 
                      ? 'bg-red-100 text-red-700' 
                      : isNearLimit 
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                  }`}>
                    {maxHours - currentTotal} qalıq
                    {isNearLimit && ' ⚠️'}
                  </span>
                )}
              </div>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{new Set(loads.map((l: any) => l.class_id)).size} sinif</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{loads.length} təyinat</span>
              </div>
              <Progress 
                value={Math.min((currentTotal / maxHours) * 100, 100)} 
                className={`w-32 h-1.5 ${
                  wouldExceedLimit ? 'bg-red-200' : isNearLimit ? 'bg-yellow-200' : ''
                }`}
              />
              {isNearLimit && (
                <span className="text-[10px] text-yellow-600">Limitə yaxın!</span>
              )}
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={() => setIsAdding(!isAdding)}
            variant={isAdding ? "outline" : "default"}
          >
            {isAdding ? 'Ləğv Et' : <><Plus className="h-4 w-4 mr-1" /> Əlavə Et</>}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Form */}
        {isAdding && (
          <div className="p-4 border rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Class Select */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  Sinif *
                  <span className="text-[10px] font-normal text-slate-400">
                    ({gradesLoading ? 'yüklənir...' : `${grades.length} sinif`})
                  </span>
                </label>
                <Select 
                  value={selectedClass?.toString() || ''} 
                  onValueChange={(v) => setSelectedClass(parseInt(v))}
                  modal={false}
                >
                  <SelectTrigger className="h-10 bg-white border-slate-200">
                    <SelectValue placeholder="Sinif seçin" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto z-[100]">
                    {gradesLoading ? (
                      <SelectItem value="loading" disabled>Yüklənir...</SelectItem>
                    ) : grades.length === 0 ? (
                      <SelectItem value="empty" disabled>Sinif yoxdur</SelectItem>
                    ) : (
                      grades.map((g: any) => (
                        <SelectItem key={g.id} value={g.id.toString()}>
                          {g.display_name || g.full_name || g.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Select */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Fənn *</label>
                <Select 
                  value={selectedSubject?.toString() || ''} 
                  onValueChange={(v) => setSelectedSubject(parseInt(v))}
                  disabled={!selectedClass || availableSubjects.length === 0}
                  modal={false}
                >
                  <SelectTrigger className="h-10 bg-white border-slate-200">
                    <SelectValue placeholder={
                      !selectedClass ? "Əvvəlcə sinif seçin" :
                      gradeSubjectsLoading ? "Yüklənir..." :
                      availableSubjects.length === 0 ? "Bu sinifdə fənn yoxdur" :
                      "Fənn seçin"
                    } />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {availableSubjects.map((s: GradeSubject) => (
                      <SelectItem key={s.subject_id} value={s.subject_id.toString()}>
                        {s.subject_name} ({s.weekly_hours} saat)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hours Display */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Saat/Həftə</label>
                <div className="h-10 px-3 flex items-center gap-2 bg-white border border-slate-200 rounded-md">
                  <span className="font-bold text-lg text-primary">{weeklyHours > 0 ? weeklyHours : '-'}</span>
                  <span className="text-xs text-slate-500">saat</span>
                </div>
              </div>
            </div>

            {/* Teacher subjects info */}
            {!subjectsLoading && (!teacherSubjects || teacherSubjects.length === 0) && (
              <Alert className="py-3 border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-700" />
                <AlertDescription className="text-xs text-amber-800">
                  Bu müəllim üçün hələ fənn təyin edilməyib. Sinifin kurikulum fənnlərindən seçim edə bilərsiniz.
                </AlertDescription>
              </Alert>
            )}

            {/* Auto-select info */}
            {selectedSubject && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">{selectedClassName} · {selectedSubjectName} · {weeklyHours} saat/həftə</span>
              </div>
            )}

            {/* Limit warning */}
            {isNearLimit && !wouldExceedLimit && (
              <Alert className="py-3 border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-xs text-yellow-700">
                  Müəllim limitə yaxınlaşır ({currentTotal}/{maxHours} saat). Yeni təyinatlar diqqətlə əlavə edin.
                </AlertDescription>
              </Alert>
            )}

            {/* Would exceed limit warning */}
            {wouldExceedLimit && (
              <Alert variant="destructive" className="py-3 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-xs text-red-700">
                  Bu təyinat limiti aşacaq! ({currentTotal} + {weeklyHours} = {projectedTotal} saat). 
                  Maximum: {maxHours} saat. Əvvəlcə mövcud yükü azaldın və ya başqa müəllim seçin.
                </AlertDescription>
              </Alert>
            )}

            {/* Add Button */}
            <div className="flex justify-end pt-2">
              <Button 
                size="sm" 
                onClick={handleAdd}
                disabled={!selectedClass || !selectedSubject || weeklyHours === 0 || createMutation.isPending || wouldExceedLimit}
                className="bg-primary hover:bg-primary/90"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Əlavə edilir...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> Əlavə Et</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Workload Table - Grouped by Class */}
        {loads.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">
                Təyin edilmiş dərslər ({loads.length})
              </div>
            </div>
            
            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="w-[30%] font-semibold text-slate-700">Sinif / Fənn</TableHead>
                    <TableHead className="w-[15%] text-center font-semibold text-slate-700">Dərs</TableHead>
                    <TableHead className="w-[15%] text-center font-semibold text-slate-700">Məşğələ</TableHead>
                    <TableHead className="w-[15%] text-center font-semibold text-slate-700">Dərnək</TableHead>
                    <TableHead className="w-[15%] text-right font-semibold text-slate-700">Cəmi Saat</TableHead>
                    <TableHead className="w-[10%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedLoads).map(([className, classLoads]: [string, WorkloadItem[]]) => {
                    const classTotalHours = classLoads.reduce((sum, l) => sum + (l.weekly_hours || 0), 0);
                    const progName = classLoads[0]?.education_program;
                    const displayProg = progName === 'umumi' ? 'Ümumi təhsil' : 
                                        progName === 'xususi' ? 'Xüsusi təhsil' : 
                                        progName === 'mektebde_ferdi' ? 'Məktəbdə fərdi' : 
                                        progName === 'evde_ferdi' ? 'Evdə fərdi' : progName;
                    
                    return (
                      <React.Fragment key={className}>
                        {/* Class Group Header */}
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/80 border-b-slate-200">
                          <TableCell colSpan={4} className="py-3">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-800 text-sm">{className}</span>
                              <Badge variant="outline" className="text-[10px] font-medium bg-white border-slate-200 text-slate-600">
                                {classLoads.length} fənn
                              </Badge>
                              {displayProg && (
                                <span className="text-xs text-slate-500 font-medium ml-1">
                                  {displayProg} {classLoads[0]?.class_profile && `· ${classLoads[0].class_profile}`}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <span className="font-bold text-slate-700 text-sm">{classTotalHours} saat/həftə</span>
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>

                        {/* Subject Rows */}
                        {classLoads.map((load) => (
                          <TableRow key={load.id} className="group hover:bg-slate-50/30 transition-colors">
                            <TableCell className="py-3 pl-8">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-semibold shrink-0">
                                  {load.subject_name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-slate-700">{load.subject_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {load.is_teaching_activity ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 text-blue-700 font-semibold text-sm border border-blue-100">
                                  {load.weekly_hours}
                                </span>
                              ) : <span className="text-slate-300">-</span>}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {load.is_extracurricular ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-sm border border-emerald-100">
                                  {load.weekly_hours}
                                </span>
                              ) : <span className="text-slate-300">-</span>}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {load.is_club ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-purple-50 text-purple-700 font-semibold text-sm border border-purple-100">
                                  {load.weekly_hours}
                                </span>
                              ) : <span className="text-slate-300">-</span>}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <span className="text-sm font-medium text-slate-600">{load.weekly_hours} saat</span>
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => deleteMutation.mutate(load.id)}
                                disabled={deleteMutation.isPending}
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {/* Total Summary */}
            <div className="border rounded-lg px-4 py-3 bg-muted/50 flex items-center justify-between">
              <span className="text-sm font-medium">Ümumi dərs yükü</span>
              <span className="text-sm font-semibold">{workload?.total_hours || 0} saat/həftə</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Hələ dərs yükü təyin edilməyib</p>
            {!isAdding && (
              <p className="text-xs mt-1">Yuxarıdakı "Əlavə Et" düyməsi ilə əlavə edin</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
