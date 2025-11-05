import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, CheckCircle, ClipboardList, Layers3, Edit, Trash2, Download } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AssessmentResultField } from '@/services/assessmentTypes';
import { schoolAssessmentService, SchoolAssessment, ClassAssessmentResult, ClassResultPayload } from '@/services/schoolAssessments';
import { gradeService, Grade } from '@/services/grades';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoSave } from '@/hooks/useAutoSave';

const defaultClassForm: ClassResultPayload = {
  class_label: '',
  grade_level: '',
  subject: '',
  student_count: undefined,
  participant_count: undefined,
  results: {},
};

export default function AssessmentEntry() {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [classForm, setClassForm] = useState<ClassResultPayload>(defaultClassForm);
  const [activeTab, setActiveTab] = useState<'form' | 'results'>('form');
  const [editingResultId, setEditingResultId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resultToDelete, setResultToDelete] = useState<ClassAssessmentResult | null>(null);
  const [showDraftRecoveryDialog, setShowDraftRecoveryDialog] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasRole, currentUser } = useAuth();

  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['school-assessments'],
    queryFn: () => schoolAssessmentService.getAssessments({ per_page: 50 }),
    staleTime: 1000 * 60 * 5,
  });

  const sessions: SchoolAssessment[] = useMemo(() => {
    const raw = sessionsData?.data ?? sessionsData;
    return Array.isArray(raw) ? raw : raw?.data ?? [];
  }, [sessionsData]);

  // Fetch grades for the institution
  const { data: gradesData, isLoading: gradesLoading } = useQuery({
    queryKey: ['grades', currentUser?.institution?.id],
    queryFn: async () => {
      if (!currentUser?.institution?.id) return null;
      const response = await gradeService.getGrades({ institution_id: currentUser.institution.id });
      return response.data;
    },
    enabled: !!currentUser?.institution?.id && !!selectedSessionId,
    staleTime: 1000 * 60 * 5,
  });

  const grades: Grade[] = useMemo(() => {
    return Array.isArray(gradesData) ? gradesData : [];
  }, [gradesData]);

  // Fetch subjects for selected grade
  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ['grade-subjects', selectedGradeId],
    queryFn: async () => {
      if (!selectedGradeId) return null;
      const { apiClient } = await import('@/services/api');
      const response = await apiClient.get(`/grades/${selectedGradeId}/subjects`);
      return response.data?.data ?? response.data ?? response;
    },
    enabled: !!selectedGradeId,
    staleTime: 1000 * 60 * 5,
  });

  const subjects = useMemo(() => {
    if (!subjectsData) return [];
    return Array.isArray(subjectsData) ? subjectsData : [];
  }, [subjectsData]);

  const { data: selectedSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['school-assessment', selectedSessionId],
    queryFn: () => schoolAssessmentService.getAssessment(selectedSessionId!),
    enabled: !!selectedSessionId,
  });

  const resultFields: AssessmentResultField[] = useMemo(
    () => selectedSession?.assessment_type?.result_fields ?? [],
    [selectedSession]
  );

  const initializeClassForm = useCallback(() => {
    const baseResults: Record<string, any> = {};
    resultFields.forEach(field => {
      baseResults[field.field_key] = '';
    });
    setClassForm({ ...defaultClassForm, results: baseResults });
  }, [resultFields]);

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  useEffect(() => {
    if (selectedSessionId && !sessionLoading) {
      initializeClassForm();
    }
  }, [selectedSessionId, sessionLoading, initializeClassForm]);

  // Auto-save setup
  const autoSaveKey = `assessment-entry-draft-${selectedSessionId}-${currentUser?.id}`;

  const { saveNow, clearSavedData, getSavedData } = useAutoSave({
    key: autoSaveKey,
    data: {
      classForm,
      selectedGradeId,
      editingResultId,
    },
    interval: 30000, // 30 seconds
    enabled: !!selectedSessionId && activeTab === 'form',
    onSave: () => {
      setLastAutoSaveTime(new Date());
    },
  });

  // Check for draft data on mount
  useEffect(() => {
    if (!selectedSessionId) return;

    const savedDraft = getSavedData();
    if (savedDraft && savedDraft.data) {
      const timeSinceLastSave = Date.now() - (savedDraft.timestamp || 0);
      const fiveMinutes = 5 * 60 * 1000;

      // Only show recovery dialog if draft is less than 5 minutes old
      if (timeSinceLastSave < fiveMinutes) {
        setShowDraftRecoveryDialog(true);
      } else {
        clearSavedData();
      }
    }
  }, [selectedSessionId, getSavedData, clearSavedData]);

  const handleRecoverDraft = () => {
    const savedDraft = getSavedData();
    if (savedDraft?.data) {
      setClassForm(savedDraft.data.classForm || defaultClassForm);
      setSelectedGradeId(savedDraft.data.selectedGradeId || null);
      setEditingResultId(savedDraft.data.editingResultId || null);
      toast({
        title: 'Draft bərpa edildi',
        description: 'Tamamlanmamış data bərpa olundu.',
      });
    }
    setShowDraftRecoveryDialog(false);
  };

  const handleDiscardDraft = () => {
    clearSavedData();
    setShowDraftRecoveryDialog(false);
    toast({
      title: 'Draft silindi',
      description: 'Tamamlanmamış data silindi.',
    });
  };

  const handleClassFormChange = (key: keyof ClassResultPayload, value: any) => {
    setClassForm(prev => ({ ...prev, [key]: value }));
  };

  const handleResultChange = (fieldKey: string, value: any) => {
    setClassForm(prev => ({
      ...prev,
      results: {
        ...prev.results,
        [fieldKey]: value,
      }
    }));
  };

  const handleSaveResults = async () => {
    if (!selectedSessionId) return;
    const payload: ClassResultPayload = {
      class_label: classForm.class_label,
      grade_level: classForm.grade_level || undefined,
      subject: classForm.subject || undefined,
      student_count: classForm.student_count ? Number(classForm.student_count) : undefined,
      participant_count: classForm.participant_count ? Number(classForm.participant_count) : undefined,
      results: classForm.results,
    };

    if (!payload.class_label?.trim()) {
      toast({ title: 'Məlumat çatışmır', description: 'Sinif etiketi mütləqdir', variant: 'destructive' });
      return;
    }

    try {
      await schoolAssessmentService.saveClassResult(selectedSessionId, payload);
      toast({ title: 'Yadda saxlanıldı', description: `${payload.class_label} nəticələri saxlanıldı.` });
      queryClient.invalidateQueries({ queryKey: ['school-assessment', selectedSessionId] });
      clearSavedData(); // Clear draft after successful save
      setActiveTab('results');
      initializeClassForm();
      setEditingResultId(null);
      setSelectedGradeId(null);
    } catch (err: any) {
      toast({ title: 'Xəta', description: err.message || 'Nəticələr saxlanılmadı.', variant: 'destructive' });
    }
  };

  const handleCompleteAssessment = async () => {
    if (!selectedSessionId) return;
    try {
      await schoolAssessmentService.completeAssessment(selectedSessionId);
      toast({ title: 'Tamamlandı', description: 'Qiymətləndirmə statusu yeniləndi.' });
      queryClient.invalidateQueries({ queryKey: ['school-assessment', selectedSessionId] });
      refetchSessions();
    } catch (err: any) {
      toast({ title: 'Xəta', description: err.message || 'Status yenilənmədi.', variant: 'destructive' });
    }
  };

  const handleEditResult = (result: ClassAssessmentResult) => {
    // Find the grade that matches the result
    const matchingGrade = grades.find(g => g.name === result.class_label);
    if (matchingGrade) {
      setSelectedGradeId(matchingGrade.id);
    }

    setEditingResultId(result.id);
    setClassForm({
      class_label: result.class_label,
      grade_level: result.grade_level ?? '',
      subject: result.subject ?? '',
      student_count: result.student_count ?? undefined,
      participant_count: result.participant_count ?? undefined,
      results: result.metadata ?? {},
    });
    setActiveTab('form');
    toast({ title: 'Redaktə rejimi', description: 'Nəticəni redaktə edin və yenidən saxlayın.' });
  };

  const handleDeleteClick = (result: ClassAssessmentResult) => {
    setResultToDelete(result);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSessionId || !resultToDelete) return;

    try {
      await schoolAssessmentService.deleteClassResult(selectedSessionId, resultToDelete.id);
      toast({ title: 'Silindi', description: 'Nəticə uğurla silindi.' });
      queryClient.invalidateQueries({ queryKey: ['school-assessment', selectedSessionId] });
      setDeleteDialogOpen(false);
      setResultToDelete(null);
    } catch (err: any) {
      toast({ title: 'Xəta', description: err.message || 'Nəticə silinmədi.', variant: 'destructive' });
    }
  };

  const handleExport = async () => {
    if (!selectedSessionId) return;

    setIsExporting(true);
    try {
      const blob = await schoolAssessmentService.exportToExcel(selectedSessionId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename
      const assessment = sessions.find(s => s.id === selectedSessionId);
      const fileName = `${assessment?.assessment_type?.name || 'Qiymetlendirme'}_${assessment?.stage?.name || 'Merhele'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.setAttribute('download', fileName);

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: 'Excel yükləndi', description: 'Nəticələr uğurla Excel faylına köçürüldü.' });
    } catch (err: any) {
      toast({ title: 'Xəta', description: err.message || 'Excel yüklənmədi.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const classResults: ClassAssessmentResult[] = selectedSession?.class_results ?? [];

  // Validation errors
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    // Check if participant count exceeds student count
    const studentCount = Number(classForm.student_count) || 0;
    const participantCount = Number(classForm.participant_count) || 0;

    if (participantCount > studentCount && studentCount > 0) {
      errors.participant_count = 'İştirakçı sayı şagird sayından çox ola bilməz';
    }

    // Check required result fields
    resultFields.forEach(field => {
      if (field.is_required && !classForm.results[field.field_key]) {
        errors[field.field_key] = `${field.label} tələb olunur`;
      }
    });

    return errors;
  }, [classForm, resultFields]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">

      <Card>
        <CardHeader>
          <CardTitle>Qiymətləndirmə seçimi</CardTitle>
          <CardDescription>Nəticə daxil etmək üçün qiymətləndirməni seçin.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-2">
              <Label>Qiymətləndirmə</Label>
              <Select
                value={selectedSessionId?.toString() ?? ''}
                onValueChange={(value) => setSelectedSessionId(Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Qiymətləndirmə seçin" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(session => {
                    const title = session.generated_title || session.title || session.assessment_type?.name || 'Qiymətləndirmə';
                    const date = session.scheduled_date
                      ? ` (${new Date(session.scheduled_date).toLocaleDateString('az-AZ')})`
                      : '';
                    return (
                      <SelectItem key={session.id} value={session.id.toString()}>
                        {title + date}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Qiymətləndirmə tapılmadı. Zəhmət olmasa əvvəlcə "Məktəb Qiymətləndirmə Sistemi" səhifəsindən qiymətləndirmə yaradın.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSessionId && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="form" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Nəticə formu
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Layers3 className="h-4 w-4" />
              Daxil edilmiş nəticələr
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Sinif nəticələrinin daxil edilməsi</CardTitle>
                <CardDescription>Seçilmiş qiymətləndirmə üçün nəticələri qeyd edin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sessionLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Sinif *</Label>
                        <Select
                          value={selectedGradeId?.toString() ?? ''}
                          onValueChange={(value) => {
                            const gradeId = Number(value);
                            setSelectedGradeId(gradeId);
                            const selectedGrade = grades.find(g => g.id === gradeId);
                            if (selectedGrade) {
                              handleClassFormChange('class_label', selectedGrade.name);
                              handleClassFormChange('grade_level', selectedGrade.class_level.toString());
                              // Avtomatik olaraq database-dəki şagird sayını daxil et
                              handleClassFormChange('student_count', selectedGrade.student_count ?? 0);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={gradesLoading ? "Yüklənir..." : "Sinif seçin"} />
                          </SelectTrigger>
                          <SelectContent>
                            {grades.length > 0 ? (
                              grades.map(grade => (
                                <SelectItem key={grade.id} value={grade.id.toString()}>
                                  {grade.display_name || grade.full_name || grade.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_grades" disabled>
                                Sinif tapılmadı
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Fənn *</Label>
                        <Select
                          value={classForm.subject ?? ''}
                          onValueChange={(value) => handleClassFormChange('subject', value)}
                          disabled={!selectedGradeId || subjectsLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedGradeId ? "Əvvəl sinif seçin" :
                              subjectsLoading ? "Yüklənir..." :
                              "Fənn seçin"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.length > 0 ? (
                              subjects.map((subj: any) => (
                                <SelectItem key={subj.subject_id || subj.id} value={subj.subject_name || subj.name}>
                                  {subj.subject_name || subj.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_subjects" disabled>
                                Bu sinif üçün fənn tapılmadı
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Şagird sayı</Label>
                        <Input
                          type="number"
                          min={0}
                          value={classForm.student_count ?? ''}
                          onChange={(e) => handleClassFormChange('student_count', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>İştirakçı sayı</Label>
                        <Input
                          type="number"
                          min={0}
                          value={classForm.participant_count ?? ''}
                          onChange={(e) => handleClassFormChange('participant_count', e.target.value)}
                          className={validationErrors.participant_count ? 'border-destructive' : ''}
                        />
                        {validationErrors.participant_count && (
                          <p className="text-xs text-destructive mt-1">{validationErrors.participant_count}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resultFields.map(field => (
                        <div key={field.id}>
                          <Label>
                            {field.label}
                            {field.is_required && <span className="text-destructive"> *</span>}
                          </Label>
                          <Input
                            type={field.input_type === 'text' ? 'text' : 'number'}
                            value={classForm.results[field.field_key] ?? ''}
                            onChange={(e) => handleResultChange(field.field_key, e.target.value)}
                            placeholder={field.scope === 'overall' ? 'Ümumi göstərici' : 'Sinif üzrə dəyər'}
                            className={validationErrors[field.field_key] ? 'border-destructive' : ''}
                          />
                          {validationErrors[field.field_key] && (
                            <p className="text-xs text-destructive mt-1">{validationErrors[field.field_key]}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {hasValidationErrors && (
                      <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                        Formu saxlamaq üçün bütün tələb olunan sahələri doldurun və xətaları düzəldin.
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" onClick={initializeClassForm}>Təmizlə</Button>
                      <Button onClick={handleSaveResults} disabled={hasValidationErrors}>
                        <Save className="h-4 w-4 mr-2" /> Saxla
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="pt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daxil edilmiş nəticələr</CardTitle>
                    <CardDescription>Siniflər üzrə daxil edilən bütün göstəricilər.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {classResults.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={isExporting}
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Yüklənir...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Excel-ə köçür
                          </>
                        )}
                      </Button>
                    )}
                    {hasRole(['superadmin', 'regionadmin', 'schooladmin']) && (
                      <Button variant="outline" onClick={handleCompleteAssessment}>
                        <CheckCircle className="h-4 w-4 mr-2" /> Tamamlandı kimi işarələ
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {sessionLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : classResults.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Hələ nəticə daxil edilməyib.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sinif</TableHead>
                          <TableHead>Fənn</TableHead>
                          <TableHead>Şagird / İştirak</TableHead>
                          {resultFields.map(field => (
                            <TableHead key={field.id}>{field.label}</TableHead>
                          ))}
                          <TableHead>Tarix</TableHead>
                          <TableHead className="text-right">Əməliyyatlar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classResults.map(result => (
                          <TableRow key={result.id}>
                            <TableCell>
                              <div className="font-semibold">{result.class_label}</div>
                              <div className="text-sm text-muted-foreground">{result.grade_level || '—'}</div>
                            </TableCell>
                            <TableCell>{result.subject || '—'}</TableCell>
                            <TableCell>
                              {result.student_count ?? '—'} / {result.participant_count ?? '—'}
                            </TableCell>
                            {resultFields.map(field => (
                              <TableCell key={`${result.id}-${field.field_key}`}>
                                {result.metadata?.[field.field_key] ?? '—'}
                              </TableCell>
                            ))}
                            <TableCell>{result.recorded_at ? new Date(result.recorded_at).toLocaleString('az-AZ', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditResult(result)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(result)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nəticəni silmək istədiyinizdən əminsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu əməliyyat geri qaytarıla bilməz. {resultToDelete?.class_label} - {resultToDelete?.subject} nəticəsi silinəcək.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ləğv et</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Draft Recovery Dialog */}
      <AlertDialog open={showDraftRecoveryDialog} onOpenChange={setShowDraftRecoveryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tamamlanmamış data tapıldı</AlertDialogTitle>
            <AlertDialogDescription>
              Əvvəllər tamamlanmamış qiymətləndirmə data-sı tapıldı. Bərpa etmək istəyirsiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft}>Xeyr, sil</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecoverDraft}>
              Bəli, bərpa et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-save Indicator */}
      {lastAutoSaveTime && activeTab === 'form' && (
        <div className="fixed bottom-4 right-4 bg-primary/10 text-primary text-xs px-3 py-2 rounded-md shadow-md flex items-center gap-2">
          <CheckCircle className="h-3 w-3" />
          Avtomatik saxlanıldı: {lastAutoSaveTime.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

    </div>
  );
}
