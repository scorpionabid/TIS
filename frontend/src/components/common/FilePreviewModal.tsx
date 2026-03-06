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
  Loader2,
  Upload
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
  {
    name: 'utis_code',
    aliases: ['utis_kod', 'utis_kodu', 'utis kod', 'utis']
  },
  {
    name: 'institution_name',
    aliases: [
      'muessise_adi', 'müəssisə_adı', 'muəssisə_adı',
      'mektebin_adi', 'məktəbin_adı', 'mektəbin_adı',
      'institution_name', 'institution name'
    ]
  },
  {
    name: 'class_level',
    aliases: [
      'sinif_seviyyesi', 'sinif_səviyyəsi', 'sinif seviyyəsi',
      'sinif_seviyyəsi_(1-12)', 'sinif_seviyyesi_(1-12)',
      'class_level', 'class level', 'seviyye', 'səviyyə'
    ]
  },
  {
    name: 'class_name',
    aliases: [
      'sinif_index-i', 'sinif_index_i', 'sinif_indexi',
      'sinif_herfi', 'sinif_hərfi', 'sinif herfi',
      'class_index', 'class_name', 'sinif_adi'
    ]
  },
];

const containsControlCharacters = (value: string): boolean => {
  for (let index = 0; index < value.length; index++) {
    const charCode = value.charCodeAt(index);
    const isAsciiControl = charCode >= 0 && charCode <= 31;
    const isExtendedControl = charCode >= 127 && charCode <= 159;
    if (isAsciiControl || isExtendedControl) {
      return true;
    }
  }
  return false;
};

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

      // Prepare validation containers early (info used below)
      const errors: string[] = [];
      const warnings: string[] = [];
      const info: string[] = [];

      // Detect file type based on extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const isCSV = fileExtension === 'csv';

      // Find header row
      // CSV: Row 1 is headers directly (index 0)
      // Excel: Row 1 is instruction, Row 2 is headers (index 1)
      const headerRowIndex = isCSV ? 0 : 1;
      const headers = rawData[headerRowIndex] || [];

      info.push(isCSV ? '📄 CSV format detected' : '📊 Excel format detected');

      // Normalize headers for comparison (handle Azerbaijani characters)
      const normalizedHeaders = headers.map(h => {
        let normalized = String(h || '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '_')
          .replace(/[()]/g, '') // Remove parentheses
          .replace(/-/g, '_');  // Replace hyphens with underscores

        // Normalize Azerbaijani characters to standard forms
        normalized = normalized
          .replace(/ə/g, 'e')
          .replace(/ı/g, 'i')
          .replace(/ö/g, 'o')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ç/g, 'c')
          .replace(/ğ/g, 'g');

        return normalized;
      });

      // Check for required headers
      const missingHeaders: string[] = [];
      REQUIRED_HEADERS.forEach(required => {
        const found = normalizedHeaders.some(h => {
          // Check exact name match
          if (h === required.name) return true;

          // Check all aliases
          return required.aliases.some(alias => {
            // Normalize alias the same way
            const normalizedAlias = alias
              .toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[()]/g, '')
              .replace(/-/g, '_')
              .replace(/ə/g, 'e')
              .replace(/ı/g, 'i')
              .replace(/ö/g, 'o')
              .replace(/ü/g, 'u')
              .replace(/ş/g, 's')
              .replace(/ç/g, 'c')
              .replace(/ğ/g, 'g');

            // Check if header contains the alias or vice versa
            return h.includes(normalizedAlias) || normalizedAlias.includes(h);
          });
        });

        if (!found) {
          missingHeaders.push(required.name);
        }
      });

      if (missingHeaders.length > 0) {
        errors.push(`Vacib sütunlar tapılmadı: ${missingHeaders.join(', ')}`);
      }

      // Get data rows (skip instruction row and header row)
      const allDataRows = rawData.slice(headerRowIndex + 1);

      // Filter completely empty rows (all cells null/undefined/empty)
      const dataRows = allDataRows.filter(row => {
        if (!row || row.length === 0) return false;
        // Row is non-empty if at least one cell has content
        return row.some(cell =>
          cell !== null &&
          cell !== undefined &&
          String(cell).trim() !== ''
        );
      });

      const emptyRows = allDataRows.length - dataRows.length;
      const nonEmptyRows = dataRows.length;

      // Stats
      const stats = {
        totalRows: rawData.length,
        emptyRows,
        headerRow: headerRowIndex + 1, // Excel row number (1-indexed)
        dataRows: nonEmptyRows
      };

      // Warnings - only show if significant number of empty rows (> 10% or > 50 rows)
      if (emptyRows > 50 || (nonEmptyRows > 0 && emptyRows / (nonEmptyRows + emptyRows) > 0.1)) {
        warnings.push(`${emptyRows} boş sətir tapıldı və avtomatik atlanacaq`);
      }

      if (nonEmptyRows === 0) {
        errors.push('Fayl boşdur - heç bir data sətri tapılmadı');
        info.push('💡 Şablon faylı yükləyin və nümunə sətirlərə baxaraq məlumatları doldurun.');
      } else if (nonEmptyRows > 500) {
        info.push(`${nonEmptyRows} sətir idxal ediləcək (təxmini vaxt: ${Math.ceil(nonEmptyRows / 20)} san)`);
      }

      // Check if required columns have data (quick sample check on first 10 rows)
      if (nonEmptyRows > 0 && !missingHeaders.includes('class_level') && !missingHeaders.includes('class_name')) {
        // Find class_level and class_name column indices
        const classLevelIndex = headers.findIndex(h => {
          const normalized = String(h || '').toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '').replace(/-/g, '_');
          return normalized.includes('sinif') && (normalized.includes('seviy') || normalized.includes('level'));
        });

        const classNameIndex = headers.findIndex(h => {
          const normalized = String(h || '').toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '').replace(/-/g, '_');
          return normalized.includes('sinif') && (normalized.includes('index') || normalized.includes('herf') || normalized.includes('name'));
        });

        // Check first 10 non-empty rows for missing data in required columns
        const sampleRows = dataRows.slice(0, Math.min(10, dataRows.length));
        let emptyClassLevelCount = 0;
        let emptyClassNameCount = 0;

        sampleRows.forEach(row => {
          if (classLevelIndex >= 0) {
            const cellValue = row[classLevelIndex];
            if (cellValue === null || cellValue === undefined || String(cellValue).trim() === '') {
              emptyClassLevelCount++;
            }
          }
          if (classNameIndex >= 0) {
            const cellValue = row[classNameIndex];
            if (cellValue === null || cellValue === undefined || String(cellValue).trim() === '') {
              emptyClassNameCount++;
            }
          }
        });

        // If most sample rows are empty, BLOCK import with error (not just warning)
        if (emptyClassLevelCount >= sampleRows.length * 0.8) {
          errors.push(`❌ "${headers[classLevelIndex]}" sütunu BOŞdur! D sütununa YALNIZ rəqəm yazın: 0, 1, 2...12 (hərf yazmayın, "9 a" kimi birləşdirməyin!)`);
        }
        if (emptyClassNameCount >= sampleRows.length * 0.8) {
          errors.push(`❌ "${headers[classNameIndex]}" sütunu BOŞdur! E sütununa YALNIZ hərf/kod yazın: A, B, ə, r2 (max 3 simvol, rəqəm əlavə etməyin!)`);
        }
      }

      // Check for potential encoding issues
      const hasWeirdChars = headers.some((header) => containsControlCharacters(String(header)));

      if (hasWeirdChars) {
        warnings.push('Fayl kodlaşdırma problemi ola bilər - Azərbaycan hərfləri düzgün görünmürsə, faylı UTF-8 formatında yadda saxlayın');
      }

      // CSV-specific encoding validation
      if (isCSV) {
        const text = await file.text();
        const hasBrokenChars = text.includes('�') || text.includes('\ufffd');

        if (hasBrokenChars) {
          errors.push('❌ CSV faylı düzgün kodlaşdırılmayıb! Excel-də "Save As" → "CSV UTF-8 (Comma delimited)" seçin.');
        } else {
          info.push('✅ CSV encoding düzgündür (UTF-8)');
        }
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

            {/* Column Detection Diagnostic */}
            {validation.headers.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-sm mb-3">📊 Sütun Təhlili (Diaqnostika):</h4>

                {/* Critical Columns Status */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {(() => {
                    const normalizedHeaders = validation.headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    const hasClassLevel = normalizedHeaders.some(h =>
                      h.includes('sinifsviyysi') || h.includes('sinifsviyy') ||
                      h.includes('classlevel') || h.includes('sviyy')
                    );
                    const hasClassName = normalizedHeaders.some(h =>
                      h.includes('sinifindex') || h.includes('sinifherfi') ||
                      h.includes('classname') || h.includes('sinifindexi')
                    );

                    return (
                      <>
                        <div className={`p-2 rounded border ${hasClassLevel ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          {hasClassLevel ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-xs text-green-900">D sütunu (Səviyyə) ✓</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-xs text-red-900">D sütunu YOXDUR!</span>
                            </div>
                          )}
                        </div>
                        <div className={`p-2 rounded border ${hasClassName ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          {hasClassName ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-xs text-green-900">E sütunu (İndex) ✓</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-xs text-red-900">E sütunu YOXDUR!</span>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <h4 className="font-medium text-sm mb-2">Bütün Sütunlar ({validation.headers.length}):</h4>
                <div className="flex flex-wrap gap-2">
                  {validation.headers.map((header, idx) => {
                    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const isClassLevel = normalized.includes('sinifsviyysi') || normalized.includes('sinifsviyy') ||
                                        normalized.includes('classlevel') || normalized.includes('sviyy');
                    const isClassName = normalized.includes('sinifindex') || normalized.includes('sinifherfi') ||
                                       normalized.includes('classname') || normalized.includes('sinifindexi');

                    return (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={`text-xs ${isClassLevel || isClassName ? 'bg-blue-100 border-blue-300 font-semibold' : ''}`}
                      >
                        {String.fromCharCode(65 + idx)}: {header}
                        {isClassLevel && ' 📐'}
                        {isClassName && ' 📝'}
                      </Badge>
                    );
                  }).slice(0, 15)}
                  {validation.headers.length > 15 && (
                    <Badge variant="secondary" className="text-xs">
                      +{validation.headers.length - 15} daha
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
                <Upload className="h-4 w-4" />
                Təsdiqlə və İdxal Et ({validation.stats.dataRows} sətir)
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
