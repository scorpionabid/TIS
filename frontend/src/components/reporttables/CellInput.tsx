import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  return (
    <Input
      ref={inputRef}
      type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
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
