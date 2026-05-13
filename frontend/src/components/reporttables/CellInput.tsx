import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportTableColumn, RowStatusMeta } from '@/types/reportTable';
import { FileUploadInput } from './FileUploadInput';
import { SignatureInput } from './SignatureInput';
import { GPSInput } from './GPSInput';

export const VIRTUALIZATION_THRESHOLD = 100;

export function isRowLocked(status: RowStatusMeta | undefined): boolean {
  return status?.status === 'submitted' || status?.status === 'approved';
}

export interface CellInputProps {
  col: ReportTableColumn;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
  error: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
}

/** Parse multi-select value: JSON array string → string[] */
function parseMultiValue(value: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    // Fallback: comma-separated
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

export const CellInput = React.memo(function CellInput({
  col, value, onChange, onBlur, onKeyDown, onPaste, disabled, error, inputRef,
}: CellInputProps) {
  // Hooks must be declared before any early returns
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);

  // Auto-resize textarea height as content changes
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  // Paste cleanup: normalize line endings, collapse extra whitespace/tabs
  const handleTextareaPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const raw = e.clipboardData.getData('text/plain');
    const cleaned = raw
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
    const el = textareaRef.current;
    if (!el) { onChange(cleaned); return; }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    onChange(value.substring(0, start) + cleaned + value.substring(end));
  }, [value, onChange]);

  if (col.type === 'file') {
    return (
      <FileUploadInput
        value={value || null}
        onChange={(v) => onChange(v || '')}
        disabled={disabled}
        acceptedTypes={col.accepted_types}
        maxSizeMB={col.max_file_size}
      />
    );
  }

  if (col.type === 'signature') {
    return (
      <SignatureInput
        value={value || null}
        onChange={(v) => onChange(v || '')}
        disabled={disabled}
        width={col.signature_width}
        height={col.signature_height}
      />
    );
  }

  if (col.type === 'gps') {
    return (
      <GPSInput
        value={value || null}
        onChange={(v) => onChange(v || '')}
        disabled={disabled}
        precision={col.gps_precision}
        radius={col.gps_radius}
      />
    );
  }

  // Multi-select: checkboxes
  if (col.type === 'select' && col.multiple) {
    const selected = parseMultiValue(value);

    return (
      <div
        className={cn(
          'min-h-[36px] px-2 py-1.5 rounded-md border text-sm space-y-0.5',
          error ? 'border-red-400 bg-red-50/20' : 'border-input bg-background',
          disabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''
        )}
        onBlur={onBlur}
      >
        {(col.options ?? []).map((opt) => {
          const checked = selected.includes(opt);
          return (
            <label
              key={opt}
              className={cn(
                'flex items-center gap-2 px-1 py-0.5 rounded cursor-pointer text-xs',
                disabled ? 'cursor-not-allowed' : 'hover:bg-gray-50'
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  if (disabled) return;
                  const next = e.target.checked
                    ? [...selected, opt]
                    : selected.filter((o) => o !== opt);
                  onChange(JSON.stringify(next));
                }}
                disabled={disabled}
                className="h-3.5 w-3.5 rounded accent-emerald-600"
              />
              <span>{opt}</span>
            </label>
          );
        })}
        {(col.options ?? []).length === 0 && (
          <span className="text-gray-400 text-xs italic">Variant yoxdur</span>
        )}
      </div>
    );
  }

  // Single select
  if (col.type === 'select') {
    return (
      <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className={`h-9 text-sm ${error ? 'border-red-400 focus:ring-red-300' : ''}`}
        >
          <SelectValue placeholder="Seçin..." />
        </SelectTrigger>
        <SelectContent>
          {(col.options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (col.type === 'boolean') {
    return (
      <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className={`h-9 text-sm ${error ? 'border-red-400 focus:ring-red-300' : ''}`}
        >
          <SelectValue placeholder="Seçin..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bəli">Bəli</SelectItem>
          <SelectItem value="xeyr">Xeyr</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (disabled && col.type === 'text') {
    const trimmed = value.trim();
    const isUrl = /^https?:\/\/.+/.test(trimmed);
    if (isUrl) {
      return (
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center min-h-[36px] px-3 py-2 text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800 break-all"
        >
          {trimmed}
        </a>
      );
    }
    return (
      <div className="min-h-[36px] px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap break-words leading-snug">
        {trimmed || <span className="text-gray-300">—</span>}
      </div>
    );
  }

  if (col.type === 'number' && col.allow_na) {
    const naLabels = col.na_labels?.length ? col.na_labels : ['Yoxdur'];
    // Legacy sentinel 'yoxdur' (lowercase) also counts as N/A
    const activeLabel = naLabels.includes(value) ? value : value === 'yoxdur' ? 'Yoxdur' : null;
    const isNa = activeLabel !== null;

    return (
      <div className="flex gap-1 items-center flex-wrap">
        <Input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          value={isNa ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          disabled={disabled || isNa}
          placeholder={col.hint || col.label}
          className={`h-9 text-sm flex-1 min-w-[60px] ${error ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
        />
        {naLabels.map((lbl) => {
          const active = value === lbl || (lbl === 'Yoxdur' && value === 'yoxdur');
          return (
            <button
              key={lbl}
              type="button"
              onClick={() => onChange(active ? '' : lbl)}
              disabled={disabled}
              className={cn(
                'h-9 px-2 rounded-md border text-xs whitespace-nowrap transition-colors',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                active
                  ? 'bg-orange-100 border-orange-300 text-orange-700 font-medium'
                  : 'border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-600'
              )}
            >
              {lbl}
            </button>
          );
        })}
      </div>
    );
  }

  // Text type (active): auto-expanding textarea with toolbar
  if (col.type === 'text') {
    const charCount = value.length;
    const nearLimit = col.max_length && charCount > col.max_length * 0.85;

    const textareaEl = (
      <textarea
        ref={(el) => {
          (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
          if (inputRef) inputRef(el as unknown as HTMLInputElement | null);
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLTextAreaElement>}
        onPaste={handleTextareaPaste}
        disabled={disabled}
        placeholder={col.hint || col.label}
        maxLength={col.max_length ?? undefined}
        rows={1}
        spellCheck
        className={cn(
          'w-full rounded-md border bg-background px-3 py-2 text-sm',
          'resize-none overflow-hidden leading-snug',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-red-400 focus-visible:ring-red-300' : 'border-input',
        )}
      />
    );

    return (
      <div className="w-full">
        {textareaEl}

        {/* Toolbar: clear + char counter + expand */}
        {!disabled && (
          <div className="flex items-center justify-between mt-0.5 px-0.5">
            {value ? (
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-gray-300 hover:text-gray-500 transition-colors"
                title="Təmizlə"
                tabIndex={-1}
              >
                <X className="h-3 w-3" />
              </button>
            ) : <span />}

            <div className="flex items-center gap-1.5">
              {col.max_length ? (
                <span className={cn(
                  'text-[10px] tabular-nums',
                  nearLimit ? 'text-amber-500 font-medium' : 'text-gray-300',
                )}>
                  {charCount}/{col.max_length}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-gray-300 hover:text-blue-500 transition-colors"
                title="Genişlət (tam ekran)"
                tabIndex={-1}
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Expand dialog */}
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent className="max-w-2xl w-full">
            <DialogHeader>
              <DialogTitle className="text-base">{col.label}</DialogTitle>
            </DialogHeader>
            <textarea
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              spellCheck
              placeholder={col.hint || col.label}
              maxLength={col.max_length ?? undefined}
              className={cn(
                'w-full min-h-[240px] max-h-[60vh] p-3 text-sm border rounded-lg resize-y',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'border-input bg-background leading-relaxed',
              )}
            />
            <div className="flex items-center justify-between">
              {col.max_length ? (
                <span className={cn(
                  'text-xs tabular-nums',
                  (value.length > col.max_length * 0.85) ? 'text-amber-500' : 'text-gray-400',
                )}>
                  {value.length} / {col.max_length} simvol
                </span>
              ) : (
                <span className="text-xs text-gray-400">{value.length} simvol</span>
              )}
              <Button size="sm" onClick={() => setExpanded(false)}>Bağla</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Number / date / other types: single-line Input
  return (
    <Input
      ref={inputRef}
      type={col.type === 'date' ? 'date' : 'number'}
      inputMode={col.type === 'number' ? 'decimal' : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      disabled={disabled}
      placeholder={col.hint || col.label}
      className={`h-9 text-sm ${error ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
    />
  );
});
