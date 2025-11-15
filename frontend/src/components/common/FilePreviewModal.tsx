import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Info,
  Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface FilePreviewModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  stats: {
    totalRows: number;
    emptyRows: number;
    headerRow: number;
    dataRows: number;
  };
  headers: string[];
  previewData: any[][];
}

const REQUIRED_HEADERS = [
  { name: 'utis_code', aliases: ['utis_kod', 'utis_kodu', 'utis kod'] },
  { name: 'institution_name', aliases: ['mektebin_adi', 'mekteb_adi', 'muessise_adi'] },
  { name: 'class_level', aliases: ['sinif_seviyyesi', 'sinif_seviyyəsi', 'sinif seviyyesi'] },
  { name: 'class_name', aliases: ['sinif_herfi', 'sinif_hərfi', 'sinif_index'] },
];

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    if (file && isOpen) {
      validateFile(file);
    }
  }, [file, isOpen]);

  const validateFile = async (file: File) => {
    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // Convert to array of arrays
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Find header row (row 2 in our template - after instruction row)
      const headerRowIndex = 1; // 0-indexed (Excel row 2)
      const headers = rawData[headerRowIndex] || [];

      // Normalize headers for comparison
      const normalizedHeaders = headers.map(h =>
        String(h || '').toLowerCase().trim().replace(/\s+/g, '_')
      );

      // Validate headers
      const errors: string[] = [];
      const warnings: string[] = [];
      const info: string[] = [];

      // Check for required headers
      const missingHeaders: string[] = [];
      REQUIRED_HEADERS.forEach(required => {
        const found = normalizedHeaders.some(h =>
          h === required.name || required.aliases.some(alias => h.includes(alias.replace(/\s+/g, '_')))
        );

        if (!found) {
          missingHeaders.push(required.name);
        }
      });

      if (missingHeaders.length > 0) {
        errors.push(`Vacib sütunlar tapılmadı: ${missingHeaders.join(', ')}`);
      }

      // Get data rows (skip instruction row and header row)
      const dataRows = rawData.slice(headerRowIndex + 1);

      // Count empty rows
      const emptyRows = dataRows.filter(row =>
        !row || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')
      ).length;

      const nonEmptyRows = dataRows.length - emptyRows;

      // Stats
      const stats = {
        totalRows: rawData.length,
        emptyRows,
        headerRow: headerRowIndex + 1, // Excel row number (1-indexed)
        dataRows: nonEmptyRows
      };

      // Warnings
      if (emptyRows > 0) {
        warnings.push(`${emptyRows} boş sətir tapıldı (avtomatik olaraq atlanacaq)`);
      }

      if (nonEmptyRows === 0) {
        errors.push('Fayl boşdur - heç bir data sətri tapılmadı');
      } else if (nonEmptyRows > 500) {
        info.push(`${nonEmptyRows} sətir idxal ediləcək (təxmini vaxt: ${Math.ceil(nonEmptyRows / 20)} san)`);
      }

      // Check for potential encoding issues
      const hasWeirdChars = headers.some(h =>
        /[\u0000-\u001F\u007F-\u009F]/.test(String(h))
      );

      if (hasWeirdChars) {
        warnings.push('Fayl kodlaşdırma problemi ola bilər - Azərbaycan hərfləri düzgün görünmürsə, faylı UTF-8 formatında yadda saxlayın');
      }

      // Preview first 5 rows
      const previewData = dataRows.slice(0, 5);

      setValidation({
        isValid: errors.length === 0,
        errors,
        warnings,
        info,
        stats,
        headers,
        previewData
      });

    } catch (error: any) {
      setValidation({
        isValid: false,
        errors: [`Fayl oxuna bilmədi: ${error.message}`],
        warnings: [],
        info: [],
        stats: { totalRows: 0, emptyRows: 0, headerRow: 0, dataRows: 0 },
        headers: [],
        previewData: []
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (validation?.isValid) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Fayl Önizləməsi
          </DialogTitle>
          <DialogDescription>
            Yükləmədən əvvəl faylın strukturunu yoxlayın
          </DialogDescription>
        </DialogHeader>

        {isProcessing ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Fayl yoxlanılır...</span>
          </div>
        ) : validation && (
          <div className="space-y-4">
            {/* File Info */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">Fayl adı</div>
                <div className="font-medium text-sm truncate">{file?.name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Ölçü</div>
                <div className="font-medium text-sm">{file ? (file.size / 1024).toFixed(1) : 0} KB</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Ümumi sətirlər</div>
                <div className="font-medium text-sm">{validation.stats.totalRows}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Data sətirləri</div>
                <div className="font-medium text-sm">{validation.stats.dataRows}</div>
              </div>
            </div>

            {/* Validation Results */}
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">Kritik Xətalar:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {validation.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validation.warnings.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold text-yellow-900">Xəbərdarlıqlar:</p>
                    <ul className="list-disc list-inside text-sm space-y-1 text-yellow-800">
                      {validation.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validation.info.length > 0 && (
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-1">
                    <ul className="list-disc list-inside text-sm space-y-1 text-blue-800">
                      {validation.info.map((info, idx) => (
                        <li key={idx}>{info}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validation.isValid && validation.errors.length === 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>Fayl hazırdır!</strong> {validation.stats.dataRows} sətir idxal edilməyə hazırdır.
                </AlertDescription>
              </Alert>
            )}

            {/* Headers Preview */}
            {validation.headers.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Sütun Başlıqları ({validation.headers.length}):</h4>
                <div className="flex flex-wrap gap-2">
                  {validation.headers.slice(0, 15).map((header, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {header}
                    </Badge>
                  ))}
                  {validation.headers.length > 15 && (
                    <Badge variant="secondary" className="text-xs">
                      +{validation.headers.length - 15} daha çox
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Data Preview */}
            {validation.previewData.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">İlk 5 Sətir Önizləməsi:</h4>
                <div className="border rounded-lg overflow-auto max-h-64">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        {validation.headers.slice(0, 8).map((header, idx) => (
                          <TableHead key={idx} className="text-xs">
                            {header}
                          </TableHead>
                        ))}
                        {validation.headers.length > 8 && (
                          <TableHead className="text-xs text-muted-foreground">...</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validation.previewData.map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {rowIdx + 1}
                          </TableCell>
                          {row.slice(0, 8).map((cell, cellIdx) => (
                            <TableCell key={cellIdx} className="text-xs max-w-32 truncate">
                              {cell !== null && cell !== undefined ? String(cell) : '-'}
                            </TableCell>
                          ))}
                          {row.length > 8 && (
                            <TableCell className="text-xs text-muted-foreground">...</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Ləğv et
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!validation?.isValid || isProcessing}
            className="gap-2"
          >
            {validation?.isValid ? (
              <>
                <CheckCircle className="h-4 w-4" />
                İdxal Et ({validation.stats.dataRows} sətir)
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                İdxal Edilə Bilməz
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
