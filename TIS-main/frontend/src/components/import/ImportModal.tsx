import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { schoolAdminService } from '@/services/schoolAdmin';
import { importService } from '@/services/import';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'students' | 'teachers' | 'institutions';
  onImportComplete?: () => void;
}

export function ImportModal({ open, onOpenChange, type, onImportComplete }: ImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeLabels = {
    students: 'Şagird',
    teachers: 'Müəllim', 
    institutions: 'Məktəb/Bağça'
  };

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      switch (type) {
        case 'students':
          return schoolAdminService.importStudents(file);
        case 'teachers':
          return schoolAdminService.importTeachers(file);
        case 'institutions':
          return importService.importInstitutions(file);
        default:
          throw new Error('Invalid import type');
      }
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setSelectedFile(null);
      onOpenChange(false);
      onImportComplete?.();
      
      // Show detailed results
      if (result.errors.length > 0) {
        toast.warning(`${result.success_count}/${result.total_processed} qeyd idxal edildi. ${result.errors.length} xəta var.`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'İdxal zamanı xəta baş verdi');
    }
  });

  const downloadTemplateMutation = useMutation({
    mutationFn: () => importService.downloadTemplate(type),
    onSuccess: (blob) => {
      const filename = `${typeLabels[type].toLowerCase()}_template.xlsx`;
      importService.downloadFileBlob(blob, filename);
      toast.success('Şablon yükləndi');
    },
    onError: () => {
      toast.error('Şablon yüklənərkən xəta baş verdi');
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const validation = importService.validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = () => {
    if (!selectedFile) return;
    importMutation.mutate(selectedFile);
  };

  const handleDownloadTemplate = () => {
    downloadTemplateMutation.mutate();
  };

  const reset = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {typeLabels[type]} İdxalı
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">İdxal Şablonu</h4>
                <p className="text-sm text-blue-700 mt-1">
                  İdxal etməzdən əvvəl şablonu yükləyin və məlumatları düzgün formada hazırlayın.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleDownloadTemplate}
                  disabled={downloadTemplateMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadTemplateMutation.isPending ? 'Yüklənir...' : 'Şablonu Yüklə'}
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive 
                ? "border-primary bg-primary/5" 
                : "border-gray-300 hover:border-gray-400",
              selectedFile ? "border-green-500 bg-green-50" : ""
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <p className="font-medium text-green-900">Fayl seçildi</p>
                <p className="text-sm text-green-700">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  Ölçü: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Dəyiş
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="font-medium text-gray-700">
                  Excel və ya CSV faylını bura atın
                </p>
                <p className="text-sm text-gray-500">
                  və ya faylı seçmək üçün klikləyin
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2"
                >
                  Fayl Seç
                </Button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Import Progress */}
          {importMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                <span className="text-sm font-medium">İdxal edilir...</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Validation Info */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Qeyd:</strong> Fayl şablona uyğun olmalıdır. 
              UTIS kodları boş buraxıla bilər (avtomatik yaradılacaq). 
              E-mail və valideyn məlumatları şagirdlər üçün məcburi deyil.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importMutation.isPending}
            >
              Ləğv et
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
            >
              {importMutation.isPending ? 'İdxal edilir...' : 'İdxal et'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}