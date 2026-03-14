/**
 * GradeDetailsDialogWithTabs Component
 *
 * Simplified grade curriculum dialog:
 * - Shows only curriculum/subject management with teaching load
 */

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-[90vw] sm:max-w-[1800px] overflow-hidden flex flex-col p-4 sm:p-6">
        <SheetHeader className="flex-shrink-0 text-left mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>{grade.display_name || grade.full_name} - Kurikulum</span>
            <Badge variant={grade.is_active ? 'default' : 'secondary'} className="ml-2">
              {grade.is_active ? 'Aktiv' : 'Deaktiv'}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <CurriculumTab
            gradeId={grade.id}
            gradeName={grade.display_name || grade.full_name}
            onUpdate={onUpdate}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
