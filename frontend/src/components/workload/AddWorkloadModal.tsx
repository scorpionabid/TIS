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
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedEducationType, setSelectedEducationType] = useState<string | null>(null);
  const [weeklyHours, setWeeklyHours] = useState<number>(0);
  const [academicYearId, setAcademicYearId] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSelectedInfo, setAutoSelectedInfo] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load grades (classes) for the school
  const { data: gradesResponse, isLoading: gradesLoading } = useQuery({
    queryKey: ['school-grades', institutionId, propAcademicYearId],
    queryFn: () => gradeService.getGrades({ 
      institution_id: institutionId, 
      academic_year_id: propAcademicYearId,
      is_active: true 
    }),
    enabled: isOpen,
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

  const grades = useMemo(() => {
    // Handle different API response structures
    const responseData = gradesResponse?.data;
    if (Array.isArray(responseData)) {
      return responseData;
    }
    if (responseData && typeof responseData === 'object') {
      // Check for nested data structure { data: { grades: [...] } }
      const nestedGrades = (responseData as any)?.grades || (responseData as any)?.data;
      if (Array.isArray(nestedGrades)) {
        return nestedGrades;
      }
    }
    return [];
  }, [gradesResponse]);

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

  // Group subjects by whether teacher teaches them
  const teacherSubjectIds = useMemo(() => {
    return new Set((teacherSubjects || []).map((ts: TeacherSubject) => ts.subject_id));
  }, [teacherSubjects]);

  // Check if subject is already assigned to this teacher for selected class
  const isSubjectAlreadyAssigned = useMemo(() => {
    if (!selectedClass || !selectedSubject || !selectedEducationType) return false;
    return existingLoads.some(
      (load: TeachingLoad) =>
        load.class_id === selectedClass &&
        load.subject_id === selectedSubject &&
        load.education_type === selectedEducationType
    );
  }, [existingLoads, selectedClass, selectedSubject, selectedEducationType]);

  // Get list of already assigned subject IDs for the selected class
  const assignedSubjectKeysForClass = useMemo(() => {
    if (!selectedClass) return new Set<string>();
    return new Set(
      existingLoads
        .filter((load: TeachingLoad) => load.class_id === selectedClass)
        .map((load: TeachingLoad) => `${load.subject_id}_${load.education_type || 'umumi'}`)
    );
  }, [existingLoads, selectedClass]);

  // List of subjects from curriculum that are available for assignment
  // (excludes subjects that have no remaining hours)
  const availableSubjects = useMemo(() => {
    return gradeSubjects.filter((gs: GradeSubject) => {
      const key = `${gs.subject_id}_${gs.education_type}`;
      const remaining = subjectRemainingHours[key] ?? gs.weekly_hours;
      
      // If no hours remaining, hide it
      if (remaining <= 0) return false;
      
      return true;
    });
  }, [gradeSubjects, subjectRemainingHours]);

  const { teacherSubjectsList, otherSubjectsList } = useMemo(() => {
    const teacherList: GradeSubject[] = [];
    const otherList: GradeSubject[] = [];

    availableSubjects.forEach((gs: GradeSubject) => {
      if (teacherSubjectIds.has(gs.subject_id)) {
        teacherList.push(gs);
      } else {
        otherList.push(gs);
      }
    });

    return { teacherSubjectsList: teacherList, otherSubjectsList: otherList };
  }, [availableSubjects, teacherSubjectIds]);

  const [hasUserSelectedSubject, setHasUserSelectedSubject] = useState(false);
  const hasUserSelectedSubjectRef = useRef(false);

  // Auto-select subject and hours when class is selected (only once per class)
  useEffect(() => {
    if (selectedClass && teacherSubjects && availableSubjects.length > 0 && !hasUserSelectedSubjectRef.current) {

      // Find matching subject: teacher's subject that exists in selected grade
      const matchingSubject = availableSubjects.find((gs: GradeSubject) =>
        teacherSubjects.some((ts: TeacherSubject) => ts.subject_id === gs.subject_id)
      );

      if (matchingSubject) {
        setSelectedSubject(matchingSubject.subject_id);
        setSelectedEducationType(matchingSubject.education_type);
        setWeeklyHours(matchingSubject.weekly_hours);
        const edLabel = EDUCATION_TYPE_LABELS[matchingSubject.education_type as EducationType] || matchingSubject.education_type;
        setAutoSelectedInfo(
          `Avtomatik seçildi: "${matchingSubject.subject_name}" [${edLabel}] (${matchingSubject.weekly_hours} saat/həftə)`
        );
      } else {
        setSelectedSubject(null);
        setSelectedEducationType(null);
        setWeeklyHours(0);
        setAutoSelectedInfo(`Bu sinifdə ${gradeSubjects.length} fənn tapıldı. Seçim edin.`);
      }
    }
  }, [selectedClass, teacherSubjects, gradeSubjects]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedClass(null);
      setSelectedSubject(null);
      setSelectedEducationType(null);
      setWeeklyHours(0);
      setAutoSelectedInfo(null);
    }
  }, [isOpen]);

  const handleClassChange = (value: string) => {
    const classId = parseInt(value);
    setSelectedClass(classId);
    // Reset subject selection when class changes
    setSelectedSubject(null);
    setWeeklyHours(0);
    setAutoSelectedInfo(null);
    setHasUserSelectedSubject(false); // Reset for new class
    hasUserSelectedSubjectRef.current = false;
  };

  const handleSubjectChange = (value: string) => {
    const [idStr, educationType] = value.split('_');
    const subjectId = parseInt(idStr);
    setSelectedEducationType(educationType);
    setSelectedSubject(subjectId);
    setHasUserSelectedSubject(true); // Mark that user has manually selected
    hasUserSelectedSubjectRef.current = true;

    // Auto-fill weekly hours from grade_subjects
    const gradeSubject = availableSubjects.find((gs: GradeSubject) => // Use availableSubjects here
      gs.subject_id === subjectId && gs.education_type === educationType
    );
    if (gradeSubject) {
      setWeeklyHours(gradeSubject.weekly_hours);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedClass || !selectedSubject || !selectedEducationType || weeklyHours <= 0) {
      toast({
        title: 'Xəta',
        description: 'Zəhmət olmasa bütün sahələri doldurun',
        variant: 'destructive'
      });
      return;
    }

    // Check if already assigned
    if (isSubjectAlreadyAssigned) {
      toast({
        title: 'Artıq Təyin Edilib',
        description: 'Bu fənn artıq bu sinifdə bu müəllimə təyin edilib',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await workloadService.createTeachingLoad({
        teacher_id: teacherId,
        subject_id: selectedSubject,
        education_type: selectedEducationType || 'umumi',
        class_id: selectedClass,
        weekly_hours: weeklyHours,
        academic_year_id: propAcademicYearId || 1
      } as any);

      toast({
        title: 'Uğurla Əlavə Edildi',
        description: `${teacherName} üçün dərs yükü əlavə edildi`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
      queryClient.invalidateQueries({ queryKey: ['class-teaching-loads', selectedClass] });
      queryClient.invalidateQueries({ queryKey: ['workload-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['curriculum-plan-master'] }); // Refresh main table if open

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating teaching load:', error);
      toast({
        title: 'Xəta Baş Verdi',
        description: error?.response?.data?.message || 'Dərs yükü əlavə edilərkən xəta',
        variant: 'destructive'
      });
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

          {/* Class Selection */}
          <div className="grid gap-2">
            <Label htmlFor="class">Sinif *</Label>
            <Select
              value={selectedClass?.toString() || ''}
              onValueChange={handleClassChange}
              disabled={gradesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={gradesLoading ? "Yüklənir..." : "Sinif seçin"} />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade: Grade) => (
                  <SelectItem key={grade.id} value={grade.id.toString()}>
                    {grade.full_name || grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject Selection */}
          <div className="grid gap-2">
            <Label htmlFor="subject">Fənn *</Label>
            <Select
              value={selectedSubject?.toString() || ''}
              onValueChange={handleSubjectChange}
              disabled={!selectedClass || gradeSubjectsLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedClass ? "Əvvəlcə sinif seçin" :
                    gradeSubjectsLoading ? "Yüklənir..." :
                    gradeSubjects.length === 0 ? "Bu sinifdə fənn yoxdur" :
                    "Fənn seçin"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {/* Teacher's subjects group — already-assigned ones are hidden */}
                {(() => {
                  const unassigned = teacherSubjectsList.filter(
                    gs => !assignedSubjectKeysForClass.has(`${gs.subject_id}_${gs.education_type}`)
                  );
                  if (unassigned.length === 0) return null;
                  return (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50">
                        Müəllimin Fənnləri
                      </div>
                      {unassigned.map((gs: GradeSubject) => {
                          const subjectKey = `${gs.subject_id}_${gs.education_type}`;
                          const edLabel = EDUCATION_TYPE_LABELS[gs.education_type as EducationType] || gs.education_type;
                          const remaining = subjectRemainingHours[subjectKey];
                          return (
                            <SelectItem key={subjectKey} value={subjectKey}>
                              <span>{gs.subject_name} ({edLabel}, {remaining} saat qalıb)</span>
                              <span className="text-xs text-emerald-600 ml-2">✓</span>
                            </SelectItem>
                          );
                      })}
                    </>
                  );
                })()}

                {/* Other subjects group — already-assigned ones are hidden */}
                {(() => {
                  const unassignedOther = otherSubjectsList.filter(
                    gs => !assignedSubjectKeysForClass.has(`${gs.subject_id}_${gs.education_type}`)
                  );
                  if (unassignedOther.length === 0) return null;
                  const hasTeacherSubjects = teacherSubjectsList.some(
                    gs => !assignedSubjectKeysForClass.has(`${gs.subject_id}_${gs.education_type}`)
                  );
                  return (
                    <>
                      {hasTeacherSubjects && (
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 mt-1">
                          Digər Fənnlər
                        </div>
                      )}
                      {unassignedOther.map((gs: GradeSubject) => {
                          const subjectKey = `${gs.subject_id}_${gs.education_type}`;
                          const edLabel = EDUCATION_TYPE_LABELS[gs.education_type as EducationType] || gs.education_type;
                          const remaining = subjectRemainingHours[subjectKey];
                          return (
                            <SelectItem key={subjectKey} value={subjectKey}>
                              <span>{gs.subject_name} ({edLabel}, {remaining} saat qalıb)</span>
                            </SelectItem>
                          );
                      })}
                    </>
                  );
                })()}
              </SelectContent>
            </Select>
            {gradeSubjectsLoading && selectedClass && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fənnlər yüklənir...
              </div>
            )}
            {!gradeSubjectsLoading && gradeSubjects.length === 0 && selectedClass && (
              <div className="text-sm text-amber-600">
                Bu sinif üçün fənn məlumatı tapılmadı.
              </div>
            )}
          </div>

          {/* Weekly Hours - Read Only */}
          <div className="grid gap-2">
            <Label>Həftəlik Saat</Label>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {weeklyHours > 0 ? weeklyHours : '-'}
              </div>
              <div className="text-sm text-muted-foreground">
                saat/həftə
                {weeklyHours > 0 && (
                  <span className="block text-xs">
                    ({weeklyHours * 4} saat/ay təxmini)
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Saatlar sinif/fənn təyinatından avtomatik gəlir
            </p>
          </div>

          {/* Validation warning - only show if no teacher subjects at all */}
          {(!teacherSubjects || teacherSubjects.length === 0) && !teacherSubjectsLoading && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Bu müəllim üçün heç bir fənn təyin edilməyib. Yenə də sinifin istənilən fənnini təyin edə bilərsiniz.
              </AlertDescription>
            </Alert>
          )}

          {/* Already assigned warning */}
          {isSubjectAlreadyAssigned && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Bu fənn artıq bu sinifdə bu müəllimə təyin edilib. Təkrar təyin etmək mümkün deyil.
              </AlertDescription>
            </Alert>
          )}

          {/* Existing assignments info */}
          {existingLoads.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Mövcud Təyinatlar ({existingLoads.length})
                </span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {existingLoads.slice(0, 5).map((load: TeachingLoad) => (
                  <div key={load.id} className="text-xs text-blue-700 flex justify-between">
                    <span>{load.class_name} - {load.subject_name}</span>
                    <span>{load.weekly_hours} saat</span>
                  </div>
                ))}
                {existingLoads.length > 5 && (
                  <div className="text-xs text-blue-600 italic">
                    ... və {existingLoads.length - 5} ədədi daha
                  </div>
                )}
              </div>
            </div>
          )}
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
            disabled={isSubmitting || !selectedClass || !selectedSubject || weeklyHours <= 0 || isSubjectAlreadyAssigned}
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
