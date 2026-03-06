/**
 * GradeDuplicateModal Component
 *
 * Modal for duplicating/copying a grade with its curriculum
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Grade, gradeService } from '@/services/grades';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, AlertCircle, Loader2, Info } from 'lucide-react';
import { logger } from '@/utils/logger';

interface GradeDuplicateModalProps {
  grade: Grade;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GradeDuplicateModal: React.FC<GradeDuplicateModalProps> = ({
  grade,
  open,
  onClose,
  onSuccess,
}) => {
  const [newName, setNewName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState<number>(grade.class_level);
  const [copySubjects, setCopySubjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Check if class level has changed
  const classLevelChanged = newClassLevel !== grade.class_level;

  const duplicateMutation = useMutation({
    mutationFn: (data: { name: string; class_level?: number; copy_subjects: boolean }) =>
      gradeService.duplicateGrade(grade.id, data),
    onSuccess: (response) => {
      logger.info('Grade duplicated successfully', {
        component: 'GradeDuplicateModal',
        data: { originalGradeId: grade.id, newGradeId: response.data.id }
      });

      toast.success('Sinif uğurla kopyalandı');
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      logger.error('Grade duplication failed', {
        component: 'GradeDuplicateModal',
        error: error.response?.data?.message || error.message
      });

      const errorMessage = error.response?.data?.message || 'Sinif kopyalanarkən xəta baş verdi';
      setError(errorMessage);
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!newName || newName.trim() === '') {
      setError('Yeni sinif adı mütləqdir');
      return;
    }

    if (!/^[A-ZƏİÖÜÇŞĞ]$/.test(newName.trim())) {
      setError('Sinif adı yalnız tək böyük hərf ola bilər (A, B, C, Ə, İ, və s.)');
      return;
    }

    const duplicateData: { name: string; class_level?: number; copy_subjects: boolean } = {
      name: newName.trim(),
      copy_subjects: copySubjects,
    };

    // Add class_level only if it has changed
    if (classLevelChanged) {
      duplicateData.class_level = newClassLevel;
    }

    duplicateMutation.mutate(duplicateData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Sinfi Kopyala
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Original Grade Info */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm text-gray-600">Orijinal sinif:</p>
              <p className="font-medium">{grade.display_name || grade.full_name}</p>
              <p className="text-xs text-gray-500">
                {grade.class_level}. sinif • {grade.institution?.name}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Class Level Selector */}
            <div className="space-y-2">
              <Label htmlFor="classLevel">
                Sinif səviyyəsi <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newClassLevel.toString()}
                onValueChange={(value) => setNewClassLevel(parseInt(value))}
              >
                <SelectTrigger id="classLevel">
                  <SelectValue placeholder="Sinif səviyyəsi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Hazırlıq sinfi (0)</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      {level}. sinif
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {classLevelChanged && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-2">
                  <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Sinif səviyyəsi dəyişdirilib. Fənnlərin yeni səviyyəyə uyğunluğunu yoxlayın.
                  </p>
                </div>
              )}
            </div>

            {/* New Name Input */}
            <div className="space-y-2">
              <Label htmlFor="newName">
                Sinif hərfi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value.toUpperCase())}
                placeholder="Məs: B, C, D"
                maxLength={1}
                className="text-lg font-medium"
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Yeni sinif adı: <span className="font-semibold">{newClassLevel}-{newName || '?'}</span>
              </p>
              {newName && (
                <p className="text-xs text-blue-600">
                  💡 Əgər bu sinif artıq mövcuddursa, fərqli hərf seçin (B, C, D, Ə, İ, Ö, Ü və s.)
                </p>
              )}
            </div>

            {/* Copy Subjects Checkbox */}
            <div className="flex items-start space-x-3 py-2">
              <Checkbox
                id="copySubjects"
                checked={copySubjects}
                onCheckedChange={(checked) => setCopySubjects(checked as boolean)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="copySubjects"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Kurikulumu kopyala
                </Label>
                <p className="text-xs text-gray-500">
                  Bütün fənnləri və dərs yüklərini yeni sinfə kopyalayır
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={duplicateMutation.isPending}
            >
              Ləğv et
            </Button>
            <Button
              type="submit"
              disabled={duplicateMutation.isPending || !newName.trim()}
            >
              {duplicateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kopyalanır...
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Kopyala
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
