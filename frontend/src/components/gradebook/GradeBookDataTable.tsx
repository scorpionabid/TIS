import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { gradeBookService, StudentWithScores, GradeBookColumn } from '@/services/gradeBook';
import { teacherService } from '@/services/teachers';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface GradeBookDataTableProps {
  students: StudentWithScores[];
  columns: GradeBookColumn[];
  semester: 'I' | 'II' | 'ALL';
  gradeBookId: number;
  onUpdate: () => void;
  onEditColumn?: (column: GradeBookColumn) => void;
  onDeleteColumn?: (column: GradeBookColumn) => void;
}

export function GradeBookDataTable({
  students,
  columns,
  semester,
  gradeBookId,
  onUpdate,
  onEditColumn,
  onDeleteColumn,
}: GradeBookDataTableProps) {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ studentId: number; columnId: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Fetch available teachers for this grade book
  const { data: availableTeachers } = useQuery({
    queryKey: ['gradebook-teachers', gradeBookId],
    queryFn: () => teacherService.getTeachers(),
  });

  const teachers = availableTeachers?.data || [];

  const formatDate = (date: string): string => {
    if (!date) return '';
    // Works for both 'YYYY-MM-DD' and ISO strings like '2026-02-26T00:00:00.000000Z'
    if (date.includes('T')) return date.split('T')[0];
    return date;
  };

  // Get score color based on value
  const getScoreColor = (score: number | null): string => {
    if (score === null) return '';
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (score >= 30) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  // Handle assign teacher to student
  const handleAssignTeacher = async (studentId: number, teacherId: string) => {
    try {
      await gradeBookService.assignStudentTeacher(gradeBookId, studentId, parseInt(teacherId) || null);
      toast({
        title: 'Uğurlu',
        description: 'Müəllim təyin edildi',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Müəllim təyin edilərkən xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  // Get cell score
  const getCellScore = (student: StudentWithScores, columnId: number): number | null => {
    return student.scores[columnId]?.score ?? null;
  };

  // Handle cell click
  const handleCellClick = (student: StudentWithScores, column: GradeBookColumn) => {
    if (column.column_type === 'calculated') return; // Can't edit calculated cells

    const currentScore = getCellScore(student, column.id);
    setEditingCell({ studentId: student.id, columnId: column.id });
    setEditValue(currentScore !== null ? String(currentScore) : '');
  };

  // Handle save
  const handleSave = useCallback(async () => {
    if (!editingCell) return;

    const score = editValue === '' ? null : parseFloat(editValue);

    if (score !== null && (score < 0 || score > 100)) {
      toast({
        title: 'Xəta',
        description: 'Bal 0-100 arası olmalıdır',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Find the cell ID for this student and column
      const student = students.find(s => s.id === editingCell.studentId);
      if (!student) return;

      // Get cell info from student scores
      const cellData = student.scores[editingCell.columnId];

      // If cell exists, update it; otherwise we need to create it
      // For now, we'll use the bulk update endpoint
      await gradeBookService.updateCell(editingCell.columnId, {
        score,
        is_present: true,
      });

      toast({
        title: 'Uğurlu',
        description: 'Bal yeniləndi',
      });

      onUpdate();
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Bal yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setEditingCell(null);
      setEditValue('');
    }
  }, [editingCell, editValue, onUpdate, toast, students]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  // Group columns by type
  const inputColumnsI = columns.filter(c => c.column_type === 'input' && c.semester === 'I');
  const inputColumnsII = columns.filter(c => c.column_type === 'input' && c.semester === 'II');
  const calculatedColumns = columns.filter(c => c.column_type === 'calculated');

  // Separate calculated columns
  const semesterICalcColumns = calculatedColumns.filter(c => c.column_label.startsWith('I_'));
  const semesterIICalcColumns = calculatedColumns.filter(c => c.column_label.startsWith('II_'));
  const annualCalcColumns = calculatedColumns.filter(c => c.column_label.startsWith('ILLIK_'));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            {/* Student Column (I sütun) */}
            <th className="border p-2 text-left font-semibold sticky left-0 bg-gray-50 z-10 min-w-[200px]">
              Şagird
            </th>

            {/* Teacher Column (II sütun) */}
            <th className="border p-2 text-left font-semibold sticky left-[200px] bg-gray-50 z-10 min-w-[150px]">
              Müəllim
            </th>

            {/* Input Columns - I Yarımil */}
            <th colSpan={inputColumnsI.length || 1} className="border p-2 text-center font-semibold bg-blue-100">
              I Yarımil - İmtahanlar
            </th>

            {/* Input Columns - II Yarımil */}
            <th colSpan={inputColumnsII.length || 1} className="border p-2 text-center font-semibold bg-indigo-100">
              II Yarımil - İmtahanlar
            </th>

            {/* Calculated Columns - I Yarımil Yekun */}
            <th colSpan={semesterICalcColumns.length || 1} className="border p-2 text-center font-semibold bg-green-100">
              I Yarımil Yekun
            </th>

            {/* Calculated Columns - II Yarımil Yekun */}
            <th colSpan={semesterIICalcColumns.length || 1} className="border p-2 text-center font-semibold bg-teal-100">
              II Yarımil Yekun
            </th>

            {/* İllik Yekun */}
            <th colSpan={annualCalcColumns.length || 1} className="border p-2 text-center font-semibold bg-purple-100">
              İllik Yekun
            </th>
          </tr>
          <tr className="bg-gray-50">
            <th className="border p-2 text-left font-semibold sticky left-0 bg-gray-50 z-10">Ad Soyad</th>
            <th className="border p-2 text-left font-semibold sticky left-[200px] bg-gray-50 z-10">Müəllim / Qrup</th>

            {/* Input Column Headers - I Yarımil */}
            {inputColumnsI.length > 0 ? (
              inputColumnsI.map(column => (
                <th
                  key={column.id}
                  className="border p-2 text-center font-semibold min-w-[80px]"
                  title={`${column.column_label} (${column.assessment_date})`}
                >
                  <div className="text-xs text-gray-700">{column.column_label}</div>
                  <div className="text-[10px] text-gray-400">{formatDate(column.assessment_date)}</div>

                  {(onEditColumn || onDeleteColumn) && (
                    <div className="mt-1 flex items-center justify-center gap-2">
                      {onEditColumn && (
                        <button
                          type="button"
                          onClick={() => onEditColumn(column)}
                          className="text-gray-500 hover:text-gray-800"
                          aria-label="Sütunu redaktə et"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      {onDeleteColumn && (
                        <button
                          type="button"
                          onClick={() => onDeleteColumn(column)}
                          className="text-gray-500 hover:text-red-600"
                          aria-label="Sütunu sil"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </th>
              ))
            ) : (
              <th className="border p-2 text-center text-gray-400">-</th>
            )}

            {/* Input Column Headers - II Yarımil */}
            {inputColumnsII.length > 0 ? (
              inputColumnsII.map(column => (
                <th
                  key={column.id}
                  className="border p-2 text-center font-semibold min-w-[80px]"
                  title={`${column.column_label} (${column.assessment_date})`}
                >
                  <div className="text-xs text-gray-700">{column.column_label}</div>
                  <div className="text-[10px] text-gray-400">{formatDate(column.assessment_date)}</div>

                  {(onEditColumn || onDeleteColumn) && (
                    <div className="mt-1 flex items-center justify-center gap-2">
                      {onEditColumn && (
                        <button
                          type="button"
                          onClick={() => onEditColumn(column)}
                          className="text-gray-500 hover:text-gray-800"
                          aria-label="Sütunu redaktə et"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      {onDeleteColumn && (
                        <button
                          type="button"
                          onClick={() => onDeleteColumn(column)}
                          className="text-gray-500 hover:text-red-600"
                          aria-label="Sütunu sil"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </th>
              ))
            ) : (
              <th className="border p-2 text-center text-gray-400">-</th>
            )}

            {/* Calculated Column Headers - I Yarımil */}
            {semesterICalcColumns.map(column => (
              <th
                key={column.id}
                className="border p-2 text-center font-semibold bg-green-50 min-w-[60px]"
              >
                <div className="text-xs text-green-700">{formatCalculatedLabel(column.column_label)}</div>
              </th>
            ))}

            {/* Calculated Column Headers - II Yarımil */}
            {semesterIICalcColumns.map(column => (
              <th
                key={column.id}
                className="border p-2 text-center font-semibold bg-teal-50 min-w-[60px]"
              >
                <div className="text-xs text-teal-700">{formatCalculatedLabel(column.column_label)}</div>
              </th>
            ))}

            {/* İllik Yekun */}
            {annualCalcColumns.map(column => (
              <th
                key={column.id}
                className="border p-2 text-center font-semibold bg-purple-50 min-w-[60px]"
              >
                <div className="text-xs text-purple-700">{formatCalculatedLabel(column.column_label)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => (
            <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {/* Student Info (I sütun) */}
              <td className="border p-2 sticky left-0 bg-inherit z-10">
                <div className="font-medium">{student.full_name}</div>
                <div className="text-xs text-gray-500">№ {student.student_number}</div>
              </td>

              {/* Teacher Selection (II sütun) */}
              <td className="border p-2 sticky left-[200px] bg-inherit z-10">
                <Select
                  value={student.teacher_id?.toString()}
                  onValueChange={(value) => handleAssignTeacher(student.id, value)}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Müəllim seç..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Müəllim təyin edilməyib</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.last_name} {teacher.first_name?.[0]}.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>

              {/* Input Cells - I Yarımil */}
              {inputColumnsI.map(column => {
                const isEditing = editingCell?.studentId === student.id && editingCell?.columnId === column.id;
                const score = getCellScore(student, column.id);

                return (
                  <td key={column.id} className="border p-1">
                    {isEditing ? (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="w-full h-8 text-center p-1"
                      />
                    ) : (
                      <div
                        onClick={() => handleCellClick(student, column)}
                        className={cn(
                          'w-full h-8 flex items-center justify-center cursor-pointer rounded border',
                          score !== null && getScoreColor(score),
                          score === null && 'bg-gray-50 text-gray-400'
                        )}
                      >
                        {score !== null ? score : '-'}
                      </div>
                    )}
                  </td>
                );
              })}

              {/* Input Cells - II Yarımil */}
              {inputColumnsII.map(column => {
                const isEditing = editingCell?.studentId === student.id && editingCell?.columnId === column.id;
                const score = getCellScore(student, column.id);

                return (
                  <td key={column.id} className="border p-1">
                    {isEditing ? (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="w-full h-8 text-center p-1"
                      />
                    ) : (
                      <div
                        onClick={() => handleCellClick(student, column)}
                        className={cn(
                          'w-full h-8 flex items-center justify-center cursor-pointer rounded border',
                          score !== null && getScoreColor(score),
                          score === null && 'bg-gray-50 text-gray-400'
                        )}
                      >
                        {score !== null ? score : '-'}
                      </div>
                    )}
                  </td>
                );
              })}

              {/* Calculated Cells - I Yarımil */}
              {semesterICalcColumns.map(column => {
                const score = getCellScore(student, column.id);

                return (
                  <td key={column.id} className="border p-1 bg-green-50/50">
                    <div
                      className={cn(
                        'w-full h-8 flex items-center justify-center rounded font-semibold',
                        score !== null && getScoreColor(score)
                      )}
                    >
                      {score !== null ? score.toFixed(1) : '-'}
                    </div>
                  </td>
                );
              })}

              {/* Calculated Cells - II Yarımil */}
              {semesterIICalcColumns.map(column => {
                const score = getCellScore(student, column.id);

                return (
                  <td key={column.id} className="border p-1 bg-teal-50/50">
                    <div
                      className={cn(
                        'w-full h-8 flex items-center justify-center rounded font-semibold',
                        score !== null && getScoreColor(score)
                      )}
                    >
                      {score !== null ? score.toFixed(1) : '-'}
                    </div>
                  </td>
                );
              })}

              {/* Annual Calculated Cells - İllik */}
              {annualCalcColumns.map(column => {
                const score = getCellScore(student, column.id);

                return (
                  <td key={column.id} className="border p-1 bg-purple-50/50">
                    <div
                      className={cn(
                        'w-full h-8 flex items-center justify-center rounded font-semibold',
                        score !== null && getScoreColor(score)
                      )}
                    >
                      {score !== null ? score.toFixed(1) : '-'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Format calculated column labels for display
function formatCalculatedLabel(label: string): string {
  const labels: Record<string, string> = {
    'I_YARIMIL_BAL': 'I Y.Bal',
    'I_YARIMIL_QIYMET': 'I Y.Qiym.',
    'II_YARIMIL_BAL': 'II Y.Bal',
    'II_YARIMIL_QIYMET': 'II Y.Qiym.',
    'ILLIK_BAL': 'İllik Bal',
    'ILLIK_QIYMET': 'İllik Qiym.',
  };
  return labels[label] || label;
}
