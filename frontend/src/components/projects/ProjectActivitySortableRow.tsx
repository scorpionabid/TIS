import React from 'react';
import {
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  X,
  Check,
  Lock,
  GripHorizontal,
  Trash2,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  Plus,
  CornerDownRight,
  MessageSquare,
  Copy,
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProjectActivity } from '@/services/projects';
import type { AssignableUser } from '@/services/tasks';
import type { ColumnSetting } from '@/hooks/projects/useColumnSettings';
import {
  ACTIVITY_STATUS_CONFIG,
  ACTIVITY_PRIORITY_CONFIG,
  type ActivityStatus,
  type ActivityPriority,
} from '@/utils/projectStatus';
import { ProjectActivityCreateRow } from './ProjectActivityCreateRow';

// ── Mətn render köməkçiləri ───────────────────────────────────────────────

/** HTML və ya markdown-u göstərmə üçün universal render (backward-compat) */
function renderContent(text: string | null | undefined): string {
  if (!text) return '';
  // HTML saxlanılmış məzmun — birbaşa istifadə et
  if (/<[a-zA-Z]/.test(text)) return text;
  // Köhnə markdown məlumatı — HTML-ə çevir
  return legacyMarkdownToHtml(text);
}

function legacyMarkdownToHtml(text: string): string {
  if (!text) return '';
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = safe.split('\n');
  const out: string[] = [];
  let listTag: 'ul' | 'ol' | null = null;
  const closeList = () => { if (listTag) { out.push(`</${listTag}>`); listTag = null; } };
  for (const line of lines) {
    const bm = line.match(/^- (.*)$/);
    const nm = line.match(/^\d+\. (.*)$/);
    if (bm) {
      if (listTag === 'ol') closeList();
      if (!listTag) { out.push('<ul style="list-style-type:disc;padding-left:1.1rem;margin:2px 0">'); listTag = 'ul'; }
      out.push(`<li>${bm[1]}</li>`);
    } else if (nm) {
      if (listTag === 'ul') closeList();
      if (!listTag) { out.push('<ol style="list-style-type:decimal;padding-left:1.1rem;margin:2px 0">'); listTag = 'ol'; }
      out.push(`<li>${nm[1]}</li>`);
    } else {
      closeList();
      out.push(line.length ? `${line}<br>` : '<br>');
    }
  }
  closeList();
  return out.join('')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n<>]+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/<br>$/, '');
}

// ── WYSIWYG InlineEditor (contenteditable) ────────────────────────────────

/** Enter = saxla | Escape = ləğv | Ctrl+B/I/U = format | Tab = növbəti xana */
function InlineTextarea({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder,
  className,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  // Mount: mövcud dəyəri HTML-ə çevir
  React.useEffect(() => {
    if (!ref.current) return;
    const html = renderContent(value);
    if (ref.current.innerHTML !== html) ref.current.innerHTML = html || '';
    if (autoFocus) {
      ref.current.focus();
      const r = document.createRange();
      r.selectNodeContents(ref.current);
      r.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(r);
    }
  }, []); // Yalnız mount-da — value prop-u dəyişsə yenidən render etmə (controlled deyil)

  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div className="flex flex-col w-full">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onClick={(e) => e.stopPropagation()}
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            if (e.altKey) {
              // Alt+Enter → yeni sətir (contenteditable-də <br> yerləşdir)
              e.preventDefault();
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const br = document.createElement('br');
                range.insertNode(br);
                // Kursorun br-dən sonra yerləşdirilməsi
                const after = document.createTextNode('​'); // zero-width space
                range.setStartAfter(br);
                range.insertNode(after);
                range.setStartAfter(after);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                if (ref.current) onChange(ref.current.innerHTML);
              }
              return;
            }
            if (!e.shiftKey) { e.preventDefault(); onSave(); return; }
          }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); return; }
          if (e.key === 'Tab') {
            e.preventDefault(); onSave();
            const row = (e.target as HTMLElement).closest('tr');
            if (row) {
              const focusables = Array.from(row.querySelectorAll<HTMLElement>('input,textarea,[contenteditable],select,button')).filter(el => !el.getAttribute('disabled'));
              const idx = focusables.indexOf(ref.current!);
              const next = e.shiftKey ? focusables[idx - 1] : focusables[idx + 1];
              if (next) setTimeout(() => (next as HTMLElement).focus(), 50);
            }
            return;
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); exec('bold'); }
          if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); exec('italic'); }
        }}
        className={cn(
          'min-h-[24px] outline-none text-xs leading-snug py-1 px-0',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40',
          className,
        )}
      />
    </div>
  );
}

function TruncatedTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  if (!text) return <>{children}</>;
  const htmlContent = renderContent(text);
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="max-w-[720px] max-h-[480px] overflow-y-auto text-sm break-words p-4 bg-popover text-popover-foreground border shadow-2xl rounded-xl leading-relaxed">
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </TooltipContent>
    </Tooltip>
  );
}

export interface SortableRowProps {
  activity: ProjectActivity;
  projectId: number;
  columns: ColumnSetting[];
  isVisible: (id: string) => boolean;
  editingId: number | null;
  isHighlighted?: boolean;
  onStatusChange: (id: number, status: ProjectActivity['status']) => void;
  startEditing: (activity: ProjectActivity) => void;
  saveEdit: () => void;
  cancelEditing: () => void;
  editFormData: Partial<ProjectActivity>;
  handleEditFieldChange: (field: keyof ProjectActivity, value: unknown) => void;
  isSubmitting: boolean;
  availableUsers?: AssignableUser[];
  columnWidths: Record<string, number>;
  onDelete: (id: number) => void;
  canEdit?: boolean;
  subActivityCount?: number;
  isSubExpanded?: boolean;
  onToggleSubExpand?: () => void;
  onAddSubActivity?: () => void;
  onViewDetails?: (activity: ProjectActivity) => void;
  onCloneActivity?: (activity: ProjectActivity) => void;
  isSubActivity?: boolean;
  isViewExpanded?: boolean;
}

export function getDeadlineStatus(
  endDate: string | null,
  status: string,
): 'overdue' | 'near' | null {
  if (!endDate || status === 'completed' || status === 'checking') return null;
  const diffDays = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'near';
  return null;
}

