import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { UploadCloud, FileUp, AlertTriangle, CheckCircle2, Info, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  MinimalDialog,
  MinimalDialogContent,
  MinimalDialogDescription,
  MinimalDialogTitle,
} from '@/components/ui/minimal-dialog';
import { useToast } from '@/hooks/use-toast';
import { linkService, LinkBulkMetadata, LinkBulkUploadResult } from '@/services/links';

interface LinkBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (summary: LinkBulkUploadResult) => void;
}

const MAX_BULK_ROWS_FALLBACK = 500;
const DEFAULT_REQUIRED_COLUMNS = [
  'link_title',
  'url',
  'description',
  'institution_unique_name',
  'link_type',
];

type ParsedRow = {
  index: number;
  values: Record<string, string>;
  issues: string[];
};

const normalizeKey = (value: string) => value.trim().toLowerCase();
const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return Boolean(url.protocol && url.host);
  } catch {
    return false;
  }
};

export function LinkBulkUploadModal({ isOpen, onClose, onSuccess }: LinkBulkUploadModalProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<LinkBulkUploadResult | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const {
    data: metadata,
    isLoading: isMetadataLoading,
    error: metadataError,
  } = useQuery({
    queryKey: ['link-bulk-metadata'],
    queryFn: () => linkService.getBulkMetadata(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const requiredColumns = metadata?.required_columns ?? DEFAULT_REQUIRED_COLUMNS;
  const allowedLinkTypes = metadata?.link_types ?? ['external', 'video', 'form', 'document'];
  const maxRows = metadata?.max_rows ?? MAX_BULK_ROWS_FALLBACK;

  const institutionLookup = useMemo(() => {
    const map = new Map<string, number>();
    (metadata?.institutions || []).forEach((institution) => {
      [institution.name, institution.short_name, institution.institution_code, institution.utis_code]
        .filter(Boolean)
        .forEach((value) => {
          map.set(normalizeKey(String(value)), institution.id);
        });
    });
    return map;
  }, [metadata?.institutions]);

  const invalidRowCount = previewRows.filter((row) => row.issues.length > 0).length;
  const canUpload = Boolean(
    selectedFile &&
    previewRows.length > 0 &&
    invalidRowCount === 0 &&
    !isParsing
  );

  const bulkMutation = useMutation({
    mutationFn: (formData: FormData) => linkService.uploadBulkLinks(formData),
    onSuccess: (result) => {
      setSummary(result);
      setSubmitErrors(result.errors || []);
      toast({
        title: 'Yükləmə tamamlandı',
        description: `Yaradılan link: ${result.created}, uğursuz: ${result.failed}`,
      });
      onSuccess?.(result);
      setSelectedFile(null);
      setPreviewRows([]);
    },
    onError: (error: any) => {
      const message = error?.message || 'Yükləmə zamanı xəta baş verdi';
      setSubmitErrors([message]);
      toast({
        title: 'Xəta baş verdi',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    onClose();
  };

  const parseFile = async (file: File, meta: LinkBulkMetadata | undefined) => {
    if (!meta) {
      setSubmitErrors(['Metadata yüklənmədi. Zəhmət olmasa yenidən cəhd edin.']);
      setPreviewRows([]);
      return;
    }

    setIsParsing(true);
    setSubmitErrors([]);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Faylda iş vərəqi tapılmadı.');
      }
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

      if (!rawRows.length) {
        throw new Error('Faylda məlumat tapılmadı.');
      }

      if (rawRows.length > maxRows) {
        throw new Error(`Maksimum ${maxRows} sətr yükləmək olar.`);
      }

      const parsedRows: ParsedRow[] = rawRows.map((row, index) => {
        const values: Record<string, string> = {};
        requiredColumns.forEach((column) => {
          values[column] = String(row[column] ?? '').trim();
        });

        const issues: string[] = [];

        if (!values.link_title) {
          issues.push('link_title boşdur');
        }

        if (!values.url || !isValidUrl(values.url)) {
          issues.push('URL düzgün formatda deyil');
        }

        const linkType = values.link_type.toLowerCase();
        if (!linkType) {
          issues.push('link_type boşdur');
        } else if (!allowedLinkTypes.includes(linkType)) {
          issues.push(`link_type dəyəri düzgün deyil (${allowedLinkTypes.join(', ')})`);
        } else {
          values.link_type = linkType;
        }

        const institutionName = values.institution_unique_name;
        if (!institutionName) {
          issues.push('institution_unique_name boşdur');
        } else {
          const institutionId = institutionLookup.get(normalizeKey(institutionName));
          if (!institutionId) {
            issues.push('Müəssisə tapılmadı');
          }
        }

        return {
          index: index + 2,
          values,
          issues,
        };
      });

      setPreviewRows(parsedRows);
      if (!parsedRows.length) {
        setSubmitErrors(['Faylda istifadə edilə bilən məlumat tapılmadı.']);
      }
    } catch (error: any) {
      console.error('Excel parsing error:', error);
      setPreviewRows([]);
      setSubmitErrors([error?.message || 'Fayl oxunarkən xəta baş verdi']);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSummary(null);
    setPreviewRows([]);
    setSubmitErrors([]);

    if (file) {
      parseFile(file, metadata);
    }
  };

  const handleTemplateDownload = async () => {
    try {
      const blob = await linkService.downloadBulkTemplate();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'link-bulk-template.xlsx';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Fayl yüklənmədi',
        description: error?.message || 'Şablon faylı yükləmək mümkün olmadı',
        variant: 'destructive',
      });
    }
  };

  const handleInstitutionsDownload = () => {
    if (!metadata?.institutions?.length) {
      toast({
        title: 'Məlumat tapılmadı',
        description: 'Müəssisə siyahısı mövcud deyil.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['id', 'name', 'short_name', 'institution_code', 'utis_code'];
    const lines = [headers.join(',')];
    metadata.institutions.forEach((institution) => {
      const values = headers.map((key) => {
        const raw = (institution as any)[key] ?? '';
        const safe = String(raw).replace(/"/g, '""');
        return `"${safe}"`;
      });
      lines.push(values.join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'institutions.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setSubmitErrors([]);
      setSummary(null);
      setPreviewRows([]);
    }
  }, [isOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      setSubmitErrors(['Excel faylı seçilməlidir.']);
      return;
    }
    if (invalidRowCount > 0 || previewRows.length === 0) {
      setSubmitErrors(['Xətalı sətirlər aradan qaldırılmadan yükləmək mümkün deyil.']);
      return;
    }
    setSubmitErrors([]);
    const formData = new FormData();
    formData.append('file', selectedFile);
    bulkMutation.mutate(formData);
  };

  return (
    <MinimalDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <MinimalDialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl sm:w-auto">
        <MinimalDialogDescription id="link-bulk-upload-desc">
          Excel vasitəsilə bir neçə linki eyni anda əlavə edin.
        </MinimalDialogDescription>
        <MinimalDialogTitle asChild>
          <div className="flex items-center gap-2 text-lg font-semibold mb-4 break-words">
            <UploadCloud className="h-5 w-5 text-primary flex-shrink-0" />
            Linklərin kütləvi yüklənməsi
          </div>
        </MinimalDialogTitle>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
            <div className="font-medium text-foreground">Tələb olunan sütunlar</div>
            <ul className="list-disc pl-5 space-y-1 text-foreground break-words">
              {requiredColumns.map((column) => (
                <li key={column}>
                  <code className="font-mono text-xs">{column}</code>
                </li>
              ))}
            </ul>
            <p className="text-xs">
              Maksimum {maxRows} sətr yükləmək olar. Hər sətr yalnız bir müəssisəyə aid olmalıdır.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border px-4 py-3 text-sm space-y-2 break-words">
              <div className="flex items-center gap-2 text-foreground">
                <Info className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Şablon və məlumatlar</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Şablon versiyası: {metadata?.template_version ?? '—'}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button variant="outline" size="sm" className="justify-center" onClick={handleTemplateDownload}>
                  <FileUp className="h-4 w-4 mr-2" />
                  Şablon
                </Button>
                <Button variant="outline" size="sm" className="justify-center" onClick={handleInstitutionsDownload}>
                  <List className="h-4 w-4 mr-2" />
                  Müəssisələr
                </Button>
              </div>
              {isMetadataLoading && (
                <p className="text-xs text-muted-foreground">Metadata yüklənir...</p>
              )}
            </div>
            {metadataError && (
              <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Metadata yüklənmədi. Səhifəni yeniləyin və ya sonra cəhd edin.
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Excel faylı *</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  Seçilmiş fayl: <span className="font-medium">{selectedFile.name}</span>
                </p>
              )}
              {isParsing && (
                <p className="text-xs text-muted-foreground mt-1">Fayl analiz edilir...</p>
              )}
            </div>

            {submitErrors.length > 0 && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Yükləmə ilə bağlı qeydlər
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  {submitErrors.slice(0, 5).map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                  {submitErrors.length > 5 && (
                    <li>... və digər {submitErrors.length - 5} xəta</li>
                  )}
                </ul>
              </div>
            )}

            {previewRows.length > 0 && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    {previewRows.length} sətir tapıldı. Doğrulanan: {previewRows.length - invalidRowCount}.
                    {invalidRowCount > 0 && (
                      <span className="text-destructive ml-2">
                        Xəta olan sətirlər: {invalidRowCount}
                      </span>
                    )}
                  </div>
                  {invalidRowCount === 0 ? (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle2 className="h-4 w-4" />
                      Yükləməyə hazırdır
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-destructive text-xs">
                      <AlertTriangle className="h-4 w-4" />
                      Xətaları düzəltmədən yükləmək olmaz
                    </div>
                  )}
                </div>
                <div className="max-h-64 overflow-x-auto overflow-y-auto rounded border bg-muted/40">
                  <table className="w-full min-w-[640px] text-xs">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Sətir</th>
                        {requiredColumns.map((column) => (
                          <th key={column} className="px-3 py-2 text-left">
                            {column}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 20).map((row) => (
                        <tr key={row.index} className={row.issues.length ? 'bg-red-50/70' : ''}>
                          <td className="border-t px-3 py-1">{row.index}</td>
                          {requiredColumns.map((column) => (
                            <td key={`${row.index}-${column}`} className="border-t px-3 py-1">
                              {row.values[column] || <span className="text-muted-foreground">—</span>}
                            </td>
                          ))}
                          <td className="border-t px-3 py-1">
                            {row.issues.length ? (
                              <span className="text-destructive">{row.issues.join('; ')}</span>
                            ) : (
                              <span className="text-green-600">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewRows.length > 20 && (
                  <p className="text-xs text-muted-foreground">
                    Yalnız ilk 20 sətir göstərilir. Cəmi sətir: {previewRows.length}.
                  </p>
                )}
              </div>
            )}

            {summary && (
              <div className="rounded-md border border-green-200 bg-green-50/80 p-3 text-sm space-y-1 text-green-800">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Nəticə
                </div>
                <p>Emal olunan sətirlər: {summary.processed}</p>
                <p>Yaradılan linklər: {summary.created}</p>
                <p>Uğursuz sətirlər: {summary.failed}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Bağla
              </Button>
              <Button type="submit" disabled={!canUpload || bulkMutation.isPending}>
                {bulkMutation.isPending ? 'Yüklənir...' : 'Yüklə'}
              </Button>
            </div>
          </form>
        </div>
      </MinimalDialogContent>
    </MinimalDialog>
  );
}
