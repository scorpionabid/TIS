/**
 * TSV (Tab-Separated Values) parser utility
 * Handles Excel-style quoted fields: "value with, comma", escaped quotes ""→"
 */

/**
 * Parses TSV text into a 2D array of strings
 * Supports Excel-style quoted fields with escaped quotes
 * 
 * @param text - The TSV text to parse
 * @returns Array of rows, where each row is an array of cell values
 */
export function parseTSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 2; continue; }
      if (ch === '"') { inQuotes = false; i++; continue; }
      cell += ch; i++;
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === '\t') { row.push(cell); cell = ''; i++; continue; }
      if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        row.push(cell); cell = '';
        rows.push(row); row = [];
        if (ch === '\r') i++;
        i++; continue;
      }
      cell += ch; i++;
    }
  }
  if (row.length > 0 || cell) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Checks if text appears to be TSV data (contains tabs or newlines)
 * 
 * @param text - The text to check
 * @returns True if the text contains TSV structure
 */
export function isTSVData(text: string): boolean {
  return text.includes('\t') || text.includes('\n');
}
