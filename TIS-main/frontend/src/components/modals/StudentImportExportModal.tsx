import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  BarChart3,
  CheckCircle,
  XCircle,
  Loader2,
  GraduationCap,
  Users
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentService } from '@/services/students';
import { useAuth } from '@/contexts/AuthContext';

interface StudentImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportStats {
  total_students: number;
  active_students: number;
  inactive_students: number;
  by_class: Record<string, number>;
  by_institution: Record<string, number>;
}

export const StudentImportExportModal: React.FC<StudentImportExportModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [exportFilters, setExportFilters] = useState({
    class_id: 'all',
    institution_id: currentUser?.institution?.id || 'all',
    is_active: 'all',
    format: 'xlsx' as 'xlsx' | 'csv'
  });

  const queryClient = useQueryClient();

  // Get export statistics
  const { data: exportStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ExportStats>({
    queryKey: ['student-export-stats', exportFilters],
    queryFn: () => studentService.getExportStats(exportFilters),
    enabled: isOpen,
  });

  // Template download mutation
  const templateMutation = useMutation({
    mutationFn: () => studentService.downloadTemplate(),
    onSuccess: (blob) => {
      const filename = `student_import_template_${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadFileBlob(blob, filename);
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => studentService.importStudents(file),
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['student-export-stats'] });
      refetchStats();
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => studentService.exportStudents(exportFilters),
    onSuccess: (blob) => {
      const filename = `students_export_${new Date().toISOString().slice(0, 10)}.${exportFilters.format}`;
      downloadFileBlob(blob, filename);
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

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleTemplateDownload = () => {
    templateMutation.mutate();
  };

  const handleFilterChange = (key: string, value: string) => {
    setExportFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? '' : value
    }));
  };

  const validateFile = (file: File): {valid: boolean, error?: string} => {
    // Check file size (max 10MB)
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

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Yalnız Excel (.xlsx, .xls) və CSV faylları dəstəklənir'
      };
    }

    return { valid: true };
  };

  const downloadFileBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Şagird İdxal/İxrac</DialogTitle>
          <DialogDescription>
            Şagirdləri Excel faylından idxal edin və ya mövcud şagirdləri ixrac edin
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              İdxal (Import)
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              İxrac (Export)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-6">
            <div className="space-y-6">
              {/* Import Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Şagird İdxalı
                  </CardTitle>
                  <CardDescription>
                    Excel və ya CSV faylından şagird məlumatlarını idxal edin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Template Download */}
                  <div>
                    <Label>İdxal Template-i</Label>
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={handleTemplateDownload}
                      disabled={templateMutation.isPending}
                    >
                      {templateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                      )}
                      Şagird Template Yüklə
                    </Button>
                  </div>

                  <Separator />

                  {/* File Selection */}
                  <div>
                    <Label>Fayl Seçin</Label>
                    <Input 
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="mt-2"
                    />
                    {selectedFile && (
                      <div className="mt-2 p-2 bg-muted rounded flex items-center justify-between">
                        <span className="text-sm">{selectedFile.name}</span>
                        <Badge variant="secondary">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Import Button */}
                  <Button 
                    onClick={handleImport}
                    disabled={!selectedFile || importMutation.isPending}
                    className="w-full"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Şagird İdxal Et
                  </Button>

                  {/* Import Results */}
                  {importResult && (
                    <Alert className={importResult.created > 0 ? 'border-green-200' : 'border-red-200'}>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p><strong>Nəticə:</strong></p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span>Uğurlu: {importResult.created}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <XCircle className="h-3 w-3 text-red-500" />
                              <span>Xəta: {importResult.errors?.length || 0}</span>
                            </div>
                          </div>
                          {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm font-medium">Xəta təfərrüatları</summary>
                              <ul className="mt-1 text-xs space-y-1 max-h-32 overflow-y-auto">
                                {importResult.errors.map((error: string, index: number) => (
                                  <li key={index} className="text-red-600">• {error}</li>
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
            </div>
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <div className="space-y-6">
              {/* Export Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Şagird İxracı
                  </CardTitle>
                  <CardDescription>
                    Mövcud şagird məlumatlarını Excel və ya CSV formatında ixrac edin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Status</Label>
                      <Select 
                        value={exportFilters.is_active} 
                        onValueChange={(value) => handleFilterChange('is_active', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Hamısı" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Hamısı</SelectItem>
                          <SelectItem value="true">Aktiv</SelectItem>
                          <SelectItem value="false">Qeyri-aktiv</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Format</Label>
                      <Select 
                        value={exportFilters.format} 
                        onValueChange={(value) => setExportFilters(prev => ({ ...prev, format: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                          <SelectItem value="csv">CSV (.csv)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Export Stats */}
                  {exportStats && !statsLoading && (
                    <div className="bg-muted p-3 rounded-lg">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        İxrac Statistikası
                      </h4>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-lg">{exportStats.total_students}</div>
                          <div className="text-muted-foreground">Ümumi</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-lg text-green-600">{exportStats.active_students}</div>
                          <div className="text-muted-foreground">Aktiv</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-lg text-red-600">{exportStats.inactive_students}</div>
                          <div className="text-muted-foreground">Qeyri-aktiv</div>
                        </div>
                      </div>
                      {exportStats.by_class && Object.keys(exportStats.by_class).length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium mb-2">Siniflərə görə:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(exportStats.by_class).map(([className, count]) => (
                              <div key={className} className="flex justify-between">
                                <span className="truncate">{className}:</span>
                                <span className="font-semibold">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Export Button */}
                  <Button 
                    onClick={handleExport}
                    disabled={exportMutation.isPending}
                    className="w-full"
                  >
                    {exportMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    İxrac Et ({exportStats?.total_students || 0} şagird)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StudentImportExportModal;