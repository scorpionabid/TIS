import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, RotateCcw, FileDown, FileUp, Download, History } from 'lucide-react';
import { gradeBookService, GradeBookSession, GradeBookColumn, StudentWithScores } from '@/services/gradeBook';
import { useGradeBookRole } from '@/contexts/GradeBookRoleContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GradeBookDataTable } from './GradeBookDataTable';
import { AddColumnModal } from './AddColumnModal';
import { ImportModal } from './ImportModal';
import { GradeHistory } from './GradeHistory';

export function GradeBookView({ id: propId }: { id?: number }) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId || Number(paramId);
  const { toast } = useToast();
  const { isRegionAdmin, isSectorAdmin } = useGradeBookRole();
  const isReadOnlyRole = isRegionAdmin || isSectorAdmin;
  const [loading, setLoading] = useState(true);
  const [gradeBook, setGradeBook] = useState<GradeBookSession | null>(null);
  const [students, setStudents] = useState<StudentWithScores[]>([]);
  const [columns, setColumns] = useState<GradeBookColumn[]>([]);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<GradeBookColumn | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isColumnLoading, setIsColumnLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Memoize students and columns to prevent unnecessary re-renders of child components
  const memoizedStudents = useMemo(() => students, [students]);
  const memoizedColumns = useMemo(() => columns, [columns]);

  // Memoize loadGradeBook to prevent re-renders of child components
  const loadGradeBook = useCallback(async () => {
    if (!id) return;
    try {
      setIsColumnLoading(true);
      const response = await gradeBookService.getGradeBook(Number(id));
      
      setGradeBook(response.data.grade_book);
      setStudents(response.data.students);

      // Combine all columns and sort by display_order
      const inputColumns = Array.isArray(response.data.input_columns) ? response.data.input_columns : [];
      const calculatedColumns = Array.isArray(response.data.calculated_columns) ? response.data.calculated_columns : [];
      const allColumns = [
        ...inputColumns,
        ...calculatedColumns,
      ].sort((a, b) => a.display_order - b.display_order);

      setColumns(allColumns);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load grade book';
      const axiosMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        title: 'Error',
        description: axiosMessage || message,
        variant: 'destructive',
      });
    } finally {
      setIsColumnLoading(false);
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    loadGradeBook();
  }, [id, loadGradeBook]);

  // Memoize callbacks to prevent re-renders
  const memoizedOnUpdate = useCallback(() => {
    loadGradeBook();
  }, [loadGradeBook]);

  const handleRecalculate = async () => {
    if (!id) return;
    setIsRecalculating(true);
    try {
      await gradeBookService.recalculate(Number(id));
      toast({
        title: 'Uğurlu',
        description: 'Bütün ballar yenidən hesablandı',
      });
      // Force fresh data load after recalculate
      await loadGradeBook();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Hesablanma zamanı xəta',
        variant: 'destructive',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleExportTemplate = async () => {
    try {
      const blob = await gradeBookService.exportTemplate(Number(id));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jurnal_${gradeBook?.grade?.name}_${gradeBook?.subject?.name}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: 'Uğurlu', description: 'Şablon yükləndi' });
    } catch (error) {
      toast({ title: 'Xəta', description: 'Şablon yüklənərkən xəta', variant: 'destructive' });
    }
  };

  const handleExport = async () => {
    try {
      const blob = await gradeBookService.exportGradeBook(Number(id));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jurnal_${gradeBook?.grade?.name}_${gradeBook?.subject?.name}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: 'Uğurlu', description: 'Jurnal export edildi' });
    } catch (error) {
      toast({ title: 'Xəta', description: 'Export zamanı xəta', variant: 'destructive' });
    }
  };

  const handleImport = async (file: File) => {
    try {
      const result = await gradeBookService.importScores(Number(id), file);
      toast({
        title: 'Uğurlu',
        description: result.message,
      });
      loadGradeBook();
      setIsImportOpen(false);
    } catch (error) {
      toast({ title: 'Xəta', description: 'İmport zamanı xəta', variant: 'destructive' });
    }
  };

  const handleColumnAdded = async () => {
    setIsAddColumnOpen(false);
    setEditingColumn(null);
    // Force immediate refresh with small delay to ensure backend has processed
    await new Promise(resolve => setTimeout(resolve, 100));
    await loadGradeBook();
  };

  const handleEditColumn = (column: GradeBookColumn) => {
    setEditingColumn(column);
    setIsAddColumnOpen(true);
  };

  const handleDeleteColumn = async (column: GradeBookColumn) => {
    try {
      await gradeBookService.archiveColumn(column.id);
      toast({
        title: 'Uğurlu',
        description: 'Sütun silindi',
      });
      loadGradeBook();
    } catch (error: any) {
      console.error('Delete column error:', error);
      console.error('Error response:', error?.response);
      toast({
        title: 'Xəta',
        description: error?.response?.data?.message || 'Sütun silinərkən xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  const getSemesterColumns = (semester: 'I' | 'II') => {
    return columns.filter((col) => col.semester === semester || col.column_type === 'calculated');
  };

  if (loading) {
    return <div className="text-center py-8">Yüklənir...</div>;
  }

  if (!gradeBook) {
    return <div className="text-center py-8">Jurnal tapılmadı</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border-blue-100 shrink-0">
            Sinif Jurnalı
          </Badge>
          <h1 className="text-lg font-bold">
            {gradeBook.grade?.class_level
              ? `${gradeBook.grade.class_level}${gradeBook.grade.name}`
              : gradeBook.grade?.name
            } - {gradeBook.subject?.name}
          </h1>
          {gradeBook.institution?.name && (
            <span className="text-sm text-slate-500 hidden sm:inline">•</span>
          )}
          {gradeBook.institution?.name && (
            <p className="text-sm text-slate-600 hidden sm:block">{gradeBook.institution.name}</p>
          )}
          <span className="text-sm text-slate-500 hidden sm:inline">•</span>
          <p className="text-sm text-slate-500 hidden sm:block">
            {gradeBook.academic_year?.name}
            {gradeBook.title && ` • ${gradeBook.title}`}
          </p>
        </div>
        <div className="flex gap-2">
          {isReadOnlyRole ? (
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleExportTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Şablon
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <FileDown className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <FileUp className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" onClick={handleRecalculate} disabled={isRecalculating || isColumnLoading}>
                <RotateCcw className={cn("w-4 h-4 mr-2", isRecalculating && "animate-spin")} />
                {isRecalculating ? 'Hesablanır...' : 'Yenidən Hesabla'}
              </Button>
              <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
                <History className="w-4 h-4 mr-2" />
                {showHistory ? 'Tarixçəni Gizlət' : 'Tarixçəni Göstər'}
              </Button>
              <Button onClick={() => setIsAddColumnOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                İmtahan Əlavə Et
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grade Book Table - All Semesters Combined */}
      <Card className="mt-4">
        <CardContent className="pt-6">
          <GradeBookDataTable
            students={memoizedStudents}
            columns={memoizedColumns}
            semester="ALL"
            gradeBookId={gradeBook.id}
            availableTeachers={gradeBook.teachers}
            onEditColumn={handleEditColumn}
            onDeleteColumn={handleDeleteColumn}
            onUpdate={memoizedOnUpdate}
            readOnly={isReadOnlyRole}
          />
        </CardContent>
      </Card>

      {/* Grade History */}
      {showHistory && (
        <div className="mt-4">
          <GradeHistory gradeBookId={gradeBook.id} />
        </div>
      )}

      {/* Add Column Modal */}
      <AddColumnModal
        isOpen={isAddColumnOpen}
        onClose={() => {
          setIsAddColumnOpen(false);
          setEditingColumn(null);
        }}
        gradeBookId={gradeBook.id}
        defaultSemester="I"
        onSuccess={handleColumnAdded}
        existingColumns={columns
          .filter(c => c.column_type === 'input' && !c.is_archived)
          .map(c => ({ 
            semester: c.semester, 
            column_label: c.column_label, 
            assessment_date: c.assessment_date 
          }))}
        editColumn={
          editingColumn
            ? {
                id: editingColumn.id,
                assessment_type_id: editingColumn.assessment_type_id,
                semester: editingColumn.semester,
                column_label: editingColumn.column_label,
                assessment_date: editingColumn.assessment_date,
                max_score: editingColumn.max_score,
              }
            : undefined
        }
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