export const ProjectActivitySortableRow = React.memo(function ProjectActivitySortableRow({
  activity,
  projectId,
  columns,
  isVisible,
  editingId,
  isHighlighted,
  onStatusChange,
  startEditing,
  saveEdit,
  cancelEditing,
  editFormData,
  handleEditFieldChange,
  isSubmitting,
  availableUsers,
  columnWidths,
  onDelete,
  canEdit,
  subActivityCount = 0,
  isSubExpanded = false,
  onToggleSubExpand,
  onAddSubActivity,
  onViewDetails,
  onCloneActivity,
  isSubActivity = false,
  isViewExpanded = false,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const nameWidth = columnWidths['name'] || 300;
  const isEditing = editingId === activity.id;
  const statusCfg = ACTIVITY_STATUS_CONFIG[activity.status as ActivityStatus];
  const priorityCfg = ACTIVITY_PRIORITY_CONFIG[activity.priority as ActivityPriority];

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        'group border-b border-muted/20 transition-all select-none',
        isEditing ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/5',
        isHighlighted && 'bg-yellow-100/40 ring-1 ring-yellow-400/50 z-40 animate-pulse duration-[3000ms]',
        isDragging && 'opacity-50 ring-2 ring-primary bg-accent z-50 relative',
      )}
      onBlur={(e) => {
        if (isEditing) {
          // Radix Portal və ya Popover daxilindədirsə redaktəni saxla
          const isInsidePortal = e.relatedTarget instanceof Element && (
            e.relatedTarget.closest('[data-radix-portal]') ||
            e.relatedTarget.closest('[data-radix-popper-content-wrapper]') ||
            e.relatedTarget.closest('.bg-popover') ||
            e.relatedTarget.closest('[role="dialog"]') ||
            e.relatedTarget.closest('[role="listbox"]')
          );
          if (isInsidePortal) return;

          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setTimeout(saveEdit, 150);
          }
        }
      }}
    >
      {/* Name — sticky left */}
      <TableCell
        className="sticky left-0 z-20 bg-card border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] cursor-default py-1.5"
        style={{ width: nameWidth, minWidth: nameWidth, maxWidth: nameWidth }}
        {...(!isEditing ? attributes : {})}
        {...(!isEditing ? listeners : {})}
      >
        <div
          className="flex items-start gap-2 px-2"
          onClick={(e) => {
            if (activity.is_editable) {
              e.stopPropagation();
              startEditing(activity);
            }
          }}
        >
          {!activity.is_editable && <Lock className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
          {isEditing ? (
            <InlineTextarea
              autoFocus
              value={editFormData.name ?? ''}
              onChange={(v) => handleEditFieldChange('name', v)}
              onSave={saveEdit}
              onCancel={cancelEditing}
              placeholder="Fəaliyyət adı..."
              className="font-semibold text-[12px]"
            />
          ) : (
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <TruncatedTooltip
                  text={[activity.name, activity.description].filter(Boolean).join('\n─────────────\n')}
                >
                  <span className={cn('text-[12px] font-semibold tracking-tight block', !isViewExpanded && 'line-clamp-2', !activity.is_editable && 'text-muted-foreground/70')}>
                    <span dangerouslySetInnerHTML={{ __html: renderContent(activity.name) }} />
                  </span>
                </TruncatedTooltip>

                {/* Sürətli Əməliyyat Badgeləri/Düymələri */}
                <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                  {/* Alt fəaliyyətləri yığıb-açan düymə (kəsilməyən, həmişə görünən!) */}
                  {subActivityCount > 0 && onToggleSubExpand && (
                    <button
                      type="button"
                      onClick={onToggleSubExpand}
                      className={cn(
                        "inline-flex h-6 px-2 rounded-lg items-center gap-1 transition-all duration-200 font-bold text-[10px] border shadow-sm hover:scale-105 active:scale-95",
                        isSubExpanded
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                      )}
                      title={isSubExpanded ? 'Alt fəaliyyətləri bağla' : `${subActivityCount} alt fəaliyyət göstər`}
                    >
                      <ChevronRight className={cn("w-3 h-3 transition-transform duration-300 shrink-0", isSubExpanded && "rotate-90")} />
                      <span className={cn("px-1 rounded text-[9px] tabular-nums font-black", isSubExpanded ? "bg-primary-foreground/20" : "bg-primary/25")}>{subActivityCount}</span>
                    </button>
                  )}

                  {/* Alt fəaliyyət əlavə et (3-cü simgə - hoverdə görünür, yalnız icon) */}
                  {!isSubActivity && activity.is_editable && onAddSubActivity && (
                    <button
                      type="button"
                      onClick={onAddSubActivity}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-lg transition-all duration-200 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-900/30 shadow-sm opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
                      title="Alt fəaliyyət əlavə et"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Kopyala (4-cü simgə - hoverdə görünür, yalnız icon) */}
                  {onCloneActivity && (
                    <button
                      type="button"
                      onClick={() => onCloneActivity(activity)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-lg transition-all duration-200 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/30 shadow-sm opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
                      title="Kopyala"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </TableCell>

      {columns.filter((c) => isVisible(c.id) && c.id !== 'name').map((col) => {
        switch (col.id) {
          case 'employees':
            return (
              <TableCell key="employees" className="p-0 border-r" style={{ width: columnWidths['employees'] || 150 }}>
                {isEditing ? (
                  <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <ProjectActivityCreateRow
                      projectId={projectId}
                      status={activity.status}
                      availableColumns={columns}
                      isVisible={isVisible}
                      onCreated={() => {}}
                      availableUsers={availableUsers}
                      canEdit
                      isJustSelector
                      multiSelectorValue={editFormData.employee_ids || []}
                      onMultiSelectorChange={(vals: number[]) => handleEditFieldChange('employee_ids', vals)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-1 gap-0.5" onClick={() => startEditing(activity)}>
                    {activity.assigned_employees?.length
                      ? activity.assigned_employees.map((e) => (
                          <div key={e.id} className="text-[10px] font-medium text-muted-foreground">{e.name}</div>
                        ))
                      : <span className="text-[10px] italic text-muted-foreground/40">-</span>}
                  </div>
                )}
              </TableCell>
            );

          case 'status':
            return statusCfg ? (
              <TableCell key="status" className="p-0 border-r" style={{ width: columnWidths['status'] || 120 }}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className={cn(
                      'w-full h-8 flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:brightness-95',
                      statusCfg.color,
                      statusCfg.textColor,
                      !activity.is_editable && 'opacity-70 cursor-not-allowed',
                    )}>
                      {statusCfg.label}
                    </div>
                  </DropdownMenuTrigger>
                  {activity.is_editable && (
                    <DropdownMenuContent align="center" className="w-[160px]">
                      {Object.entries(ACTIVITY_STATUS_CONFIG).map(([id, cfg]) => (
                        <DropdownMenuItem key={id} onClick={() => onStatusChange(activity.id, id as ActivityStatus)} className="gap-2">
                          <div className={cn('w-3 h-3 rounded-full', cfg.color)} />
                          {cfg.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  )}
                </DropdownMenu>
              </TableCell>
            ) : null;

          case 'priority':
            return (
              <TableCell key="priority" className="p-0 border-r" style={{ width: columnWidths['priority'] || 100 }}>
                <div className="flex justify-center h-8 items-center" onClick={() => startEditing(activity)}>
                  {isEditing ? (
                    <select
                      value={editFormData.priority}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleEditFieldChange('priority', e.target.value)}
                      className="text-xs bg-transparent border-none focus:ring-0"
                    >
                      <option value="low">Aşağı</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksək</option>
                      <option value="critical">Kritik</option>
                    </select>
                  ) : priorityCfg ? (
                    <Badge variant="outline" className={cn('text-xs px-1.5 py-0 border-none', priorityCfg.color)}>
                      {priorityCfg.label}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
            );

          case 'start_date':
            return (
              <TableCell key="start_date" className="p-0 border-r text-center" style={{ width: columnWidths['start_date'] || 120 }}>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editFormData.start_date?.split('T')[0] || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleEditFieldChange('start_date', e.target.value)}
                    className="h-7 text-[10px] border-none text-center bg-transparent"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-8" onClick={() => startEditing(activity)}>
                    <span className="text-[10px] font-medium leading-tight">
                      {activity.start_date ? format(new Date(activity.start_date), 'dd.MM.yyyy', { locale: az }) : '-'}
                    </span>
                  </div>
                )}
              </TableCell>
            );

          case 'end_date':
            return (
              <TableCell
                key="end_date"
                className={cn(
                  'p-0 border-r text-center transition-colors',
                  !isEditing && getDeadlineStatus(activity.end_date, activity.status) === 'overdue' && 'bg-destructive/5',
                  !isEditing && getDeadlineStatus(activity.end_date, activity.status) === 'near' && 'bg-warning/5',
                )}
                style={{ width: columnWidths['end_date'] || 120 }}
              >
                {isEditing ? (
                  <Input
                    type="date"
                    value={editFormData.end_date?.split('T')[0] || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleEditFieldChange('end_date', e.target.value)}
                    className="h-7 text-[10px] border-none text-center bg-transparent"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-8 cursor-pointer" onClick={() => startEditing(activity)}>
                    <span className={cn(
                      'text-[10px] font-medium leading-tight',
                      getDeadlineStatus(activity.end_date, activity.status) === 'overdue' && 'text-destructive',
                      getDeadlineStatus(activity.end_date, activity.status) === 'near' && 'text-warning',
                    )}>
                      {activity.end_date ? format(new Date(activity.end_date), 'dd.MM.yyyy', { locale: az }) : '-'}
                    </span>
                  </div>
                )}
              </TableCell>
            );

          case 'duration':
            return (
              <TableCell
                key="duration"
                className="text-center text-[11px] font-medium text-muted-foreground border-r"
                style={{ width: columnWidths['duration'] || 80 }}
                onClick={() => startEditing(activity)}
              >
                {(() => {
                  if (!activity.start_date || !activity.end_date) return '-';
                  const diff = Math.ceil(
                    (new Date(activity.end_date).getTime() - new Date(activity.start_date).getTime()) / (1000 * 60 * 60 * 24),
                  ) + 1;
                  return `${diff} gün`;
                })()}
              </TableCell>
            );

          case 'budget':
            return (
              <TableCell
                key="budget"
                className="text-center font-medium text-success text-[11px] border-r"
                style={{ width: columnWidths['budget'] || 100 }}
                onClick={() => startEditing(activity)}
              >
                {isEditing ? (
                  <Input
                    type="number"
                    value={editFormData.budget ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleEditFieldChange('budget', e.target.value ? Number(e.target.value) : null)}
                    className="h-7 text-xs border-none text-center bg-transparent"
                    placeholder="0"
                  />
                ) : (
                  activity.budget ? `${Number(activity.budget).toLocaleString()} ₼` : '-'
                )}
              </TableCell>
            );

          case 'expected_outcome':
            return (
              <TableCell key="expected_outcome" className="text-left py-1 px-2 text-[11px] text-muted-foreground border-r align-top" style={{ width: columnWidths['expected_outcome'] || 180 }} onClick={() => startEditing(activity)}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.expected_outcome ?? ''}
                    onChange={(v) => handleEditFieldChange('expected_outcome', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Gözlənilən nəticə..."
                  />
                ) : (
                  <TruncatedTooltip text={activity.expected_outcome || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(activity.expected_outcome) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'kpi_metrics':
            return (
              <TableCell key="kpi_metrics" className="text-left py-1 px-2 text-[11px] text-muted-foreground border-r align-top" style={{ width: columnWidths['kpi_metrics'] || 150 }} onClick={() => startEditing(activity)}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.kpi_metrics ?? ''}
                    onChange={(v) => handleEditFieldChange('kpi_metrics', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="KPI metriklər..."
                  />
                ) : (
                  <TruncatedTooltip text={activity.kpi_metrics || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(activity.kpi_metrics) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'risks':
            return (
              <TableCell key="risks" className="text-left py-1 px-2 text-[11px] text-destructive/70 italic border-r align-top" style={{ width: columnWidths['risks'] || 150 }} onClick={() => startEditing(activity)}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.risks ?? ''}
                    onChange={(v) => handleEditFieldChange('risks', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Risklər..."
                    className="text-destructive/70 italic"
                  />
                ) : (
                  <TruncatedTooltip text={activity.risks || ''}>
                    <div className={cn('italic text-destructive/70', !isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(activity.risks) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'dependency':
            return (
              <TableCell key="dependency" className="text-center text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['dependency'] || 100 }} onClick={() => startEditing(activity)}>
                {activity.parent_id || '-'}
              </TableCell>
            );

          case 'location_platform':
            return (
              <TableCell key="location_platform" className="text-left py-1 px-2 text-[11px] font-medium border-r align-top" style={{ width: columnWidths['location_platform'] || 160 }} onClick={() => startEditing(activity)}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.location_platform ?? ''}
                    onChange={(v) => handleEditFieldChange('location_platform', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Platforma..."
                  />
                ) : (
                  <TruncatedTooltip text={activity.location_platform || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(activity.location_platform) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'monitoring_mechanism':
            return (
              <TableCell key="monitoring_mechanism" className="text-left py-1 px-2 text-[11px] border-r align-top" style={{ width: columnWidths['monitoring_mechanism'] || 200 }} onClick={() => startEditing(activity)}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.monitoring_mechanism ?? ''}
                    onChange={(v) => handleEditFieldChange('monitoring_mechanism', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Monitorinq mexanizmi..."
                  />
                ) : (
                  <TruncatedTooltip text={activity.monitoring_mechanism || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(activity.monitoring_mechanism) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'description':
            return (
              <TableCell key="description" className="text-left py-1 px-2 text-[11px] text-muted-foreground border-r align-top" style={{ width: columnWidths['description'] || 300 }} onClick={() => startEditing(activity)}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.description ?? ''}
                    onChange={(v) => handleEditFieldChange('description', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Təsvir..."
                  />
                ) : (
                  <TruncatedTooltip text={activity.description || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(activity.description) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'notes':
            return (
              <TableCell key="notes" className="text-left py-1 px-2 text-[11px] text-muted-foreground border-r align-top" style={{ width: columnWidths['notes'] || 300 }} onClick={() => startEditing(activity)}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.notes ?? ''}
                    onChange={(v) => handleEditFieldChange('notes', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Qeydlər..."
                  />
                ) : (
                  <TruncatedTooltip text={activity.notes || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(activity.notes) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          default:
            return null;
        }
      })}

      {/* Actions — sticky right */}
      <TableCell
        className="sticky right-0 z-20 bg-card border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] py-0"
        style={{ width: 80, minWidth: 80, maxWidth: 80 }}
      >
        <div className="flex items-center justify-center gap-1">
          {isEditing ? (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:bg-success/10"
                onClick={(e) => { e.stopPropagation(); saveEdit(); }} disabled={isSubmitting} title="Saxla (Enter)">
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); cancelEditing(); }} title="Ləğv et (Esc)">
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              {onViewDetails && (
                <Button size="icon" variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all rounded-md"
                  onClick={(e) => { e.stopPropagation(); onViewDetails(activity); }}
                  title="Şərhlər / Tarixçə"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              )}
              {canEdit && activity.is_editable && (
                <Button size="icon" variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-md"
                  onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }}
                  title="Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

// ── Sub-activity sırası (indent-li, DnD-siz) ─────────────────────────────

export interface SubActivityRowProps {
  sub: ProjectActivity;
  projectId: number;
  columns: SortableRowProps['columns'];
  isVisible: (id: string) => boolean;
  editingId: number | null;
  onStatusChange: (id: number, status: ProjectActivity['status']) => void;
  startEditing: (a: ProjectActivity) => void;
  saveEdit: () => void;
  cancelEditing: () => void;
  editFormData: Partial<ProjectActivity>;
  handleEditFieldChange: (f: keyof ProjectActivity, v: unknown) => void;
  isSubmitting: boolean;
  availableUsers?: AssignableUser[];
  columnWidths: Record<string, number>;
  onDelete: (id: number) => void;
  canEdit?: boolean;
  isViewExpanded?: boolean;
}

export function SubActivityRow({
  sub,
  projectId,
  columns,
  isVisible,
  editingId,
  onStatusChange,
  startEditing,
  saveEdit,
  cancelEditing,
  editFormData,
  handleEditFieldChange,
  isSubmitting,
  availableUsers,
  columnWidths,
  onDelete,
  canEdit,
  isViewExpanded = false,
}: SubActivityRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sub.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const isEditing     = editingId === sub.id;
  const nameWidth     = columnWidths['name'] || 350;
  const statusCfg     = ACTIVITY_STATUS_CONFIG[sub.status as ActivityStatus];
  const priorityCfg   = ACTIVITY_PRIORITY_CONFIG[sub.priority as ActivityPriority];

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        'group border-b border-muted/10 transition-all select-none',
        'bg-[#f5f8fe] dark:bg-[#141b2d]',               // alt fəaliyyət fonu (solid!)
        isEditing && 'bg-primary/5 border-primary/20',
        isDragging && 'opacity-50 ring-2 ring-primary bg-accent z-50 relative',
        'animate-in fade-in slide-in-from-top-1 duration-200',
      )}
      onBlur={(e) => {
        if (isEditing) {
          // Radix Portal və ya Popover daxilindədirsə redaktəni saxla
          const isInsidePortal = e.relatedTarget instanceof Element && (
            e.relatedTarget.closest('[data-radix-portal]') ||
            e.relatedTarget.closest('[data-radix-popper-content-wrapper]') ||
            e.relatedTarget.closest('.bg-popover') ||
            e.relatedTarget.closest('[role="dialog"]') ||
            e.relatedTarget.closest('[role="listbox"]')
          );
          if (isInsidePortal) return;

          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setTimeout(saveEdit, 150);
          }
        }
      }}
    >
      {/* Name — sticky, indent-li */}
      <TableCell
        className="sticky left-0 z-20 border-r border-l-2 border-l-primary/20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] cursor-default py-1.5 bg-[#f5f8fe] dark:bg-[#141b2d]"
        style={{ width: nameWidth, minWidth: nameWidth, maxWidth: nameWidth }}
        {...(!isEditing ? attributes : {})}
        {...(!isEditing ? listeners : {})}
      >
        <div
          className="flex items-start gap-1.5 px-2 pl-8"
          onClick={() => { if (sub.is_editable) startEditing(sub); }}
        >
          <CornerDownRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
          {isEditing ? (
            <InlineTextarea
              autoFocus
              value={editFormData.name ?? ''}
              onChange={(v) => handleEditFieldChange('name', v)}
              onSave={saveEdit}
              onCancel={cancelEditing}
              placeholder="Alt fəaliyyət adı..."
              className="font-medium text-[11px]"
            />
          ) : (
            <TruncatedTooltip text={[sub.name, sub.description].filter(Boolean).join('\n─────────────\n')}>
              <span
                className={cn("text-[11px] font-medium text-muted-foreground cursor-pointer block", !isViewExpanded && "line-clamp-2")}
                dangerouslySetInnerHTML={{ __html: renderContent(sub.name) || sub.name }}
              />
            </TruncatedTooltip>
          )}
        </div>
      </TableCell>

      {columns.filter((c) => isVisible(c.id) && c.id !== 'name').map((col) => {
        switch (col.id) {
          case 'employees':
            return (
              <TableCell key="employees" className="p-0 border-r" style={{ width: columnWidths['employees'] || 150 }}>
                {isEditing ? (
                  <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <ProjectActivityCreateRow
                      projectId={projectId} status={sub.status}
                      availableColumns={columns} isVisible={isVisible}
                      onCreated={() => {}} availableUsers={availableUsers}
                      canEdit isJustSelector
                      multiSelectorValue={editFormData.employee_ids || []}
                      onMultiSelectorChange={(vals: number[]) => handleEditFieldChange('employee_ids', vals)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-1 gap-0.5" onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                    {sub.assigned_employees?.length
                      ? sub.assigned_employees.map((e) => (
                          <div key={e.id} className="text-[10px] font-medium text-muted-foreground">{e.name}</div>
                        ))
                      : <span className="text-[10px] italic text-muted-foreground/30">-</span>}
                  </div>
                )}
              </TableCell>
            );

          case 'status':
            return statusCfg ? (
              <TableCell key="status" className="p-0 border-r" style={{ width: columnWidths['status'] || 120 }}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className={cn(
                      'w-full h-8 flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:brightness-95',
                      statusCfg.color, statusCfg.textColor,
                      !canEdit && 'opacity-70 cursor-not-allowed',
                    )}>
                      {statusCfg.label}
                    </div>
                  </DropdownMenuTrigger>
                  {canEdit && (
                    <DropdownMenuContent align="center" className="w-[160px]">
                      {Object.entries(ACTIVITY_STATUS_CONFIG).map(([id, cfg]) => (
                        <DropdownMenuItem key={id} onClick={() => onStatusChange(sub.id, id as ActivityStatus)} className="gap-2">
                          <div className={cn('w-3 h-3 rounded-full', cfg.color)} />
                          {cfg.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  )}
                </DropdownMenu>
              </TableCell>
            ) : null;

          case 'priority':
            return (
              <TableCell key="priority" className="p-0 border-r" style={{ width: columnWidths['priority'] || 100 }}>
                <div className="flex justify-center h-8 items-center" onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                  {isEditing ? (
                    <select
                      value={editFormData.priority}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleEditFieldChange('priority', e.target.value)}
                      className="text-xs bg-transparent border-none focus:ring-0"
                    >
                      <option value="low">Aşağı</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksək</option>
                      <option value="critical">Kritik</option>
                    </select>
                  ) : priorityCfg ? (
                    <Badge variant="outline" className={cn('text-xs px-1.5 py-0 border-none', priorityCfg.color)}>
                      {priorityCfg.label}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
            );

          case 'start_date':
            return (
              <TableCell key="start_date" className="p-0 border-r text-center" style={{ width: columnWidths['start_date'] || 120 }}>
                {isEditing ? (
                  <Input type="date" value={editFormData.start_date?.split('T')[0] || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleEditFieldChange('start_date', e.target.value)}
                    className="h-7 text-[10px] border-none text-center bg-transparent" />
                ) : (
                  <div className="flex items-center justify-center h-8" onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                    <span className="text-[10px] font-medium">
                      {sub.start_date ? format(new Date(sub.start_date), 'dd.MM.yyyy', { locale: az }) : '-'}
                    </span>
                  </div>
                )}
              </TableCell>
            );

          case 'end_date':
            return (
              <TableCell key="end_date" className={cn('p-0 border-r text-center', !isEditing && getDeadlineStatus(sub.end_date, sub.status) === 'overdue' && 'bg-destructive/5')} style={{ width: columnWidths['end_date'] || 120 }}>
                {isEditing ? (
                  <Input type="date" value={editFormData.end_date?.split('T')[0] || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleEditFieldChange('end_date', e.target.value)}
                    className="h-7 text-[10px] border-none text-center bg-transparent" />
                ) : (
                  <div className="flex items-center justify-center h-8 cursor-pointer" onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                    <span className={cn('text-[10px] font-medium', getDeadlineStatus(sub.end_date, sub.status) === 'overdue' && 'text-destructive')}>
                      {sub.end_date ? format(new Date(sub.end_date), 'dd.MM.yyyy', { locale: az }) : '-'}
                    </span>
                  </div>
                )}
              </TableCell>
            );

          case 'duration':
            return (
              <TableCell key="duration" className="text-center text-[10px] text-muted-foreground border-r" style={{ width: columnWidths['duration'] || 80 }}>
                {(() => {
                  if (!sub.start_date || !sub.end_date) return '-';
                  const diff = Math.ceil((new Date(sub.end_date).getTime() - new Date(sub.start_date).getTime()) / 86400000) + 1;
                  return `${diff} gün`;
                })()}
              </TableCell>
            );

          case 'budget':
            return (
              <TableCell key="budget" className="text-center text-[11px] border-r" style={{ width: columnWidths['budget'] || 100 }} onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                {isEditing ? (
                  <Input type="number" value={editFormData.budget ?? ''} onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleEditFieldChange('budget', e.target.value ? Number(e.target.value) : null)}
                    className="h-7 text-xs border-none text-center bg-transparent" placeholder="0" />
                ) : (sub.budget ? `${Number(sub.budget).toLocaleString()} ₼` : '-')}
              </TableCell>
            );

          case 'expected_outcome':
            return (
              <TableCell key="expected_outcome" className="text-left py-1 px-2 text-[11px] text-muted-foreground border-r align-top" style={{ width: columnWidths['expected_outcome'] || 180 }} onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.expected_outcome ?? ''}
                    onChange={(v) => handleEditFieldChange('expected_outcome', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Gözlənilən nəticə..."
                  />
                ) : (
                  <TruncatedTooltip text={sub.expected_outcome || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(sub.expected_outcome) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'kpi_metrics':
            return (
              <TableCell key="kpi_metrics" className="text-left py-1 px-2 text-[11px] text-muted-foreground border-r align-top" style={{ width: columnWidths['kpi_metrics'] || 150 }} onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.kpi_metrics ?? ''}
                    onChange={(v) => handleEditFieldChange('kpi_metrics', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="KPI metriklər..."
                  />
                ) : (
                  <TruncatedTooltip text={sub.kpi_metrics || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(sub.kpi_metrics) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'risks':
            return (
              <TableCell key="risks" className="text-left py-1 px-2 text-[11px] text-destructive/70 italic border-r align-top" style={{ width: columnWidths['risks'] || 150 }} onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.risks ?? ''}
                    onChange={(v) => handleEditFieldChange('risks', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Risklər..."
                    className="text-destructive/70 italic"
                  />
                ) : (
                  <TruncatedTooltip text={sub.risks || ''}>
                    <div className={cn('italic text-destructive/70', !isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(sub.risks) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'dependency':
            return (
              <TableCell key="dependency" className="text-center text-[11px] text-muted-foreground border-r" style={{ width: columnWidths['dependency'] || 100 }} onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                <span className="text-muted-foreground/40">{sub.parent_id || '-'}</span>
              </TableCell>
            );

          case 'location_platform':
            return (
              <TableCell key="location_platform" className="text-left py-1 px-2 text-[11px] font-medium border-r align-top" style={{ width: columnWidths['location_platform'] || 160 }} onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.location_platform ?? ''}
                    onChange={(v) => handleEditFieldChange('location_platform', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Platforma..."
                  />
                ) : (
                  <TruncatedTooltip text={sub.location_platform || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(sub.location_platform) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'monitoring_mechanism':
            return (
              <TableCell key="monitoring_mechanism" className="text-left py-1 px-2 text-[11px] border-r align-top" style={{ width: columnWidths['monitoring_mechanism'] || 200 }} onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.monitoring_mechanism ?? ''}
                    onChange={(v) => handleEditFieldChange('monitoring_mechanism', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Monitorinq mexanizmi..."
                  />
                ) : (
                  <TruncatedTooltip text={sub.monitoring_mechanism || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(sub.monitoring_mechanism) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'description':
            return (
              <TableCell key="description" className="text-left py-1 px-2 text-[11px] text-muted-foreground border-r align-top" style={{ width: columnWidths['description'] || 300 }} onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.description ?? ''}
                    onChange={(v) => handleEditFieldChange('description', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Təsvir..."
                  />
                ) : (
                  <TruncatedTooltip text={sub.description || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(sub.description) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          case 'notes':
            return (
              <TableCell key="notes" className="text-left py-1 px-2 text-[11px] text-muted-foreground border-r align-top" style={{ width: columnWidths['notes'] || 300 }} onClick={() => { if (sub.is_editable) startEditing(sub); }}>
                {isEditing ? (
                  <InlineTextarea
                    value={editFormData.notes ?? ''}
                    onChange={(v) => handleEditFieldChange('notes', v)}
                    onSave={saveEdit}
                    onCancel={cancelEditing}
                    placeholder="Qeydlər..."
                  />
                ) : (
                  <TruncatedTooltip text={sub.notes || ''}>
                    <div className={cn(!isViewExpanded && "line-clamp-2")} dangerouslySetInnerHTML={{ __html: renderContent(sub.notes) || '-' }} />
                  </TruncatedTooltip>
                )}
              </TableCell>
            );

          default:
            return null;
        }
      })}

      {/* Actions */}
      <TableCell className="sticky right-0 z-20 bg-[#f5f8fe] dark:bg-[#141b2d] border-l py-0" style={{ width: 80, minWidth: 80, maxWidth: 80 }}>
        <div className="flex items-center justify-center gap-1">
          {isEditing ? (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:bg-success/10"
                onClick={(e) => { e.stopPropagation(); saveEdit(); }} disabled={isSubmitting} title="Saxla (Enter)">
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); cancelEditing(); }} title="Ləğv et (Esc)">
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            canEdit && (
              <Button size="icon" variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-md"
                onClick={(e) => { e.stopPropagation(); onDelete(sub.id); }}
                title="Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
