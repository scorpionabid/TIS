import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Loader2,
  GraduationCap,
  Users,
  BookOpen,
  UserCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { academicYearService, AcademicYear } from '@/services/academicYears';
import {
  academicYearTransitionService,
  TransitionPreview,
  TransitionOptions,
  TransitionStatus,
} from '@/services/academicYearTransition';
import { useToast } from '@/hooks/use-toast';

interface AcademicYearTransitionWizardProps {
  institutionId: number;
  institutionName: string;
  onComplete?: () => void;
}

type WizardStep = 'year-selection' | 'configuration' | 'preview' | 'execution' | 'complete';

const STEPS: { id: WizardStep; title: string; description: string }[] = [
  { id: 'year-selection', title: 'İl Seçimi', description: 'Mənbə və hədəf tədris illərini seçin' },
  { id: 'configuration', title: 'Konfiqurasiya', description: 'Keçid parametrlərini təyin edin' },
  { id: 'preview', title: 'Nəzərdən Keçirmə', description: 'Dəyişiklikləri nəzərdən keçirin' },
  { id: 'execution', title: 'İcra', description: 'Keçidi icra edin' },
  { id: 'complete', title: 'Tamamlandı', description: 'Keçid nəticələri' },
];

export const AcademicYearTransitionWizard: React.FC<AcademicYearTransitionWizardProps> = ({
  institutionId,
  institutionName,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('year-selection');
  const [sourceYearId, setSourceYearId] = useState<number | null>(null);
  const [targetYearId, setTargetYearId] = useState<number | null>(null);
  const [options, setOptions] = useState<TransitionOptions>({
    copy_subjects: true,
    copy_teachers: false,
    promote_students: true,
    copy_homeroom_teachers: false,
    copy_subject_teachers: false,
    copy_teaching_loads: false,
    exclude_student_ids: [],
    retain_student_ids: [],
  });
  const [preview, setPreview] = useState<TransitionPreview | null>(null);
  const [transitionResult, setTransitionResult] = useState<TransitionStatus | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch academic years
  const { data: academicYears = [], isLoading: yearsLoading } = useQuery({
    queryKey: ['academic-years-dropdown'],
    queryFn: () => academicYearService.getAllForDropdown(),
  });

  // Set default years when loaded
  useEffect(() => {
    if (academicYears.length > 0 && !sourceYearId) {
      const activeYear = academicYears.find((y) => y.is_active);
      if (activeYear) {
        setSourceYearId(activeYear.id);
        // Find next year
        const activeIndex = academicYears.findIndex((y) => y.id === activeYear.id);
        if (activeIndex > 0) {
          setTargetYearId(academicYears[activeIndex - 1].id);
        }
      }
    }
  }, [academicYears, sourceYearId]);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: () =>
      academicYearTransitionService.preview(sourceYearId!, targetYearId!, institutionId, options),
    onSuccess: (data) => {
      setPreview(data);
      setCurrentStep('preview');
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Nəzərdən keçirmə xətası',
        variant: 'destructive',
      });
    },
  });

  // Initiate transition mutation
  const initiateMutation = useMutation({
    mutationFn: () =>
      academicYearTransitionService.initiate(sourceYearId!, targetYearId!, institutionId, options),
    onSuccess: (data) => {
      setTransitionResult(data);
      setCurrentStep('complete');
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Keçid xətası',
        description: error.response?.data?.message || 'Keçid zamanı xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const goNext = () => {
    if (currentStep === 'year-selection') {
      setCurrentStep('configuration');
    } else if (currentStep === 'configuration') {
      previewMutation.mutate();
    } else if (currentStep === 'preview') {
      setCurrentStep('execution');
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const executeTransition = () => {
    initiateMutation.mutate();
  };

  const canProceed = () => {
    if (currentStep === 'year-selection') {
      return sourceYearId && targetYearId && sourceYearId !== targetYearId;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  currentStepIndex > index
                    ? 'border-green-500 bg-green-500 text-white'
                    : currentStepIndex === index
                      ? 'border-primary bg-primary text-white'
                      : 'border-muted bg-background text-muted-foreground'
                }`}
              >
                {currentStepIndex > index ? <Check className="h-5 w-5" /> : index + 1}
              </div>
              <div className="ml-3 hidden md:block">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div className="mx-4 hidden flex-1 border-t border-muted md:block" />
            )}
          </React.Fragment>
        ))}
      </div>

      <Separator />

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStepIndex].title}</CardTitle>
          <CardDescription>{STEPS[currentStepIndex].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Year Selection */}
          {currentStep === 'year-selection' && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mənbə Tədris İli (Köhnə)</label>
                  <Select
                    value={sourceYearId?.toString()}
                    onValueChange={(v) => setSourceYearId(Number(v))}
                    disabled={yearsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Mənbə ili seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((year) => (
                        <SelectItem key={year.id} value={year.id.toString()}>
                          {year.name} {year.is_active && '(Aktiv)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Hədəf Tədris İli (Yeni)</label>
                  <Select
                    value={targetYearId?.toString()}
                    onValueChange={(v) => setTargetYearId(Number(v))}
                    disabled={yearsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hədəf ili seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears
                        .filter((y) => y.id !== sourceYearId)
                        .map((year) => (
                          <SelectItem key={year.id} value={year.id.toString()}>
                            {year.name} {year.is_active && '(Aktiv)'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Diqqət</AlertTitle>
                <AlertDescription>
                  Bu əməliyyat {institutionName} təşkilatı üçün seçilmiş tədris ilindəki bütün sinifləri,
                  şagirdləri və müəllim təyinatlarını yeni ilə keçirəcək.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Configuration */}
          {currentStep === 'configuration' && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="h-5 w-5" />
                      Sinif Konfiqurasiyası
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="copy_subjects"
                        checked={options.copy_subjects}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, copy_subjects: checked as boolean })
                        }
                      />
                      <label htmlFor="copy_subjects" className="text-sm">
                        Fənn konfiqurasiyalarını kopyala
                      </label>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5" />
                      Şagird Yüksəltmə
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="promote_students"
                        checked={options.promote_students}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, promote_students: checked as boolean })
                        }
                      />
                      <label htmlFor="promote_students" className="text-sm">
                        Şagirdləri növbəti sinifə yüksəlt
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bütün şagirdlər avtomatik yüksəldilir. 12-ci sinif şagirdləri məzun olur.
                    </p>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserCheck className="h-5 w-5" />
                      Müəllim Təyinatları
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="copy_homeroom_teachers"
                          checked={options.copy_homeroom_teachers}
                          onCheckedChange={(checked) =>
                            setOptions({ ...options, copy_homeroom_teachers: checked as boolean })
                          }
                        />
                        <label htmlFor="copy_homeroom_teachers" className="text-sm">
                          Sinif rəhbərlərini kopyala
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="copy_subject_teachers"
                          checked={options.copy_subject_teachers}
                          onCheckedChange={(checked) =>
                            setOptions({ ...options, copy_subject_teachers: checked as boolean })
                          }
                        />
                        <label htmlFor="copy_subject_teachers" className="text-sm">
                          Fənn müəllimlərini kopyala
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="copy_teaching_loads"
                          checked={options.copy_teaching_loads}
                          onCheckedChange={(checked) =>
                            setOptions({ ...options, copy_teaching_loads: checked as boolean })
                          }
                        />
                        <label htmlFor="copy_teaching_loads" className="text-sm">
                          Tədris yüklərini kopyala
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {currentStep === 'preview' && preview && (
            <div className="space-y-6">
              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <div className="space-y-2">
                  {preview.warnings.map((warning, index) => (
                    <Alert
                      key={index}
                      variant={warning.severity === 'error' ? 'destructive' : 'default'}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{warning.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Yaradılacaq Siniflər</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{preview.grades.to_create.length}</div>
                    {preview.grades.already_exist.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {preview.grades.already_exist.length} ədəd atlanacaq
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Yüksəldiləcək Şagirdlər</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{preview.students.to_promote}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Məzun Olacaq</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {preview.students.to_graduate}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Müəllim Təyinatları</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{preview.teachers.homeroom_count}</div>
                    <p className="text-xs text-muted-foreground">sinif rəhbəri</p>
                  </CardContent>
                </Card>
              </div>

              {/* Grade List */}
              {preview.grades.to_create.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Yaradılacaq Siniflər</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-60 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sinif</TableHead>
                            <TableHead>Şagird Sayı</TableHead>
                            <TableHead>İxtisas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.grades.to_create.map((grade) => (
                            <TableRow key={grade.id}>
                              <TableCell className="font-medium">{grade.full_name}</TableCell>
                              <TableCell>{grade.student_count}</TableCell>
                              <TableCell>{grade.specialty || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Execution */}
          {currentStep === 'execution' && (
            <div className="space-y-6">
              {initiateMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4 text-lg font-medium">Keçid icra edilir...</p>
                  <p className="text-sm text-muted-foreground">
                    Bu proses bir neçə dəqiqə çəkə bilər
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Son Təsdiq</AlertTitle>
                    <AlertDescription>
                      Bu əməliyyatı icra etmək istədiyinizdən əminsiniz? Bu əməliyyat 24 saat ərzində
                      geri qaytarıla bilər.
                    </AlertDescription>
                  </Alert>

                  <Button onClick={executeTransition} size="lg" className="mt-6">
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Keçidi İcra Et
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && transitionResult && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8">
                {transitionResult.status === 'completed' ? (
                  <>
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                    <h3 className="mt-4 text-xl font-bold">Keçid Uğurla Tamamlandı!</h3>
                  </>
                ) : (
                  <>
                    <XCircle className="h-16 w-16 text-red-500" />
                    <h3 className="mt-4 text-xl font-bold">Keçid Xətası</h3>
                    <p className="text-sm text-muted-foreground">{transitionResult.error_message}</p>
                  </>
                )}
              </div>

              {transitionResult.status === 'completed' && (
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Yaradılan Siniflər</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {transitionResult.summary.grades.created}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Yüksəldilən Şagirdlər</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {transitionResult.summary.students.promoted}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Məzun Olan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {transitionResult.summary.students.graduated}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Müəllim Təyinatları</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {transitionResult.summary.teachers.assignments_copied}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {transitionResult.can_rollback && (
                <Alert>
                  <RefreshCw className="h-4 w-4" />
                  <AlertTitle>Geri Qaytarma</AlertTitle>
                  <AlertDescription>
                    Bu keçidi 24 saat ərzində geri qaytara bilərsiniz.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center">
                <Button onClick={onComplete} size="lg">
                  Tamamla
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      {currentStep !== 'complete' && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStepIndex === 0 || initiateMutation.isPending}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Geri
          </Button>

          {currentStep !== 'execution' && (
            <Button
              onClick={goNext}
              disabled={!canProceed() || previewMutation.isPending}
            >
              {previewMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Yüklənir...
                </>
              ) : (
                <>
                  Davam Et
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AcademicYearTransitionWizard;
