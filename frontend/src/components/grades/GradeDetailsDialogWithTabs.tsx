/**
 * GradeDetailsDialogWithTabs Component
 *
 * Enhanced grade details dialog with tabbed interface:
 * - Details tab: Basic information, capacity, warnings
 * - Students tab: Student management
 * - Curriculum tab: Subject management with teaching load
 * - Analytics tab: Performance metrics
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Grade } from '@/services/grades';
import {
  School,
  BookOpen,
  Users,
  BarChart3,
  Info,
} from 'lucide-react';
import CurriculumTab from '../curriculum/CurriculumTab';
import { GradeDetailsTabContent } from './GradeDetailsTabContent';

interface GradeDetailsDialogWithTabsProps {
  grade: Grade;
  onClose: () => void;
  onEdit: (grade: Grade) => void;
  onManageStudents: (grade: Grade) => void;
  onUpdate?: () => void;
}

export const GradeDetailsDialogWithTabs: React.FC<GradeDetailsDialogWithTabsProps> = ({
  grade,
  onClose,
  onEdit,
  onManageStudents,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            {grade.display_name || grade.full_name}
            <Badge variant={grade.is_active ? 'default' : 'secondary'} className="ml-2">
              {grade.is_active ? 'Aktiv' : 'Deaktiv'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Məlumat
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Kurikulum
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tələbələr
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analitika
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Details Tab */}
            <TabsContent value="details" className="mt-0">
              <GradeDetailsTabContent
                grade={grade}
                onEdit={onEdit}
                onManageStudents={onManageStudents}
                onClose={onClose}
              />
            </TabsContent>

            {/* Curriculum Tab */}
            <TabsContent value="curriculum" className="mt-0">
              <CurriculumTab
                gradeId={grade.id}
                gradeName={grade.display_name || grade.full_name}
                onUpdate={onUpdate}
              />
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students" className="mt-0">
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tələbə İdarəetməsi</h3>
                <p className="text-gray-500 mb-4">Tələbə idarəetmə funksionallığı hazırlanmaqdadır.</p>
                <button
                  onClick={() => onManageStudents(grade)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Tələbələri İdarə Et
                </button>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-0">
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analitika</h3>
                <p className="text-gray-500">Sinif analitikası hazırlanmaqdadır.</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
