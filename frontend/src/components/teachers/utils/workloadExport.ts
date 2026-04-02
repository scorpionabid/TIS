import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { SchoolTeacher } from '@/services/schoolAdmin';

export const exportWorkloadToExcel = async (teachers: SchoolTeacher[], institutionName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dərs Bölgüsü');

  // Define columns based on the image requirements
  worksheet.columns = [
    { header: 'S/S', key: 'index', width: 5 },
    { header: 'Müəllimin Soyadı, Adı, Ata adı', key: 'full_name', width: 35 },
    { header: 'Vəzifəsi', key: 'position', width: 20 },
    { header: 'Müəllimin UTİS kodu', key: 'utis', width: 15 },
    { header: 'Müəllimin ixtisası', key: 'specialty', width: 25 },
    { header: 'Qiymətləndirmə növü', key: 'assessment_type', width: 20 },
    { header: 'Qiymətləndirmə balı', key: 'assessment_score', width: 15 },
    { header: 'İxtisas balı', key: 'specialty_score', width: 15 },
    { header: 'Dərs yükü', key: 'teaching_hours', width: 12 },
    { header: 'Fərdi təhsil (məktəbdə)', key: 'individual', width: 15 },
    { header: 'Evdə təhsil', key: 'home', width: 12 },
    { header: 'Xüsusi təhsil', key: 'special', width: 12 },
    { header: 'Dərsdən kənar məşğələ', key: 'extra', width: 15 },
    { header: 'Dərnək', key: 'club', width: 12 },
    { header: 'Ümumi dərs yükü', key: 'total', width: 15 },
  ];

  // Style the header
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F81BD' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 40;

  // Add data
  teachers.forEach((teacher, idx) => {
    const positionLabels: Record<string, string> = {
      direktor: 'Direktor',
      direktor_muavini_tedris: 'Direktor Müavini (Tədris)',
      direktor_muavini_inzibati: 'Direktor Müavini (İnzibati)',
      terbiye_isi_uzre_direktor_muavini: 'Direktor Müavini (Tərbiyə)',
      'muəllim': 'Müəllim',
    };

    worksheet.addRow({
      index: idx + 1,
      full_name: `${teacher.last_name || ''} ${teacher.first_name || ''} ${teacher.patronymic || ''}`.trim(),
      position: positionLabels[teacher.position_type as string] || teacher.position_type || 'Müəllim',
      utis: teacher.employee_id || '',
      specialty: teacher.specialty || '',
      assessment_type: (teacher as any).assessment_type || '',
      assessment_score: teacher.assessment_score || 0,
      specialty_score: (teacher as any).specialty_score || 0,
      teaching_hours: teacher.workload_teaching_hours || 0,
      individual: (teacher as any).workload_individual_school || 0,
      home: (teacher as any).workload_home_education || 0,
      special: (teacher as any).workload_special_education || 0,
      extra: teacher.workload_extracurricular_hours || 0,
      club: teacher.workload_club_hours || 0,
      total: teacher.workload_total_hours || 0,
    });
  });

  // Add borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Generate and save file
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `Ders_Bolgusu_${institutionName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(new Blob([buffer]), fileName);
};
