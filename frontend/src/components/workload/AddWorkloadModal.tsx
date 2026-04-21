import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gradeService, Grade } from '@/services/grades';
import { teacherService, TeacherSubject } from '@/services/teachers';
import { workloadService, TeachingLoad, GradeSubject } from '@/services/workload';
import { curriculumService } from '@/services/curriculumService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EDUCATION_TYPE_LABELS, EducationType } from '@/types/curriculum';

interface AddWorkloadModalProps {
  teacherId: number;
  teacherName: string;
  institutionId?: number;
  academicYearId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddWorkloadModal({
  teacherId,
  teacherName,
  institutionId,
  academicYearId: propAcademicYearId,
  isOpen,
  onClose,
  onSuccess
}: AddWorkloadModalProps) {
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  // Composite key format: "subjectId_educationType" (e.g. "12_umumi")
  // This matches SelectItem values exactly so the dropdown displays correctly
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>('');
  const [weeklyHours, setWeeklyHours] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoSelectedInfo, setAutoSelectedInfo] = useState<string | null>(null);

  // Derive individual fields from composite key
  const selectedSubject = selectedSubjectKey ? parseInt(selectedSubjectKey.split('_')[0]) : null;
  const selectedEducationType = selectedSubjectKey ? selectedSubjectKey.split('_').slice(1).join('_') : null;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load master curriculum plan to get unique subjects for the dropdown
  const { data: masterPlanResponse, isLoading: masterPlanLoading } = useQuery({
    queryKey: ['curriculum-plan-master', institutionId, propAcademicYearId],
    queryFn: () => curriculumService.getMasterPlan(institutionId!, propAcademicYearId!),
    enabled: isOpen && !!institutionId && !!propAcademicYearId,
  });

  // When subject is selected, fetch only grades that have this subject in their Sinif Tədris Planı (grade_subjects)
  const selectedSubjectId = selectedSubjectKey ? parseInt(selectedSubjectKey.split('_')[0]) : null;
  const { data: filteredGradesResponse, isLoading: filteredGradesLoading } = useQuery({
    queryKey: ['grades-by-subject', institutionId, propAcademicYearId, selectedSubjectKey],
    queryFn: () => gradeService.getGrades({
      institution_id: institutionId,
      academic_year_id: propAcademicYearId,
      is_active: true,
      subject_id: selectedSubjectId!,
      education_type: selectedEducationType || 'umumi',
      per_page: 500,
    }),
    enabled: isOpen && !!institutionId && !!selectedSubjectId,
  });

  // Load teacher's subjects
  const { data: teacherSubjects, isLoading: teacherSubjectsLoading } = useQuery({
    queryKey: ['teacher-subjects', teacherId],
    queryFn: () => teacherService.getTeacherSubjects(teacherId),
    enabled: isOpen && teacherId > 0,
  });

  // Load grade subjects when class is selected
  const { data: gradeSubjectsResponse, isLoading: gradeSubjectsLoading } = useQuery({
    queryKey: ['grade-subjects', selectedClass],
    queryFn: () => workloadService.getGradeSubjects(selectedClass!),
    enabled: selectedClass !== null && selectedClass > 0,
  });

  // Load existing teaching loads for this teacher
  const { data: existingLoadsResponse, isLoading: existingLoadsLoading } = useQuery({
    queryKey: ['teaching-loads', teacherId],
    queryFn: () => workloadService.getTeacherWorkload(teacherId),
    enabled: isOpen && teacherId > 0,
  });

  // Load ALL teaching loads for the selected class to calculate remaining hours
  const { data: classLoadsResponse, isLoading: classLoadsLoading } = useQuery({
    queryKey: ['class-teaching-loads', selectedClass],
    queryFn: () => workloadService.getTeachingLoadsForClass(selectedClass!),
    enabled: selectedClass !== null && selectedClass > 0,
  });



