import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { gradeBookService } from '@/services/gradeBook';
import { assessmentTypeService } from '@/services/assessmentTypes';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  gradeBookId: number;
  defaultSemester: 'I' | 'II';
  onSuccess: () => void;
  existingColumns?: Array<{ semester: 'I' | 'II'; column_label: string }>;
  editColumn?: {
    id: number;
    assessment_type_id: number;
    semester: 'I' | 'II';
    column_label: string;
    assessment_date: string;
    max_score: number;
  };
}

export function AddColumnModal({
  isOpen,
  onClose,
  gradeBookId,
  defaultSemester,
  onSuccess,
  existingColumns = [],
  editColumn,
}: AddColumnModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    assessment_type_id: (editColumn ? String(editColumn.assessment_type_id) : undefined) as string | undefined,
    semester: editColumn?.semester ?? defaultSemester,
    column_label: editColumn?.column_label ?? '',
    assessment_date: (() => {
      const raw = editColumn?.assessment_date ?? new Date().toISOString().split('T')[0];
      return raw.includes('T') ? raw.split('T')[0] : raw;
    })(),
    max_score: editColumn?.max_score ?? 100,
  });

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      assessment_type_id: (editColumn ? String(editColumn.assessment_type_id) : undefined) as string | undefined,
      semester: editColumn?.semester ?? defaultSemester,
      column_label: editColumn?.column_label ?? '',
      assessment_date: (() => {
        const raw = editColumn?.assessment_date ?? new Date().toISOString().split('T')[0];
        return raw.includes('T') ? raw.split('T')[0] : raw;
      })(),
      max_score: editColumn?.max_score ?? 100,
    });
  }, [isOpen, editColumn, defaultSemester]);

  // Fetch assessment types
  const { data: assessmentTypesResponse } = useQuery({
    queryKey: ['assessment-types'],
    queryFn: () => assessmentTypeService.getAssessmentTypes({ per_page: 100 }),
  });
  const assessmentTypes = assessmentTypesResponse?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assessment_type_id || !formData.column_label) {
      toast({
        title: 'Xəta',
        description: 'Bütün sahələri doldurun',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      if (editColumn) {
        await gradeBookService.updateColumn(editColumn.id, {
          assessment_type_id: Number(formData.assessment_type_id),
          semester: formData.semester,
          column_label: formData.column_label,
          assessment_date: formData.assessment_date,
          max_score: Number(formData.max_score),
        });
      } else {
        await gradeBookService.addColumn(gradeBookId, {
          assessment_type_id: Number(formData.assessment_type_id),
          semester: formData.semester,
          column_label: formData.column_label,
          assessment_date: formData.assessment_date,
          max_score: Number(formData.max_score),
        });
      }

      toast({
        title: 'Uğurlu',
        description: editColumn ? 'İmtahan sütunu yeniləndi' : 'İmtahan sütunu əlavə edildi',
      });

      onSuccess();
      setFormData({
        assessment_type_id: undefined,
        semester: defaultSemester,
        column_label: '',
        assessment_date: new Date().toISOString().split('T')[0],
        max_score: 100,
      });
    } catch (error) {
      const err: any = error;
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Sütun əlavə edilərkən xəta baş verdi';

      const validationErrors = err?.response?.data?.errors;
      const validationMessage = validationErrors
        ? Object.values(validationErrors).flat().join(', ')
        : null;

      toast({
        title: 'Xəta',
        description: validationMessage || errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-suggest column label based on assessment type and semester
  const suggestColumnLabel = (assessmentTypeId: string, semester: 'I' | 'II') => {
    const selectedType = assessmentTypes?.find(t => t.id === Number(assessmentTypeId));
    if (!selectedType) return '';

    const prefix = selectedType.category?.toUpperCase() || 'KSQ';
    const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
    const maxN = existingColumns
      .filter(c => c.semester === semester)
      .map(c => {
        const label = (c.column_label || '').trim();
        const match = label.match(regex);
        return match ? Number(match[1]) : 0;
      })
      .reduce((acc, n) => Math.max(acc, n), 0);

    return `${prefix}${maxN + 1}`;
  };

  const handleAssessmentTypeChange = (value: string) => {
    if (!value) return;
    setFormData(prev => ({
      ...prev,
      assessment_type_id: value,
      column_label: editColumn ? prev.column_label : suggestColumnLabel(value, prev.semester),
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editColumn ? 'İmtahan Sütununu Redaktə Et' : 'İmtahan Sütunu Əlavə Et'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="semester">Yarımil</Label>
            <Select
              value={formData.semester}
              onValueChange={(value) =>
                setFormData(prev => {
                  const newSemester = value as 'I' | 'II';
                  const next: typeof prev = { ...prev, semester: newSemester };
                  if (!editColumn && prev.assessment_type_id) {
                    next.column_label = suggestColumnLabel(prev.assessment_type_id, newSemester);
                  }
                  return next;
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Yarımil seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="I">I Yarımil</SelectItem>
                <SelectItem value="II">II Yarımil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessment_type">İmtahan Növü</Label>
            <Select
              value={formData.assessment_type_id}
              onValueChange={handleAssessmentTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="İmtahan növü seçin" />
              </SelectTrigger>
              <SelectContent>
                {assessmentTypes?.map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.name} ({type.category?.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="column_label">Sütun Adı</Label>
            <Input
              id="column_label"
              value={formData.column_label}
              onChange={(e) => setFormData(prev => ({ ...prev, column_label: e.target.value }))}
              placeholder="Məsələn: KSQ1, BSQ1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessment_date">İmtahan Tarixi</Label>
            <Input
              id="assessment_date"
              type="date"
              value={formData.assessment_date}
              onChange={(e) => setFormData(prev => ({ ...prev, assessment_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_score">Maksimum Bal</Label>
            <Input
              id="max_score"
              type="number"
              min={1}
              max={100}
              value={formData.max_score}
              onChange={(e) => setFormData(prev => ({ ...prev, max_score: Number(e.target.value) }))}
            />
            <p className="text-xs text-gray-500">Standart: 100 bal</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Ləğv Et
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Əlavə edilir...' : 'Əlavə Et'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
