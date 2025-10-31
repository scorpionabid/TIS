import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { regionAdminClassService, ClassImportResult } from '@/services/regionadmin/classes';

interface RegionClassImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegionClassImportModal: React.FC<RegionClassImportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ClassImportResult | null>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (file: File) => regionAdminClassService.importClasses(file),
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['regionadmin', 'classes'] });
      queryClient.invalidateQueries({ queryKey: ['regionadmin', 'class-statistics'] });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = validateFile(file);
      if (validation.valid) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        alert(`Fayl səhvi: ${validation.error}`);
      }
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return {
        valid: false,
        error: 'Fayl ölçüsü çox böyükdür (maksimum 5MB)'
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
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold text-base">İdxal qaydaları:</p>

                <div className="space-y-2">
                  <p className="font-medium text-sm">1. Şablon yüklə:</p>
                  <p className="text-sm text-muted-foreground pl-4">
                    "Şablon yüklə" düyməsinə klikləyərək Excel şablonunu kompüterinizə endirin
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-sm">2. Məlumatları doldur:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm pl-4 text-muted-foreground">
                    <li><strong className="text-foreground">UTIS kod</strong> və ya <strong className="text-foreground">Müəssisə kodu</strong> mütləqdir (ən az biri)</li>
                    <li><strong className="text-foreground">Sinif səviyyəsi</strong> (1-12) və <strong className="text-foreground">Sinif adı</strong> (A,B,C...) mütləqdir</li>
                    <li>Şagird sayı = Oğlan sayı + Qız sayı (avtomatik hesablanır)</li>
                    <li>Digər sahələr ixtiyaridir: İxtisas, Kateqoriya, Təhsil proqramı</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-sm">3. Faylı yüklə:</p>
                  <p className="text-sm text-muted-foreground pl-4">
                    Doldurulmuş Excel faylını seçin və "İdxal Et" düyməsinə klikləyin
                  </p>
                </div>

                <div className="bg-muted/50 p-3 rounded mt-3">
                  <p className="font-medium text-sm mb-2">Nümunə sətir:</p>
                  <code className="text-xs bg-background px-2 py-1 rounded block overflow-x-auto">
                    12345678 | MKT-001 | 1 saylı məktəb | 5 | A | 25 | 13 | 12 | Ümumi | ümumi | umumi | 2024-2025
                  </code>
                </div>

                <div className="space-y-1 pt-2">
                  <p className="font-medium text-sm text-amber-600">⚠️ Qeyd:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs pl-4 text-amber-600">
                    <li>Fayl formatı: .xlsx, .xls və ya .csv (maksimum 5 MB)</li>
                    <li>Müəssisələr sizin region daxilində olmalıdır</li>
                    <li>Mövcud siniflər yenilənəcək (duplikasiya olmayacaq)</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>

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
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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

              {/* Errors */}
              {importResult.data.errors && importResult.data.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Xətalar ({importResult.data.errors.length}):</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importResult.data.errors.slice(0, 10).map((error, index) => (
                          <div key={index} className="text-xs p-2 bg-destructive/10 rounded">
                            {error}
                          </div>
                        ))}
                        {importResult.data.errors.length > 10 && (
                          <div className="text-xs text-muted-foreground text-center pt-2">
                            ... və {importResult.data.errors.length - 10} daha çox xəta
                          </div>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
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
    </Dialog>
  );
};

export default RegionClassImportModal;
