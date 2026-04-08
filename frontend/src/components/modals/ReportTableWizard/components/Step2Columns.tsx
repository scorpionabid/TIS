/**
 * Step2Columns Component
 * Column management with drag-drop and live preview
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Copy, ChevronDown, Eye, EyeOff, Grid3X3, List, Trash2, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import type { ReportTable, ReportTableColumn } from '@/types/reportTable';
import { reportTableService } from '@/services/reportTables';
import { useQuery } from '@tanstack/react-query';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StepProps } from '../types';
import { useColumnManagement } from '../hooks/useColumnManagement';
import { ColumnEditor } from './ColumnEditor';
import { ColumnPreview } from './ColumnPreview';

class ColumnEditorPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: { nativeEvent: PointerEvent }) => {
        const target = nativeEvent.target as HTMLElement | null;
        if (!target) return true;

        const interactive = target.closest(
          'input, textarea, button, a, [role="combobox"], [role="listbox"], [data-radix-collection-item], [data-no-dnd]'
        );
        if (interactive) return false;

        return true;
      },
    },
  ];
}

interface CollapseSignal {
  collapsed: boolean;
  version: number;
}

interface SortableColumnItemProps {
  column: ReportTableColumn;
  index: number;
  totalColumns: number;
  disabled: boolean;
  onUpdate: (index: number, field: keyof ReportTableColumn, value: unknown) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  hasErrors: boolean;
  errors?: string[];
  collapseSignal?: CollapseSignal;
}

function SortableColumnItem({
  column,
  index,
  totalColumns,
  disabled,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  hasErrors,
  errors,
  collapseSignal,
}: SortableColumnItemProps) {
  const id = column.key || `col-${index}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    position: 'relative',
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ColumnEditor
        column={column}
        index={index}
        disabled={disabled}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onDuplicate={() => onDuplicate(index)}
        onMoveUp={index > 0 ? () => onMoveUp(index) : undefined}
        onMoveDown={index < totalColumns - 1 ? () => onMoveDown(index) : undefined}
        hasErrors={hasErrors}
        errors={errors}
        collapseSignal={collapseSignal}
        dragHandleProps={{
          attributes: attributes as Record<string, unknown>,
          listeners: listeners as Record<string, unknown>,
          ref: (_node: HTMLElement | null) => { /* node ref is on wrapper div */ },
        }}
      />
    </div>
  );
}

interface Step2ColumnsProps extends StepProps {
  isEditing: boolean;
  canEditColumns: boolean;
}

