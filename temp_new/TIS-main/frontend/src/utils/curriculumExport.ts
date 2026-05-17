import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ExportMetadata {
  regionalName: string;
  schoolName: string;
  academicYear: string;
  directorName: string;
}

/**
 * Adds the standard header (3 rows) and footer (Director signature) to the worksheet
 */
const applyStandardLayout = (worksheet: ExcelJS.Worksheet, metadata: ExportMetadata, colCount: number) => {
  // --- Header ---
  // Row 1: Regional Dept
  const row1 = worksheet.getRow(1);
  row1.getCell(1).value = metadata.regionalName;
  worksheet.mergeCells(1, 1, 1, colCount);
  row1.font = { bold: true, size: 14, name: 'Calibri' };
  row1.alignment = { horizontal: 'center', vertical: 'middle' };
  row1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } }; // Light greenish background
  row1.height = 35;

  // Row 2: School Name
  const row2 = worksheet.getRow(2);
  row2.getCell(1).value = (metadata.schoolName.includes('üzrə') ? metadata.schoolName : metadata.schoolName + ' üzrə');
  worksheet.mergeCells(2, 1, 2, colCount);
  row2.font = { bold: true, size: 11, name: 'Calibri' };
  row2.alignment = { horizontal: 'center', vertical: 'middle' };
  row2.height = 25;

  // Row 3: Academic Year
  const row3 = worksheet.getRow(3);
  row3.getCell(1).value = `(${metadata.academicYear})`;
  worksheet.mergeCells(3, 1, 3, colCount);
  row3.font = { bold: true, size: 10, name: 'Calibri' };
  row3.alignment = { horizontal: 'center', vertical: 'middle' };
  row3.height = 20;

  // Empty row for spacing
  worksheet.getRow(4).height = 10;
};

const addFooter = (worksheet: ExcelJS.Worksheet, metadata: ExportMetadata, startRow: number, colCount: number) => {
  const footerStart = startRow + 2;
  
  const rowF1 = worksheet.getRow(footerStart);
  rowF1.getCell(1).value = "Məktəbin direktoru:";
  rowF1.getCell(1).font = { bold: true, size: 11 };
  
  // Director Name line
  const nameColStart = Math.max(2, Math.floor(colCount * 0.4));
  const nameColEnd = Math.max(3, Math.floor(colCount * 0.8));
  
  worksheet.mergeCells(footerStart, nameColStart, footerStart, nameColEnd);
  const nameCell = rowF1.getCell(nameColStart);
  nameCell.value = metadata.directorName || "______________________________";
  nameCell.font = { bold: true, size: 11 };
  nameCell.alignment = { horizontal: 'center' };
  nameCell.border = { bottom: { style: 'thin' } };

  // MY label on the far right (seen in image)
  rowF1.getCell(colCount).value = "MY";
  rowF1.getCell(colCount).font = { bold: true };

  // Placeholder text
  const rowF2 = worksheet.getRow(footerStart + 1);
  worksheet.mergeCells(footerStart + 1, nameColStart, footerStart + 1, nameColEnd);
  const subCell = rowF2.getCell(nameColStart);
  subCell.value = "Soyad Ad Ata adı";
  subCell.alignment = { horizontal: 'center' };
  subCell.font = { size: 9, italic: true };
};

const addBorders = (worksheet: ExcelJS.Worksheet, startRow: number, endRow: number, colCount: number) => {
  for (let r = startRow; r <= endRow; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= colCount; c++) {
      row.getCell(c).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }
};

/**
 * EXPORT: Yigim Cedveli
 */
export const exportYigimCedveli = async (data: any[], metadata: ExportMetadata) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Yığım Cədvəli');
  
  const colCount = 20; // Based on CurriculumPlan.tsx columns
  applyStandardLayout(worksheet, metadata, colCount);

  // Add Table Headers (Starts at Row 5)
  // [Actual implementation will populate rows based on 'data' passed]
  // This is a placeholder for the actual row population logic
  
  // Save
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Yigim_Cedveli_${metadata.schoolName.replace(/\s+/g, '_')}.xlsx`);
};

/**
 * General Export Function for any table
 */
export const exportToExcelUniversal = async (
  filename: string,
  sheetName: string,
  headers: any[][], // Supports multi-row headers
  data: any[][],
  metadata: ExportMetadata,
  columnWidths?: number[],
  merges?: string[] // e.g. ["A5:A6", "E5:L5"]
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  const maxCols = Math.max(headers[0]?.length || 0, data[0]?.length || 0);
  applyStandardLayout(worksheet, metadata, maxCols);

  const tableStartRow = 5;
  let currentRow = tableStartRow;

  // Add Headers
  headers.forEach((hRow, idx) => {
    const row = worksheet.getRow(currentRow);
    row.values = hRow;
    row.font = { bold: true };
    row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    currentRow++;
  });

  // Add Merges
  if (merges) {
    merges.forEach(m => worksheet.mergeCells(m));
  }

  // Add Data
  data.forEach(dRow => {
    const row = worksheet.getRow(currentRow);
    row.values = dRow;
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;
  });

  // Add Borders to table
  addBorders(worksheet, tableStartRow, currentRow - 1, maxCols);

  // Column widths
  if (columnWidths) {
    columnWidths.forEach((w, i) => {
      worksheet.getColumn(i + 1).width = w;
    });
  }

  addFooter(worksheet, metadata, currentRow, maxCols);

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${filename}.xlsx`);
};

export interface SheetConfig {
  sheetName: string;
  headers: any[][];
  data: any[][];
  columnWidths?: number[];
  merges?: string[];
}

/**
 * EXPORT: Multi-sheet Workbook
 */
export const exportMultipleSheets = async (
  filename: string,
  sheets: SheetConfig[],
  metadata: ExportMetadata
) => {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach(s => {
    const worksheet = workbook.addWorksheet(s.sheetName);
    const maxCols = Math.max(s.headers[0]?.length || 0, s.data[0]?.length || 0);
    
    applyStandardLayout(worksheet, metadata, maxCols);

    const tableStartRow = 5;
    let currentRow = tableStartRow;

    // Headers
    s.headers.forEach(hRow => {
      const row = worksheet.getRow(currentRow);
      row.values = hRow;
      row.font = { bold: true, size: 10 };
      row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      currentRow++;
    });

    // Merges
    if (s.merges) {
      s.merges.forEach(m => worksheet.mergeCells(m));
    }

    // Data
    s.data.forEach(dRow => {
      const row = worksheet.getRow(currentRow);
      row.values = dRow;
      row.font = { size: 10 };
      row.alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;
    });

    // Borders
    addBorders(worksheet, tableStartRow, currentRow - 1, maxCols);

    // Column widths
    if (s.columnWidths) {
      s.columnWidths.forEach((w, i) => {
        worksheet.getColumn(i + 1).width = w;
      });
    }

    addFooter(worksheet, metadata, currentRow, maxCols);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${filename}.xlsx`);
};
