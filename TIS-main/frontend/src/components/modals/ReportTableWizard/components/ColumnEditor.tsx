/**
 * ColumnEditor Component
 * Individual column editing with expandable advanced settings
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  hasErrors?: boolean;
  errors?: string[];
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

export function ColumnEditor({
  column,
  index,
  disabled,
  onUpdate,
  onRemove,
  hasErrors,
  errors,
  dragHandleProps,
}: ColumnEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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

        {/* Collapsed view - show only summary */}
        {isCollapsed ? (
          <div className="flex-1 flex items-center gap-2 py-1">
            <span className="text-sm font-medium text-gray-700 truncate">
              {column.label || 'Sütun'} ({column.key || 'col_'})
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {COLUMN_TYPES.find(t => t.value === column.type)?.label || column.type}
            </span>
          </div>
        ) : (
          /* Main Fields */
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
                  if (v !== 'select') onUpdate(index, 'options', undefined);
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

        {/* Actions */}
        <div className="flex items-center gap-1 mt-1 shrink-0">
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
              title={isCollapsed ? "Genişləndir" : "Yığışdır"}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
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
              onClick={() => setShowAdvanced(!showAdvanced)}
              title="Qaydalar"
            >
              <Settings2 className="h-4 w-4" />
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
                onChange={(e) =>
                  onUpdate(index, 'hint', e.target.value || undefined)
                }
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

            {/* Type-specific settings */}
            {column.type === 'number' && (
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
            )}

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

            {column.type === 'select' && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Seçim variantları</Label>
                {(column.options ?? []).map((opt, optIdx) => (
                  <div key={optIdx} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(column.options ?? [])];
                        newOpts[optIdx] = e.target.value;
                        onUpdate(index, 'options', newOpts);
                      }}
                      placeholder={`Variant ${optIdx + 1}`}
                      className="text-sm h-8"
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
                {(column.options?.length ?? 0) === 0 && (
                  <p className="text-xs text-red-500">
                    Ən azı bir variant əlavə edin
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
