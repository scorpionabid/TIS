import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

interface EmployeeStat {
  name: string;
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

interface ExportMetadata {
  currentUser?: {
    name?: string;
    institution?: { name: string };
  };
  startDate?: string;
  endDate?: string;
}

export const exportEmployeePerformanceToExcel = async (
  data: EmployeeStat[],
  metadata: ExportMetadata
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Əməkdaşların İcra Vəziyyəti');

  // Set page margins and orientation
  worksheet.pageSetup.orientation = 'landscape';
  worksheet.pageSetup.margins = {
    left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3
  };

  // Header Section
  const headerContent = [
    ['AZƏRBAYCAN RESPUBLİKASI ELM VƏ TƏHSİL NAZİRLİYİ'],
    ['AZƏRBAYCAN TƏHSİL İDARƏETMƏ SİSTEMİ (ATİS)'],
    ['ƏMƏKDAŞLARIN TAPŞIRIQ İCRA VƏZİYYƏTİ ÜZRƏ HESABAT'],
    ['']
  ];

  headerContent.forEach((row, i) => {
    const r = worksheet.getRow(i + 1);
    r.getCell(1).value = row[0];
    worksheet.mergeCells(i + 1, 1, i + 1, 6);
    r.alignment = { horizontal: 'center', vertical: 'middle' };
    r.font = { bold: true, size: i === 2 ? 14 : 11, name: 'Calibri' };
  });

  // Metadata Section (Info about filters/user)
  const infoRow = worksheet.getRow(5);
  const dateRangeStr = (metadata.startDate || metadata.endDate)
    ? `Dövr: ${metadata.startDate || '...'} - ${metadata.endDate || '...'}`
    : `Dövr: Bütün vaxtlar`;
    
  infoRow.getCell(1).value = dateRangeStr;
  infoRow.getCell(4).value = `Çap tarixi: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`;
  infoRow.font = { italic: true, size: 10 };
  worksheet.mergeCells(5, 1, 5, 3);
  worksheet.mergeCells(5, 4, 5, 6);

  // Table Headers
  const tableHeaders = [
    '№',
    'Əməkdaş',
    'Ümumi Tapşırıqlar',
    'İcradadır',
    'Tamamlanıb',
    'Gecikir'
  ];

  const headerRow = worksheet.getRow(7);
  headerRow.values = tableHeaders;
  headerRow.height = 30;
  
  // Style headers
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8EAF6' } // Light Indigo
    };
    cell.font = { bold: true, size: 11, color: { argb: 'FF1A237E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Add Data
  data.forEach((emp, index) => {
    const row = worksheet.addRow([
      index + 1,
      emp.name,
      emp.total,
      emp.in_progress,
      emp.completed,
      emp.overdue
    ]);

    row.height = 25;
    row.eachCell((cell, colNumber) => {
      cell.alignment = { 
        horizontal: colNumber === 2 ? 'left' : 'center', 
        vertical: 'middle' 
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Coloring the overdue column cells
      if (colNumber === 6 && emp.overdue > 0) {
        cell.font = { color: { argb: 'FFC62828' }, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
      }
    });
  });

  // Set column widths
  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 40;
  worksheet.getColumn(3).width = 15;
  worksheet.getColumn(4).width = 15;
  worksheet.getColumn(5).width = 15;
  worksheet.getColumn(6).width = 15;

  // Footer footer
  const totalRow = worksheet.addRow(['', 'CƏMİ:', data.reduce((s, e) => s + e.total, 0), data.reduce((s, e) => s + e.in_progress, 0), data.reduce((s, e) => s + e.completed, 0), data.reduce((s, e) => s + e.overdue, 0)]);
  totalRow.height = 30;
  totalRow.font = { bold: true };
  totalRow.eachCell((cell, colNumber) => {
    if (colNumber >= 2) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      cell.border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }
  });

  // Generate buffer and save
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Emekdash_Icra_Veziyyeti_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
  saveAs(new Blob([buffer]), filename);
};
