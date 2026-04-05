/**
 * RegionTeacherImportModal - Enhanced Import/Export Modal with Pre-Validation
 * Phase 6: Advanced UI with wizard-based import flow
 *
 * Features:
 * - Multi-step wizard (File Upload → Validation → Strategy → Import → Results)
 * - Pre-validation before import (Phase 1)
 * - Detailed error preview with suggestions
 * - Error export to Excel (Phase 3)
 * - Skip errors strategy (Phase 4)
 * - Real-time progress tracking
 */

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Info,
  FileText,
  Clock,
  ChevronRight,
  ChevronLeft,
  FileDown,
  Search,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  teacherImportService,
  type ValidationResult,
  type ImportStrategy
} from '@/services/teachers';

interface RegionTeacherImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WizardStep = 'upload' | 'validation' | 'strategy' | 'import' | 'results';

export const RegionTeacherImportModal: React.FC<RegionTeacherImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>('strict');
  const [importResult, setImportResult] = useState<any>(null);

  // Options
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);

  // Progress tracking
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileSizeMB, setFileSizeMB] = useState(0);
  const [estimatedRows, setEstimatedRows] = useState(0);

  // Validation mutation (Phase 1)
  const validateMutation = useMutation({
    mutationFn: (file: File) => teacherImportService.validateImportFile(file),
    onSuccess: (result) => {
      setValidationResult(result);
      setCurrentStep('validation');

      if (result.summary.invalid_rows === 0) {
        toast({
          title: '✅ Fayl düzgündür',
          description: `${result.summary.valid_rows} sətir validdir və idxal üçün hazırdır`,
        });
      } else {
        toast({
          title: '⚠️ Xətalar aşkar edildi',
          description: `${result.summary.invalid_rows} sətirdə xəta var. Təfərrüatları yoxlayın`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Doğrulama xətası',
        description: error.message || 'Faylı doğrulayarkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Error export mutation (Phase 3)
  const exportErrorsMutation = useMutation({
    mutationFn: () => {
      if (!validationResult) throw new Error('Validation result yoxdur');
      return teacherImportService.exportValidationErrors(validationResult);
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teacher_import_errors_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Uğurlu',
        description: 'Xəta faylı yükləndi. Excel-də açaraq düzəliş edə bilərsiniz.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Xəta faylını export edərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Import mutation (Phase 4 - with strategy support)
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      return teacherImportService.importTeachers(file, {
        skip_duplicates: skipDuplicates,
        update_existing: updateExisting,
        strategy: importStrategy,
        onUploadProgress: (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setUploadProgress(percent);
        },
      });
    },
    onSuccess: (result) => {
      setImportResult(result);
      setCurrentStep('results');
      queryClient.invalidateQueries({ queryKey: ['regionadmin-teachers'] });

      if (result.imported > 0) {
        toast({
          title: 'İdxal tamamlandı',
          description: `${result.imported} müəllim uğurla idxal edildi${
            result.errors > 0 ? `, ${result.errors} xətalı sətir ötürüldü` : ''
          }`,
        });
      } else {
        toast({
          title: 'Xəbərdarlıq',
          description: 'Heç bir müəllim idxal edilmədi',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'İdxal xətası',
        description: error.message || 'Müəllimləri idxal edərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Download template handler
  const handleDownloadTemplate = async () => {
    try {
      const templateBlob = await teacherImportService.downloadImportTemplate();
      const url = window.URL.createObjectURL(templateBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teacher_import_template_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Uğurlu',
        description: 'Şablon yükləndi',
      });
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: error.message || 'Şablonu yükləyərkən xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  // Handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: 'Fayl çox böyükdür',
          description: `Maksimum fayl ölçüsü: 10MB`,
          variant: 'destructive',
        });
        return;
      }

      const sizeMB = file.size / 1024 / 1024;
      const estimatedRowCount = Math.floor(file.size / 250);

      setSelectedFile(file);
      setFileSizeMB(sizeMB);
      setEstimatedRows(estimatedRowCount);
      setValidationResult(null);
      setImportResult(null);
    }
  };

  const handleValidate = () => {
    if (!selectedFile) {
      toast({
        title: 'Xəta',
        description: 'Zəhmət olmasa fayl seçin',
        variant: 'destructive',
      });
      return;
    }
    validateMutation.mutate(selectedFile);
  };

  const handleImport = () => {
    if (!selectedFile) return;
    setCurrentStep('import');
    importMutation.mutate(selectedFile);
  };

  const handleClose = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setValidationResult(null);
    setImportResult(null);
    setImportStrategy('strict');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const canProceedToImport =
    validationResult &&
    (validationResult.summary.invalid_rows === 0 ||
     validationResult.summary.can_proceed_with_skip);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Müəllim İdxalı (Təkmilləşdirilmiş)
          </DialogTitle>
          <DialogDescription>
            Excel faylını əvvəlcədən yoxlayın, xətaları düzəldin və idxal edin
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg">
          {['upload', 'validation', 'strategy', 'import', 'results'].map((step, idx) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-2 ${
                currentStep === step ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}>
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                  currentStep === step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  {idx + 1}
                </div>
                <span className="text-xs hidden sm:inline">
                  {step === 'upload' && 'Yüklə'}
                  {step === 'validation' && 'Yoxla'}
                  {step === 'strategy' && 'Strategiya'}
                  {step === 'import' && 'İdxal'}
                  {step === 'results' && 'Nəticə'}
                </span>
              </div>
              {idx < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>

        <Tabs value={currentStep === 'results' ? 'import' : 'import'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">İdxal</TabsTrigger>
            <TabsTrigger value="export">İxrac</TabsTrigger>
          </TabsList>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="space-y-4">
            {/* STEP 1: UPLOAD */}
            {currentStep === 'upload' && (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">✨ Yeni: Əvvəlcədən Yoxlama (Pre-Validation)</p>
                      <p className="text-sm">
                        Excel faylınız idxaldan əvvəl yoxlanılacaq və xətalar haqqında detallı məlumat veriləcək.
                        Xətalı sətirləri düzəltmək üçün Excel fayl export edə bilərsiniz.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">1. Excel Şablon Faylı</CardTitle>
                    <CardDescription>
                      Excel şablon faylını yükləyin və müəllim məlumatlarını doldurun
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      onClick={handleDownloadTemplate}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Excel Şablon Yüklə (.xlsx)
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">2. İdxal Seçimləri</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="skip-duplicates"
                        checked={skipDuplicates}
                        onCheckedChange={(checked) => setSkipDuplicates(!!checked)}
                      />
                      <Label htmlFor="skip-duplicates" className="text-sm cursor-pointer">
                        Təkrarlananları keç
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="update-existing"
                        checked={updateExisting}
                        onCheckedChange={(checked) => setUpdateExisting(!!checked)}
                        disabled={skipDuplicates}
                      />
                      <Label
                        htmlFor="update-existing"
                        className={`text-sm ${skipDuplicates ? 'opacity-50' : 'cursor-pointer'}`}
                      >
                        Mövcud müəllimləri yenilə
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">3. Excel Fayl Yüklə və Yoxla</CardTitle>
                    <CardDescription>
                      Doldurulmuş Excel faylını seçin və əvvəlcə yoxlayın
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="flex-1 text-sm w-full"
                    />

                    {selectedFile && (
                      <Alert className="bg-blue-50 border-blue-200">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <AlertDescription>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium">Fayl:</span>
                              <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
                            </div>
                            <div>
                              <span className="font-medium">Ölçü:</span>
                              <p className="text-xs text-muted-foreground">{fileSizeMB.toFixed(2)} MB</p>
                            </div>
                            <div>
                              <span className="font-medium">Təxmini sətir:</span>
                              <p className="text-xs text-muted-foreground">~{estimatedRows} müəllim</p>
                            </div>
                            <div>
                              <span className="font-medium">Yoxlama vaxtı:</span>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                ~{Math.ceil(estimatedRows / 100)} saniyə
                              </p>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handleValidate}
                      disabled={!selectedFile || validateMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {validateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Yoxlanılır...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Faylı Yoxla (Pre-Validation)
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* STEP 2: VALIDATION RESULTS */}
            {currentStep === 'validation' && validationResult && (
              <>
                {/* Summary Card */}
                <Card className={
                  validationResult.summary.invalid_rows === 0
                    ? 'border-green-200 bg-green-50'
                    : 'border-amber-200 bg-amber-50'
                }>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {validationResult.summary.invalid_rows === 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      )}
                      Yoxlama Nəticəsi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{validationResult.summary.total_rows}</p>
                        <p className="text-xs text-muted-foreground">Cəmi sətir</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {validationResult.summary.valid_rows}
                        </p>
                        <p className="text-xs text-muted-foreground">Düzgün</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {validationResult.summary.invalid_rows}
                        </p>
                        <p className="text-xs text-muted-foreground">Xətalı</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {validationResult.summary.valid_percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Düzgünlük</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Suggestions */}
                {validationResult.suggestions.length > 0 && (
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Tövsiyyələr</AlertTitle>
                    <AlertDescription>
                      <ScrollArea className="h-24 mt-2">
                        <ul className="space-y-1 text-sm">
                          {validationResult.suggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error Groups */}
                {Object.keys(validationResult.error_groups).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Xəta Qrupları</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(validationResult.error_groups).map(([group, count]) => (
                          <div key={group} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                            <span className="text-xs">{group}</span>
                            <Badge variant="destructive">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top 10 Errors Preview */}
                {validationResult.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Xətalar (İlk 10)</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportErrorsMutation.mutate()}
                          disabled={exportErrorsMutation.isPending}
                        >
                          {exportErrorsMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <FileDown className="h-3 w-3 mr-1" />
                              Xətaları Export Et
                            </>
                          )}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {validationResult.errors.slice(0, 10).map((error, idx) => (
                            <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                              <div className="flex items-start gap-2">
                                <Badge variant="destructive" className="text-[10px]">
                                  Sətir {error.row_number}
                                </Badge>
                                <div className="flex-1">
                                  <p className="font-medium">{error.field}: {error.message}</p>
                                  {error.value && (
                                    <p className="text-muted-foreground mt-1">Dəyər: {error.value}</p>
                                  )}
                                  {error.suggestion && (
                                    <p className="text-blue-600 mt-1">💡 {error.suggestion}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {validationResult.errors.length > 10 && (
                            <p className="text-center text-xs text-muted-foreground py-2">
                              ... və daha {validationResult.errors.length - 10} xəta
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('upload')}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Geri
                  </Button>

                  {canProceedToImport && (
                    <Button
                      onClick={() => setCurrentStep('strategy')}
                      className="flex-1"
                    >
                      Növbəti: Strategiya seç
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* STEP 3: STRATEGY SELECTION */}
            {currentStep === 'strategy' && validationResult && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>İdxal Strategiyası Seçin</CardTitle>
                    <CardDescription>
                      Xətalı sətirlərlə necə davranmaq istədiyinizi seçin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup value={importStrategy} onValueChange={(v) => setImportStrategy(v as ImportStrategy)}>
                      {/* Strict Strategy */}
                      <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="strict" id="strict" className="mt-1" />
                        <Label htmlFor="strict" className="flex-1 cursor-pointer">
                          <div className="font-medium">Strict (Dəqiq) ⚠️</div>
                          <p className="text-sm text-muted-foreground mt-1">
                            İlk xəta tapıldıqda idxal dayanar. Bütün sətirlərin düzgün olmasını tələb edir.
                          </p>
                          <Badge variant="secondary" className="mt-2">
                            Tövsiyə edilmir (xətalar varsa)
                          </Badge>
                        </Label>
                      </div>

                      {/* Skip Errors Strategy */}
                      <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="skip_errors" id="skip_errors" className="mt-1" />
                        <Label htmlFor="skip_errors" className="flex-1 cursor-pointer">
                          <div className="font-medium">Skip Errors (Xətaları ötür) ✅</div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Xətalı sətirlər ötürülür, yalnız düzgün sətirler idxal edilir.
                            Xətalı sətirləri sonra düzəldib yenidən yükləyə bilərsiniz.
                          </p>
                          {validationResult.summary.invalid_rows > 0 && (
                            <Alert className="mt-2">
                              <TrendingUp className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                {validationResult.summary.valid_rows} sətir idxal olunacaq,
                                {validationResult.summary.invalid_rows} sətir ötürüləcək
                              </AlertDescription>
                            </Alert>
                          )}
                          <Badge variant="default" className="mt-2">
                            Tövsiyə edilir
                          </Badge>
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                <div className="flex justify-between gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('validation')}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Geri
                  </Button>

                  <Button
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                    className="flex-1"
                    size="lg"
                  >
                    {importMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        İdxal edilir...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        İdxal Et ({importStrategy === 'skip_errors' ? `${validationResult.summary.valid_rows} sətir` : 'hamısı'})
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* STEP 4: IMPORT PROGRESS */}
            {currentStep === 'import' && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        İdxal prosesi davam edir...
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {uploadProgress}%
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      Müəllimlər database-ə əlavə edilir. Zəhmət olmasa gözləyin...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 5: RESULTS */}
            {currentStep === 'results' && importResult && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">İdxal Nəticəsi</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">İdxal edildi</p>
                          <p className="text-2xl font-bold text-green-600">
                            {importResult.imported}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="text-sm text-gray-600">Ötürüldü</p>
                          <p className="text-2xl font-bold text-amber-600">{importResult.errors}</p>
                        </div>
                      </div>
                    </div>

                    {importResult.errors > 0 && validationResult && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {importResult.errors} xətalı sətir ötürüldü. Xəta faylını export edərək düzəliş edə bilərsiniz.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={handleClose}>
                    Bağla
                  </Button>
                  <Button onClick={() => setCurrentStep('upload')}>
                    Yeni İdxal
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* EXPORT TAB */}
          <TabsContent value="export" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Export funksiyası hazırda aktiv filtrlərlə işləyir. Müəllimləri export etmək üçün
                əsas səhifədəki "Export" düyməsindən istifadə edin.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {currentStep === 'upload' && (
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Bağla
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
