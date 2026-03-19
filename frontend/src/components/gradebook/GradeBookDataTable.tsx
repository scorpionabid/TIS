import React, { useState, useCallback, useMemo, useRef } from 'react';
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

export const GradeBookDataTable = React.memo(function GradeBookDataTable({
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
  const [editInitialValue, setEditInitialValue] = useState<string>('');
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);
  const [localScoreOverrides, setLocalScoreOverrides] = useState<Record<string, number | null>>({});

  const editingCellRef = useRef<{ studentId: number; columnId: number } | null>(null);
  const editValueRef = useRef<string>('');
  const editInitialValueRef = useRef<string>('');

  // Fetch available teachers for this grade book
  const { data: availableTeachers } = useQuery({
    queryKey: ['gradebook-teachers', gradeBookId],
    queryFn: () => teacherService.getTeachers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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

  const normalizeNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const getCellKey = (studentId: number, columnId: number): string => `${studentId}:${columnId}`;

  const parseScore = (raw: string): number | null | undefined => {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const normalized = trimmed.replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return undefined;
    return parsed;
  };

  // Get cell score - for calculated grade columns, return grade_mark instead of score
  const getCellScore = (student: StudentWithScores, columnId: number, column?: GradeBookColumn): number | null => {
    if (!student.scores) {
      console.log('getCellScore: no scores for student', student.id);
      return null;
    }

    const overrideKey = getCellKey(Number(student.id), Number(columnId));
    if (Object.prototype.hasOwnProperty.call(localScoreOverrides, overrideKey)) {
      console.log('getCellScore: using override', overrideKey, localScoreOverrides[overrideKey]);
      return localScoreOverrides[overrideKey] ?? null;
    }

    const cellData = student.scores[columnId];
    console.log('getCellScore: cellData', { studentId: student.id, columnId, cellData });
    if (!cellData) return null;
  
    // For calculated grade columns (ending with _QIYMET), show grade_mark
    if (column?.column_type === 'calculated' && column?.column_label?.endsWith('_QIYMET')) {
      return normalizeNumber(cellData.grade_mark);
    }
  
    return normalizeNumber(cellData.score);
  };

  const formatCalculatedValue = (score: number | null, column: GradeBookColumn): string => {
    if (score === null) return '-';
    if (column.column_label?.endsWith('_QIYMET')) return String(score);
    return safeScoreToFixed(score, 1);
  };

  const saveCell = useCallback(async (args: {
    studentId: number;
    columnId: number;
    rawValue: string;
    closeEditor: boolean;
  }) => {
    const { studentId, columnId, rawValue, closeEditor } = args;
    console.log('saveCell DEBUG:', { gradeBookId, studentId, columnId, rawValue, isSavingCell });
    if (isSavingCell) return;

    const parsed = parseScore(rawValue);
    if (parsed === undefined) {
      toast({
        title: 'Xəta',
        description: 'Düzgün bal daxil edin',
        variant: 'destructive',
      });
      return;
    }

    if (parsed !== null && (parsed < 0 || parsed > 100)) {
      toast({
        title: 'Xəta',
        description: 'Bal 0-100 arası olmalıdır',
        variant: 'destructive',
      });
      return;
    }

    const column = columns.find(c => Number(c.id) === Number(columnId));
    const maxScore = column?.max_score;
    if (parsed !== null && typeof maxScore === 'number' && Number.isFinite(maxScore) && parsed > maxScore) {
      toast({
        title: 'Xəta',
        description: `Bal 0-${maxScore} arası olmalıdır`,
        variant: 'destructive',
      });
      return;
    }

    const student = students.find(s => Number(s.id) === Number(studentId));
    if (!student) return;

    const cellData = student.scores?.[Number(columnId)];
    console.log('saveCell CELL DATA:', { studentId, columnId, cellData, cellId: cellData?.id });
    if (!cellData || !cellData.id) {
      toast({
        title: 'Xəta',
        description: 'Xana tapılmadı',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingCell(true);
    try {
      await gradeBookService.updateCell(cellData.id, {
        score: parsed,
        is_present: true,
      });

      try {
        console.log('saveCell RECALCULATE START:', { gradeBookId, parsed });
        await gradeBookService.recalculate(Number(gradeBookId));
        console.log('saveCell RECALCULATE SUCCESS');
      } catch (err) {
        console.error('saveCell RECALCULATE ERROR:', err);
      }

      setLocalScoreOverrides(prev => ({
        ...prev,
        [getCellKey(studentId, columnId)]: parsed,
      }));

      toast({
        title: 'Uğurlu',
        description: 'Bal yeniləndi',
      });

      if (closeEditor) {
        setEditingCell(null);
        editingCellRef.current = null;
        setEditValue('');
        editValueRef.current = '';
        setEditInitialValue('');
        editInitialValueRef.current = '';
      } else {
        setEditInitialValue(rawValue);
        editInitialValueRef.current = rawValue;
      }

      setTimeout(() => onUpdate(), 50);
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: error?.response?.data?.message || error?.message || 'Bal yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setIsSavingCell(false);
    }
  }, [columns, gradeBookId, isSavingCell, onUpdate, students, toast]);

  // Handle cell click
  const handleCellClick = async (student: StudentWithScores, column: GradeBookColumn) => {
    if (column.column_type === 'calculated') return; // Can't edit calculated cells
    if (isSavingCell) return; // Don't switch cells while saving

    const studentId = Number(student.id);
    const columnId = Number(column.id);

    // If already editing this cell, do nothing
    if (editingCell?.studentId === studentId && editingCell?.columnId === columnId) return;

    const currentEditing = editingCellRef.current;
    const currentValue = editValueRef.current;
    const currentInitialValue = editInitialValueRef.current;

    if (currentEditing && currentValue !== currentInitialValue) {
      await saveCell({
        studentId: currentEditing.studentId,
        columnId: currentEditing.columnId,
        rawValue: currentValue,
        closeEditor: false,
      });
    }

    const currentScore = getCellScore(student, column.id, column);
    setEditingCell({ studentId, columnId });
    editingCellRef.current = { studentId, columnId };
    const nextValue = currentScore !== null ? String(currentScore) : '';
    setEditValue(nextValue);
    editValueRef.current = nextValue;
    setEditInitialValue(nextValue);
    editInitialValueRef.current = nextValue;
  };

  const handleSave = useCallback(async () => {
    const currentEditing = editingCellRef.current;
    if (!currentEditing) return;
    const currentValue = editValueRef.current;
    const currentInitialValue = editInitialValueRef.current;
    if (currentValue === currentInitialValue) {
      setEditingCell(null);
      editingCellRef.current = null;
      setEditValue('');
      editValueRef.current = '';
      setEditInitialValue('');
      editInitialValueRef.current = '';
      return;
    }

    await saveCell({
      studentId: currentEditing.studentId,
      columnId: currentEditing.columnId,
      rawValue: currentValue,
      closeEditor: true,
    });
  }, [saveCell]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      editingCellRef.current = null;
      setEditValue('');
      editValueRef.current = '';
      setEditInitialValue('');
      editInitialValueRef.current = '';
    }
  };

  // Group columns by type - memoized to prevent recalculation
  const inputColumnsI = useMemo(() => columns.filter(c => c.column_type === 'input' && c.semester === 'I'), [columns]);
  const inputColumnsII = useMemo(() => columns.filter(c => c.column_type === 'input' && c.semester === 'II'), [columns]);
  const calculatedColumns = useMemo(() => columns.filter(c => c.column_type === 'calculated'), [columns]);

  // Separate calculated columns - memoized
  const semesterICalcColumns = useMemo(() => calculatedColumns.filter(c => c.column_label.startsWith('I_')), [calculatedColumns]);
  const semesterIICalcColumns = useMemo(() => calculatedColumns.filter(c => c.column_label.startsWith('II_')), [calculatedColumns]);
  const annualCalcColumns = useMemo(() => calculatedColumns.filter(c => c.column_label.startsWith('ILLIK_')), [calculatedColumns]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1200px] border-collapse table-fixed">
        <thead>
          <tr className="bg-gray-50">
            {/* Student Column (I sütun) */}
            <th className="border p-2 text-left font-semibold sticky left-0 bg-gray-50 z-10 w-[200px]">
              Şagird
            </th>

            {/* Teacher Column (II sütun) */}
            <th className="border p-2 text-left font-semibold sticky left-[200px] bg-gray-50 z-10 w-[150px]">
              Müəllim
            </th>

            {/* Input Columns - I Yarımil */}
            <th colSpan={inputColumnsI.length || 1} className="border p-2 text-center font-semibold bg-blue-100" style={{width: `${(inputColumnsI.length || 1) * 80}px`}}>
              I Yarımil - İmtahanlar
            </th>

            {/* Input Columns - II Yarımil */}
            <th colSpan={inputColumnsII.length || 1} className="border p-2 text-center font-semibold bg-indigo-100" style={{width: `${(inputColumnsII.length || 1) * 80}px`}}>
              II Yarımil - İmtahanlar
            </th>

            {/* Calculated Columns - I Yarımil Yekun */}
            <th colSpan={semesterICalcColumns.length >= 2 ? semesterICalcColumns.length : (semesterICalcColumns.length || 1)} className="border p-2 text-center font-semibold bg-green-100" style={{width: `${(semesterICalcColumns.length >= 2 ? semesterICalcColumns.length : (semesterICalcColumns.length || 1)) * 60}px`}}>
              I Yarımil Yekun
            </th>

            {/* Calculated Columns - II Yarımil Yekun */}
            <th colSpan={semesterIICalcColumns.length >= 2 ? semesterIICalcColumns.length : (semesterIICalcColumns.length || 1)} className="border p-2 text-center font-semibold bg-teal-100" style={{width: `${(semesterIICalcColumns.length >= 2 ? semesterIICalcColumns.length : (semesterIICalcColumns.length || 1)) * 60}px`}}>
              II Yarımil Yekun
            </th>

            {/* İllik Yekun */}
            <th colSpan={annualCalcColumns.length >= 2 ? annualCalcColumns.length : (annualCalcColumns.length || 1)} className="border p-2 text-center font-semibold bg-purple-100" style={{width: `${(annualCalcColumns.length >= 2 ? annualCalcColumns.length : (annualCalcColumns.length || 1)) * 60}px`}}>
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
                  className="border p-2 text-center font-semibold w-[80px]"
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
                  className="border p-2 text-center font-semibold w-[80px]"
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
                className="border p-2 text-center font-semibold bg-green-50 w-[60px]"
              >
                <div className="text-xs text-green-700">{formatCalculatedLabel(column.column_label)}</div>
              </th>
            ))}

            {/* Calculated Column Headers - II Yarımil */}
            {semesterIICalcColumns.map(column => (
              <th
                key={column.id}
                className="border p-2 text-center font-semibold bg-teal-50 w-[60px]"
              >
                <div className="text-xs text-teal-700">{formatCalculatedLabel(column.column_label)}</div>
              </th>
            ))}

            {/* İllik Yekun */}
            {annualCalcColumns.map(column => (
              <th
                key={column.id}
                className="border p-2 text-center font-semibold bg-purple-50 w-[60px]"
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
              <td className="border p-2 sticky left-0 bg-inherit z-10 w-[200px]">
                <div className="font-medium">{student.full_name}</div>
                <div className="text-xs text-gray-500">№ {student.student_number}</div>
              </td>

              {/* Teacher Selection (II sütun) */}
              <td className="border p-2 sticky left-[200px] bg-inherit z-10 w-[150px]">
                <Select
                  value={student.teacher_id?.toString()}
                  onValueChange={(value) => handleAssignTeacher(student.id, value)}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Müəllim seç..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Müəllim təyin edilməyib</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.last_name} {teacher.first_name?.[0]}.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>

              {/* Input Cells - I Yarımil */}
              {inputColumnsI.length > 0 ? (
                inputColumnsI.map(column => {
                  const studentId = Number(student.id);
                  const columnId = Number(column.id);
                  const isEditing = editingCell?.studentId === studentId && editingCell?.columnId === columnId;
                  const score = getCellScore(student, columnId);

                  return (
                    <td key={column.id} className="border p-1 w-[80px]">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editValue}
                          disabled={isSavingCell}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            editValueRef.current = e.target.value;
                          }}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className="w-full h-8 text-center p-1 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
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
                })
              ) : (
                <td className="border p-1 w-[80px] bg-gray-50 text-gray-400 text-center">-</td>
              )}

              {/* Input Cells - II Yarımil */}
              {inputColumnsII.length > 0 ? (
                inputColumnsII.map(column => {
                  const studentId = Number(student.id);
                  const columnId = Number(column.id);
                  const isEditing = editingCell?.studentId === studentId && editingCell?.columnId === columnId;
                  const score = getCellScore(student, columnId);

                  return (
                    <td key={column.id} className="border p-1 w-[80px]">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editValue}
                          disabled={isSavingCell}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            editValueRef.current = e.target.value;
                          }}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className="w-full h-8 text-center p-1 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
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
                })
              ) : (
                <td className="border p-1 w-[80px] bg-gray-50 text-gray-400 text-center">-</td>
              )}

              {/* Calculated Cells - I Yarımil */}
              {semesterICalcColumns.length > 0 ? (
                semesterICalcColumns.map(column => {
                  const score = getCellScore(student, column.id, column);

                  return (
                    <td key={column.id} className="border p-1 bg-green-50/50 w-[60px]">
                      <div
                        className={cn(
                          'w-full h-8 flex items-center justify-center rounded font-semibold',
                          score !== null && getScoreColor(score)
                        )}
                      >
                        {formatCalculatedValue(score, column)}
                      </div>
                    </td>
                  );
                })
              ) : (
                <td className="border p-1 bg-green-50/50 w-[60px]">
                  <div className="w-full h-8 flex items-center justify-center rounded font-semibold">-</div>
                </td>
              )}

              {/* Calculated Cells - II Yarımil */}
              {semesterIICalcColumns.length > 0 ? (
                semesterIICalcColumns.map(column => {
                  const score = getCellScore(student, column.id, column);

                  return (
                    <td key={column.id} className="border p-1 bg-teal-50/50 w-[60px]">
                      <div
                        className={cn(
                          'w-full h-8 flex items-center justify-center rounded font-semibold',
                          score !== null && getScoreColor(score)
                        )}
                      >
                        {formatCalculatedValue(score, column)}
                      </div>
                    </td>
                  );
                })
              ) : (
                <td className="border p-1 bg-teal-50/50 w-[60px]">
                  <div className="w-full h-8 flex items-center justify-center rounded font-semibold">-</div>
                </td>
              )}

              {/* Annual Calculated Cells - İllik */}
              {annualCalcColumns.length > 0 ? (
                annualCalcColumns.map(column => {
                  const score = getCellScore(student, column.id, column);

                  return (
                    <td key={column.id} className="border p-1 bg-purple-50/50 w-[60px]">
                      <div
                        className={cn(
                          'w-full h-8 flex items-center justify-center rounded font-semibold',
                          score !== null && getScoreColor(score)
                        )}
                      >
                        {formatCalculatedValue(score, column)}
                      </div>
                    </td>
                  );
                })
              ) : (
                <td className="border p-1 bg-purple-50/50 w-[60px]">
                  <div className="w-full h-8 flex items-center justify-center rounded font-semibold">-</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// Format score safely for display (handles string/number/null)
function safeScoreToFixed(score: number | string | null | undefined, digits = 1): string {
  if (score === null || score === undefined) return '-';
  const numeric = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(numeric)) return '-';
  return numeric.toFixed(digits);
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
