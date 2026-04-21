import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { gradeBookService, StudentWithScores, GradeBookColumn, GradeBookTeacher } from '@/services/gradeBook';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, UserCheck, Users, Info, Sparkles } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GradeBookDataTableProps {
  students: StudentWithScores[];
  columns: GradeBookColumn[];
  semester: 'I' | 'II' | 'ALL';
  gradeBookId: number;
  availableTeachers?: GradeBookTeacher[];
  onUpdate: () => void;
  onEditColumn?: (column: GradeBookColumn) => void;
  onDeleteColumn?: (column: GradeBookColumn) => void;
  readOnly?: boolean;
}

export const GradeBookDataTable = React.memo(function GradeBookDataTable({
  students,
  columns,
  semester,
  gradeBookId,
  availableTeachers = [],
  onUpdate,
  onEditColumn,
  onDeleteColumn,
  readOnly = false,
}: GradeBookDataTableProps) {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ studentId: number; columnId: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editInitialValue, setEditInitialValue] = useState<string>('');
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);
  const [localScoreOverrides, setLocalScoreOverrides] = useState<Record<string, number | null>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [isBulkAssigning, setIsBulkAssigning] = useState<boolean>(false);

  const editingCellRef = useRef<{ studentId: number; columnId: number } | null>(null);
  const editValueRef = useRef<string>('');
  const editInitialValueRef = useRef<string>('');

  const teachers = useMemo(() => 
    availableTeachers.map(gb => ({
      id: gb.teacher_id,
      fullName: gb.teacher ? `${gb.teacher.last_name} ${gb.teacher.first_name}` : `Müəllim #${gb.teacher_id}`,
      shortName: gb.teacher ? `${gb.teacher.last_name} ${gb.teacher.first_name?.[0]}.` : `Müəllim #${gb.teacher_id}`
    })), [availableTeachers]
  );

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

  const handleToggleSelect = (studentId: number) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(students.map(s => Number(s.id)));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleBulkAssign = async (teacherId: string) => {
    if (selectedStudentIds.length === 0) return;
    
    setIsBulkAssigning(true);
    try {
      await gradeBookService.assignStudentTeacher(gradeBookId, selectedStudentIds, parseInt(teacherId) || null);
      toast({
        title: 'Uğurlu',
        description: `${selectedStudentIds.length} şagird üçün müəllim təyin edildi`,
      });
      setSelectedStudentIds([]);
      onUpdate();
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Toplu müəllim təyinatı zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleSmartSplit = async () => {
    if (teachers.length < 2) {
      toast({
        title: 'Məlumat',
        description: 'Avtomatik bölgü üçün ən azı 2 müəllim lazımdır',
      });
      return;
    }

    setIsBulkAssigning(true);
    try {
      const midPoint = Math.ceil(students.length / 2);
      const firstHalfIds = students.slice(0, midPoint).map(s => Number(s.id));
      const secondHalfIds = students.slice(midPoint).map(s => Number(s.id));

      const t1 = teachers[0].id;
      const t2 = teachers[1].id;

      await Promise.all([
        gradeBookService.assignStudentTeacher(gradeBookId, firstHalfIds, t1),
        gradeBookService.assignStudentTeacher(gradeBookId, secondHalfIds, t2)
      ]);

      toast({
        title: 'Uğurlu',
        description: 'Şagirdlər 50/50 nisbətində müəllimlər arasında bölündü',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Avtomatik bölgü zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setIsBulkAssigning(false);
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
      return null;
    }

    const overrideKey = getCellKey(Number(student.id), Number(columnId));
    if (Object.prototype.hasOwnProperty.call(localScoreOverrides, overrideKey)) {
      return localScoreOverrides[overrideKey] ?? null;
    }

    const cellData = student.scores?.[columnId];
    if (!cellData || typeof cellData !== 'object') return null;
  
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
    if (!cellData || !cellData.id) {
      console.warn('[GradeBookDataTable] Missing cell data for student:', studentId, 'column:', columnId, 'cellData:', cellData);
      toast({
        title: 'Xəta',
        description: 'Bu xana üçün məlumat tapılmadı. Zəhmət olmasa səhifəni yeniləyin.',
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
        await gradeBookService.recalculate(Number(gradeBookId));
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
    if (readOnly) return; // Read-only mode (region/sector admin)
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
    <div className="space-y-4">
      {/* Selection Control & Bulk Header */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-lg border shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Cəmi: {students.length} şagird</span>
            </div>
            
            {teachers.length >= 2 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-dashed border-blue-300 hover:bg-blue-50 text-blue-600"
                onClick={handleSmartSplit}
                disabled={isBulkAssigning}
              >
                <Sparkles className="h-4 w-4" />
                Ağıllı 50/50 Bölgü
              </Button>
            )}
          </div>

          <div className={cn(
            "flex items-center gap-3 transition-opacity duration-300",
            selectedStudentIds.length > 0 ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <Badge variant="secondary" className="px-3 py-1 bg-amber-50 text-amber-700 border-amber-200">
              {selectedStudentIds.length} şagird seçilib
            </Badge>

            {teachers.length > 1 && (
              <div className="flex items-center gap-2">
                <Select onValueChange={handleBulkAssign} disabled={isBulkAssigning}>
                  <SelectTrigger className="w-[180px] h-9 bg-amber-50 border-amber-200 text-amber-900 focus:ring-amber-500">
                    <SelectValue placeholder="Seçilənlərə müəllim təyin et" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Təmizlə (Müəllimsiz)</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedStudentIds([])}
            >
              Ləğv et
            </Button>
          </div>
        </div>
      )}

      {teachers.length >= 2 && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800 py-2">
          <Info className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-xs">
            Bu jurnal bölünən sinifə aiddir (Birdən çox müəllim təyin olunub). Şagirdləri sol tərəfdən seçərək onlara müvafiq müəllimləri toplu şəkildə təyin edə bilərsiniz.
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto rounded-lg border shadow-sm bg-white">
        <table className="w-full min-w-[1200px] border-collapse table-fixed">
          <thead>
            <tr className="bg-gray-50">
              {/* Checkbox Header */}
              {!readOnly && (
                <th className="border p-2 sticky left-0 bg-gray-50 z-20 w-[40px] text-center">
                  <Checkbox 
                    checked={selectedStudentIds.length === students.length && students.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Hamısını seç"
                  />
                </th>
              )}

              {/* Student Column (I sütun) */}
              <th className={cn(
                "border p-2 text-left font-semibold sticky bg-gray-50 z-10 w-[200px]",
                !readOnly ? "left-[40px]" : "left-0"
              )}>
                Şagird
              </th>

              {/* Teacher Column (II sütun) */}
              <th className={cn(
                "border p-2 text-left font-semibold sticky bg-gray-50 z-10 w-[150px]",
                !readOnly ? "left-[240px]" : "left-[200px]"
              )}>
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
            {!readOnly && <th className="border p-2 sticky left-0 bg-gray-50 z-20 w-[40px]"></th>}
            <th className={cn(
              "border p-2 text-left font-semibold sticky bg-gray-50 z-10",
              !readOnly ? "left-[40px]" : "left-0"
            )}>Ad Soyad</th>
            <th className={cn(
              "border p-2 text-left font-semibold sticky bg-gray-50 z-10",
              !readOnly ? "left-[240px]" : "left-[200px]"
            )}>Müəllim / Qrup</th>

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
            <tr key={student.id} className={cn(index % 2 === 0 ? 'bg-white' : 'bg-gray-50', selectedStudentIds.includes(Number(student.id)) && "bg-amber-50/50")}>
              {/* Checkbox Cell */}
              {!readOnly && (
                <td className="border p-2 sticky left-0 bg-inherit z-20 w-[40px] text-center">
                  <Checkbox 
                    checked={selectedStudentIds.includes(Number(student.id))}
                    onCheckedChange={() => handleToggleSelect(Number(student.id))}
                  />
                </td>
              )}

              {/* Student Info (I sütun) */}
              <td className={cn(
                "border p-2 sticky bg-inherit z-10 w-[200px]",
                !readOnly ? "left-[40px]" : "left-0"
              )}>
                <div className="font-medium">{student.full_name}</div>
                <div className="text-xs text-gray-500">№ {student.student_number}</div>
              </td>

              {/* Teacher Selection (II sütun) */}
              <td className={cn(
                "border p-2 sticky bg-inherit z-10 w-[150px]",
                !readOnly ? "left-[240px]" : "left-[200px]"
              )}>
                {teachers.length > 1 && !readOnly ? (
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
                          {teacher.shortName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center h-8 px-2 text-xs text-gray-700 bg-gray-50/50 rounded border border-transparent">
                    <UserCheck className="h-3 w-3 mr-2 text-gray-400" />
                    <span className="truncate">
                      {teachers.find(t => t.id === student.teacher_id)?.shortName || 'Təyin edilməyib'}
                    </span>
                  </div>
                )}
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
