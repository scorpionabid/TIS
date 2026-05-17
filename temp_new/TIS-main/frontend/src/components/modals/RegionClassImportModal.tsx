import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download, Table as TableIcon, Filter, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { regionAdminClassService, ClassImportResult, ImportError, ImportProgress } from '@/services/regionadmin/classes';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ImportProgressBar } from '@/components/common/ImportProgressBar';
import { EnhancedErrorDisplay } from '@/components/common/EnhancedErrorDisplay';
import { FilePreviewModal } from '@/components/common/FilePreviewModal';
import { toast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';

interface RegionClassImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegionClassImportModal: React.FC<RegionClassImportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ClassImportResult | null>(null);
  const [importError, setImportError] = useState<{ message: string; details: string[] } | null>(null);

  // Progress tracking state
  const [importSessionId, setImportSessionId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [isDownloadingCsvTemplate, setIsDownloadingCsvTemplate] = useState(false);

  // File preview state
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (file: File) => regionAdminClassService.importClasses(file),
    onSuccess: (result) => {
      // Extract session ID for progress tracking
      if (result.data.session_id) {
        setImportSessionId(result.data.session_id);
        setShowProgress(true);
      }

      setImportResult(result);
      setImportError(null);
      queryClient.invalidateQueries({ queryKey: ['regionadmin', 'classes'] });
      queryClient.invalidateQueries({ queryKey: ['regionadmin', 'class-statistics'] });

      // Show success toast
      if (result.data.success_count > 0) {
        toast({
          title: 'İdxal prosesi başladı',
          description: `${result.data.success_count} sətir emal edildi.`,
        });
      }
    },
    onError: (error: any) => {
      const responseData = error?.response?.data;
      const userMessage =
        responseData?.message ||
        error?.message ||
        'İdxal zamanı xəta baş verdi. Zəhmət olmasa faylı yoxlayın və yenidən cəhd edin.';

      // Check if backend sent structured error format (from ValidationException)
      if (responseData?.data) {
        // Backend sent structured format - treat as import result
        setImportResult({
          success: false,
          message: userMessage,
          data: {
            success_count: responseData.data.success_count || 0,
            error_count: responseData.data.error_count || 0,
            errors: responseData.data.errors || [],
            structured_errors: responseData.data.structured_errors || [],
            total_processed: responseData.data.total_processed || 0,
          }
        });
        setImportError(null);
        return;
      }

      // Fallback: old error format
      let details: string[] = [];
      const backendErrors = responseData?.errors;
      if (Array.isArray(backendErrors)) {
        details = backendErrors.flat().map((item: any) => item?.toString?.() ?? String(item));
      } else if (backendErrors && typeof backendErrors === 'object') {
        details = Object.values(backendErrors)
          .flat()
          .map((item: any) => item?.toString?.() ?? String(item));
      }

      if (details.length === 0 && responseData?.error) {
        details = [responseData.error.toString()];
      }

      setImportResult(null);
      setImportError({
        message: userMessage,
        details,
      });

      toast({
        title: 'İdxal mümkün olmadı',
        description: userMessage,
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = validateFile(file);
      if (validation.valid) {
        // Show preview modal instead of directly setting file
        setPendingFile(file);
        setShowFilePreview(true);
        setImportResult(null);
        setImportError(null);
      } else {
        toast({
          title: 'Fayl uyğun deyil',
          description: validation.error,
          variant: 'destructive',
        });
      }
    }
  };

  const handlePreviewConfirm = () => {
    if (pendingFile) {
      setSelectedFile(pendingFile);
      setShowFilePreview(false);
      // Auto-start import immediately after preview confirmation
      importMutation.mutate(pendingFile);
      setPendingFile(null);
    }
  };

  const handlePreviewCancel = () => {
    setShowFilePreview(false);
    setPendingFile(null);
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleDownloadCSVTemplate = async () => {
    setIsDownloadingCsvTemplate(true);

    try {
      const response = await regionAdminClassService.downloadCsvTemplate();
      const blob = response instanceof Blob ? response : response?.data;

      if (!(blob instanceof Blob)) {
        throw new Error('Server CSV faylı qaytarmadı. Yenidən cəhd edin.');
      }

      if (blob.size === 0) {
        throw new Error('Boş CSV faylı alındı.');
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `sinif-import-shablon-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast({
        title: 'CSV şablonu hazırdır',
        description: 'Fayl UTF-8 kodlaşdırması ilə endirildi.',
      });
    } catch (error) {
      toast({
        title: 'CSV şablonu yüklənmədi',
        description: error instanceof Error ? error.message : 'Fayl hazırlanarkən xəta baş verdi.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingCsvTemplate(false);
    }
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size (max 10MB - updated to match backend)
    if (file.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: 'Fayl ölçüsü çox böyükdür (maksimum 10MB)'
      };
    }

    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return {
        valid: false,
        error: 'Yalnız Excel (.xlsx, .xls) və CSV faylları dəstəklənir'
      };
    }

    return { valid: true };
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    setImportError(null);
    setImportSessionId(null);
    setShowProgress(false);
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Sinifləri İdxal Et
          </DialogTitle>
          <DialogDescription>
            Excel və ya CSV faylından sinif məlumatlarını toplu şəkildə idxal edin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {importError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-sm text-red-700">{importError.message}</p>
                  {importError.details.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                      {importError.details.map((detail, index) => (
                        <li key={index}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold text-base">İdxal qaydaları:</p>

                <div className="space-y-2">
                  <p className="font-medium text-sm">1. Şablon yüklə:</p>
                  <p className="text-sm text-muted-foreground pl-4">
                    "CSV Şablonu" düyməsindən regionunuza uyğun UTF-8 şablonu endirin
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-sm">2. Məlumatları doldur:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm pl-4 text-muted-foreground">
                    <li><strong className="text-foreground">UTIS kod</strong> və ya <strong className="text-foreground">Müəssisə kodu</strong> mütləqdir (ən az biri)</li>
                    <li><strong className="text-foreground">Sinif səviyyəsi</strong> sütununa 0–12 arası rəqəm yazın; <strong className="text-foreground">Sinif index-i</strong> sütunu azad 3 simvola qədər kodla doldurun (A, B, r2, 11 və s.)</li>
                    <li><strong className="text-foreground">Sinfin tipi</strong> və <strong className="text-foreground">Profil</strong> sahələri Excel-də göstərildiyi kimi doldurulmalıdır</li>
                    <li><strong className="text-foreground">Növbə</strong>: 1 növbə, 2 növbə, 3 növbə və ya fərdi</li>
                    <li><strong className="text-foreground">Sinif rəhbəri</strong>: Sistemdə mövcud olan müəllimin tam adı ilə eyni olmalıdır</li>
                    <li><strong className="text-foreground">Şagird sayı</strong>: Ümumi = Oğlan + Qız (avtomatik hesablanır)</li>
                    <li><strong className="text-foreground">Təhsil proqramı</strong>: umumi, xususi, ferdi_mekteb, ferdi_ev</li>
                    <li><strong className="text-foreground">Tədris dili</strong>: azərbaycan, rus, gürcü, ingilis</li>
                    <li><strong className="text-foreground">Tədris həftəsi</strong>: 4_günlük, 5_günlük, 6_günlük</li>
                    <li>Digər sahələr ixtiyaridir: İxtisas, Tədris ili</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-sm">3. Faylı yüklə:</p>
                  <p className="text-sm text-muted-foreground pl-4">
                    Doldurulmuş CSV faylını (və ya dəstəklənən Excel faylını) seçin və "İdxal Et" düyməsinə klikləyin
                  </p>
                </div>

                <div className="bg-muted/50 p-3 rounded mt-3">
                  <p className="font-medium text-sm mb-2">Nümunə sətirlər:</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">1. Standart azərbaycan dilli sinif:</p>
                      <code className="text-xs bg-background px-2 py-1 rounded block overflow-x-auto">
                        12345678 | MKT-001 | 1 saylı məktəb | 5A | 25 | 13 | 12 | azərbaycan | 1 növbə | 5_günlük | Mirzəyeva Azada İlqar qızı | Orta məktəb sinfi | Ümumi | umumi | 2024-2025
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">2. Rus dilli ixtisaslaşdırılmış sinif:</p>
                      <code className="text-xs bg-background px-2 py-1 rounded block overflow-x-auto">
                        12345678 | MKT-001 | 1 saylı məktəb | 10B | 28 | 15 | 13 | rus | 2 növbə | 5_günlük | Bayramova Pakizə Xəlil qızı | İxtisas sinfi | Riyaziyyat | umumi | 2024-2025
                      </code>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <p className="font-medium text-sm text-amber-600">⚠️ Qeyd:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs pl-4 text-amber-600">
                    <li>Fayl formatı: .xlsx, .xls və ya .csv (maksimum 5 MB)</li>
                    <li>Müəssisələr sizin region daxilində olmalıdır</li>
                    <li>Mövcud siniflər yenilənəcək (duplikasiya olmayacaq)</li>
                    <li>Sinif rəhbərlərinin adları sistemdəki müəllim hesabları ilə uyğun gəlməlidir</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Template Download Buttons */}
          {!importResult && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCSVTemplate}
                className="gap-2"
                disabled={isDownloadingCsvTemplate}
              >
                {isDownloadingCsvTemplate ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Yüklənir...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    CSV Şablon (.csv)
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Şablon regionunuza aid müəssisələrin UTIS/MKT kodları ilə gəlir və yalnız UTF-8 kodlaşdırılmış CSV formatındadır.
              </p>
            </div>
          )}

          {/* File Upload */}
          {!importResult && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition">
                <input
                  type="file"
                  id="file-upload"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">
                    {selectedFile ? selectedFile.name : 'Fayl seçin və ya buraya sürüşdürün'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Excel (.xlsx, .xls) və ya CSV faylı
                  </p>
                </label>
              </div>

              {selectedFile && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleImport}
                      disabled={importMutation.isLoading}
                      className="gap-2"
                    >
                      {importMutation.isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          İdxal edilir...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          İdxal Et
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Progress Tracking */}
                  {showProgress && importSessionId && importMutation.isLoading && (
                    <div className="border rounded-lg p-4 bg-white">
                      <ImportProgressBar
                        sessionId={importSessionId}
                        onComplete={() => {
                          setShowProgress(false);
                        }}
                        onError={(errorMessage) => {
                          setShowProgress(false);
                          toast({
                            title: 'Proses izlənmədi',
                            description: errorMessage,
                            variant: 'destructive',
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import Progress */}
          {importMutation.isLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>İdxal prosesi...</span>
                <span className="text-muted-foreground">Zəhmət olmasa gözləyin</span>
              </div>
              <Progress value={50} className="h-2" />
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-4">
              {/* Success Summary */}
              <Alert variant={importResult.data.error_count > 0 ? 'default' : 'default'} className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium text-green-900">İdxal tamamlandı</p>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {importResult.data.success_count}
                        </div>
                        <div className="text-xs text-muted-foreground">Uğurlu</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {importResult.data.error_count}
                        </div>
                        <div className="text-xs text-muted-foreground">Xəta</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {importResult.data.total_processed}
                        </div>
                        <div className="text-xs text-muted-foreground">Cəmi</div>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Errors - Enhanced with severity categorization */}
              {importResult.data.errors && importResult.data.errors.length > 0 && (
                <EnhancedErrorDisplay
                  errors={importResult.data.errors}
                  structuredErrors={importResult.data.structured_errors}
                />
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setSelectedFile(null); setImportResult(null); }}>
                  Yeni İdxal
                </Button>
                <Button onClick={handleClose}>
                  Bağla
                </Button>
              </div>
            </div>
          )}

          {/* Close button when no import in progress */}
          {!importResult && !importMutation.isLoading && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Ləğv et
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={pendingFile}
        isOpen={showFilePreview}
        onClose={handlePreviewCancel}
        onConfirm={handlePreviewConfirm}
      />
    </Dialog>
  );
};

export default RegionClassImportModal;
