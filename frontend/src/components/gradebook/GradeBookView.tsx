import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, RotateCcw, FileDown, FileUp, Download, History } from 'lucide-react';
import { gradeBookService, GradeBookSession, GradeBookColumn, StudentWithScores } from '@/services/gradeBook';
import { useToast } from '@/hooks/use-toast';
import { GradeBookDataTable } from './GradeBookDataTable';
import { AddColumnModal } from './AddColumnModal';
import { ImportModal } from './ImportModal';
import { GradeHistory } from './GradeHistory';

export function GradeBookView({ id: propId }: { id?: number }) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId || Number(paramId);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gradeBook, setGradeBook] = useState<GradeBookSession | null>(null);
  const [students, setStudents] = useState<StudentWithScores[]>([]);
  const [columns, setColumns] = useState<GradeBookColumn[]>([]);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<GradeBookColumn | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (id) {
      loadGradeBook();
    }
  }, [id]);

  const loadGradeBook = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await gradeBookService.getGradeBook(Number(id));
      
      setGradeBook(response.data.grade_book);
      setStudents(response.data.students);

      // Combine all columns and sort by display_order
      const allColumns = [
        ...response.data.input_columns,
        ...response.data.calculated_columns,
      ].sort((a, b) => a.display_order - b.display_order);

      setColumns(allColumns);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to load grade book',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      await gradeBookService.recalculate(Number(id));
      toast({
        title: 'Uğurlu',
        description: 'Bütün ballar yenidən hesablandı',
      });
      loadGradeBook();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Hesablanma zamanı xəta',
        variant: 'destructive',
      });
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

  const handleColumnAdded = () => {
    setIsAddColumnOpen(false);
    setEditingColumn(null);
    loadGradeBook();
  };

  const handleEditColumn = (column: GradeBookColumn) => {
    setEditingColumn(column);
    setIsAddColumnOpen(true);
  };

  const handleDeleteColumn = async (column: GradeBookColumn) => {
    console.log('Deleting column:', column);
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
        <div>
          <h1 className="text-2xl font-bold">
            {gradeBook.grade?.name} - {gradeBook.subject?.name}
          </h1>
          <p className="text-gray-500">
            {gradeBook.academic_year?.name}
            {gradeBook.title && ` • ${gradeBook.title}`}
          </p>
        </div>
        <div className="flex gap-2">
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
          <Button variant="outline" onClick={handleRecalculate}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Yenidən Hesabla
          </Button>
          <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-4 h-4 mr-2" />
            {showHistory ? 'Tarixçəni Gizlət' : 'Tarixçəni Göstər'}
          </Button>
          <Button onClick={() => setIsAddColumnOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            İmtahan Əlavə Et
          </Button>
        </div>
      </div>

      {/* Grade Book Table - All Semesters Combined */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="secondary">Sinif Jurnalı</Badge>
            <span className="text-sm font-normal text-gray-500">
              ({columns.filter(c => c.column_type === 'input' && !c.is_archived).length} imtahan)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GradeBookDataTable
            students={students}
            columns={columns}
            semester="ALL"
            gradeBookId={gradeBook.id}
            onEditColumn={handleEditColumn}
            onDeleteColumn={handleDeleteColumn}
            onUpdate={loadGradeBook}
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
          .map(c => ({ semester: c.semester, column_label: c.column_label }))}
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
