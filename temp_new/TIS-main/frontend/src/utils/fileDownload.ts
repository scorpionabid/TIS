/**
 * File download utilities
 *
 * Centralized helpers used by all import/export modals.
 * Replaces the copy-pasted `downloadBlob` / `downloadFileBlob` functions
 * that previously appeared in 5+ components.
 */

/**
 * Trigger a browser file download from a Blob object.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert a JSON array to CSV and trigger download.
 * Adds UTF-8 BOM so Azerbaijani characters (ç, ş, ğ, ı, ö, ü) render
 * correctly in Excel.
 */
export function downloadJsonAsCsv(
  rows: Record<string, string | number | boolean | null | undefined>[],
  filename: string,
): void {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | boolean | null | undefined): string =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;

  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Build a dated filename: e.g. `teachers_export_2026-04-17.xlsx`
 */
export function buildExportFilename(base: string, format: 'xlsx' | 'csv' | 'pdf'): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${base}_${date}.${format}`;
}
