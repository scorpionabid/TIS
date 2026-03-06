/**
 * GradeDetailsDialogWithTabs Component
 *
 * Simplified grade curriculum dialog:
 * - Shows only curriculum/subject management with teaching load
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Grade } from '@/services/grades';
import { BookOpen } from 'lucide-react';
import CurriculumTab from '../curriculum/CurriculumTab';

interface GradeDetailsDialogWithTabsProps {
  grade: Grade;
  onClose: () => void;
  onUpdate?: () => void;
}

export const GradeDetailsDialogWithTabs: React.FC<GradeDetailsDialogWithTabsProps> = ({
  grade,
  onClose,
  onUpdate,
}) => {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {grade.display_name || grade.full_name} - Kurikulum
            <Badge variant={grade.is_active ? 'default' : 'secondary'} className="ml-2">
              {grade.is_active ? 'Aktiv' : 'Deaktiv'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          <CurriculumTab
            gradeId={grade.id}
            gradeName={grade.display_name || grade.full_name}
            onUpdate={onUpdate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
