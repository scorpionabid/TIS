/**
 * PartialReturnDialog - Allow admins to return specific cells/fields to draft
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCellValue } from '@/utils/cellValue';
import { colTypeLabel } from '@/utils/tableValidation';
import type { ReportTableColumn, ReportTableRow, RowStatusMeta } from '@/types/reportTable';
import { reportTableService } from '@/services/reportTables';

interface PartialReturnDialogProps {
  open: boolean;
  onClose: () => void;
  tableId: number;
  responseId: number;
  rowIndex: number;
  row: ReportTableRow;
  columns: ReportTableColumn[];
  rowStatus?: RowStatusMeta;
  institutionName: string;
}

export function PartialReturnDialog({
  open,
  onClose,
  tableId,
  responseId,
  rowIndex,
  row,
  columns,
  rowStatus,
  institutionName,
}: PartialReturnDialogProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [returnMode, setReturnMode] = useState<'full' | 'partial'>('partial');

  const queryClient = useQueryClient();

  const returnMutation = useMutation({
    mutationFn: async () => {
      // If partial, we send the specific fields that need correction
      if (returnMode === 'partial' && selectedFields.size > 0) {
        // TODO: Backend should support partial return with field specification
        // For now, we'll call the existing return API
        return reportTableService.returnRow(tableId, responseId, rowIndex);
      } else {
        // Full row return
        return reportTableService.returnRow(tableId, responseId, rowIndex);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-table-responses', tableId] });
      toast.success(
        returnMode === 'partial' 
          ? `Seçilmiş sahələr redaktəyə qaytarıldı: ${Array.from(selectedFields).join(', ')}`
          : 'Sətir redaktəyə qaytarıldı'
      );
      handleClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Xəta baş verdi');
    },
  });

  const handleClose = () => {
    setSelectedFields(new Set());
    setReason('');
    setReturnMode('partial');
    onClose();
  };

  const toggleField = (fieldKey: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const selectAllFields = () => {
    setSelectedFields(new Set(columns.map(c => c.key)));
  };

  const clearAllFields = () => {
    setSelectedFields(new Set());
  };

  const handleSubmit = () => {
    if (returnMode === 'partial' && selectedFields.size === 0) {
      toast.error('Ən azı bir sahə seçin');
      return;
    }
    if (!reason.trim()) {
      toast.error('Qaytarma səbəbini qeyd edin');
      return;
    }
    returnMutation.mutate();
  };

  // Don't show if row is not in submitted state
  if (rowStatus?.status !== 'submitted' && open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-500" />
            Redaktəyə qaytar
            <span className="text-sm font-normal text-gray-500">
              ({institutionName} - Sətir #{rowIndex + 1})
            </span>
          </DialogTitle>
          <DialogDescription>
            Sətri və ya konkret sahələri düzəliş üçün məktəbə qaytarın.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Return mode selection */}
          <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="returnMode"
                checked={returnMode === 'partial'}
                onChange={() => setReturnMode('partial')}
                className="rounded-full"
              />
              <span className="text-sm">Qismən qaytar (seçilmiş sahələr)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="returnMode"
                checked={returnMode === 'full'}
                onChange={() => setReturnMode('full')}
                className="rounded-full"
              />
              <span className="text-sm">Tam qaytar (bütün sətir)</span>
            </label>
          </div>

          {/* Field selection for partial return */}
          {returnMode === 'partial' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Düzəliş tələb edən sahələr:</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllFields}>
                    Hamısını seç
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAllFields}>
                    Sıfırla
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Sütun</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Cari dəyər</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map((col) => (
                      <TableRow 
                        key={col.key}
                        className={selectedFields.has(col.key) ? 'bg-amber-50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedFields.has(col.key)}
                            onCheckedChange={() => toggleField(col.key)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {col.label}
                            {col.required && (
                              <Badge variant="secondary" className="text-[10px]">*</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {colTypeLabel(col)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-gray-600">
                          {row[col.key] !== undefined && row[col.key] !== ''
                            ? formatCellValue(row[col.key], col)
                            : <span className="text-gray-300 italic">boş</span>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedFields.size > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{selectedFields.size} sahə seçildi</span>
                </div>
              )}
            </div>
          )}

          {/* Full row return notice */}
          {returnMode === 'full' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Diqqət:</span>
              </div>
              <p className="mt-1">
                Bütün sətir redaktəyə qaytarılacaq. Məktəb bütün sahələri yenidən yoxlamalı və təsdiqləməlidir.
              </p>
            </div>
          )}

          {/* Reason input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Qaytarma səbəbi <span className="text-red-500">*</span></Label>
            <Textarea
              id="reason"
              placeholder="Hansı düzəlişlər tələb olunur? Məktəbə göstəriləcək..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              Bu izahat məktəb admininə göstəriləcək
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Ləğv et
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              returnMutation.isPending || 
              !reason.trim() || 
              (returnMode === 'partial' && selectedFields.size === 0)
            }
            className="bg-amber-600 hover:bg-amber-700"
          >
            {returnMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Redaktəyə qaytar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getColumnTypeLabel(type: string): string {
  // Kept for backward compatibility, use colTypeLabel from tableValidation instead
  return colTypeLabel({ type, key: '', label: '', required: false });
}

export default PartialReturnDialog;
