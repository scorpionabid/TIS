/**
 * Step2Columns Component
 * Column management with drag-drop and live preview
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Copy, ChevronDown, Eye, EyeOff } from 'lucide-react';
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
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import type { ReportTable } from '@/types/reportTable';
import { reportTableService } from '@/services/reportTables';
import { useQuery } from '@tanstack/react-query';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

  const { columnErrors } = validation.step2;

  return (
    <div className="space-y-4">
      {/* Warning for published tables */}
      {isEditing && !canEditColumns && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          Dərc edilmiş cədvəlin sütunları dəyişdirilə bilməz.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
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
                    <ColumnEditor
                      key={col.key || `col-${idx}`}
                      column={col}
                      index={idx}
                      disabled={!canEditColumns}
                      onUpdate={updateColumn}
                      onRemove={removeColumn}
                      hasErrors={!!columnErrors?.[idx]}
                      errors={columnErrors?.[idx]}
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
            <ColumnPreview columns={columns} maxRows={formData.max_rows} />
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
