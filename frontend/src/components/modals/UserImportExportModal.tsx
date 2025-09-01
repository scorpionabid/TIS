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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Users,
  GraduationCap,
  UserCheck
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';

interface UserImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  teachers: number;
  students: number;
  staff: number;
  by_role: Record<string, number>;
  by_institution: Record<string, number>;
}

export const UserImportExportModal: React.FC<UserImportExportModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedRoleType, setSelectedRoleType] = useState<string>('');
  const [exportFilters, setExportFilters] = useState({
    role: '',
    institution_id: currentUser?.institution?.id || 'all',
    is_active: 'all',
    format: 'xlsx' as 'xlsx' | 'csv'
  });

  const queryClient = useQueryClient();

  // Get available roles for current user's context
  const { data: availableRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['available-roles', currentUser?.id],
    queryFn: () => userService.getAvailableRoles(),
    enabled: isOpen && !!currentUser,
  });

  // Get export statistics
  const { data: exportStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ExportStats>({
    queryKey: ['user-export-stats', exportFilters],
    queryFn: () => userService.getExportStats(exportFilters),
    enabled: isOpen,
  });

  // Template download mutation
  const templateMutation = useMutation({
    mutationFn: (roleType: string) => userService.downloadRoleTemplate(roleType),
    onSuccess: (blob) => {
      const filename = `${selectedRoleType}_import_template_${new Date().toISOString().slice(0, 10)}.xlsx`;
      userService.downloadFileBlob(blob, filename);
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: ({ file, roleType }: { file: File, roleType: string }) => 
      userService.importUsersByRole(file, roleType),
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['user-export-stats'] });
      refetchStats();
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => {
      if (exportFilters.role && exportFilters.role !== 'all') {
        return userService.exportUsersByRole(exportFilters.role, exportFilters);
      } else {
        return userService.exportUsers(exportFilters);
      }
    },
    onSuccess: (blob) => {
      const roleName = exportFilters.role && exportFilters.role !== 'all' ? exportFilters.role : 'users';
      const filename = `${roleName}_export_${new Date().toISOString().slice(0, 10)}.${exportFilters.format}`;
      userService.downloadFileBlob(blob, filename);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = userService.validateFile(file);
      if (validation.valid) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        alert(`Fayl səhvi: ${validation.error}`);
      }
    }
  };

  const handleImport = () => {
    if (selectedFile && selectedRoleType) {
      importMutation.mutate({ file: selectedFile, roleType: selectedRoleType });
    }
  };

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleTemplateDownload = () => {
    if (selectedRoleType) {
      templateMutation.mutate(selectedRoleType);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setExportFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? '' : value
    }));
  };

  const getRoleIcon = (role: string) => {
    const lowerRole = role.toLowerCase();
    if (lowerRole.includes('müəllim') || lowerRole.includes('teacher')) {
      return <GraduationCap className="h-4 w-4" />;
    } else if (lowerRole.includes('şagird') || lowerRole.includes('student')) {
      return <Users className="h-4 w-4" />;
    } else if (lowerRole.includes('admin') || lowerRole.includes('operator')) {
      return <UserCheck className="h-4 w-4" />;
    }
    return <Users className="h-4 w-4" />;
  };

  const getRoleLabel = (role: any) => {
    if (typeof role === 'object' && role.display_name) {
      return role.display_name;
    }
    if (typeof role === 'object' && role.name) {
      return role.name;
    }
    return typeof role === 'string' ? role : 'İstifadəçi';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>İstifadəçi İdxal/İxrac</DialogTitle>
          <DialogDescription>
            İstifadəçiləri Excel faylından idxal edin və ya mövcud istifadəçiləri ixrac edin
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
              {/* Role Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>İstifadəçi Rolunu Seçin</CardTitle>
                  <CardDescription>İdxal etmək istədiyiniz rol növünü seçin</CardDescription>
                </CardHeader>
                <CardContent>
                  {rolesLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Rollar yüklənir...</span>
                    </div>
                  ) : availableRoles && availableRoles.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availableRoles.map((role) => (
                        <div
                          key={role.id}
                          className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-all ${
                            selectedRoleType === role.name 
                              ? 'border-primary bg-primary/5' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedRoleType(role.name)}
                        >
                          <div className="flex flex-col items-center gap-2">
                            {getRoleIcon(role.name)}
                            <span className="font-medium text-sm">{getRoleLabel(role)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      İstifadəçi rollari tapılmadı
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Import Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    {selectedRoleType ? getRoleLabel(availableRoles?.find(r => r.name === selectedRoleType) || selectedRoleType) : 'İstifadəçi'} İdxalı
                  </CardTitle>
                  <CardDescription>
                    Excel və ya CSV faylından {selectedRoleType ? selectedRoleType.toLowerCase() : 'istifadəçi'} məlumatlarını idxal edin
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
                      {selectedRoleType ? getRoleLabel(availableRoles?.find(r => r.name === selectedRoleType) || selectedRoleType) : 'Template'} Yüklə
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
                    disabled={!selectedFile || !selectedRoleType || importMutation.isPending}
                    className="w-full"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {selectedRoleType ? getRoleLabel(availableRoles?.find(r => r.name === selectedRoleType) || selectedRoleType) : 'İstifadəçi'} İdxal Et
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
            </div>
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <div className="space-y-6">
              {/* Export Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    İstifadəçi İxracı
                  </CardTitle>
                  <CardDescription>
                    Mövcud istifadəçi məlumatlarını Excel və ya CSV formatında ixrac edin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>İstifadəçi Rolu</Label>
                      <Select 
                        value={exportFilters.role} 
                        onValueChange={(value) => handleFilterChange('role', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rol seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Bütün rollar</SelectItem>
                          {availableRoles?.map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                              <div className="flex items-center gap-2">
                                {getRoleIcon(role.name)}
                                {getRoleLabel(role)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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
                          <div className="font-semibold text-lg">{exportStats.total_users}</div>
                          <div className="text-muted-foreground">Ümumi</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-lg text-green-600">{exportStats.active_users}</div>
                          <div className="text-muted-foreground">Aktiv</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-lg text-red-600">{exportStats.inactive_users}</div>
                          <div className="text-muted-foreground">Qeyri-aktiv</div>
                        </div>
                      </div>
                      {exportStats.by_role && Object.keys(exportStats.by_role).length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium mb-2">Rollara göre:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(exportStats.by_role).map(([role, count]) => (
                              <div key={role} className="flex justify-between">
                                <span className="truncate">{role}:</span>
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
                    İxrac Et ({exportStats?.total_users || 0} istifadəçi)
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

export default UserImportExportModal;