  const gradeSubjects = useMemo(() => {
    const responseData = gradeSubjectsResponse?.data;
    
    
    if (Array.isArray(responseData)) {
      return responseData;
    }
    
    return [];
  }, [gradeSubjectsResponse]);

  // Get existing teaching loads
  const existingLoads = useMemo(() => {
    return existingLoadsResponse?.data?.loads || [];
  }, [existingLoadsResponse]);

  // Get all loads for the selected class
  const classLoads = useMemo(() => {
    return (classLoadsResponse?.data || []) as TeachingLoad[];
  }, [classLoadsResponse]);

  // Calculate remaining hours per subject for the class
  const subjectRemainingHours = useMemo(() => {
    const hoursMap: Record<string, number> = {};
    
    gradeSubjects.forEach(gs => {
      const key = `${gs.subject_id}_${gs.education_type}`;
      const totalPlanned = gs.weekly_hours * (gs.is_split_groups ? gs.group_count : 1);
      
      const assignedToThisSubject = classLoads
        .filter(l => l.subject_id === gs.subject_id && l.education_type === gs.education_type)
        .reduce((sum, l) => sum + Number(l.weekly_hours || 0), 0);
        
      hoursMap[key] = Math.max(0, totalPlanned - assignedToThisSubject);
    });
    
    return hoursMap;
  }, [gradeSubjects, classLoads]);



  // Check if subject is already assigned to this teacher for selected class
  const isSubjectAlreadyAssigned = useMemo(() => {
    if (!selectedClass || !selectedSubjectKey) return false;
    return existingLoads.some(
      (load: TeachingLoad) =>
        load.class_id === selectedClass &&
        `${load.subject_id}_${load.education_type || 'umumi'}` === selectedSubjectKey
    );
  }, [existingLoads, selectedClass, selectedSubjectKey]);

  // Get list of already assigned subject keys for the selected class
  const assignedSubjectKeysForClass = useMemo(() => {
    if (!selectedClass) return new Set<string>();
    return new Set(
      existingLoads
        .filter((load: TeachingLoad) => load.class_id === selectedClass)
        .map((load: TeachingLoad) => `${load.subject_id}_${load.education_type || 'umumi'}`)
    );
  }, [existingLoads, selectedClass]);

  // Existing assignments filtered by currently selected subject
  const relevantExistingLoads = useMemo(() => {
    if (!selectedSubject || !selectedEducationType) return existingLoads;
    return existingLoads.filter(
      (load: TeachingLoad) => load.subject_id === selectedSubject && (load.education_type || 'umumi') === selectedEducationType
    );
  }, [existingLoads, selectedSubject, selectedEducationType]);

  // Extract all unique subjects from the Master Plan for the Subject dropdown
  const allSchoolSubjects = useMemo(() => {
    const items = masterPlanResponse?.items || [];
    const subjectsMap = new Map();
    items.forEach((item: any) => {
      if (!item.subject_id) return;
      // Yalnız ən azı bir sinifə əlavə edilmiş fənlər göstərilsin
      if (!item.has_grade_subjects) return;
      const key = `${item.subject_id}_${item.education_type || 'umumi'}`;
      if (!subjectsMap.has(key)) {
        subjectsMap.set(key, {
          subject_id: item.subject_id,
          subject_name: item.subject?.name || 'Fənn',
          education_type: item.education_type || 'umumi',
          weekly_hours: item.hours
        });
      }
    });
    return Array.from(subjectsMap.values());
  }, [masterPlanResponse]);

  const teacherSubjectIds = useMemo(() => {
    return new Set((teacherSubjects || []).map((ts: TeacherSubject) => ts.subject_id));
  }, [teacherSubjects]);

  // Group subjects: teacher's own subjects first, then others
  const { teacherSubjectsList, otherSubjectsList } = useMemo(() => {
    const teacherList: any[] = [];
    const otherList: any[] = [];
    allSchoolSubjects.forEach((gs: any) => {
      if (teacherSubjectIds.has(gs.subject_id)) {
        teacherList.push(gs);
      } else {
        otherList.push(gs);
      }
    });
    return { teacherSubjectsList: teacherList, otherSubjectsList: otherList };
  }, [allSchoolSubjects, teacherSubjectIds]);

  // Grades available for the selected subject — fetched directly from backend
  // Backend filters via grade_subjects (Sinif Tədris Planı), so result is EXACT match
  const availableGrades = useMemo(() => {
    if (!selectedSubjectKey) return [];
    const responseData = filteredGradesResponse?.data;
    if (!responseData) return [];
    if (Array.isArray(responseData)) return responseData;
    const nested = (responseData as any)?.grades || (responseData as any)?.data;
    return Array.isArray(nested) ? nested : [];
  }, [filteredGradesResponse, selectedSubjectKey]);

  const [hasUserSelectedSubject, setHasUserSelectedSubject] = useState(false);
  const hasUserSelectedSubjectRef = useRef(false);

  // Auto-fill hours from grade_subjects API when BOTH class and subject are selected
  useEffect(() => {
    if (selectedClass && selectedSubjectKey && !gradeSubjectsLoading && gradeSubjects.length > 0) {
       const [sIdStr, eType] = selectedSubjectKey.split('_');
       const sId = parseInt(sIdStr);
       const gs = gradeSubjects.find((g: GradeSubject) => g.subject_id === sId && (g.education_type || 'umumi') === eType);
       if (gs) {
           setWeeklyHours(gs.weekly_hours);
           
           // Calculate remaining hours safely
           const totalPlanned = gs.weekly_hours * (gs.is_split_groups ? gs.group_count : 1);
           const assignedToThisSubject = classLoads
             .filter((l: TeachingLoad) => l.subject_id === gs.subject_id && l.education_type === gs.education_type)
             .reduce((sum: number, l: TeachingLoad) => sum + Number(l.weekly_hours || 0), 0);
           const remaining = Math.max(0, totalPlanned - assignedToThisSubject);
           
           if (remaining <= 0) {
             setAutoSelectedInfo(`DİQQƏT: Tədris planına əsasən bu sinifdə "${gs.subject_name}" üçün fənn yükü limit dolub!`);
           } else {
             setAutoSelectedInfo(`Sinifdə bu fənn üçün tədris planında ${remaining} saat boş fənn yükü var.`);
           }
       } else {
           setWeeklyHours(0);
           setAutoSelectedInfo(`DİQQƏT: Tədris planında bu sinif üçün seçilən fənn təyin olunmayıb!`);
       }
    } else if (selectedSubjectKey && !selectedClass) {
        setWeeklyHours(0);
        setAutoSelectedInfo('Seçilmiş fənnə uyğun təyin etmək istədikdə, sadəcə aşağıdan dəstəklənən siyahıdan sinif seçin.');
    }
  }, [selectedClass, selectedSubjectKey, gradeSubjectsLoading, gradeSubjects, classLoads]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedClass(null);
      setSelectedSubjectKey('');
      setWeeklyHours(0);
      setAutoSelectedInfo(null);
      setSubmitError(null);
    }
  }, [isOpen]);

  const handleSubjectChange = (value: string) => {
    // value is in format "subjectId_educationType"
    setSelectedSubjectKey(value);
    setSubmitError(null);
    setHasUserSelectedSubject(true);
    hasUserSelectedSubjectRef.current = true;

    // Reset selected class because the new subject might not be available in it
    setSelectedClass(null);
    setWeeklyHours(0);
    setAutoSelectedInfo(null);
  };

  const handleClassChange = (value: string) => {
    const classId = parseInt(value);
    setSelectedClass(classId);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    // Validation
    if (!selectedClass || !selectedSubjectKey || weeklyHours <= 0) {
      setSubmitError('Zəhmət olmasa sinif və fənn seçin.');
      return;
    }

    // Check if already assigned
    if (isSubjectAlreadyAssigned) {
      setSubmitError('Bu fənn artıq bu sinifdə bu müəllimə təyin edilib.');
      return;
    }

    setIsSubmitting(true);
    try {
      await workloadService.createTeachingLoad({
        teacher_id: teacherId,
        subject_id: selectedSubject!,
        education_type: selectedEducationType || 'umumi',
        class_id: selectedClass,
        weekly_hours: weeklyHours,
        academic_year_id: propAcademicYearId || 1
      } as any);

      toast({
        title: 'Uğurla Əlavə Edildi',
        description: `${teacherName} üçün dərs yükü əlavə edildi`,
      });

      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
      queryClient.invalidateQueries({ queryKey: ['class-teaching-loads', selectedClass] });
      queryClient.invalidateQueries({ queryKey: ['workload-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['curriculum-plan-master'] });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating teaching load:', error);
      // Extract detailed backend message (Laravel validation errors or custom messages)
      const resp = error?.response?.data;
      let errMsg = 'Dərs yükü əlavə edilərkən xəta baş verdi.';
      if (resp?.message) {
        errMsg = resp.message;
      } else if (resp?.errors) {
        const firstKey = Object.keys(resp.errors)[0];
        if (firstKey) errMsg = Array.isArray(resp.errors[firstKey]) ? resp.errors[firstKey][0] : resp.errors[firstKey];
      }
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Dərs Yükü Əlavə Et</DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{teacherName}</span> müəllimi üçün yeni dərs yükü əlavə edin
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Submit Error Banner - Moved up top */}
          {submitError && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Auto-selection info */}
          {autoSelectedInfo && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{autoSelectedInfo}</AlertDescription>
            </Alert>
          )}

          {/* Teacher Subjects Info */}
          {teacherSubjects && teacherSubjects.length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Müəllimin Fənnləri:</p>
              <div className="flex flex-wrap gap-2">
                {teacherSubjects.map((ts: TeacherSubject) => (
                  <span key={ts.id} className="text-xs bg-primary/10 px-2 py-1 rounded">
                    {ts.subject_name}
                    {ts.is_primary_subject && ' ⭐'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {teacherSubjectsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Müəllimin fənnləri yüklənir...
            </div>
          )}

          {/* Form Fields - 2 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subject Selection (Now First) */}
            <div className="grid gap-2">
              <Label htmlFor="subject">Fənn *</Label>
              <Select
                value={selectedSubjectKey}
                onValueChange={handleSubjectChange}
                disabled={masterPlanLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      masterPlanLoading ? "Yüklənir..." :
                      allSchoolSubjects.length === 0 ? "Məktəb planında fənn yoxdur" :
                      "Fənn seçin"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {/* Teacher's subjects group */}
                  {(() => {
                    const unassigned = teacherSubjectsList;
                    if (unassigned.length === 0) return null;
                    return (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50">
                          Müəllimin Fənnləri
                        </div>
                        {unassigned.map((gs: any) => {
                            const subjectKey = `${gs.subject_id}_${gs.education_type}`;
                            const edLabel = EDUCATION_TYPE_LABELS[gs.education_type as EducationType] || gs.education_type;
                            return (
                              <SelectItem key={subjectKey} value={subjectKey}>
                                <span>{gs.subject_name} ({edLabel})</span>
                                <span className="text-xs text-emerald-600 ml-2">✓</span>
                              </SelectItem>
                            );
                        })}
                      </>
                    );
                  })()}

                  {/* Other subjects group */}
                  {(() => {
                    const unassignedOther = otherSubjectsList;
                    if (unassignedOther.length === 0) return null;
                    const hasTeacherSubjects = teacherSubjectsList.length > 0;
                    return (
                      <>
                        {hasTeacherSubjects && (
                          <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 mt-1">
                            Digər Fənnlər
                          </div>
                        )}
                        {unassignedOther.map((gs: any) => {
                            const subjectKey = `${gs.subject_id}_${gs.education_type}`;
                            const edLabel = EDUCATION_TYPE_LABELS[gs.education_type as EducationType] || gs.education_type;
                            return (
                              <SelectItem key={subjectKey} value={subjectKey}>
                                <span>{gs.subject_name} ({edLabel})</span>
                              </SelectItem>
                            );
                        })}
                      </>
                    );
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Class Selection (Now Second, logically filtered) */}
            <div className="grid gap-2">
              <Label htmlFor="class">Sinif *</Label>
              <Select
                value={selectedClass?.toString() || ''}
                onValueChange={handleClassChange}
                disabled={filteredGradesLoading || !selectedSubjectKey || availableGrades.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                     !selectedSubjectKey ? "Əvvəlcə Fənn seçin..." :
                     filteredGradesLoading ? "Yüklənir..." : 
                     availableGrades.length === 0 ? "Bu fənnə aid sinif tapılmadı" :
                     "Sinif seçin"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableGrades.map((grade: Grade) => {
                    // Check if subject is already assigned to THIS SPECIFIC class to visually indicate
                    const isAlreadyAssignedInClass = existingLoads.some(
                      l => l.class_id === grade.id && `${l.subject_id}_${l.education_type || 'umumi'}` === selectedSubjectKey
                    );
                    
                    const formattedGradeName = grade.full_name 
                      ? grade.full_name.replace(/(,\s*)+$/g, '').replace(/,\s*,/g, ', ').trim()
                      : grade.name;
                      
                    return (
                      <SelectItem key={grade.id} value={grade.id.toString()} disabled={isAlreadyAssignedInClass}>
                        {formattedGradeName} {isAlreadyAssignedInClass ? "(Təyin edilib)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedSubjectKey && availableGrades.length === 0 && !filteredGradesLoading && filteredGradesResponse && (
                <div className="text-xs text-amber-600 font-medium">Bu fənn məktəbin heç bir sinfinə təyin olunmayıb.</div>
              )}
            </div>
          </div>

          {/* Additional details column row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekly Hours - Read Only */}
            <div className="grid gap-2">
              <Label>Həftəlik Saat</Label>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg h-12">
                <div className="text-xl font-bold text-primary">
                  {weeklyHours > 0 ? weeklyHours : '-'}
                </div>
                <div className="text-xs text-muted-foreground flex flex-col justify-center">
                  <span>saat/həftə</span>
                  {weeklyHours > 0 && (
                    <span>({weeklyHours * 4} saat/ay)</span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Saatlar sinif/fənn təyinatından avtomatik gəlir
              </p>
            </div>

            {/* Existing assignments info */}
            {relevantExistingLoads.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">
                    {selectedSubjectKey ? 'Bu fənni tədris etdiyi siniflər' : 'Mövcud Təyinatlar'} ({relevantExistingLoads.length})
                  </span>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto scrollbar-thin">
                  {relevantExistingLoads.slice(0, 4).map((load: TeachingLoad) => (
                    <div key={load.id} className="text-xs text-blue-700 flex justify-between">
                      <span className="font-semibold">{load.class_name}</span> 
                      {!selectedSubjectKey && <span className="truncate ml-1 max-w-[100px]">{load.subject_name}</span>}
                      <span>{load.weekly_hours}s</span>
                    </div>
                  ))}
                  {relevantExistingLoads.length > 4 && (
                    <div className="text-[10px] text-blue-600 italic">
                      ... və {relevantExistingLoads.length - 4} ədədi daha
                    </div>
                  )}
                </div>
              </div>
            )}
            {relevantExistingLoads.length === 0 && existingLoads.length > 0 && selectedSubjectKey && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
                <span className="text-xs text-slate-500">Bu müəllimin bu fənndən hələ təyinatı yoxdur</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Ləğv Et
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedClass || !selectedSubjectKey || weeklyHours <= 0 || isSubjectAlreadyAssigned}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Əlavə Edilir...
              </>
            ) : (
              'Əlavə Et'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
