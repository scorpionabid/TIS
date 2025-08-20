import React from 'react';
import { School, Globe, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssessmentCreate } from '../assessments/hooks/useAssessmentCreate';
import { KSQAssessmentForm } from '../assessments/KSQAssessmentForm';
import { BSQAssessmentForm } from '../assessments/BSQAssessmentForm';

interface AssessmentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssessmentCreated?: () => void;
}

export const AssessmentCreateModal: React.FC<AssessmentCreateModalProps> = ({
  isOpen,
  onClose,
  onAssessmentCreated
}) => {
  const {
    // State
    creating,
    selectedType,
    criteriaList,
    strengthsList,
    improvementsList,
    recommendationsList,
    
    // Data
    academicYears,
    institutions,
    activeAcademicYear,
    defaultInstitution,
    loadingAcademicYears,
    loadingInstitutions,
    
    // Forms
    ksqForm,
    bsqForm,
    
    // Actions
    setSelectedType,
    addCriteria,
    removeCriteria,
    updateCriteria,
    addListItem,
    removeListItem,
    updateListItem,
    onSubmitKSQ,
    onSubmitBSQ,
    handleClose,
    calculatePercentage,
    setStrengthsList,
    setImprovementsList,
    setRecommendationsList
  } = useAssessmentCreate({ onAssessmentCreated, onClose });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Yeni Qiymətləndirmə Yaradın</span>
          </DialogTitle>
          <DialogDescription>
            Təhsil müəssisəsi üçün keyfiyyət və ya beynəlxalq standartlar qiymətləndirməsi əlavə edin
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as 'ksq' | 'bsq')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ksq" className="flex items-center space-x-2">
              <School className="h-4 w-4" />
              <span>KSQ Qiymətləndirməsi</span>
            </TabsTrigger>
            <TabsTrigger value="bsq" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>BSQ Qiymətləndirməsi</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ksq" className="space-y-6">
            <KSQAssessmentForm
              form={ksqForm}
              criteriaList={criteriaList}
              strengthsList={strengthsList}
              improvementsList={improvementsList}
              recommendationsList={recommendationsList}
              academicYears={academicYears || []}
              institutions={institutions}
              defaultInstitution={defaultInstitution}
              activeAcademicYear={activeAcademicYear}
              creating={creating}
              loadingAcademicYears={loadingAcademicYears}
              loadingInstitutions={loadingInstitutions}
              onSubmit={onSubmitKSQ}
              onClose={handleClose}
              addCriteria={addCriteria}
              removeCriteria={removeCriteria}
              updateCriteria={updateCriteria}
              addListItem={addListItem}
              removeListItem={removeListItem}
              updateListItem={updateListItem}
              setStrengthsList={setStrengthsList}
              setImprovementsList={setImprovementsList}
              setRecommendationsList={setRecommendationsList}
              calculatePercentage={calculatePercentage}
            />
          </TabsContent>

          <TabsContent value="bsq" className="space-y-6">
            <BSQAssessmentForm
              form={bsqForm}
              academicYears={academicYears || []}
              institutions={institutions}
              defaultInstitution={defaultInstitution}
              activeAcademicYear={activeAcademicYear}
              creating={creating}
              loadingAcademicYears={loadingAcademicYears}
              loadingInstitutions={loadingInstitutions}
              onSubmit={onSubmitBSQ}
              onClose={handleClose}
              calculatePercentage={calculatePercentage}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};