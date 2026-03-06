import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
  error: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
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
