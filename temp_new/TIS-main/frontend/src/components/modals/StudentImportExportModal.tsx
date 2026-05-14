import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '@/services/students';
import { downloadBlob, buildExportFilename } from '@/utils/fileDownload';
import { type ImportResult, validateImportFile } from '@/types/import-export';

interface StudentImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentImportExportModal: React.FC<StudentImportExportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const queryClient = useQueryClient();

  // Template download
  const templateMutation = useMutation({
    mutationFn: () => studentService.downloadTemplate(),
    onSuccess: (blob) => {
      downloadBlob(blob, buildExportFilename('sagird_import_template', 'xlsx'));
    },
  });

  // Import
  const importMutation = useMutation({
    mutationFn: (file: File) => studentService.importStudents(file),
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  // Export
  const exportMutation = useMutation({
    mutationFn: () => studentService.exportStudents({}),
    onSuccess: (blob) => {
      downloadBlob(blob, buildExportFilename('sagirdler', 'xlsx'));
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImportFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Şagird İdxal / İxrac</DialogTitle>
          <DialogDescription>
            Excel faylından şagird idxal edin və ya cari şagirdləri ixrac edin
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              İdxal
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              İxrac
            </TabsTrigger>
          </TabsList>

          {/* ── IMPORT TAB ── */}
          <TabsContent value="import" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Template yüklə
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => templateMutation.mutate()}
                  disabled={templateMutation.isPending}
                >
                  {templateMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <Download className="h-4 w-4 mr-2" />}
                  Template Excel Yüklə
                </Button>
              </CardContent>
            </Card>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Fayl İdxalı
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Excel faylı seçin (.xlsx)</Label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="mt-2"
                  />
                  {selectedFile && (
                    <div className="mt-2 p-2 bg-muted rounded flex items-center justify-between text-sm">
                      <span className="truncate">{selectedFile.name}</span>
                      <Badge variant="secondary">{(selectedFile.size / 1024).toFixed(0)} KB</Badge>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => selectedFile && importMutation.mutate(selectedFile)}
                  disabled={!selectedFile || importMutation.isPending}
                  className="w-full"
                >
                  {importMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <Upload className="h-4 w-4 mr-2" />}
                  İdxal Et
                </Button>

                {importResult && (
                  <Alert className={importResult.created > 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
                    <AlertDescription>
                      <div className="space-y-2 text-sm">
                        <div className="flex gap-4">
                          <span className="flex items-center gap-1 text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Uğurlu: <strong>{importResult.created}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-red-700">
                            <XCircle className="h-3 w-3" />
                            Xəta: <strong>{importResult.errors?.length ?? 0}</strong>
                          </span>
                        </div>
                        {importResult.errors?.length > 0 && (
                          <details>
                            <summary className="cursor-pointer font-medium text-red-700">Xəta detalları</summary>
                            <ul className="mt-1 space-y-0.5 max-h-28 overflow-y-auto">
                              {importResult.errors.map((err, i) => (
                                <li key={i} className="text-xs text-red-600">
                                  • {err.row != null ? `Sətir ${err.row}: ` : ''}{err.message}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── EXPORT TAB ── */}
          <TabsContent value="export" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Excel İxracı
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Bütün şagirdlər Excel (.xlsx) formatında ixrac ediləcək.
                </p>

                {exportMutation.isError && (
                  <Alert className="border-red-300 bg-red-50">
                    <AlertDescription className="text-sm text-red-700">
                      İxrac zamanı xəta baş verdi. Yenidən cəhd edin.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className="w-full"
                >
                  {exportMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <Download className="h-4 w-4 mr-2" />}
                  Şagirdləri Excel-ə İxrac Et
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StudentImportExportModal;
