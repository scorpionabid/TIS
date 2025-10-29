import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gradeService, Grade } from '@/services/grades';
import { teacherService, TeacherSubject } from '@/services/teachers';
import { workloadService, GradeSubject } from '@/services/workload';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddWorkloadModalProps {
  teacherId: number;
  teacherName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddWorkloadModal({
  teacherId,
  teacherName,
  isOpen,
  onClose,
  onSuccess
}: AddWorkloadModalProps) {
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [weeklyHours, setWeeklyHours] = useState<number>(0);
  const [academicYearId, setAcademicYearId] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSelectedInfo, setAutoSelectedInfo] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load grades (classes) for the school
  const { data: gradesResponse, isLoading: gradesLoading } = useQuery({
    queryKey: ['school-grades'],
    queryFn: () => gradeService.getGrades({ is_active: true }),
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

  const grades = gradesResponse?.data || [];
  const gradeSubjects = gradeSubjectsResponse?.data || [];

  // Auto-select subject and hours when class is selected
  useEffect(() => {
    if (selectedClass && teacherSubjects && gradeSubjects.length > 0) {
      console.log('🔍 Checking for auto-selection...');
      console.log('Teacher subjects:', teacherSubjects);
      console.log('Grade subjects:', gradeSubjects);

      // Find matching subject: teacher's subject that exists in selected grade
      const matchingSubject = gradeSubjects.find((gs: GradeSubject) =>
        teacherSubjects.some((ts: TeacherSubject) => ts.subject_id === gs.subject_id)
      );

      if (matchingSubject) {
        console.log('✅ Found matching subject:', matchingSubject);
        setSelectedSubject(matchingSubject.subject_id);
        setWeeklyHours(matchingSubject.weekly_hours);
        setAutoSelectedInfo(
          `Avtomatik seçildi: "${matchingSubject.subject_name}" (${matchingSubject.weekly_hours} saat/həftə)`
        );

        toast({
          title: 'Avtomatik Seçim',
          description: `${matchingSubject.subject_name} fənni və ${matchingSubject.weekly_hours} saat avtomatik seçildi`,
        });
      } else {
        console.log('⚠️ No matching subject found');
        setSelectedSubject(null);
        setWeeklyHours(0);
        setAutoSelectedInfo('Bu sinifdə müəllimin fənni tapılmadı. Manuel olaraq seçin.');
      }
    }
  }, [selectedClass, teacherSubjects, gradeSubjects]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedClass(null);
      setSelectedSubject(null);
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
  };

  const handleSubjectChange = (value: string) => {
    const subjectId = parseInt(value);
    setSelectedSubject(subjectId);

    // Auto-fill weekly hours from grade_subjects
    const gradeSubject = gradeSubjects.find((gs: GradeSubject) => gs.subject_id === subjectId);
    if (gradeSubject) {
      setWeeklyHours(gradeSubject.weekly_hours);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedClass || !selectedSubject || weeklyHours <= 0) {
      toast({
        title: 'Xəta',
        description: 'Zəhmət olmasa bütün sahələri doldurun',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await workloadService.createTeachingLoad({
        teacher_id: teacherId,
        subject_id: selectedSubject,
        class_id: selectedClass,
        weekly_hours: weeklyHours,
        academic_year_id: academicYearId
      });

      toast({
        title: 'Uğurla Əlavə Edildi',
        description: `${teacherName} üçün dərs yükü əlavə edildi`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
      queryClient.invalidateQueries({ queryKey: ['workload-statistics'] });

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
                {gradeSubjects.map((gs: GradeSubject) => (
                  <SelectItem key={gs.subject_id} value={gs.subject_id.toString()}>
                    {gs.subject_name} ({gs.weekly_hours} saat/həftə)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {gradeSubjectsLoading && selectedClass && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sinif fənnləri yüklənir...
              </div>
            )}
          </div>

          {/* Weekly Hours */}
          <div className="grid gap-2">
            <Label htmlFor="hours">Həftəlik Saat Sayı *</Label>
            <Input
              id="hours"
              type="number"
              placeholder="Həftəlik saat sayı"
              min="1"
              max="40"
              value={weeklyHours || ''}
              onChange={(e) => setWeeklyHours(parseInt(e.target.value) || 0)}
              disabled={!selectedSubject}
            />
            {weeklyHours > 0 && (
              <p className="text-xs text-muted-foreground">
                {weeklyHours} saat/həftə = {weeklyHours * 4} saat/ay (təxmini)
              </p>
            )}
          </div>

          {/* Validation warning */}
          {!teacherSubjects || teacherSubjects.length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Bu müəllim üçün heç bir fənn təyin edilməyib. Zəhmət olmasa əvvəlcə müəllimə fənn təyin edin.
              </AlertDescription>
            </Alert>
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
            disabled={isSubmitting || !teacherSubjects || teacherSubjects.length === 0}
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
