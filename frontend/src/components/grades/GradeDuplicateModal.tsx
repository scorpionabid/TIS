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
import { Grade, gradeService } from '@/services/grades';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, AlertCircle, Loader2 } from 'lucide-react';
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
  const [copySubjects, setCopySubjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const duplicateMutation = useMutation({
    mutationFn: (data: { name: string; copy_subjects: boolean }) =>
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

    duplicateMutation.mutate({
      name: newName.trim(),
      copy_subjects: copySubjects,
    });
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

            {/* New Name Input */}
            <div className="space-y-2">
              <Label htmlFor="newName">
                Yeni Sinif Adı <span className="text-red-500">*</span>
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
                Yeni sinif adı: {grade.class_level}-{newName || '?'}
              </p>
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
