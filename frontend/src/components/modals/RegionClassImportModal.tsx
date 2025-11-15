import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download, Table as TableIcon, Filter } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { regionAdminClassService, ClassImportResult, ImportError } from '@/services/regionadmin/classes';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

interface RegionClassImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegionClassImportModal: React.FC<RegionClassImportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ClassImportResult | null>(null);
  const [importError, setImportError] = useState<{ message: string; details: string[] } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list'); // View mode for errors
  const [filterField, setFilterField] = useState<string>('all'); // Filter errors by field
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (file: File) => regionAdminClassService.importClasses(file),
    onSuccess: (result) => {
      setImportResult(result);
      setImportError(null);
      queryClient.invalidateQueries({ queryKey: ['regionadmin', 'classes'] });
      queryClient.invalidateQueries({ queryKey: ['regionadmin', 'class-statistics'] });

      // Show success toast
      if (result.data.success_count > 0) {
        console.log(`✅ ${result.data.success_count} sinif uğurla idxal edildi`);
      }
    },
    onError: (error: any) => {
      console.error('❌ İdxal xətası:', error);
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
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = validateFile(file);
      if (validation.valid) {
        setSelectedFile(file);
        setImportResult(null);
        setImportError(null);
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
    setImportError(null);
    setViewMode('list');
    setFilterField('all');
    onClose();
  };

  /**
   * Export errors to Excel file
   */
  const exportErrorsToExcel = () => {
    if (!importResult?.data?.structured_errors || importResult.data.structured_errors.length === 0) {
      alert('Xəta məlumatları mövcud deyil');
      return;
    }

    const structuredErrors = importResult.data.structured_errors;
    const fileName = `sinif-import-xetalari-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Prepare data for Excel
    const excelData = structuredErrors.map((error: ImportError) => ({
      'Sətir №': error.row || '-',
      'Sahə': error.field || '-',
      'Yanlış Dəyər': error.value !== null && error.value !== undefined ? String(error.value) : '-',
      'Xəta': error.error,
      'Təklif': error.suggestion || '-',
      'UTIS Kod': error.context?.utis_code || '-',
      'Müəssisə Kodu': error.context?.institution_code || '-',
      'Müəssisə': error.context?.institution_name || '-',
      'Sinif Səviyyəsi': error.context?.class_level !== null ? error.context.class_level : '-',
      'Sinif Adı': error.context?.class_name || '-',
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 10 }, // Sətir №
      { wch: 20 }, // Sahə
      { wch: 20 }, // Yanlış Dəyər
      { wch: 50 }, // Xəta
      { wch: 50 }, // Təklif
      { wch: 15 }, // UTIS Kod
      { wch: 18 }, // Müəssisə Kodu
      { wch: 40 }, // Müəssisə
      { wch: 15 }, // Sinif Səviyyəsi
      { wch: 15 }, // Sinif Adı
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Xətalar');

    // Add summary sheet
    const summaryData = [
      { 'Statistika': 'Ümumi işlənmiş sətirlər', 'Dəyər': importResult.data.total_processed },
      { 'Statistika': 'Uğurlu', 'Dəyər': importResult.data.success_count },
      { 'Statistika': 'Xətalı', 'Dəyər': importResult.data.error_count },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Statistika');

    // Download file
    XLSX.writeFile(workbook, fileName);
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
                    "Şablon yüklə" düyməsinə klikləyərək Excel şablonunu kompüterinizə endirin
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
                    Doldurulmuş Excel faylını seçin və "İdxal Et" düyməsinə klikləyin
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

              {/* Errors - Enhanced with table view and export */}
              {importResult.data.errors && importResult.data.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="font-semibold text-base">Xətalar ({importResult.data.errors.length}):</p>
                        <div className="flex gap-2">
                          {/* View Mode Toggle */}
                          {importResult.data.structured_errors && importResult.data.structured_errors.length > 0 && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant={viewMode === 'list' ? 'default' : 'outline'}
                                onClick={() => setViewMode('list')}
                                className="h-7 text-xs"
                              >
                                Siyahı
                              </Button>
                              <Button
                                size="sm"
                                variant={viewMode === 'table' ? 'default' : 'outline'}
                                onClick={() => setViewMode('table')}
                                className="h-7 text-xs"
                              >
                                <TableIcon className="h-3 w-3 mr-1" />
                                Cədvəl
                              </Button>
                            </div>
                          )}
                          {/* Export Button */}
                          {importResult.data.structured_errors && importResult.data.structured_errors.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={exportErrorsToExcel}
                              className="h-7 text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Excel Yüklə
                            </Button>
                          )}
                          {/* Copy Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const errorText = importResult.data.errors.join('\n');
                              navigator.clipboard.writeText(errorText);
                              alert('Xətalar panoya kopyalandı');
                            }}
                            className="h-7 text-xs"
                          >
                            Kopyala
                          </Button>
                        </div>
                      </div>

                      {/* Table View with Filter */}
                      {viewMode === 'table' && importResult.data.structured_errors && importResult.data.structured_errors.length > 0 ? (
                        <div className="space-y-2">
                          {/* Field Filter */}
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <select
                              value={filterField}
                              onChange={(e) => setFilterField(e.target.value)}
                              className="text-xs border rounded px-2 py-1"
                            >
                              <option value="all">Bütün sahələr</option>
                              {Array.from(new Set(importResult.data.structured_errors.map(e => e.field).filter(Boolean))).map(field => (
                                <option key={field} value={field}>{field}</option>
                              ))}
                            </select>
                            {filterField !== 'all' && (
                              <Badge variant="secondary" className="text-xs">
                                {importResult.data.structured_errors.filter(e => e.field === filterField).length} xəta
                              </Badge>
                            )}
                          </div>

                          {/* Error Table */}
                          <div className="max-h-96 overflow-y-auto border rounded">
                            <Table>
                              <TableHeader className="sticky top-0 bg-background">
                                <TableRow>
                                  <TableHead className="w-16">Sətir</TableHead>
                                  <TableHead className="w-32">Sahə</TableHead>
                                  <TableHead className="w-24">Dəyər</TableHead>
                                  <TableHead>Xəta</TableHead>
                                  <TableHead>Təklif</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importResult.data.structured_errors
                                  .filter(error => filterField === 'all' || error.field === filterField)
                                  .map((error, index) => (
                                    <TableRow key={index} className="text-xs">
                                      <TableCell className="font-mono">
                                        {error.row || '-'}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                          {error.field || '-'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="font-mono text-xs truncate max-w-24" title={String(error.value)}>
                                        {error.value !== null && error.value !== undefined ? String(error.value) : '-'}
                                      </TableCell>
                                      <TableCell className="text-destructive">
                                        {error.error}
                                      </TableCell>
                                      <TableCell className="text-blue-600 text-xs">
                                        {error.suggestion || '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : (
                        /* List View (Original) */
                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-2">
                          {importResult.data.errors.map((error, index) => (
                            <div key={index} className="text-sm p-3 bg-destructive/10 rounded border border-destructive/20">
                              <span className="font-mono text-xs text-destructive/80 mr-2">
                                #{index + 1}
                              </span>
                              <span className="text-destructive">{error}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {importResult.data.errors.length > 5 && (
                        <div className="text-xs text-muted-foreground italic text-center pt-2 border-t">
                          💡 Məsləhət: Xətaları Excel faylına yükləyin, düzəldin və yenidən cəhd edin
                        </div>
                      )}
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
