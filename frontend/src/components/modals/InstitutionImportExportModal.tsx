import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [importResult, setImportResult] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);

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
    }
  }, [open]);

  // Get available institution types
  const availableTypes = React.useMemo(() => {
    console.log('🏷️ Institution Types Response:', institutionTypesResponse);
    console.log('🔄 Loading state:', isLoading);
    console.log('👤 Current user:', currentUser);

    if (!institutionTypesResponse?.institution_types) {
      console.log('❌ No institution types found in response');
      return [];
    }

    const types = institutionTypesResponse.institution_types.map((type: InstitutionType) => {
      console.log('🔍 Processing type:', type);
      return {
        key: type.key,
        label: type.label_az || type.label,
        level: type.default_level,
        color: type.color || '#3b82f6',
        icon: type.icon
      };
    });

    console.log('✅ Processed types:', types);
    return types;
  }, [institutionTypesResponse, isLoading, currentUser]);

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
      
      // Create download link
      const url = window.URL.createObjectURL(templateBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedType?.label || selectedInstitutionType}_template_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

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

      const result = await institutionService.importFromTemplateByType(uploadFile, selectedInstitutionType);

      clearInterval(progressTimer);
      setImportProgress(100);
      setImportStatus('complete');

      // Store result for detailed modal
      setImportResult(result.data);

      // Brief success toast
      const hasErrors = result.data?.errors && result.data.errors.length > 0;
      toast({
        title: hasErrors ? 'İdxal tamamlandı (xətalarla)' : 'Uğurlu idxal',
        description: hasErrors 
          ? `${result.data.success || 0} uğurlu, ${result.data.errors.length} xəta`
          : `${result.data?.success || 0} müəssisə əlavə edildi`,
        variant: hasErrors ? 'default' : 'default',
      });

      // Show detailed result modal after brief delay
      setTimeout(() => {
        setShowResultModal(true);
      }, 800);

      onImportComplete?.();
    } catch (error: any) {
      setImportStatus('error');
      setImportProgress(0);
      
      console.error('Import error:', error);
      
      // Extract detailed error message
      let errorMessage = 'Fayl idxal edilərkən xəta baş verdi';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.errors) {
        errorMessage = Array.isArray(error.response.data.errors) 
          ? error.response.data.errors.join(', ')
          : error.response.data.errors;
      }

      // Store error result for modal
      setImportResult({
        success: 0,
        errors: [errorMessage],
        created_institutions: []
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
      
      // Create download link
      const url = window.URL.createObjectURL(exportBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedType?.label || selectedInstitutionType}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid md:grid-cols-2 gap-6">
                {/* Download Template */}
                <div className="p-6 border rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Download className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold">Template Yüklə</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Seçilmiş müəssisələr üçün idxal templatesi yükləyin. Template-də mövcud məlumatlar və düzgün format göstəriləcək.
                  </p>
                  <Button 
                    onClick={handleDownloadTemplate} 
                    disabled={!selectedInstitutionType || generating}
                    className="w-full"
                  >
                    {generating ? 'Hazırlanır...' : 'Template Yüklə'}
                  </Button>
                  {!selectedInstitutionType && (
                    <p className="text-xs text-red-500 mt-2">Əvvəlcə müəssisə növünü seçin</p>
                  )}
                </div>

                {/* Export Data */}
                <div className="p-6 border rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Download className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold">Məlumatları İxrac Et</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Seçilmiş müəssisələrin mövcud məlumatlarını Excel formatında ixrac edin.
                  </p>
                  <Button 
                    onClick={handleExportInstitutions}
                    disabled={!selectedInstitutionType || generating}
                    variant="outline"
                    className="w-full"
                  >
                    {generating ? 'İxrac edilir...' : 'İxrac Et'}
                  </Button>
                </div>
              </div>

              {/* Template Instructions */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-medium text-amber-800 mb-2">Template istifadə qaydaları:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Template-də yalnız seçilmiş müəssisələr üçün sətırlər olacaq</li>
                  <li>• Mövcud məlumatlar template-də əvvəlcədən doldurulacaq</li>
                  <li>• Yalnız dəyişdirmək istədiyiniz sahələri yeniləyin</li>
                  <li>• Sütun başlıqlarını dəyişdirməyin</li>
                  <li>• UTIS kodları 8 rəqəmli olmalıdır (məcburi deyil)</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* File Upload Tab */}
          <TabsContent value="upload" className="mt-6">
            <div className="space-y-6">
              <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="mb-4">
                  <Label htmlFor="upload-file" className="cursor-pointer">
                    <span className="text-blue-600 hover:underline">
                      Fayl seçin
                    </span>
                    {' '}və ya buraya sürüşdürün
                  </Label>
                  <Input
                    id="upload-file"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Yalnız Excel faylları (.xlsx, .xls) qəbul edilir
                </p>
              </div>

              {uploadFile && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Seçilmiş fayl:</span>
                    <span>{uploadFile.name}</span>
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