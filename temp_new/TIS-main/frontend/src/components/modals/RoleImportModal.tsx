/**
 * RoleImportModal — universal, yenidən istifadə edilə bilən import modalı.
 * Rol səhifələrindən (Teachers, Students, PreschoolAdmins...) çağırılır.
 * Role seçimi addımı yoxdur — rol prop kimi ötürülür.
 *
 * İstifadəsi:
 *   <RoleImportModal
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     role="teachers"        // backend user_type/role_id dəyəri
 *     roleLabel="Müəllimlər" // UI-da göstəriləcək ad
 *     onSuccess={() => refetch()}
 *   />
 */
import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Upload, Download, FileSpreadsheet, CheckCircle, XCircle,
  AlertTriangle, Loader2, FileText, Save, ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/users';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface RoleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Backend user_type/role_id: 'teachers' | 'students' | 'staff' */
  role: string;
  /** Azərbaycan dilində görünən ad, məs. "Müəllimlər" */
  roleLabel: string;
  /** Import uğurlu olduqda çağırılır (siyahını yeniləmək üçün) */
  onSuccess?: () => void;
}

type Step = 'upload' | 'confirm' | 'result';

const translateAttribute = (attr: string): string => {
  const map: Record<string, string> = {
    first_name: 'Ad', last_name: 'Soyad', email: 'E-poçt',
    utis_code: 'UTİS kodu', date_of_birth: 'Doğum tarixi',
    gender: 'Cins', phone: 'Telefon', position: 'Vəzifə',
    department_name: 'Şöbə adı', grade_name: 'Sinif adı',
    enrollment_date: 'Qeydiyyat tarixi', address: 'Ünvan',
  };
  return map[attr] ?? attr;
};

