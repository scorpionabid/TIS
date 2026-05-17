import { useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, XCircle,
  Loader2, AlertTriangle, Info,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '@/services/students';
import type { RegionStudentFilters } from '@/services/students';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentFilters?: RegionStudentFilters;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadJson(rows: Record<string, string>[], filename: string) {
  // Convert JSON array to CSV
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.replace('.xlsx', '.csv'));
}

export function RegionStudentImportExportModal({ isOpen, onClose, currentFilters }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number; updated: number; skipped: number; errors: string[];
  } | null>(null);

  // ── Template download ──────────────────────────────────────────────────────
  const templateMutation = useMutation({
    mutationFn: () => studentService.downloadRegionTemplate(),
    onSuccess: (blob) => {
      downloadBlob(blob, `sagird_import_sablonu_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Şablon yükləndi');
    },
    onError: () => toast.error('Şablon yüklənərkən xəta baş verdi'),
  });

  // ── Import ─────────────────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: (file: File) => studentService.importRegionStudents(file),
    onSuccess: (res) => {
      const result = res.data;
      setImportResult(result);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['regionadmin', 'students'] });

      const total = result.created + result.updated + result.skipped;
      const hasErrors = result.errors.length > 0;
      const hasSuccess = result.created > 0 || result.updated > 0;

      if (hasSuccess && !hasErrors) {
        toast.success(
          `Import uğurla tamamlandı: ${result.created} yaradıldı, ${result.updated} yeniləndi` +
          (result.skipped > 0 ? `, ${result.skipped} keçildi` : ''),
        );
      } else if (hasSuccess && hasErrors) {
        toast.warning(
          `Qismən uğurlu: ${result.created} yaradıldı, ${result.updated} yeniləndi — ${result.errors.length} sətirdə xəta var`,
        );
      } else if (!hasSuccess && total > 0) {
        toast.error(`Import uğursuz oldu: ${result.errors.length} xəta, heç bir sətir emal edilmədi`);
      } else {
        toast.info('Fayl emal edildi, lakin heç bir sətir tapılmadı');
      }
    },
    onError: (err: Error) => {
      const msg = err?.message ?? '';
      if (msg) {
        toast.error(`Import xətası: ${msg}`);
      } else {
        toast.error('İmport zamanı gözlənilməz xəta baş verdi');
      }
    },
  });

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportMutation = useMutation({
    mutationFn: () => studentService.exportRegionStudents(currentFilters ?? {}),
    onSuccess: (res) => {
      if (res.success && res.data.length) {
        downloadJson(res.data, res.filename);
        toast.success(`${res.total} şagird export edildi`);
      } else {
        toast.info('Export ediləcək məlumat yoxdur');
      }
    },
    onError: () => toast.error('Export zamanı xəta baş verdi'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    setImportResult(null);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Şagird Import / Export
          </DialogTitle>
          <DialogDescription>
            Region daxilindəki şagirdlər üçün toplu əməliyyatlar
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import">
          <TabsList className="w-full">
            <TabsTrigger value="import" className="flex-1 gap-2">
              <Upload className="h-4 w-4" /> Import
            </TabsTrigger>
            <TabsTrigger value="export" className="flex-1 gap-2">
              <Download className="h-4 w-4" /> Export
            </TabsTrigger>
          </TabsList>

          {/* ── IMPORT TAB ─────────────────────────────────────────────────── */}
          <TabsContent value="import" className="space-y-4 pt-2">

            {/* Step 1: template */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                Şablonu yüklə
              </div>
              <p className="text-sm text-muted-foreground">
                Excel şablonunu yükləyib lazımi məlumatlarla doldurun.
              </p>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Məcburi sütunlar:</strong> utis_code, first_name, last_name, school_id, grade_level, class_name<br />
                  <strong>İxtiyari:</strong> gender, birth_date, parent_name, parent_phone
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                size="sm"
                onClick={() => templateMutation.mutate()}
                disabled={templateMutation.isPending}
                className="gap-2 w-full"
              >
                {templateMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                Şablonu yüklə (.xlsx)
              </Button>
            </div>

            {/* Step 2: upload */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                Doldurulmuş faylı yüklə
              </div>

              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {selectedFile ? selectedFile.name : 'Fayl seçin (.xlsx, .xls, .csv)'}
                  </span>
                  {selectedFile && (
                    <span className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                />
              </label>

              <Button
                className="w-full gap-2"
                disabled={!selectedFile || importMutation.isPending}
                onClick={() => selectedFile && importMutation.mutate(selectedFile)}
              >
                {importMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> İmport edilir...</>
                  : <><Upload className="h-4 w-4" /> Import et</>}
              </Button>
            </div>

            {/* Step 3: result */}
            {importResult && (() => {
              const hasErrors  = importResult.errors.length > 0;
              const hasSuccess = importResult.created > 0 || importResult.updated > 0;
              const isFullFail = !hasSuccess && hasErrors;
              const borderCls  = isFullFail
                ? 'border-destructive/40 bg-destructive/5'
                : hasErrors
                  ? 'border-yellow-400/60 bg-yellow-50/50'
                  : 'border-green-400/60 bg-green-50/50';
              return (
                <div className={`rounded-lg border p-4 space-y-3 ${borderCls}`}>
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                    Nəticə
                    {isFullFail && <XCircle className="h-4 w-4 text-destructive ml-auto" />}
                    {!isFullFail && hasErrors && <AlertTriangle className="h-4 w-4 text-yellow-600 ml-auto" />}
                    {!isFullFail && !hasErrors && <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded border p-2 bg-green-50">
                      <div className="text-lg font-bold text-green-700">{importResult.created}</div>
                      <div className="text-xs text-green-600">Yaradıldı</div>
                    </div>
                    <div className="rounded border p-2 bg-blue-50">
                      <div className="text-lg font-bold text-blue-700">{importResult.updated}</div>
                      <div className="text-xs text-blue-600">Yeniləndi</div>
                    </div>
                    <div className="rounded border p-2 bg-gray-50">
                      <div className="text-lg font-bold text-gray-700">{importResult.skipped}</div>
                      <div className="text-xs text-gray-600">Keçildi</div>
                    </div>
                  </div>

                  {hasErrors && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {importResult.errors.length} sətirdə xəta
                      </p>
                      <div className="max-h-36 overflow-y-auto rounded border bg-white/70 p-2 text-xs text-destructive space-y-1">
                        {importResult.errors.map((e, i) => (
                          <div key={i} className="flex gap-1.5">
                            <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
                            <span>{e}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasErrors && (
                    <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Bütün sətirlər uğurla emal edildi
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          {/* ── EXPORT TAB ─────────────────────────────────────────────────── */}
          <TabsContent value="export" className="space-y-4 pt-2">
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Cari filter şəraitinə uyğun bütün şagirdləri CSV formatında yüklə.
              </p>

              {currentFilters && Object.values(currentFilters).some(Boolean) && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Aktiv filterlər tətbiq olunacaq (sektor, məktəb, sinif).
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <Button
                className="w-full gap-2"
                variant="outline"
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate()}
              >
                {exportMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Export edilir...</>
                  : <><Download className="h-4 w-4" /> CSV-ə export et</>}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
