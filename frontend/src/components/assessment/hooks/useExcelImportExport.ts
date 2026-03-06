import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { assessmentService } from '@/services/assessments';
import { assessmentTypeService } from '@/services/assessmentTypes';
import { institutionService } from '@/services/institutions';

export interface ImportError {
  row: number;
  field: string;
  message: string;
  student_name?: string;
}

export interface ImportResult {
  total_rows: number;
  successful_imports: number;
  failed_imports: number;
  errors: ImportError[];
  warnings: string[];
  import_id: string;
}

export interface ImportFormData {
  institution_id: number | string;
  assessment_type_id: number | string;
  grade_level: string;
  class_name: string;
  assessment_date: string;
}

export interface ExportFormData {
  institution_id: number | string;
  assessment_type_id: number | string;
  grade_level: string;
  class_name: string;
  date_from: string;
  date_to: string;
  format: string;
}

export const useExcelImportExport = (
  initialInstitution?: number,
  initialAssessmentType?: number
) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [selectedTab, setSelectedTab] = useState('import');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Form states
  const [importForm, setImportForm] = useState<ImportFormData>({
    institution_id: initialInstitution || '',
    assessment_type_id: initialAssessmentType || '',
    grade_level: '',
    class_name: '',
    assessment_date: new Date().toISOString().split('T')[0]
  });

  const [exportForm, setExportForm] = useState<ExportFormData>({
    institution_id: initialInstitution || '',
    assessment_type_id: initialAssessmentType || '',
    grade_level: '',
    class_name: '',
    date_from: '',
    date_to: '',
    format: 'xlsx'
  });

  // Data for dropdowns
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [assessmentTypes, setAssessmentTypes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Load dropdown data
  const loadDropdownData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [institutionsResponse, typesResponse] = await Promise.all([
        institutionService.getInstitutions(),
        assessmentTypeService.getAssessmentTypes()
      ]);
      
      setInstitutions(institutionsResponse.data || []);
      setAssessmentTypes(typesResponse.data || []);
    } catch (error) {
      toast({
        title: 'Məlumat yükləmə xətası',
        description: 'Məlumatlar yüklənə bilmədi',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Fayl növü xətası',
        description: 'Yalnız Excel (.xlsx, .xls) və CSV faylları dəstəklənir',
        variant: 'destructive',
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Fayl ölçüsü xətası',
        description: 'Fayl ölçüsü maksimum 10MB ola bilər',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: 'Fayl seçin',
        description: 'İmport üçün fayl seçməlisiniz',
        variant: 'destructive',
      });
      return;
    }

    if (!importForm.institution_id || !importForm.assessment_type_id) {
      toast({
        title: 'Məlumat eksikliyi',
        description: 'Müəssisə və qiymətləndirmə növü seçməlisiniz',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('institution_id', importForm.institution_id.toString());
      formData.append('assessment_type_id', importForm.assessment_type_id.toString());
      formData.append('grade_level', importForm.grade_level);
      formData.append('class_name', importForm.class_name);
      formData.append('assessment_date', importForm.assessment_date);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await assessmentService.importFromExcel(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setImportResult(result);
      
      toast({
        title: 'İmport tamamlandı',
        description: `${result.successful_imports} məlumat uğurla import edildi`,
      });
    } catch (error: any) {
      toast({
        title: 'İmport xətası',
        description: error.message || 'İmport zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      setUploadProgress(0);
    }
  };

  const handleExport = async () => {
    if (!exportForm.institution_id) {
      toast({
        title: 'Məlumat eksikliyi',
        description: 'Müəssisə seçməlisiniz',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);

    try {
      const exportData = {
        institution_id: exportForm.institution_id,
        assessment_type_id: exportForm.assessment_type_id || undefined,
        grade_level: exportForm.grade_level || undefined,
        class_name: exportForm.class_name || undefined,
        date_from: exportForm.date_from || undefined,
        date_to: exportForm.date_to || undefined,
        format: exportForm.format
      };

      const response = await assessmentService.exportToExcel(exportData);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = `qiymetlendirme_export_${new Date().toISOString().split('T')[0]}.${exportForm.format}`;
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Export uğurlu',
        description: 'Məlumatlar uğurla export edildi',
      });
    } catch (error: any) {
      toast({
        title: 'Export xətası',
        description: error.message || 'Export zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const clearImportResult = () => {
    setImportResult(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await assessmentService.downloadTemplate();
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'qiymetlendirme_template.xlsx');
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Şablon yükləndi',
        description: 'Excel şablonu uğurla yükləndi',
      });
    } catch (error: any) {
      toast({
        title: 'Şablon xətası',
        description: 'Şablon yüklənə bilmədi',
        variant: 'destructive',
      });
    }
  };

  const validateImportForm = () => {
    return !!(importForm.institution_id && importForm.assessment_type_id && selectedFile);
  };

  const validateExportForm = () => {
    return !!exportForm.institution_id;
  };

  const getGradeLevels = () => {
    return Array.from({length: 11}, (_, i) => ({
      value: (i + 1).toString(),
      label: `${i + 1}-ci sinif`
    }));
  };

  const getFormatOptions = () => {
    return [
      { value: 'xlsx', label: 'Excel (.xlsx)' },
      { value: 'csv', label: 'CSV (.csv)' },
      { value: 'pdf', label: 'PDF (.pdf)' }
    ];
  };

  return {
    // State
    selectedTab,
    importing,
    exporting,
    uploadProgress,
    importResult,
    selectedFile,
    importForm,
    exportForm,
    institutions,
    assessmentTypes,
    loadingData,
    fileInputRef,
    
    // Actions
    setSelectedTab,
    setImportForm,
    setExportForm,
    
    // Event handlers
    handleFileSelect,
    handleImport,
    handleExport,
    clearImportResult,
    downloadTemplate,
    loadDropdownData,
    
    // Utilities
    validateImportForm,
    validateExportForm,
    getGradeLevels,
    getFormatOptions
  };
};
