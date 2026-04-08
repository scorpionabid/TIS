/**
 * ColumnEditor Component
 * Individual column editing with expandable advanced settings
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  GripVertical,
  Settings2,
  X,
  Plus,
  AlertCircle,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Calculator,
  FileUp,
  PenTool,
  MapPin,
  ChevronDown,
  ChevronUp,
  Copy,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportTableColumn } from '@/types/reportTable';
import { COLUMN_TYPES } from '../constants';

interface ColumnEditorProps {
  column: ReportTableColumn;
  index: number;
  disabled: boolean;
  onUpdate: (index: number, field: keyof ReportTableColumn, value: unknown) => void;
  onRemove: (index: number) => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  hasErrors?: boolean;
  errors?: string[];
  /** External collapse/expand signal from parent (collapse all / expand all) */
  collapseSignal?: { collapsed: boolean; version: number };
  dragHandleProps?: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown>;
    ref: (node: HTMLElement | null) => void;
  };
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  select: <List className="h-4 w-4" />,
  boolean: <CheckSquare className="h-4 w-4" />,
  calculated: <Calculator className="h-4 w-4" />,
  file: <FileUp className="h-4 w-4" />,
  signature: <PenTool className="h-4 w-4" />,
  gps: <MapPin className="h-4 w-4" />,
};

// Matches the default auto-generated key pattern (col_1, col_2, etc.)
const AUTO_KEY_PATTERN = /^col_\d+$/;

function generateKeyFromLabel(label: string): string {
  const key = label
    .toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30);
  return key || 'col';
}

