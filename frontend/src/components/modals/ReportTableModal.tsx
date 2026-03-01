import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Loader2, Plus, X, ChevronLeft, ChevronRight,
  GripVertical, ChevronDown, Copy, Settings2, ListChecks,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { institutionService, type Institution } from '@/services/institutions';
import { reportTableService } from '@/services/reportTables';
import { toast } from 'sonner';
import type { ReportTable, ReportTableColumn, ColumnType } from '@/types/reportTable';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: 'text',    label: 'Mətn' },
  { value: 'number',  label: 'Rəqəm' },
  { value: 'date',    label: 'Tarix' },
  { value: 'select',  label: 'Seçim (dropdown)' },
  { value: 'boolean', label: 'Bəli / Xeyr' },
];

const MAX_ROWS_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 100, 200];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  title: string;
  description: string;
  notes: string;
  columns: ReportTableColumn[];
  max_rows: number;
  target_institutions: number[];
  deadline: string;
}

interface ReportTableModalProps {
  open: boolean;
  onClose: () => void;
  editingTable?: ReportTable | null;
}

// ─── Sortable Column Item ─────────────────────────────────────────────────────

interface SortableColumnItemProps {
  col: ReportTableColumn;
  index: number;
  disabled: boolean;
  onUpdate: (index: number, field: keyof ReportTableColumn, value: string | boolean | number | string[] | undefined) => void;
  onRemove: (index: number) => void;
}

