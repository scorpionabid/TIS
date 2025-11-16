/**
 * RegionTeacherImportModal - Import/Export Modal for RegionAdmin
 * Handles bulk teacher import and export operations for multiple institutions
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Info,
  FileText,
  Clock,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { regionAdminTeacherService } from '@/services/regionAdminTeachers';

interface RegionTeacherImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegionTeacherImportModal: React.FC<RegionTeacherImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);

  // Progress tracking
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed'>('idle');
  const [estimatedRows, setEstimatedRows] = useState(0);
  const [fileSizeMB, setFileSizeMB] = useState(0);

  // Download template handler - Matches institutions.ts pattern
  const handleDownloadTemplate = async () => {
    try {
      // Get blob from service (same as institutions)
      const templateBlob = await regionAdminTeacherService.downloadImportTemplate();

      // Create download link (same pattern as institutions)
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

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      setImportStatus('uploading');
      setUploadProgress(0);

      return regionAdminTeacherService.importTeachers(file, {
        skip_duplicates: skipDuplicates,
        update_existing: updateExisting,
        onUploadProgress: (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setUploadProgress(percent);

          if (percent === 100) {
            setImportStatus('processing');
          }
        },
      });
    },
    onSuccess: (result) => {
      setImportStatus('completed');
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['regionadmin-teachers'] });

      if (result.imported > 0) {
        toast({
          title: 'İdxal tamamlandı',
          description: `${result.imported} müəllim uğurla idxal edildi${
            result.errors > 0 ? `, ${result.errors} xəta baş verdi` : ''
          }`,
        });
      } else {
        toast({
          title: 'Xəbərdarlıq',
          description: 'Heç bir müəllim idxal edilmədi',
          variant: 'destructive',
        });
      }

      // Clear file after import
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      setImportStatus('idle');
      setUploadProgress(0);

      toast({
        title: 'İdxal xətası',
        description: error.message || 'Müəllimləri idxal edərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // File size validation (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          title: 'Fayl çox böyükdür',
          description: `Maksimum fayl ölçüsü: 10MB (Sizin fayl: ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
          variant: 'destructive',
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Calculate file info
      const sizeMB = file.size / 1024 / 1024;
      const estimatedRowCount = Math.floor(file.size / 250); // Average row size ~250 bytes

      setSelectedFile(file);
      setFileSizeMB(sizeMB);
      setEstimatedRows(estimatedRowCount);
      setImportResult(null); // Clear previous results
      setImportStatus('idle');
      setUploadProgress(0);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast({
        title: 'Xəta',
        description: 'Zəhmət olmasa fayl seçin',
        variant: 'destructive',
      });
      return;
    }

    importMutation.mutate(selectedFile);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Müəllim İdxalı və İxracı
          </DialogTitle>
          <DialogDescription>
            Müəllimləri toplu şəkildə idxal edin və ya mövcud məlumatları ixrac edin
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">İdxal</TabsTrigger>
            <TabsTrigger value="export">İxrac</TabsTrigger>
          </TabsList>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="space-y-4">
            {/* Instructions */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">İdxal addımları:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Excel şablon faylını yükləyin (.xlsx)</li>
                    <li>
                      Şablondakı məcburi sahələri doldurun:
                      <ul className="list-disc list-inside ml-4 mt-1 text-xs">
                        <li>email, username, ad, soyad, ata adı</li>
                        <li>müəssisə ID, vəzifə, iş yeri növü, ixtisas</li>
                        <li>qiymətləndirmə növü və balı, şifrə</li>
                      </ul>
                    </li>
                    <li>Doldurulmuş faylı yükləyin və idxal edin</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    📝 Şablonda 3 vərəq var: 1) Əsas məlumatlar, 2) Müəssisələr, 3) Sahə izahları
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {/* Download Template */}
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
                <p className="text-xs text-gray-500 mt-2">
                  ✅ Şablon faylında mövcud müəssisələrin siyahısı və sahə izahları daxildir
                </p>
              </CardContent>
            </Card>

            {/* Import Options */}
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

            {/* File Info Preview */}
            {selectedFile && (
              <Alert className="bg-blue-50 border-blue-200">
                <FileText className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Fayl:</span>
                        <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
                      </div>
                      <div>
                        <span className="font-medium">Ölçü:</span>
                        <p className="text-xs text-muted-foreground">{fileSizeMB.toFixed(2)} MB</p>
                      </div>
                      <div>
                        <span className="font-medium">Təxmini sətir sayı:</span>
                        <p className="text-xs text-muted-foreground">~{estimatedRows} müəllim</p>
                      </div>
                      <div>
                        <span className="font-medium">Təxmini vaxt:</span>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ~{Math.ceil(estimatedRows / 50)} saniyə
                        </p>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Progress Bar */}
            {importStatus !== 'idle' && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium flex items-center gap-2">
                        {importStatus === 'uploading' && (
                          <>
                            <Upload className="h-4 w-4 animate-pulse" />
                            Yüklənir...
                          </>
                        )}
                        {importStatus === 'processing' && (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Proses edilir...
                          </>
                        )}
                        {importStatus === 'completed' && (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Tamamlandı
                          </>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {uploadProgress}%
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {importStatus === 'uploading' && 'Fayl serverə yüklənir...'}
                      {importStatus === 'processing' && 'Müəllimlər database-ə əlavə edilir...'}
                      {importStatus === 'completed' && 'İdxal prosesi uğurla tamamlandı!'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Excel Fayl Yüklə</CardTitle>
                <CardDescription>
                  Doldurulmuş Excel faylını seçin və idxal edin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="flex-1 text-sm"
                  />
                  {selectedFile && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <FileSpreadsheet className="h-3 w-3" />
                      {selectedFile.name}
                    </Badge>
                  )}
                </div>

                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || importMutation.isPending}
                  className="w-full"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      İdxal edilir...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      İdxal Et
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Import Results */}
            {importResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">İdxal Nəticəsi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Uğurlu</p>
                        <p className="text-2xl font-bold text-green-600">
                          {importResult.imported}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-600">Xəta</p>
                        <p className="text-2xl font-bold text-red-600">{importResult.errors}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Success Details */}
                  {importResult.details?.success?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Uğurlu idxallar:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResult.details.success.map((msg: string, idx: number) => (
                          <p key={idx} className="text-xs text-green-600">
                            ✓ {msg}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Details */}
                  {importResult.details?.errors?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Xətalar:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResult.details.errors.map((msg: string, idx: number) => (
                          <p key={idx} className="text-xs text-red-600">
                            ✗ {msg}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
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

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Bağla
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
