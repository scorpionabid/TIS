import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { downloadBlob } from '@/utils/fileDownload';
import { type ImportResult } from '@/types/import-export';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2,
  AlertCircle,
  Building2,
  Filter,
  X
} from 'lucide-react';
import { institutionService } from '@/services/institutions';
import { useInstitutionTypes } from '@/hooks/useInstitutionTypes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { InstitutionType } from '@/services/institutions';
import { ImportResultModal } from './ImportResultModal';
import { ImportProgress } from '@/components/ui/import-progress';

interface InstitutionImportExportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}


export function InstitutionImportExportModal({ 
  open, 
  onClose, 
  onImportComplete 
}: InstitutionImportExportModalProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('select');
  const [selectedInstitutionType, setSelectedInstitutionType] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'uploading' | 'processing' | 'validating' | 'complete' | 'error'>('uploading');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  // CSV seçimləri
  const [delimiter, setDelimiter] = useState<'comma' | 'semicolon'>('comma');
  const [upsertOnUtis, setUpsertOnUtis] = useState(false);
  const [conflicts, setConflicts] = useState<Array<{ row: number; utis_code: string; existing_name: string }>>([]);

  // Load institution types for selection
  const { data: institutionTypesResponse, isLoading } = useInstitutionTypes({ 
    userRole: currentUser?.role,
    enabled: !!currentUser && open 
  });


  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setActiveTab('select');
      setSelectedInstitutionType('');
      setUploadFile(null);
      setImportProgress(0);
      setImportStatus('uploading');
      setImportResult(null);
      setShowResultModal(false);
      setDelimiter('comma');
      setUpsertOnUtis(false);
      setConflicts([]);
    }
  }, [open]);

  // Get available institution types
  const availableTypes = React.useMemo(() => {
    if (!institutionTypesResponse?.institution_types) return [];

    return institutionTypesResponse.institution_types.map((type: InstitutionType) => ({
      key: type.key,
      label: type.label_az || type.label,
      level: type.default_level,
      color: type.color || '#3b82f6',
      icon: type.icon,
    }));
  }, [institutionTypesResponse]);

  // Handle institution type selection
  const handleTypeSelection = (typeKey: string) => {
    setSelectedInstitutionType(typeKey);
  };

  // Generate and download template
  const handleDownloadTemplate = async () => {
    if (!selectedInstitutionType) {
      toast({
        title: 'Xəta',
        description: 'Zəhmət olmasa əvvəlcə müəssisə növünü seçin',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      
      // Create template for the selected institution type
      const selectedType = availableTypes.find(type => type.key === selectedInstitutionType);
      const templateBlob = await institutionService.downloadImportTemplateByType(selectedInstitutionType);
      const label = selectedType?.label || selectedInstitutionType;
      downloadBlob(templateBlob, `${label}_template_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: 'Uğurlu',
        description: 'Template uğurla yükləndi',
      });
      
      setActiveTab('upload');
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: 'Xəta',
        description: 'Template yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  // CSV template yüklə
  const handleDownloadCsvTemplate = async () => {
    if (!selectedInstitutionType) {
      toast({ title: 'Xəta', description: 'Əvvəlcə müəssisə növünü seçin', variant: 'destructive' });
      return;
    }
    try {
      setGenerating(true);
      const selectedType = availableTypes.find(t => t.key === selectedInstitutionType);
      const blob = await institutionService.downloadCsvTemplateByType(selectedInstitutionType, delimiter);
      const label = selectedType?.label || selectedInstitutionType;
      const delimLabel = delimiter === 'semicolon' ? 'noqteli_vergul' : 'vergul';
      downloadBlob(blob, `${label}_csv_sablon_${delimLabel}_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: 'Uğurlu', description: 'CSV şablon yükləndi' });
      setActiveTab('upload');
    } catch (error) {
      console.error('CSV template error:', error);
      toast({ title: 'Xəta', description: 'CSV şablon yüklənərkən xəta baş verdi', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  // Enhanced file upload with progress tracking
  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast({
        title: 'Xəta',
        description: 'Zəhmət olmasa fayl seçin',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedInstitutionType) {
      toast({
        title: 'Xəta',
        description: 'Zəhmət olmasa əvvəlcə müəssisə növünü seçin',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      setImportProgress(0);
      setImportStatus('uploading');

      // Simulate progress updates
      const progressTimer = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);

      // Update status steps
      setTimeout(() => setImportStatus('processing'), 500);
      setTimeout(() => setImportStatus('validating'), 1500);

      const isCsv = uploadFile.name.toLowerCase().endsWith('.csv');
      const result = await institutionService.importFromTemplateByType(
        uploadFile,
        selectedInstitutionType,
        isCsv ? { delimiter, upsertOnUtis } : {}
      );

      // Conflict-ləri aşkar et
      if (result.data?.conflicts?.length > 0) {
        setConflicts(result.data.conflicts);
      }

      clearInterval(progressTimer);
      setImportProgress(100);
      setImportStatus('complete');

      // Normalize to ImportResult shape
      const importData: ImportResult = {
        created: result.data?.created ?? result.data?.success ?? 0,
        updated: result.data?.updated ?? 0,
        skipped: result.data?.skipped ?? 0,
        errors: (result.data?.errors ?? []).map((e: string | { message: string }) =>
          typeof e === 'string' ? { message: e } : e,
        ),
      };
      setImportResult(importData);

      const hasErrors = importData.errors.length > 0;
      toast({
        title: hasErrors ? 'İdxal tamamlandı (xətalarla)' : 'Uğurlu idxal',
        description: hasErrors
          ? `${importData.created} uğurlu, ${importData.errors.length} xəta`
          : `${importData.created} müəssisə əlavə edildi`,
      });

      // Show detailed result modal after brief delay
      setTimeout(() => {
        setShowResultModal(true);
      }, 800);

      onImportComplete?.();
    } catch (err: unknown) {
      setImportStatus('error');
      setImportProgress(0);

      const error = err as { message?: string; response?: { data?: { message?: string; errors?: string[] | string } } };
      let errorMessage = 'Fayl idxal edilərkən xəta baş verdi';
      if (error.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.errors) {
        const rawErrors = error.response.data.errors;
        errorMessage = Array.isArray(rawErrors) ? rawErrors.join(', ') : rawErrors;
      }

      setImportResult({
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [{ message: errorMessage }],
      });

      toast({
        title: 'İdxal xətası',
        description: errorMessage,
        variant: 'destructive',
      });

      // Show error result modal
      setTimeout(() => {
        setShowResultModal(true);
      }, 500);

    } finally {
      setUploading(false);
      // Reset progress after delay
      setTimeout(() => {
        setImportProgress(0);
        setImportStatus('uploading');
      }, 3000);
    }
  };

  // Export institutions by type
  const handleExportInstitutions = async () => {
    if (!selectedInstitutionType) {
      toast({
        title: 'Xəta',
        description: 'Zəhmət olmasa müəssisə növünü seçin',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      
      const selectedType = availableTypes.find(type => type.key === selectedInstitutionType);
      const exportBlob = await institutionService.exportInstitutionsByType(selectedInstitutionType);
      const label = selectedType?.label || selectedInstitutionType;
      downloadBlob(exportBlob, `${label}_export_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: 'Uğurlu',
        description: 'Müəssisələr uğurla ixrac edildi',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Xəta',
        description: 'Ixrac zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Müəssisə İdxal/İxrac
          </DialogTitle>
          <DialogDescription>
            Müəssisələri idxal və ixrac etmək üçün modal pəncərə
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="select" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Müəssisə Növü Seçimi
              {selectedInstitutionType && (
                <Badge variant="secondary">Seçildi</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Template İdarəsi
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Fayl Yükləmə
            </TabsTrigger>
          </TabsList>

          {/* Institution Selection Tab */}
          <TabsContent value="select" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Yeni müəssisələr üçün idxal template hazirla</p>
                  <p className="text-sm text-blue-600">
                    İdxal etmək istədiyiniz müəssisə növünü seçin. Template həmin növün sahələri üçün hazirlanacaq.
                  </p>
                </div>
              </div>


              {/* Institution Type Selection */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="institution-type">Müəssisə Növü *</Label>
                  <Select 
                    value={selectedInstitutionType} 
                    onValueChange={handleTypeSelection}
                  >
                    <SelectTrigger>
                      {selectedInstitutionType && availableTypes.length > 0 ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {(() => {
                            const selectedType = availableTypes.find(type => type.key === selectedInstitutionType);
                            return selectedType ? (
                              <>
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: selectedType.color }}
                                />
                                <span className="truncate">{selectedType.label} (Səviyyə {selectedType.level})</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground truncate">
                                Növ: {selectedInstitutionType}
                              </span>
                            )
                          })()}
                        </div>
                      ) : (
                        <SelectValue placeholder="Müəssisə növünü seçin" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {isLoading ? (
                        <SelectItem value="loading" disabled>
                          Yüklənir...
                        </SelectItem>
                      ) : availableTypes.length > 0 ? (
                        availableTypes.map((type) => (
                          <SelectItem key={type.key} value={type.key}>
                            {type.label} (Səviyyə {type.level})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-types" disabled>
                          Müəssisə növləri tapılmadı
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Type Info */}
                {selectedInstitutionType && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    {(() => {
                      const selectedType = availableTypes.find(type => type.key === selectedInstitutionType);
                      return selectedType ? (
                        <div>
                          <p className="font-medium text-green-800 mb-2">
                            Seçilən Növ: {selectedType.label}
                          </p>
                          <div className="text-sm text-green-600 space-y-1">
                            <p>• Səviyyə: {selectedType.level}</p>
                            <p>• Template bu növün sahələri üçün hazırlanacaq</p>
                            <p>• Yeni {selectedType.label.toLowerCase()} müəssisələri əlavə edə bilərsiniz</p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Template Management Tab */}
          <TabsContent value="template" className="mt-6">
            <div className="space-y-6">

              {/* Delimiter seçimi — CSV üçün */}
              <div className="p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-medium mb-3">CSV Delimiter (Ayırıcı) Seçimi</h4>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="delimiter"
                      value="comma"
                      checked={delimiter === 'comma'}
                      onChange={() => setDelimiter('comma')}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm">Vergül <code className="bg-gray-200 px-1 rounded">,</code> (standart)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="delimiter"
                      value="semicolon"
                      checked={delimiter === 'semicolon'}
                      onChange={() => setDelimiter('semicolon')}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm">Nöqtəli vergül <code className="bg-gray-200 px-1 rounded">;</code> (MS Excel AZ)</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Microsoft Excel-in Azərbaycanca versiyası CSV-ni nöqtəli vergüllə saxlayır.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* Excel Template */}
                <div className="p-5 border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Download className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-sm">Excel Şablon</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">Standart .xlsx formatı</p>
                  <Button
                    onClick={handleDownloadTemplate}
                    disabled={!selectedInstitutionType || generating}
                    className="w-full"
                    size="sm"
                  >
                    {generating ? 'Hazırlanır...' : '.xlsx Yüklə'}
                  </Button>
                  {!selectedInstitutionType && (
                    <p className="text-xs text-red-500 mt-2">Əvvəlcə növ seçin</p>
                  )}
                </div>

                {/* CSV Template */}
                <div className="p-5 border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Download className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-sm">CSV Şablon</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    {delimiter === 'semicolon' ? 'Nöqtəli vergüllü' : 'Vergüllü'} .csv formatı — UTF-8
                  </p>
                  <Button
                    onClick={handleDownloadCsvTemplate}
                    disabled={!selectedInstitutionType || generating}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    {generating ? 'Hazırlanır...' : '.csv Yüklə'}
                  </Button>
                  {!selectedInstitutionType && (
                    <p className="text-xs text-red-500 mt-2">Əvvəlcə növ seçin</p>
                  )}
                </div>

                {/* Export Data */}
                <div className="p-5 border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Download className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-sm">Məlumat İxracı</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">Mövcud məlumatları Excel-ə ixrac et</p>
                  <Button
                    onClick={handleExportInstitutions}
                    disabled={!selectedInstitutionType || generating}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    {generating ? 'İxrac edilir...' : 'İxrac Et'}
                  </Button>
                </div>
              </div>

              {/* Template Instructions */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-medium text-amber-800 mb-2">Şablon istifadə qaydaları:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Sütun başlıqlarını dəyişdirməyin</li>
                  <li>• UTIS kodu eyni olarsa sistem mövcud institutu yeniləyəcək (upsert)</li>
                  <li>• CSV faylı UTF-8 kodlaması ilə saxlanılmalıdır</li>
                  <li>• 400+ qeyd üçün fayl 10MB-dan az olmalıdır</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* File Upload Tab */}
          <TabsContent value="upload" className="mt-6">
            <div className="space-y-6">

              {/* Fayl seçim sahəsi */}
              <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="mb-3">
                  <Label htmlFor="upload-file" className="cursor-pointer">
                    <span className="text-blue-600 hover:underline">Fayl seçin</span>
                    {' '}və ya buraya sürüşdürün
                  </Label>
                  <Input
                    id="upload-file"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      setUploadFile(e.target.files?.[0] || null);
                      setConflicts([]);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Excel (.xlsx, .xls) və ya CSV (.csv) faylları qəbul edilir
                </p>
              </div>

              {/* Seçilmiş fayl məlumatları */}
              {uploadFile && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Seçilmiş fayl:</span>
                    <span>{uploadFile.name}</span>
                    <Badge variant="secondary">
                      {uploadFile.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'Excel'}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>

                  {/* CSV faylı seçilib: delimiter + upsert seçimləri */}
                  {uploadFile.name.toLowerCase().endsWith('.csv') && (
                    <div className="mt-4 space-y-3 border-t pt-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Ayırıcı (Delimiter):</p>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="upload-delimiter"
                              value="comma"
                              checked={delimiter === 'comma'}
                              onChange={() => setDelimiter('comma')}
                              className="w-4 h-4 accent-blue-600"
                            />
                            <span className="text-sm">Vergül <code className="bg-gray-200 px-1 rounded">,</code></span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="upload-delimiter"
                              value="semicolon"
                              checked={delimiter === 'semicolon'}
                              onChange={() => setDelimiter('semicolon')}
                              className="w-4 h-4 accent-blue-600"
                            />
                            <span className="text-sm">Nöqtəli vergül <code className="bg-gray-200 px-1 rounded">;</code></span>
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="upsert-on-utis"
                          checked={upsertOnUtis}
                          onCheckedChange={(v) => setUpsertOnUtis(Boolean(v))}
                        />
                        <Label htmlFor="upsert-on-utis" className="text-sm cursor-pointer">
                          UTIS kodu eyni olan müəssisələri avtomatik <strong>yenilə</strong>
                        </Label>
                      </div>
                      <p className="text-xs text-gray-500">
                        ⚠️ CSV faylı UTF-8 kodlamasında olmalıdır (Excel-dən CSV olaraq saxlayın → UTF-8).
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* UTIS Conflict panel */}
              {conflicts.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="font-medium text-yellow-800 mb-2">
                    ⚠️ {conflicts.length} UTIS konflikti aşkar edildi
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
                    {conflicts.map((c) => (
                      <div key={c.utis_code} className="text-sm text-yellow-700">
                        Sətir {c.row}: UTIS <code className="bg-yellow-100 px-1 rounded">{c.utis_code}</code> — artıq mövcuddur: <strong>{c.existing_name}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="upsert-conflicts"
                      checked={upsertOnUtis}
                      onCheckedChange={(v) => setUpsertOnUtis(Boolean(v))}
                    />
                    <Label htmlFor="upsert-conflicts" className="text-sm cursor-pointer">
                      Hamısını yenilə (upsert)
                    </Label>
                  </div>
                </div>
              )}

              {/* Import Progress */}
              {uploading && (
                <ImportProgress
                  isUploading={uploading}
                  progress={importProgress}
                  status={importStatus}
                  fileName={uploadFile?.name}
                />
              )}

              <Button
                onClick={handleFileUpload}
                disabled={!uploadFile || !selectedInstitutionType || uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? 'İdxal edilir...' : 'İdxal Et'}
              </Button>

              {!selectedInstitutionType && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">Xəbərdarlıq</p>
                  <p className="text-red-600 text-sm">
                    İdxal etmək üçün əvvəlcə "Müəssisə Növü Seçimi" bölməsindən növ seçin.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Import Result Modal */}
        <ImportResultModal
          open={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            setImportResult(null);
            if (importResult && (importResult.success > 0 || (importResult.errors && importResult.errors.length === 0))) {
              onClose(); // Close main modal on successful import
            }
          }}
          result={importResult}
          institutionType={availableTypes.find(t => t.key === selectedInstitutionType)?.label}
          fileName={uploadFile?.name}
        />
      </DialogContent>
    </Dialog>
  );
}