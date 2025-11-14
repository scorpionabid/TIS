import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { UploadCloud, FileUp, AlertTriangle, CheckCircle2, Info, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MinimalDialog,
  MinimalDialogContent,
  MinimalDialogDescription,
  MinimalDialogTitle,
} from '@/components/ui/minimal-dialog';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { linkService, LinkBulkMetadata, LinkBulkUploadResult } from '@/services/links';
import { cn } from '@/lib/utils';

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

type RowIssue = {
  column: string;
  message: string;
};

type ParsedRow = {
  index: number;
  values: Record<string, string>;
  issues: RowIssue[];
};

type SubmitError = {
  message: string;
  column?: string;
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
  const [submitErrors, setSubmitErrors] = useState<SubmitError[]>([]);
  const [summary, setSummary] = useState<LinkBulkUploadResult | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [showOnlyErroredRows, setShowOnlyErroredRows] = useState(false);
  const [allowUploadWithErrors, setAllowUploadWithErrors] = useState(false);
  const [sheetColumns, setSheetColumns] = useState<string[]>(DEFAULT_REQUIRED_COLUMNS);

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
  const validRows = useMemo(() => previewRows.filter((row) => row.issues.length === 0), [previewRows]);
  const validRowCount = validRows.length;
  const displayedRows = useMemo(() => {
    if (!showOnlyErroredRows) {
      return previewRows;
    }
    return previewRows.filter((row) => row.issues.length > 0);
  }, [previewRows, showOnlyErroredRows]);

  const groupedSubmitErrors = useMemo(() => {
    if (!submitErrors.length) {
      return [] as Array<{ group: string; items: SubmitError[] }>;
    }

    const groups = submitErrors.reduce<Record<string, SubmitError[]>>((acc, error) => {
      const key = error.column ? `Sütun: ${error.column}` : 'Digər xətalar';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(error);
      return acc;
    }, {});

    return Object.entries(groups).map(([group, items]) => ({ group, items }));
  }, [submitErrors]);

  const canUpload = Boolean(
    selectedFile &&
    previewRows.length > 0 &&
    ((invalidRowCount === 0) || (allowUploadWithErrors && validRowCount > 0)) &&
    !isParsing
  );

  const bulkMutation = useMutation({
    mutationFn: (formData: FormData) => linkService.uploadBulkLinks(formData),
    onSuccess: (result) => {
      setSummary(result);
      const apiErrors = (result.errors || []).map<SubmitError>((message) => ({ message }));
      setSubmitErrors(apiErrors);
      toast({
        title: 'Yükləmə tamamlandı',
        description: `Yaradılan link: ${result.created}, uğursuz: ${result.failed}`,
      });
      onSuccess?.(result);
      setSelectedFile(null);
      setPreviewRows([]);
      setAllowUploadWithErrors(false);
      setSheetColumns(DEFAULT_REQUIRED_COLUMNS);
    },
    onError: (error: any) => {
      const message = error?.message || 'Yükləmə zamanı xəta baş verdi';
      setSubmitErrors([{ message }]);
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

  const parseFile = async (file: File, meta: LinkBulkMetadata) => {
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

      const columnSet = new Set<string>();
      rawRows.forEach((row) => {
        Object.keys(row).forEach((key) => {
          if (key) {
            columnSet.add(key);
          }
        });
      });
      requiredColumns.forEach((column) => columnSet.add(column));
      const columns = Array.from(columnSet);
      setSheetColumns(columns);

      const parsedRows: ParsedRow[] = rawRows.map((row, index) => {
        const values: Record<string, string> = {};
        columns.forEach((column) => {
          values[column] = String(row[column] ?? '').trim();
        });

        const issues: RowIssue[] = [];

        if (!values.link_title) {
          issues.push({ column: 'link_title', message: 'link_title boşdur' });
        }

        if (!values.url || !isValidUrl(values.url)) {
          issues.push({ column: 'url', message: 'URL düzgün formatda deyil' });
        }

        const linkType = values.link_type.toLowerCase();
        if (!linkType) {
          issues.push({ column: 'link_type', message: 'link_type boşdur' });
        } else if (!allowedLinkTypes.includes(linkType)) {
          issues.push({
            column: 'link_type',
            message: `link_type dəyəri düzgün deyil (${allowedLinkTypes.join(', ')})`,
          });
        } else {
          values.link_type = linkType;
        }

        const institutionName = values.institution_unique_name;
        if (!institutionName) {
          issues.push({ column: 'institution_unique_name', message: 'institution_unique_name boşdur' });
        } else {
          const institutionId = institutionLookup.get(normalizeKey(institutionName));
          if (!institutionId) {
            issues.push({ column: 'institution_unique_name', message: 'Müəssisə tapılmadı' });
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
        setSubmitErrors([{ message: 'Faylda istifadə edilə bilən məlumat tapılmadı.' }]);
      }
    } catch (error: any) {
      console.error('Excel parsing error:', error);
      setPreviewRows([]);
      setSubmitErrors([{ message: error?.message || 'Fayl oxunarkən xəta baş verdi' }]);
      setSheetColumns(DEFAULT_REQUIRED_COLUMNS);
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
    setAllowUploadWithErrors(false);
    setSheetColumns(DEFAULT_REQUIRED_COLUMNS);

    if (file) {
      if (metadata) {
        parseFile(file, metadata);
      }
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
      setAllowUploadWithErrors(false);
      setSheetColumns(DEFAULT_REQUIRED_COLUMNS);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (!metadata || !selectedFile) {
      return;
    }
    if (previewRows.length > 0 || isParsing) {
      return;
    }

    parseFile(selectedFile, metadata);
  }, [metadata, selectedFile, isOpen, previewRows.length, isParsing]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      setSubmitErrors([{ message: 'Excel faylı seçilməlidir.' }]);
      return;
    }
    if (previewRows.length === 0) {
      setSubmitErrors([{ message: 'Yükləmək üçün faylda etibarlı sətrlər tapılmadı.' }]);
      return;
    }
    if (invalidRowCount > 0 && !allowUploadWithErrors) {
      setSubmitErrors([{ message: 'Xətalı sətirlərlə davam etmək istəyirsinizsə təsdiq edin.' }]);
      return;
    }
    if (allowUploadWithErrors && invalidRowCount > 0 && validRowCount === 0) {
      setSubmitErrors([{ message: 'Yükləmək üçün etibarlı sətr tapılmadı.' }]);
      return;
    }
    setSubmitErrors([]);
    const formData = new FormData();

    let fileToUpload = selectedFile;
    if (fileToUpload && allowUploadWithErrors && invalidRowCount > 0) {
      const rowsForExport = validRows.map((row) => {
        const entry: Record<string, string> = {};
        sheetColumns.forEach((column) => {
          entry[column] = row.values[column] ?? '';
        });
        return entry;
      });

      const worksheet = XLSX.utils.json_to_sheet(rowsForExport, { header: sheetColumns });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Links');
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const sanitizedFileName = selectedFile.name.replace(/\.(xlsx|xls|csv)$/i, '') + '-valid.xlsx';
      fileToUpload = new File([blob], sanitizedFileName, { type: blob.type });
    }

    if (fileToUpload) {
      formData.append('file', fileToUpload);
    }
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
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm space-y-3 text-destructive">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Yükləmə ilə bağlı qeydlər
                </div>
                <div className="space-y-3">
                  {groupedSubmitErrors.map(({ group, items }) => (
                    <div key={group} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="bg-destructive text-destructive-foreground">
                          {items.length}
                        </Badge>
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {group}
                        </span>
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-destructive">
                        {items.slice(0, 4).map((error, index) => (
                          <li key={`${group}-${index}`}>{error.message}</li>
                        ))}
                        {items.length > 4 && (
                          <li className="text-muted-foreground">
                            ... və digər {items.length - 4} xəta
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewRows.length > 0 && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="space-y-1">
                    <div>
                      {previewRows.length} sətir tapıldı. Doğrulanan: {previewRows.length - invalidRowCount}.
                      {invalidRowCount > 0 && (
                        <span className="text-destructive ml-2">
                          Xəta olan sətirlər: {invalidRowCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        id="only-error-rows"
                        checked={showOnlyErroredRows}
                        onCheckedChange={setShowOnlyErroredRows}
                        className="h-5 w-9"
                      />
                      <Label htmlFor="only-error-rows" className="text-xs text-muted-foreground">
                        Yalnız xətalı sətirlər
                      </Label>
                      {showOnlyErroredRows && (
                        <span className="text-[11px] text-muted-foreground">
                          Göstərilən: {displayedRows.length} sətir
                        </span>
                      )}
                    </div>
                    {invalidRowCount > 0 && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          id="allow-upload-with-errors"
                          checked={allowUploadWithErrors}
                          onCheckedChange={(checked) => setAllowUploadWithErrors(Boolean(checked))}
                        />
                        <Label htmlFor="allow-upload-with-errors" className="text-xs text-muted-foreground">
                          Xətalı sətirləri istisna edib yalnız düzgün sətrləri yüklə ({validRowCount} sətr göndəriləcək)
                        </Label>
                      </div>
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
                  <TooltipProvider>
                    <table className="w-full min-w-[680px] text-xs">
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
                        {displayedRows.slice(0, 20).map((row) => (
                          <tr key={row.index} className={row.issues.length ? 'bg-red-50/40' : ''}>
                            <td className="border-t px-3 py-1 align-top">
                              <div className="flex flex-col gap-1">
                                <span>{row.index}</span>
                                {row.issues.length > 0 ? (
                                  <Badge variant="destructive" className="w-fit">
                                    {row.issues.length} xəta
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700">
                                    OK
                                  </Badge>
                                )}
                              </div>
                            </td>
                            {requiredColumns.map((column) => {
                              const cellIssue = row.issues.find((issue) => issue.column === column);
                              const cellValue = row.values[column] || '';
                              return (
                                <td
                                  key={`${row.index}-${column}`}
                                  className={cn(
                                    'border-t px-3 py-1 align-top',
                                    cellIssue && 'border-destructive/60 bg-destructive/10 text-destructive'
                                  )}
                                >
                                  {cellIssue ? (
                                    <Tooltip delayDuration={200}>
                                      <TooltipTrigger className="text-left">
                                        {cellValue || <span className="italic text-muted-foreground">—</span>}
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs text-xs">
                                        {cellIssue.message}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    cellValue || <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="border-t px-3 py-1 align-top">
                              {row.issues.length ? (
                                <div className="space-y-1">
                                  {row.issues.slice(0, 2).map((issue, idx) => (
                                    <div key={`${row.index}-issue-${idx}`} className="text-destructive">
                                      {issue.message}
                                    </div>
                                  ))}
                                  {row.issues.length > 2 && (
                                    <div className="text-xs text-muted-foreground">
                                      ... və digər {row.issues.length - 2} xəta
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-green-600">Təsdiq edildi</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TooltipProvider>
                </div>
                {displayedRows.length === 0 && showOnlyErroredRows && (
                  <p className="text-xs text-muted-foreground">
                    Filtr nəticəsində heç bir xəta sətri göstərilmir. Filtri söndürərək bütün sətirləri görə bilərsiniz.
                  </p>
                )}
                {displayedRows.length > 20 && (
                  <p className="text-xs text-muted-foreground">
                    Yalnız ilk 20 sətir göstərilir. Cəmi sətir: {displayedRows.length}.
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