export function ColumnEditor({
  column,
  index,
  disabled,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  hasErrors,
  errors,
  collapseSignal,
  dragHandleProps,
}: ColumnEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const prevSignalVersionRef = useRef<number | undefined>(undefined);

  // Sync with external collapse/expand signal (collapse all / expand all from parent)
  useEffect(() => {
    if (
      collapseSignal !== undefined &&
      collapseSignal.version !== prevSignalVersionRef.current
    ) {
      prevSignalVersionRef.current = collapseSignal.version;
      setIsCollapsed(collapseSignal.collapsed);
      if (collapseSignal.collapsed) setShowAdvanced(false);
    }
  }, [collapseSignal]);

  // Auto-generate key from label if key is still default auto-generated pattern
  const handleLabelBlur = useCallback(() => {
    if (
      column.label.trim() &&
      (AUTO_KEY_PATTERN.test(column.key) || !column.key.trim())
    ) {
      const generated = generateKeyFromLabel(column.label);
      if (generated && generated !== column.key) {
        onUpdate(index, 'key', generated);
      }
    }
  }, [column.label, column.key, index, onUpdate]);

  // Move an option up (-1) or down (+1)
  const moveOption = useCallback(
    (optIdx: number, direction: -1 | 1) => {
      const opts = [...(column.options ?? [])];
      const targetIdx = optIdx + direction;
      if (targetIdx < 0 || targetIdx >= opts.length) return;
      [opts[optIdx], opts[targetIdx]] = [opts[targetIdx], opts[optIdx]];
      onUpdate(index, 'options', opts);
    },
    [column.options, index, onUpdate]
  );

  // Bulk paste: split by newline, trim, filter empty lines, append to options
  const handleBulkPaste = useCallback(() => {
    const lines = bulkPasteText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    onUpdate(index, 'options', [...(column.options ?? []), ...lines]);
    setBulkPasteText('');
  }, [bulkPasteText, column.options, index, onUpdate]);

  const hasAdvancedSettings =
    column.required ||
    column.hint ||
    column.min !== undefined ||
    column.max !== undefined ||
    column.min_length !== undefined ||
    column.max_length !== undefined ||
    (column.type === 'select' && (column.options?.length ?? 0) > 0);

  return (
    <div
      className={cn(
        'bg-gray-50 rounded-lg border transition-all',
        hasErrors ? 'border-red-300 bg-red-50/30' : 'border-gray-200',
        disabled ? 'opacity-60' : ''
      )}
    >
      {/* Header Row */}
      <div className="flex gap-2 items-start p-3">
        {/* Drag Handle */}
        {!disabled && dragHandleProps && (
          <button
            type="button"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            ref={dragHandleProps.ref}
            className="mt-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        <span className="text-gray-400 text-sm mt-2 w-5 shrink-0">{index + 1}.</span>

        {/* Type Icon */}
        <div className="mt-2 text-gray-400 shrink-0">
          {TYPE_ICONS[column.type] || <Type className="h-4 w-4" />}
        </div>

        {/* Collapsed view — show summary only */}
        {isCollapsed ? (
          <div className="flex-1 flex items-center gap-2 py-1 min-w-0">
            <span className="text-sm font-medium text-gray-700 truncate">
              {column.label || 'Sütun'}{' '}
              <span className="text-gray-400 font-normal">({column.key || 'col_'})</span>
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
              {COLUMN_TYPES.find((t) => t.value === column.type)?.label || column.type}
            </span>
            {column.multiple && (
              <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                çoxlu
              </span>
            )}
          </div>
        ) : (
          /* Expanded: Main Fields */
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Açar ad</Label>
              <Input
                value={column.key}
                onChange={(e) =>
                  onUpdate(
                    index,
                    'key',
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                  )
                }
                placeholder="col_1"
                disabled={disabled}
                className={cn(
                  'text-sm h-8',
                  errors?.some((e) => e.includes('Açar ad')) && 'border-red-500'
                )}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Etiket</Label>
              <Input
                value={column.label}
                onChange={(e) => onUpdate(index, 'label', e.target.value)}
                onBlur={handleLabelBlur}
                placeholder="Sütun adı"
                disabled={disabled}
                className={cn(
                  'text-sm h-8',
                  errors?.some((e) => e.includes('Etiket')) && 'border-red-500'
                )}
              />
            </div>
            <div className="relative z-50 select-container" data-no-dnd>
              <Label className="text-xs text-gray-500 mb-1 block">Tip</Label>
              <select
                value={column.type}
                onChange={(e) => {
                  const v = e.target.value as ReportTableColumn['type'];
                  onUpdate(index, 'type', v);
                  if (v !== 'select') {
                    onUpdate(index, 'options', undefined);
                    onUpdate(index, 'multiple', undefined);
                  }
                }}
                disabled={disabled}
                className={cn(
                  'text-sm h-8 w-full rounded-md border border-input bg-background px-3 py-1.5',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {COLUMN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1 mt-1 shrink-0">
          {!disabled && onMoveUp && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
              onClick={onMoveUp}
              title="Yuxarı apar"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          {!disabled && onMoveDown && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
              onClick={onMoveDown}
              title="Aşağı apar"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                isCollapsed ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-600'
              )}
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Genişləndir' : 'Yığışdır'}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                hasAdvancedSettings
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-emerald-600'
              )}
              onClick={() => {
                if (isCollapsed) setIsCollapsed(false);
                setShowAdvanced(!showAdvanced);
              }}
              title="Qaydalar"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
          {!disabled && onDuplicate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
              onClick={onDuplicate}
              title="Kopyala"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
              onClick={() => onRemove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {hasErrors && errors && errors.length > 0 && !isCollapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-start gap-1.5 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <ul className="space-y-0.5">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Advanced Settings Panel */}
      {showAdvanced && !disabled && !isCollapsed && (
        <div className="px-3 pb-3 border-t border-gray-200 bg-gray-50/80 rounded-b-lg">
          <p className="text-xs text-gray-500 font-medium mt-2 mb-2">Əlavə parametrlər</p>

          <div className="space-y-3">
            {/* Hint */}
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Kömək mətni</Label>
              <Input
                value={column.hint ?? ''}
                onChange={(e) => onUpdate(index, 'hint', e.target.value || undefined)}
                placeholder="İstifadəçiyə kömək mətni..."
                className="text-sm h-8"
              />
            </div>

            {/* Required */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={`req-${index}`}
                checked={column.required ?? false}
                onCheckedChange={(v) =>
                  onUpdate(index, 'required', v === true ? true : undefined)
                }
              />
              <Label htmlFor={`req-${index}`} className="text-sm text-gray-600 cursor-pointer">
                Mütləq doldurulsun
              </Label>
            </div>

            {/* Number constraints */}
            {column.type === 'number' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Minimum</Label>
                    <Input
                      type="number"
                      value={column.min ?? ''}
                      onChange={(e) =>
                        onUpdate(
                          index,
                          'min',
                          e.target.value === '' ? undefined : Number(e.target.value)
                        )
                      }
                      placeholder="0"
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Maksimum</Label>
                    <Input
                      type="number"
                      value={column.max ?? ''}
                      onChange={(e) =>
                        onUpdate(
                          index,
                          'max',
                          e.target.value === '' ? undefined : Number(e.target.value)
                        )
                      }
                      placeholder="9999"
                      className="text-sm h-8"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`allow-na-${index}`}
                    checked={column.allow_na ?? false}
                    onCheckedChange={(v) =>
                      onUpdate(index, 'allow_na', v === true ? true : undefined)
                    }
                  />
                  <Label htmlFor={`allow-na-${index}`} className="text-sm text-gray-600 cursor-pointer">
                    "Yoxdur" seçiminə icazə ver
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`zero-blank-${index}`}
                    checked={column.export_zero_as_blank ?? false}
                    onCheckedChange={(v) =>
                      onUpdate(index, 'export_zero_as_blank', v === true ? true : undefined)
                    }
                  />
                  <Label htmlFor={`zero-blank-${index}`} className="text-sm text-gray-600 cursor-pointer">
                    Eksportda sıfırı boş göstər
                  </Label>
                </div>
              </div>
            )}

            {/* Text length constraints */}
            {column.type === 'text' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Min simvol</Label>
                  <Input
                    type="number"
                    value={column.min_length ?? ''}
                    onChange={(e) =>
                      onUpdate(
                        index,
                        'min_length',
                        e.target.value === '' ? undefined : Number(e.target.value)
                      )
                    }
                    placeholder="0"
                    className="text-sm h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Maks simvol</Label>
                  <Input
                    type="number"
                    value={column.max_length ?? ''}
                    onChange={(e) =>
                      onUpdate(
                        index,
                        'max_length',
                        e.target.value === '' ? undefined : Number(e.target.value)
                      )
                    }
                    placeholder="500"
                    className="text-sm h-8"
                  />
                </div>
              </div>
            )}

            {/* Select options */}
            {column.type === 'select' && (
              <div className="space-y-3">
                {/* Multiple selection toggle */}
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <Checkbox
                    id={`multi-${index}`}
                    checked={column.multiple ?? false}
                    onCheckedChange={(v) =>
                      onUpdate(index, 'multiple', v === true ? true : undefined)
                    }
                  />
                  <Label
                    htmlFor={`multi-${index}`}
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    Çoxlu seçim (multi-select)
                  </Label>
                </div>

                {/* Options list with reordering */}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Seçim variantları</Label>
                  {(column.options ?? []).map((opt, optIdx) => (
                    <div key={optIdx} className="flex gap-1 items-center">
                      {/* Up / Down arrows */}
                      <div className="flex flex-col gap-0 shrink-0">
                        <button
                          type="button"
                          disabled={optIdx === 0}
                          onClick={() => moveOption(optIdx, -1)}
                          className="h-4 w-5 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed"
                          title="Yuxarı"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={optIdx === (column.options?.length ?? 1) - 1}
                          onClick={() => moveOption(optIdx, 1)}
                          className="h-4 w-5 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed"
                          title="Aşağı"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>

                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(column.options ?? [])];
                          newOpts[optIdx] = e.target.value;
                          onUpdate(index, 'options', newOpts);
                        }}
                        placeholder={`Variant ${optIdx + 1}`}
                        className="text-sm h-8 flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-600 shrink-0"
                        onClick={() => {
                          const newOpts = (column.options ?? []).filter((_, i) => i !== optIdx);
                          onUpdate(index, 'options', newOpts);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-7 border-dashed"
                  onClick={() =>
                    onUpdate(index, 'options', [...(column.options ?? []), ''])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Variant əlavə et
                </Button>

                {/* Bulk paste */}
                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                  <Label className="text-xs text-gray-400">
                    Toplu əlavə — hər sətirdə bir variant yazın
                  </Label>
                  <Textarea
                    value={bulkPasteText}
                    onChange={(e) => setBulkPasteText(e.target.value)}
                    placeholder={'Variant 1\nVariant 2\nVariant 3'}
                    className="text-sm min-h-[60px] resize-none"
                    rows={3}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-7"
                    disabled={!bulkPasteText.trim()}
                    onClick={handleBulkPaste}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Toplu əlavə et
                  </Button>
                </div>

                {(column.options?.length ?? 0) === 0 && (
                  <p className="text-xs text-red-500">Ən azı bir variant əlavə edin</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
