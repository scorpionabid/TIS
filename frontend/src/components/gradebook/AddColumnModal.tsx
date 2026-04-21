import React, { useEffect, useState, useMemo } from 'react';
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
    queryFn: () => assessmentTypeService.getAssessmentTypes({ per_page: 100, is_active: true }),
  });
  const assessmentTypes = assessmentTypesResponse?.data || [];

  const getAssessmentTypeTag = (type: { name?: string; category?: string }): string => {
    const name = (type.name || '').trim();
    const lowerName = name.toLowerCase();
    const category = (type.category || '').toLowerCase();

    if (category === 'ksq') return 'KSQ';
    if (category === 'bsq') {
      if (lowerName.includes('burax')) return 'Buraxılış';
      return 'BSQ';
    }
    if (category === 'monitoring') return 'Monitorinq';
    if (category === 'diagnostic') return 'Diaqnostik';
    if (category === 'national') return 'Milli';

    if (lowerName.includes('burax')) return 'Buraxılış';
    if (lowerName.includes('monitor')) return 'Monitorinq';
    if (lowerName.includes('milli')) return 'Milli';
    if (lowerName.includes('diaqno')) return 'Diaqnostik';
    if (lowerName.includes('kiçik') || lowerName.includes('kicik')) return 'KSQ';
    if (lowerName.includes('böyük') || lowerName.includes('boyuk')) return 'BSQ';

    return '';
  };

  // Group and sort assessment types - but for now just show them directly
  const displayAssessmentTypes = useMemo(() => {
    if (!assessmentTypes) return [];
    return [...assessmentTypes].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      if (nameA.includes('ksq')) return -1;
      if (nameA.includes('bsq')) return -1;
      return 1;
    });
  }, [assessmentTypes]);

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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } }; message?: string };
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

  // Auto-suggest column label based on assessment type, semester and DATE
  const suggestColumnLabel = (assessmentTypeId: string, semester: 'I' | 'II', date: string) => {
    const selectedType = assessmentTypes.find(t => String(t.id) === assessmentTypeId);
    if (!selectedType) return '';

    const category = (selectedType.category || '').toLowerCase();

    if (category === 'ksq' || category === 'bsq') {
      const prefix = category.toUpperCase();
      
      // Get all existing exams of this category in this semester
      const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
      const exams = existingColumns
        .filter(c => c.semester === semester && regex.test(c.column_label || ''))
        .map(c => ({
          label: (c.column_label || '').trim(),
          date: (c as any).assessment_date || '9999-99-99' // Fallback to far future if no date
        }));

      // Add the new one to the list and sort by date
      exams.push({ label: 'NEW', date });
      exams.sort((a, b) => a.date.localeCompare(b.date));

      const position = exams.findIndex(e => e.label === 'NEW') + 1;
      return `${prefix}${position}`;
    }

    const base = (selectedType.name || '').trim();
    if (!base) return '';

    const sameSemesterLabels = existingColumns
      .filter(c => c.semester === semester)
      .map(c => (c.column_label || '').trim())
      .filter(Boolean);

    if (!sameSemesterLabels.includes(base)) {
      return base;
    }

    const suffixRegex = new RegExp(`^${base.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s+(\\d+)$`, 'i');
    const maxSuffix = sameSemesterLabels
      .map(label => {
        const match = label.match(suffixRegex);
        return match ? Number(match[1]) : 0;
      })
      .reduce((acc, n) => Math.max(acc, n), 0);

    return `${base} ${Math.max(1, maxSuffix + 1)}`;
  };

  const handleAssessmentTypeChange = (value: string) => {
    if (!value) return;
    setFormData(prev => ({
      ...prev,
      assessment_type_id: value,
      column_label: editColumn ? prev.column_label : suggestColumnLabel(value, prev.semester, prev.assessment_date),
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
                    next.column_label = suggestColumnLabel(prev.assessment_type_id, newSemester, prev.assessment_date);
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
                {displayAssessmentTypes.map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.name}
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
              onChange={(e) => {
                const newDate = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  assessment_date: newDate,
                  column_label: editColumn ? prev.column_label : suggestColumnLabel(prev.assessment_type_id || '', prev.semester, newDate)
                }));
              }}
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
