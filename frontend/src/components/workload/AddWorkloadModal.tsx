import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EDUCATION_TYPE_LABELS, EducationType } from '@/types/curriculum';
import { Grade } from '@/services/grades';

// Hook
import { useAddWorkload } from './hooks/useAddWorkload';

interface AddWorkloadModalProps {
  teacherId: number;
  teacherName: string;
  institutionId?: number;
  academicYearId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddWorkloadModal(props: AddWorkloadModalProps) {
  const {
    selectedClass,
    selectedSubjectKey,
    weeklyHours,
    isSubmitting,
    submitError,
    autoSelectedInfo,
    masterPlanLoading,
    filteredGradesLoading,
    teacherSubjects,
    teacherSubjectsLoading,
    teacherSubjectsList,
    otherSubjectsList,
    availableGrades,
    relevantExistingLoads,
    isSubjectAlreadyAssigned,
    existingLoads,
    handleSubjectChange,
    handleClassChange,
    handleSubmit
  } = useAddWorkload(props);

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Dərs Yükü Əlavə Et</DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{props.teacherName}</span> müəllimi üçün yeni dərs yükü əlavə edin
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {submitError && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {autoSelectedInfo && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{autoSelectedInfo}</AlertDescription>
            </Alert>
          )}

          {teacherSubjects && teacherSubjects.length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Müəllimin Fənnləri:</p>
              <div className="flex flex-wrap gap-2">
                {teacherSubjects.map((ts: any) => (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Fənn *</Label>
              <Select value={selectedSubjectKey} onValueChange={handleSubjectChange} disabled={masterPlanLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={masterPlanLoading ? "Yüklənir..." : "Fənn seçin"} />
                </SelectTrigger>
                <SelectContent>
                  {teacherSubjectsList.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50">Müəllimin Fənnləri</div>
                      {teacherSubjectsList.map((gs: any) => (
                        <SelectItem key={`${gs.subject_id}_${gs.education_type}`} value={`${gs.subject_id}_${gs.education_type}`}>
                          <span>{gs.subject_name} ({EDUCATION_TYPE_LABELS[gs.education_type as EducationType] || gs.education_type})</span>
                          <span className="text-xs text-emerald-600 ml-2">✓</span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {otherSubjectsList.length > 0 && (
                    <>
                      {teacherSubjectsList.length > 0 && <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 mt-1">Digər Fənnləri</div>}
                      {otherSubjectsList.map((gs: any) => (
                        <SelectItem key={`${gs.subject_id}_${gs.education_type}`} value={`${gs.subject_id}_${gs.education_type}`}>
                          <span>{gs.subject_name} ({EDUCATION_TYPE_LABELS[gs.education_type as EducationType] || gs.education_type})</span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="class">Sinif *</Label>
              <Select value={selectedClass?.toString() || ''} onValueChange={handleClassChange} disabled={filteredGradesLoading || !selectedSubjectKey || availableGrades.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!selectedSubjectKey ? "Əvvəlcə Fənn seçin..." : filteredGradesLoading ? "Yüklənir..." : availableGrades.length === 0 ? "Sinif tapılmadı" : "Sinif seçin"} />
                </SelectTrigger>
                <SelectContent>
                  {availableGrades.map((grade: Grade) => {
                    const isAssigned = existingLoads.some(l => l.class_id === grade.id && `${l.subject_id}_${l.education_type || 'umumi'}` === selectedSubjectKey);
                    return (
                      <SelectItem key={grade.id} value={grade.id.toString()} disabled={isAssigned}>
                        {grade.full_name?.trim() || grade.name} {isAssigned ? "(Təyin edilib)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Həftəlik Saat</Label>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg h-12">
                <div className="text-xl font-bold text-primary">{weeklyHours > 0 ? weeklyHours : '-'}</div>
                <div className="text-xs text-muted-foreground flex flex-col justify-center">
                  <span>saat/həftə</span>
                  {weeklyHours > 0 && <span>({weeklyHours * 4} saat/ay)</span>}
                </div>
              </div>
            </div>

            {relevantExistingLoads.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">Mövcud Təyinatlar ({relevantExistingLoads.length})</span>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto scrollbar-thin">
                  {relevantExistingLoads.slice(0, 4).map((load: any) => (
                    <div key={load.id} className="text-xs text-blue-700 flex justify-between">
                      <span className="font-semibold">{load.class_name}</span> 
                      <span>{load.weekly_hours}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={props.onClose} disabled={isSubmitting}>Ləğv Et</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedClass || !selectedSubjectKey || weeklyHours <= 0 || isSubjectAlreadyAssigned}>
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Əlavə Edilir...</> : 'Əlavə Et'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