export function Step2Columns({
  formData,
  onChange,
  validation,
  isEditing,
  canEditColumns,
}: Step2ColumnsProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [importPopoverOpen, setImportPopoverOpen] = useState(false);
  const [collapseSignal, setCollapseSignal] = useState<CollapseSignal | undefined>(undefined);

  const sensors = useSensors(
    useSensor(ColumnEditorPointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const {
    columns,
    addColumn,
    removeColumn,
    updateColumn,
    duplicateColumn,
    reorderColumns,
    importColumns,
  } = useColumnManagement(formData.columns, (newColumns) => {
    onChange('columns', newColumns);
  });

  const { data: tablesForImport } = useQuery({
    queryKey: ['report-tables-for-import'],
    queryFn: () => reportTableService.getList({ per_page: 50 }),
    enabled: !isEditing && importPopoverOpen,
  });

  const handleMoveUp = (index: number) => {
    if (index > 0) reorderColumns(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index < columns.length - 1) reorderColumns(index, index + 1);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = columns.map((c, i) => c.key || `col-${i}`);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));

    if (oldIndex !== -1 && newIndex !== -1) {
      reorderColumns(oldIndex, newIndex);
    }
  };

  const handleImport = (table: ReportTable) => {
    importColumns(table.columns ?? []);
    setImportPopoverOpen(false);
    toast.success(`"${table.title}" cədvəlinin sütunları yükləndi`);
  };

  const handleCollapseAll = () => {
    setCollapseSignal((prev) => ({ collapsed: true, version: (prev?.version ?? 0) + 1 }));
  };

  const handleExpandAll = () => {
    setCollapseSignal((prev) => ({ collapsed: false, version: (prev?.version ?? 0) + 1 }));
  };

  const { columnErrors } = validation.step2;

  return (
    <div className="space-y-4">
      {/* Warning for published tables */}
      {isEditing && !canEditColumns && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          Dərc edilmiş cədvəlin sütunları və sətir strukturu dəyişdirilə bilməz.
        </div>
      )}

      {/* Table Type Toggle */}
      {canEditColumns && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg border">
                {formData.fixed_rows ? <Grid3X3 className="h-5 w-5 text-emerald-600" /> : <List className="h-5 w-5 text-blue-600" />}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {formData.fixed_rows ? 'Stabil cədvəl (fixed rows)' : 'Dinamik cədvəl'}
                </p>
                <p className="text-xs text-gray-500">
                  {formData.fixed_rows
                    ? 'Məktəb yalnız təyin olunmuş sətirləri doldura bilir'
                    : 'Məktəb özü sətir əlavə edə bilir'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="stable-mode" className="text-sm text-gray-600">Stabil cədvəl</Label>
              <Switch
                id="stable-mode"
                checked={!!formData.fixed_rows}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange('fixed_rows', [{ id: 'row_1', label: '1-ci sətir' }]);
                  } else {
                    onChange('fixed_rows', null);
                  }
                }}
                data-testid="stable-table-toggle"
              />
            </div>
          </div>

          {/* Fixed Rows Editor */}
          {formData.fixed_rows && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Sətirlər (əvvəlcədən təyin edilmiş)</Label>
                <span className="text-xs text-gray-500">{formData.fixed_rows.length} sətir</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.fixed_rows.map((row, idx) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-6">{idx + 1}.</span>
                    <Input
                      value={row.label}
                      onChange={(e) => {
                        const newRows = [...formData.fixed_rows!];
                        newRows[idx] = { ...row, label: e.target.value };
                        onChange('fixed_rows', newRows);
                      }}
                      placeholder="Sətir adı (məs: 9-cu sinif)"
                      className="flex-1 h-8 text-sm"
                      disabled={!canEditColumns}
                      data-testid="fixed-row-input"
                    />
                    {canEditColumns && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500"
                        onClick={() => {
                          const newRows = formData.fixed_rows!.filter((_, i) => i !== idx);
                          onChange('fixed_rows', newRows.length > 0 ? newRows : null);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {canEditColumns && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed mt-2"
                  onClick={() => {
                    const newRow = {
                      id: `row_${(formData.fixed_rows?.length ?? 0) + 1}`,
                      label: '',
                    };
                    onChange('fixed_rows', [...(formData.fixed_rows ?? []), newRow]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Sətir əlavə et
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isEditing && (
          <Popover open={importPopoverOpen} onOpenChange={setImportPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Copy className="h-3.5 w-3.5" />
                Sütunları yüklə
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-2 text-xs text-gray-500 font-medium border-b">
                Cədvəl seç
              </div>
              <div className="max-h-48 overflow-y-auto">
                {(tablesForImport?.data ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Cədvəl tapılmadı
                  </p>
                ) : (
                  (tablesForImport?.data ?? []).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => handleImport(t)}
                    >
                      <span className="flex-1 truncate">{t.title}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {t.columns?.length ?? 0} sütun
                      </span>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Collapse / Expand All — only shown when there are columns */}
        {canEditColumns && columns.length > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-gray-500 hover:text-gray-700"
              onClick={handleCollapseAll}
              title="Hamısını yığışdır"
            >
              <ChevronsDownUp className="h-3.5 w-3.5" />
              Yığışdır
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-gray-500 hover:text-gray-700"
              onClick={handleExpandAll}
              title="Hamısını aç"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              Aç
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 ml-auto"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Gizlət
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" /> Preview
            </>
          )}
        </Button>
      </div>

      {/* Columns List */}
      <div className="grid gap-4" style={{ gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr' }}>
        <div className="space-y-2">
          {canEditColumns ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              autoScroll={{ enabled: true }}
            >
              <SortableContext
                items={columns.map((c, i) => c.key || `col-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {columns.map((col, idx) => (
                    <SortableColumnItem
                      key={col.key || `col-${idx}`}
                      column={col}
                      index={idx}
                      totalColumns={columns.length}
                      disabled={!canEditColumns}
                      onUpdate={updateColumn}
                      onRemove={removeColumn}
                      onDuplicate={duplicateColumn}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      hasErrors={!!columnErrors?.[idx]}
                      errors={columnErrors?.[idx]}
                      collapseSignal={collapseSignal}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-2">
              {columns.map((col, idx) => (
                <div
                  key={col.key || `col-${idx}`}
                  className="bg-gray-50 rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{idx + 1}.</span>
                    <span className="font-medium">{col.label || col.key}</span>
                    <span className="text-xs text-gray-400">({col.type})</span>
                    {col.multiple && (
                      <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                        çoxlu
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {columns.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
              <p>Hələ sütun əlavə edilməyib</p>
              <p className="text-sm">Yuxarıdaki düymədən əlavə edin</p>
            </div>
          )}

          {canEditColumns && (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              onClick={addColumn}
            >
              <Plus className="h-4 w-4 mr-1" /> Sütun əlavə et
            </Button>
          )}
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="border rounded-lg p-4 bg-white">
            <h4 className="text-sm font-medium mb-3 text-gray-700">Preview</h4>
            <ColumnPreview columns={columns} maxRows={formData.max_rows} fixedRows={formData.fixed_rows} />
          </div>
        )}
      </div>

      {/* Validation Summary */}
      {validation.step2.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-red-700 mb-1">Xətalar:</p>
          <ul className="text-red-600 space-y-0.5">
            {validation.step2.errors.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