function SortableColumnItem({ col, index, disabled, onUpdate, onRemove }: SortableColumnItemProps) {
  const [showRules, setShowRules] = useState(false);
  const sortableId = col.key || `col-${index}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasRules = col.required ||
    col.hint ||
    col.min !== undefined ||
    col.max !== undefined ||
    col.min_length !== undefined ||
    col.max_length !== undefined ||
    (col.type === 'select' && (col.options?.length ?? 0) > 0);

  return (
    <div ref={setNodeRef} style={style} className="bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex gap-2 items-start p-3">
        {/* Drag handle */}
        {!disabled && (
          <button
            {...attributes}
            {...listeners}
            type="button"
            className="mt-7 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        <span className="text-gray-400 text-sm mt-7 w-5 shrink-0">{index + 1}.</span>

        <div className="flex-1 grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Açar ad</Label>
            <Input
              value={col.key}
              onChange={(e) => onUpdate(index, 'key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              placeholder="col_1"
              disabled={disabled}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Etiket</Label>
            <Input
              value={col.label}
              onChange={(e) => onUpdate(index, 'label', e.target.value)}
              placeholder="Avadanlıq adı"
              disabled={disabled}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Tip</Label>
            <Select
              value={col.type}
              onValueChange={(v) => {
                onUpdate(index, 'type', v);
                // select tipindən çıxanda options-ı sıfırla
                if (v !== 'select') onUpdate(index, 'options', undefined);
              }}
              disabled={disabled}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-6 shrink-0">
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${hasRules ? 'text-emerald-600' : 'text-gray-400'} hover:text-emerald-700`}
              onClick={() => setShowRules((v) => !v)}
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

      {/* Validation rules panel */}
      {showRules && !disabled && (
        <div className="px-3 pb-3 border-t border-gray-200 bg-gray-50/80 rounded-b-lg">
          <p className="text-xs text-gray-500 font-medium mt-2 mb-2">Qaydalar</p>
          <div className="grid grid-cols-2 gap-2">
            {/* Hint */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-500 mb-1 block">Kömək mətni (hint)</Label>
              <Input
                value={col.hint ?? ''}
                onChange={(e) => onUpdate(index, 'hint', e.target.value || undefined)}
                placeholder="Məs: Rəqəmi vergüllə daxil edin"
                className="text-sm"
              />
            </div>

            {/* Required */}
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox
                id={`req-${sortableId}`}
                checked={col.required ?? false}
                onCheckedChange={(v) => onUpdate(index, 'required', v === true ? true : undefined)}
              />
              <Label htmlFor={`req-${sortableId}`} className="text-sm text-gray-600 cursor-pointer">
                Mütləq doldurulsun
              </Label>
            </div>

            {/* Number rules */}
            {col.type === 'number' && (
              <>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Minimum</Label>
                  <Input
                    type="number"
                    value={col.min ?? ''}
                    onChange={(e) => onUpdate(index, 'min', e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Maksimum</Label>
                  <Input
                    type="number"
                    value={col.max ?? ''}
                    onChange={(e) => onUpdate(index, 'max', e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="9999"
                    className="text-sm"
                  />
                </div>
              </>
            )}

            {/* Text rules */}
            {col.type === 'text' && (
              <>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Min simvol</Label>
                  <Input
                    type="number"
                    value={col.min_length ?? ''}
                    onChange={(e) => onUpdate(index, 'min_length', e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Maks simvol</Label>
                  <Input
                    type="number"
                    value={col.max_length ?? ''}
                    onChange={(e) => onUpdate(index, 'max_length', e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="500"
                    className="text-sm"
                  />
                </div>
              </>
            )}

            {/* Select options */}
            {col.type === 'select' && (
              <div className="col-span-2 space-y-2">
                <div className="flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5 text-gray-500" />
                  <Label className="text-xs text-gray-500">Seçim variantları <span className="text-red-500">*</span></Label>
                </div>
                {(col.options ?? []).map((opt, optIdx) => (
                  <div key={optIdx} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(col.options ?? [])];
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
                        const newOpts = (col.options ?? []).filter((_, i) => i !== optIdx);
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
                  onClick={() => onUpdate(index, 'options', [...(col.options ?? []), ''])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Variant əlavə et
                </Button>
                {(col.options?.length ?? 0) === 0 && (
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

// ─── Modal Component ──────────────────────────────────────────────────────────

export function ReportTableModal({ open, onClose, editingTable }: ReportTableModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingTable;

  const [step, setStep] = useState(1);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [importPopoverOpen, setImportPopoverOpen] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    notes: '',
    columns: [],
    max_rows: 50,
    target_institutions: [],
    deadline: '',
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (editingTable) {
      setFormData({
        title: editingTable.title,
        description: editingTable.description ?? '',
        notes: editingTable.notes ?? '',
        columns: editingTable.columns ?? [],
        max_rows: editingTable.max_rows ?? 50,
        target_institutions: editingTable.target_institutions ?? [],
        deadline: editingTable.deadline
          ? new Date(editingTable.deadline).toISOString().split('T')[0]
          : '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        notes: '',
        columns: [],
        max_rows: 50,
        target_institutions: [],
        deadline: '',
      });
    }
    setStep(1);
    setInstitutionSearch('');
  }, [editingTable, open]);

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const { data: institutionsResponse } = useQuery({
    queryKey: ['institutions-for-report-tables-l4'],
    queryFn: () => institutionService.getAll({ per_page: 1000 }),
    enabled: open,
  });

  const { data: sectorsResponse } = useQuery({
    queryKey: ['institutions-for-report-tables-l3'],
    queryFn: () => institutionService.getAll({ per_page: 200, level: 3 } as Parameters<typeof institutionService.getAll>[0]),
    enabled: open,
  });

  const { data: tablesForImport } = useQuery({
    queryKey: ['report-tables-for-import'],
    queryFn: () => reportTableService.getList({ per_page: 50 }),
    enabled: open && !isEditing && importPopoverOpen,
  });

  const allInstitutions = React.useMemo(() => {
    const raw = institutionsResponse?.data ?? [];
    return raw.filter((inst) => (inst as Institution & { level?: number }).level === 4);
  }, [institutionsResponse]);

  const sectorMap = React.useMemo(() => {
    const raw = sectorsResponse?.data ?? [];
    const map: Record<number, string> = {};
    raw.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [sectorsResponse]);

  const groupedInstitutions = React.useMemo(() => {
    const groups: Record<string, Institution[]> = {};
    const q = institutionSearch.toLowerCase().trim();
    const list = q
      ? allInstitutions.filter((i) => i.name.toLowerCase().includes(q))
      : allInstitutions;

    list.forEach((inst) => {
      const parentId = (inst as Institution & { parent_id?: number }).parent_id;
      const sectorName = parentId ? (sectorMap[parentId] ?? 'Sektor bilinmir') : 'Digər';
      if (!groups[sectorName]) groups[sectorName] = [];
      groups[sectorName].push(inst);
    });
    return groups;
  }, [allInstitutions, institutionSearch, sectorMap]);

  // ─── DnD ──────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = formData.columns.map((c, i) => c.key || `col-${i}`);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex !== -1 && newIndex !== -1) {
      setFormData((prev) => ({ ...prev, columns: arrayMove(prev.columns, oldIndex, newIndex) }));
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleChange = useCallback((field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addColumn = useCallback(() => {
    const idx = formData.columns.length + 1;
    setFormData((prev) => ({
      ...prev,
      columns: [...prev.columns, { key: `col_${idx}`, label: '', type: 'text' }],
    }));
  }, [formData.columns.length]);

  const removeColumn = useCallback((index: number) => {
    setFormData((prev) => ({ ...prev, columns: prev.columns.filter((_, i) => i !== index) }));
  }, []);

  const updateColumn = useCallback((
    index: number,
    field: keyof ReportTableColumn,
    value: string | boolean | number | string[] | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      columns: prev.columns.map((col, i) =>
        i === index ? { ...col, [field]: value } : col
      ),
    }));
  }, []);

  const importColumnsFromTable = (table: ReportTable) => {
    setFormData((prev) => ({ ...prev, columns: (table.columns ?? []).map((c) => ({ ...c })) }));
    setImportPopoverOpen(false);
    toast.success(`"${table.title}" cədvəlinin sütunları yükləndi.`);
  };

  const toggleInstitution = useCallback((id: number) => {
    setFormData((prev) => ({
      ...prev,
      target_institutions: prev.target_institutions.includes(id)
        ? prev.target_institutions.filter((x) => x !== id)
        : [...prev.target_institutions, id],
    }));
  }, []);

  const toggleSector = (insts: Institution[]) => {
    const ids = insts.map((i) => i.id);
    const allSelected = ids.every((id) => formData.target_institutions.includes(id));
    setFormData((prev) => ({
      ...prev,
      target_institutions: allSelected
        ? prev.target_institutions.filter((x) => !ids.includes(x))
        : [...new Set([...prev.target_institutions, ...ids])],
    }));
  };

  const selectAll = useCallback(() => {
    setFormData((prev) => ({ ...prev, target_institutions: allInstitutions.map((i) => i.id) }));
  }, [allInstitutions]);

  const clearAll = useCallback(() => {
    setFormData((prev) => ({ ...prev, target_institutions: [] }));
  }, []);

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () =>
      reportTableService.createTable({
        title: formData.title,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        columns: formData.columns,
        max_rows: formData.max_rows,
        target_institutions: formData.target_institutions,
        deadline: formData.deadline || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Hesabat cədvəli yaradıldı.');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Xəta baş verdi.'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      reportTableService.updateTable(editingTable!.id, {
        title: formData.title,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        columns: editingTable?.can_edit_columns ? formData.columns : undefined,
        max_rows: formData.max_rows,
        target_institutions: formData.target_institutions,
        deadline: formData.deadline || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-tables'] });
      toast.success('Hesabat cədvəli yeniləndi.');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Xəta baş verdi.'),
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const canProceedStep1 = formData.title.trim().length > 0;
  const canProceedStep2 = formData.columns.length > 0 &&
    formData.columns.every((col) =>
      col.key.trim() && col.label.trim() && col.type &&
      (col.type !== 'select' || (col.options?.length ?? 0) > 0)
    );
  const columnsDisabled = isEditing && !editingTable?.can_edit_columns;

  // ─── Render ───────────────────────────────────────────────────────────────

  const STEPS = [
    { n: 1 as const, label: 'Əsas məlumatlar' },
    { n: 2 as const, label: 'Sütunlar' },
    { n: 3 as const, label: 'Müəssisələr' },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Hesabat cədvəlini redaktə et' : 'Yeni hesabat cədvəli'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-1">
          {STEPS.map(({ n, label }, i) => (
            <React.Fragment key={n}>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === n
                      ? 'bg-emerald-600 text-white'
                      : step > n
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {n}
                </div>
                <span className={`text-sm hidden sm:block ${step === n ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-0.5 bg-gray-200 mx-1" />}
            </React.Fragment>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pt-1">

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Başlıq <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Məktəbin texniki avadanlıq siyahısı..."
                  maxLength={300}
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <Label>Açıqlama</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="İstəyə bağlı qısa açıqlama..."
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label>
                  İzahat / Təlimat
                  <span className="ml-1 text-xs text-gray-400">(məktəbə göstəriləcək)</span>
                </Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Cədvəli necə doldurmaq lazımdır, hansı qaydalar var..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Maksimum sətir sayı</Label>
                  <Select
                    value={String(formData.max_rows)}
                    onValueChange={(v) => handleChange('max_rows', Number(v))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MAX_ROWS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={String(opt)}>{opt} sətir</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Son tarix</Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => handleChange('deadline', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div className="space-y-3">
              {columnsDisabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  Dərc edilmiş cədvəlin sütunları dəyişdirilə bilməz.
                </div>
              )}

              {!isEditing && (
                <Popover open={importPopoverOpen} onOpenChange={setImportPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 w-full justify-start text-gray-500">
                      <Copy className="h-3.5 w-3.5" />
                      Mövcud cədvəldən sütunları yüklə
                      <ChevronDown className="h-3.5 w-3.5 ml-auto" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-2 text-xs text-gray-500 font-medium border-b">Cədvəl seç</div>
                    <div className="max-h-48 overflow-y-auto">
                      {(tablesForImport?.data ?? []).length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Cədvəl tapılmadı</p>
                      ) : (
                        (tablesForImport?.data ?? []).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => importColumnsFromTable(t)}
                          >
                            <span className="flex-1 truncate">{t.title}</span>
                            <span className="text-xs text-gray-400 shrink-0">{t.columns?.length ?? 0} sütun</span>
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={formData.columns.map((c, i) => c.key || `col-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {formData.columns.map((col, idx) => (
                      <SortableColumnItem
                        key={col.key || `col-${idx}`}
                        col={col}
                        index={idx}
                        disabled={columnsDisabled}
                        onUpdate={updateColumn}
                        onRemove={removeColumn}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {formData.columns.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">Hələ sütun əlavə edilməyib</p>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={addColumn}
                disabled={columnsDisabled}
              >
                <Plus className="h-4 w-4 mr-1" /> Sütun əlavə et
              </Button>
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Seçilmiş:{' '}
                  <Badge variant="secondary">{formData.target_institutions.length}</Badge>
                  {allInstitutions.length > 0 && (
                    <span className="ml-1 text-xs text-gray-400">/ {allInstitutions.length}</span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>Hamısını seç</Button>
                  <Button variant="outline" size="sm" onClick={clearAll}>Sıfırla</Button>
                </div>
              </div>

              <Input
                placeholder="Müəssisə axtar..."
                value={institutionSearch}
                onChange={(e) => setInstitutionSearch(e.target.value)}
              />

              <div className="max-h-72 overflow-y-auto border rounded-lg">
                {Object.keys(groupedInstitutions).length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-4">Müəssisə tapılmadı</p>
                ) : (
                  Object.entries(groupedInstitutions)
                    .sort(([a], [b]) => a.localeCompare(b, 'az'))
                    .map(([sectorName, insts]) => {
                      const sectorIds = insts.map((i) => i.id);
                      const selectedInSector = sectorIds.filter((id) => formData.target_institutions.includes(id)).length;
                      const allSelected = selectedInSector === sectorIds.length;
                      const someSelected = selectedInSector > 0;

                      return (
                        <div key={sectorName}>
                          <div
                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b sticky top-0 cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => toggleSector(insts)}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              allSelected
                                ? 'bg-emerald-600 border-emerald-600'
                                : someSelected
                                ? 'border-emerald-400 bg-emerald-50'
                                : 'border-gray-300'
                            }`}>
                              {allSelected && <div className="w-2 h-1 border-b-2 border-l-2 border-white -rotate-45 -mt-0.5" />}
                              {someSelected && !allSelected && <div className="w-2 h-0.5 bg-emerald-600" />}
                            </div>
                            <span className="text-xs font-semibold text-gray-600 flex-1">{sectorName}</span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {selectedInSector}/{sectorIds.length}
                            </Badge>
                          </div>

                          <div className="divide-y divide-gray-100">
                            {insts.map((inst) => {
                              const selected = formData.target_institutions.includes(inst.id);
                              return (
                                <label
                                  key={inst.id}
                                  className={`flex items-center gap-3 px-5 py-2 cursor-pointer text-sm hover:bg-gray-50 transition-colors ${
                                    selected ? 'bg-emerald-50' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleInstitution(inst.id)}
                                    className="rounded accent-emerald-600"
                                  />
                                  <span className={selected ? 'font-medium text-emerald-700' : 'text-gray-700'}>
                                    {inst.name}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-2 pt-3 border-t">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={isLoading}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Əvvəlki
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>
              Ləğv et
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
              >
                Növbəti <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => { if (isEditing) updateMutation.mutate(); else createMutation.mutate(); }}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Yadda saxla' : 'Yarat'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
