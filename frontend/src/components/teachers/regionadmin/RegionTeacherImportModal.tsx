/**
 * RegionTeacherImportModal - Import/Export Modal for RegionAdmin
 * Handles bulk teacher import and export operations for multiple institutions
 */

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { regionAdminTeacherService } from '@/services/regionAdminTeachers';

interface RegionTeacherImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegionTeacherImportModal: React.FC<RegionTeacherImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);

  // Download template handler - Direct backend call
  const handleDownloadTemplate = async () => {
    try {
      await regionAdminTeacherService.downloadImportTemplate();
      toast({
        title: 'Uğurlu',
        description: 'Şablon yükləndi',
      });
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: error.message || 'Şablonu yükləyərkən xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (file: File) =>
      regionAdminTeacherService.importTeachers(file, {
        skip_duplicates: skipDuplicates,
        update_existing: updateExisting,
      }),
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['regionadmin-teachers'] });

      if (result.imported > 0) {
        toast({
          title: 'İdxal tamamlandı',
          description: `${result.imported} müəllim uğurla idxal edildi${
            result.errors > 0 ? `, ${result.errors} xəta baş verdi` : ''
          }`,
        });
      } else {
        toast({
          title: 'Xəbərdarlıq',
          description: 'Heç bir müəllim idxal edilmədi',
          variant: 'destructive',
        });
      }

      // Clear file after import
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: 'İdxal xətası',
        description: error.message || 'Müəllimləri idxal edərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null); // Clear previous results
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast({
        title: 'Xəta',
        description: 'Zəhmət olmasa fayl seçin',
        variant: 'destructive',
      });
      return;
    }

    importMutation.mutate(selectedFile);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Müəllim İdxalı və İxracı
          </DialogTitle>
          <DialogDescription>
            Müəllimləri toplu şəkildə idxal edin və ya mövcud məlumatları ixrac edin
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">İdxal</TabsTrigger>
            <TabsTrigger value="export">İxrac</TabsTrigger>
          </TabsList>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="space-y-4">
            {/* Instructions */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">İdxal addımları:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Excel şablon faylını yükləyin (.xlsx)</li>
                    <li>
                      Şablondakı məcburi sahələri doldurun:
                      <ul className="list-disc list-inside ml-4 mt-1 text-xs">
                        <li>email, username, ad, soyad, ata adı</li>
                        <li>müəssisə ID, vəzifə, iş yeri növü, ixtisas</li>
                        <li>qiymətləndirmə növü və balı, şifrə</li>
                      </ul>
                    </li>
                    <li>Doldurulmuş faylı yükləyin və idxal edin</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    📝 Şablonda 3 vərəq var: 1) Əsas məlumatlar, 2) Müəssisələr, 3) Sahə izahları
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {/* Download Template */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Excel Şablon Faylı</CardTitle>
                <CardDescription>
                  Excel şablon faylını yükləyin və müəllim məlumatlarını doldurun
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Excel Şablon Yüklə (.xlsx)
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  ✅ Şablon faylında mövcud müəssisələrin siyahısı və sahə izahları daxildir
                </p>
              </CardContent>
            </Card>

            {/* Import Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. İdxal Seçimləri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skip-duplicates"
                    checked={skipDuplicates}
                    onCheckedChange={(checked) => setSkipDuplicates(!!checked)}
                  />
                  <Label htmlFor="skip-duplicates" className="text-sm cursor-pointer">
                    Təkrarlananları keç
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="update-existing"
                    checked={updateExisting}
                    onCheckedChange={(checked) => setUpdateExisting(!!checked)}
                    disabled={skipDuplicates}
                  />
                  <Label
                    htmlFor="update-existing"
                    className={`text-sm ${skipDuplicates ? 'opacity-50' : 'cursor-pointer'}`}
                  >
                    Mövcud müəllimləri yenilə
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Excel Fayl Yüklə</CardTitle>
                <CardDescription>
                  Doldurulmuş Excel faylını seçin və idxal edin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="flex-1 text-sm"
                  />
                  {selectedFile && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <FileSpreadsheet className="h-3 w-3" />
                      {selectedFile.name}
                    </Badge>
                  )}
                </div>

                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || importMutation.isPending}
                  className="w-full"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      İdxal edilir...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      İdxal Et
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Import Results */}
            {importResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">İdxal Nəticəsi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Uğurlu</p>
                        <p className="text-2xl font-bold text-green-600">
                          {importResult.imported}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-600">Xəta</p>
                        <p className="text-2xl font-bold text-red-600">{importResult.errors}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Success Details */}
                  {importResult.details?.success?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Uğurlu idxallar:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResult.details.success.map((msg: string, idx: number) => (
                          <p key={idx} className="text-xs text-green-600">
                            ✓ {msg}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Details */}
                  {importResult.details?.errors?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Xətalar:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResult.details.errors.map((msg: string, idx: number) => (
                          <p key={idx} className="text-xs text-red-600">
                            ✗ {msg}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* EXPORT TAB */}
          <TabsContent value="export" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Export funksiyası hazırda aktiv filtrlərlə işləyir. Müəllimləri export etmək üçün
                əsas səhifədəki "Export" düyməsindən istifadə edin.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Bağla
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