export const RoleImportModal: React.FC<RoleImportModalProps> = ({
  isOpen, onClose, role, roleLabel, onSuccess,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<unknown[][]>([]);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    errors: unknown[];
  } | null>(null);

  const queryClient = useQueryClient();

  const templateMutation = useMutation({
    mutationFn: () => userService.downloadRoleTemplate(role),
    onSuccess: (blob) => {
      userService.downloadFileBlob(blob, `${role}_sablon.xlsx`);
    },
    onError: () => {
      toast({ title: 'Xəta', description: 'Şablon yüklənmədi. Yenidən cəhd edin.', variant: 'destructive' });
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ file }: { file: File }) =>
      userService.importUsersByRole(file, role),
    onSuccess: (result) => {
      setImportResult(result);
      setStep('result');

      const created = result.created ?? 0;
      const updated = result.updated ?? 0;
      const errorCount = result.errors?.length ?? 0;

      if (created === 0 && updated === 0 && errorCount > 0) {
        toast({
          title: 'İdxal uğursuz oldu',
          description: 'Heç bir qeyd idxal edilmədi. UTİS kodlarını yoxlayın.',
          variant: 'destructive',
        });
      } else if (errorCount > 0) {
        toast({
          title: 'İdxal qismən tamamlandı',
          description: `${created} yaradıldı, ${updated} yeniləndi, ${errorCount} xəta.`,
        });
      } else {
        toast({
          title: 'Uğurlu İdxal',
          description: `${created} yeni, ${updated} yeniləndi.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: [role] });
      onSuccess?.();
    },
    onError: (error: { errors?: unknown[]; message?: string }) => {
      if (error.errors && error.errors.length > 0) {
        setImportResult({ created: 0, updated: 0, errors: error.errors });
        setStep('result');
      }
      toast({
        title: 'İdxal xətası',
        description: error.message ?? 'Bilinməyən xəta. Fayl formatını yoxlayın.',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = userService.validateFile(file);
    if (!validation.valid) {
      toast({ title: 'Fayl Xətası', description: validation.error, variant: 'destructive' });
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
      setPreviewData(json.filter((r) => (r as unknown[]).length > 0).slice(0, 6) as unknown[][]);
    };
    reader.readAsArrayBuffer(file);
    setStep('confirm');
  };

  const reset = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewData([]);
    setImportResult(null);
  };

  const steps: Step[] = ['upload', 'confirm', 'result'];
  const stepLabels = { upload: 'Fayl', confirm: 'Təsdiq', result: 'Nəticə' };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            {roleLabel} — Kütləvi İdxal
          </DialogTitle>
          <DialogDescription>
            Şablonu yükləyin, doldurun və import edin. UTİS kodu məcburidir.
          </DialogDescription>
        </DialogHeader>

        {/* Progress steps */}
        <div className="flex justify-between items-center px-12 py-4 relative">
          <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-muted -translate-y-1/2 z-0" />
          {steps.map((s, i) => (
            <div key={s} className="relative z-10 flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step === s ? 'bg-primary border-primary text-white shadow' :
                steps.indexOf(step) > i ? 'bg-green-500 border-green-500 text-white' :
                'bg-background border-muted text-muted-foreground'
              }`}>
                {steps.indexOf(step) > i ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${step === s ? 'text-primary' : 'text-muted-foreground'}`}>
                {stepLabels[s]}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center gap-4 text-center hover:border-primary/50 transition-colors">
                <div className="p-4 bg-primary/10 rounded-full">
                  <FileSpreadsheet className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{roleLabel} üçün Excel faylı seçin</p>
                  <p className="text-xs text-muted-foreground mt-1">XLSX, XLS — maksimum 10 MB</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    disabled={templateMutation.isPending}
                    onClick={() => templateMutation.mutate()}
                  >
                    {templateMutation.isPending
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <Download className="mr-2 h-4 w-4" />}
                    Şablonu Yüklə
                  </Button>
                  <Button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.xlsx,.xls';
                      input.onchange = (e) => handleFileSelect(e as unknown as React.ChangeEvent<HTMLInputElement>);
                      input.click();
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" /> Fayl Seç
                  </Button>
                </div>
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 text-sm font-semibold">Vacib qeyd</AlertTitle>
                <AlertDescription className="text-amber-700 text-xs">
                  Şablonu dəyişdirməyin — sütun başlıqları import üçün lazımdır.
                  UTİS kodu 7 rəqəm olmalıdır. Mövcud qeydlər UTİS kodu ilə tapılarsa yenilənəcək.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Preview & Confirm */}
          {step === 'confirm' && selectedFile && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-700 rounded">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {roleLabel} idxalı
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>Faylı Dəyiş</Button>
              </div>

              {previewData.length > 0 && (
                <Card>
                  <CardHeader className="py-2 px-4 bg-muted/50 border-b">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5" /> Önbaxış (İlk 5 sətir)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {(previewData[0] as unknown[])?.map((h, i) => (
                              <TableHead key={i} className="whitespace-nowrap text-xs bg-muted/20">
                                {String(h)}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.slice(1).map((row, i) => (
                            <TableRow key={i}>
                              {(row as unknown[]).map((cell, j) => (
                                <TableCell key={j} className="text-xs whitespace-nowrap">
                                  {String(cell ?? '')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={reset}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
                <Button
                  onClick={() => importMutation.mutate({ file: selectedFile })}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Save className="mr-2 h-4 w-4" />}
                  Təsdiqlə və İdxal Et
                </Button>
              </div>

              {importMutation.isPending && (
                <div className="space-y-1">
                  <Progress value={50} className="h-1.5" />
                  <p className="text-center text-xs text-muted-foreground">
                    Məlumatlar serverə ötürülür...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Result */}
          {step === 'result' && importResult && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-4">
              {(() => {
                const created   = importResult.created;
                const updated   = importResult.updated;
                const errCount  = importResult.errors.length;
                const processed = created + updated;
                const isFail    = processed === 0 && errCount > 0;
                const isPartial = processed > 0  && errCount > 0;

                const icon = isFail
                  ? <XCircle className="h-8 w-8" />
                  : isPartial
                    ? <AlertTriangle className="h-8 w-8" />
                    : <CheckCircle className="h-8 w-8" />;

                const iconBg = isFail
                  ? 'bg-red-100 text-red-600'
                  : isPartial
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-green-100 text-green-600';

                const title = isFail
                  ? 'İdxal Uğursuz Oldu'
                  : isPartial
                    ? 'İdxal Qismən Tamamlandı'
                    : 'İdxal Uğurla Tamamlandı';

                const subtitle = isFail
                  ? `${errCount} sətirdə xəta aşkarlandı, heç bir qeyd idxal edilmədi. UTİS kodlarını, sütun başlıqlarını və fayl formatını yoxlayın.`
                  : isPartial
                    ? `${created} yeni qeyd yaradıldı, ${updated} mövcud qeyd yeniləndi. ${errCount} sətir xəta ilə keçildi.`
                    : `${created} yeni qeyd yaradıldı${updated > 0 ? `, ${updated} mövcud qeyd yeniləndi` : ''}. Bütün sətirləri uğurla işlədi.`;

                return (
                  <div className="text-center space-y-2">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-2 ${iconBg}`}>
                      {icon}
                    </div>
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className={`text-sm max-w-sm mx-auto leading-relaxed ${isFail ? 'text-red-600' : isPartial ? 'text-amber-700' : 'text-muted-foreground'}`}>
                      {subtitle}
                    </p>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-black text-green-700">{importResult.created}</div>
                    <div className="text-xs font-medium text-green-600 uppercase">Yaradıldı</div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-black text-blue-700">{importResult.updated}</div>
                    <div className="text-xs font-medium text-blue-600 uppercase">Yeniləndi</div>
                  </CardContent>
                </Card>
                <Card className={importResult.errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-muted'}>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-black ${importResult.errors.length > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>
                      {importResult.errors.length}
                    </div>
                    <div className={`text-xs font-medium uppercase ${importResult.errors.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      Xəta
                    </div>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold flex items-center gap-2 text-red-700 text-sm">
                    <AlertTriangle className="h-4 w-4" /> Xətalı Sətirlər
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-[220px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-muted sticky top-0">
                          <TableRow>
                            <TableHead className="w-[70px]">Sətir</TableHead>
                            <TableHead className="w-[130px]">Sahə</TableHead>
                            <TableHead>Xəta</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.errors.map((err: unknown, idx: number) => {
                            const isStr = typeof err === 'string';
                            const e = err as Record<string, unknown>;
                            const rowNum = isStr
                              ? ((err as string).match(/Sətir (\d+)/)?.[1] ?? String(idx + 2))
                              : String(e['row'] ?? idx + 2);
                            const rawField = isStr ? '' : String(e['attribute'] ?? '');
                            const field = rawField ? translateAttribute(rawField) : 'Xəta';
                            const msg = isStr
                              ? (err as string)
                              : (Array.isArray(e['errors'])
                                ? (e['errors'] as string[]).join(', ')
                                : String(e['errors'] ?? ''));
                            return (
                              <TableRow key={idx} className="hover:bg-red-50/50">
                                <TableCell className="font-medium text-xs">#{rowNum}</TableCell>
                                <TableCell className="text-red-600 text-xs font-semibold">{field}</TableCell>
                                <TableCell className="text-xs">{msg}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" onClick={reset}>
                  <ChevronRight className="mr-2 h-4 w-4" /> Yeni İdxal
                </Button>
                <Button onClick={onClose}>Bağla</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleImportModal;
