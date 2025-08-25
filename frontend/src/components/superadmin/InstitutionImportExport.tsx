import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  BarChart3, 
  Users, 
  Building, 
  Hash,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importService } from '@/services/import';
import { institutionService } from '@/services/institutions';

interface ExportStats {
  filters_applied: Record<string, any>;
  total_institutions: number;
  active_institutions: number;
  inactive_institutions: number;
  level_breakdown: Record<number, number>;
  type_breakdown: Record<string, number>;
  export_ready: boolean;
}

export const InstitutionImportExport: React.FC = () => {
  console.log('🚀 InstitutionImportExport component rendering...');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [exportFilters, setExportFilters] = useState({
    type: 'all',
    level: 'all', 
    is_active: 'all',
    search: '',
    format: 'xlsx' as 'xlsx' | 'csv'
  });

  const queryClient = useQueryClient();

  // Get export statistics
  const { data: exportStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ExportStats>({
    queryKey: ['export-stats', exportFilters],
    queryFn: () => importService.getExportStats(exportFilters),
    enabled: true,
  });

  // Get institution types for filter dropdown
  const { data: institutionTypes } = useQuery({
    queryKey: ['institution-types'],
    queryFn: () => institutionService.getInstitutionTypes(),
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => importService.importInstitutions(file),
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['export-stats'] });
      refetchStats();
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => importService.exportInstitutions(exportFilters),
    onSuccess: (blob) => {
      const filename = `tehsil_muessiseler_${new Date().toISOString().slice(0, 10)}.${exportFilters.format}`;
      importService.downloadFileBlob(blob, filename);
    },
  });

  // Template download mutation
  const templateMutation = useMutation({
    mutationFn: () => importService.downloadTemplate('institutions'),
    onSuccess: (blob) => {
      importService.downloadFileBlob(blob, 'məktəb_import_template.xlsx');
    },
  });

  // UTIS code generation mutation
  const utisMutation = useMutation({
    mutationFn: (type: 'users' | 'institutions' | 'both') => 
      importService.generateMissingUtisCode(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-stats'] });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = importService.validateFile(file);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Müəssisələr İdxal/İxrac</h1>
        <p className="text-muted-foreground">Excel və CSV formatında təhsil müəssisələrini idxal və ixrac edin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              İdxal (Import)
            </CardTitle>
            <CardDescription>
              Excel və ya CSV faylından müəssisə məlumatlarını idxal edin
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
                Template Yüklə
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
              İdxal Et
            </Button>

            {/* Import Results */}
            {importResult && (
              <Alert className={importResult.success_count > 0 ? 'border-green-200' : 'border-red-200'}>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Nəticə:</strong></p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Uğurlu: {importResult.success_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-red-500" />
                        <span>Xəta: {importResult.errors?.length || 0}</span>
                      </div>
                    </div>
                    {importResult.errors && importResult.errors.length > 0 && (
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

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              İxrac (Export)
            </CardTitle>
            <CardDescription>
              Mövcud müəssisə məlumatlarını Excel və ya CSV formatında ixrac edin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Növ</Label>
                <Select value={exportFilters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Hamısı" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    <SelectItem value="ministry">Nazirlik</SelectItem>
                    <SelectItem value="regional_education_department">Regional İdarə</SelectItem>
                    <SelectItem value="sector_education_office">Sektor</SelectItem>
                    <SelectItem value="secondary_school">Məktəb</SelectItem>
                    <SelectItem value="kindergarten">Uşaq bağçası</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Səviyyə</Label>
                <Select value={exportFilters.level} onValueChange={(value) => handleFilterChange('level', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Hamısı" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    <SelectItem value="1">Səviyyə 1</SelectItem>
                    <SelectItem value="2">Səviyyə 2</SelectItem>
                    <SelectItem value="3">Səviyyə 3</SelectItem>
                    <SelectItem value="4">Səviyyə 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={exportFilters.is_active} onValueChange={(value) => handleFilterChange('is_active', value)}>
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
                <Select value={exportFilters.format} onValueChange={(value) => handleFilterChange('format', value)}>
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

            <div>
              <Label>Axtarış</Label>
              <Input 
                placeholder="Ad, kod və ya UTIS koduna görə..."
                value={exportFilters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
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
                    <div className="font-semibold text-lg">{exportStats.total_institutions}</div>
                    <div className="text-muted-foreground">Ümumi</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg text-green-600">{exportStats.active_institutions}</div>
                    <div className="text-muted-foreground">Aktiv</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg text-red-600">{exportStats.inactive_institutions}</div>
                    <div className="text-muted-foreground">Qeyri-aktiv</div>
                  </div>
                </div>
              </div>
            )}

            {/* Export Button */}
            <Button 
              onClick={handleExport}
              disabled={exportMutation.isPending || !exportStats?.export_ready}
              className="w-full"
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              İxrac Et ({exportStats?.total_institutions || 0} müəssisə)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* UTIS Code Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            UTIS Kod İdarəetməsi
          </CardTitle>
          <CardDescription>
            Mövcud qeydlər üçün unikal 8 rəqəmli UTIS kodları yaradın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => utisMutation.mutate('institutions')}
              disabled={utisMutation.isPending}
            >
              {utisMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Building className="h-4 w-4 mr-2" />
              )}
              Müəssisələr üçün kod yarat
            </Button>
            <Button 
              variant="outline"
              onClick={() => utisMutation.mutate('users')}
              disabled={utisMutation.isPending}
            >
              {utisMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              İstifadəçilər üçün kod yarat
            </Button>
            <Button 
              onClick={() => utisMutation.mutate('both')}
              disabled={utisMutation.isPending}
            >
              {utisMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Hash className="h-4 w-4 mr-2" />
              )}
              Hamısı üçün kod yarat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstitutionImportExport;