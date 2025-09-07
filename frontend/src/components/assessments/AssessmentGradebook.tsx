import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GraduationCap, 
  Plus,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import modular components
import { useAssessmentGradebook } from './hooks/useAssessmentGradebook';
import { ClassSelector } from './ClassSelector';
import { AcademicAssessmentCreateModal } from './AcademicAssessmentCreateModal';
import { AssessmentCard } from './AssessmentCard';
import { GradingInterface } from './GradingInterface';
import { GradebookStats } from './GradebookStats';

interface AssessmentGradebookProps {
  className?: string;
}

export const AssessmentGradebook: React.FC<AssessmentGradebookProps> = ({ 
  className 
}) => {
  const {
    // State
    selectedClassId,
    selectedAssessmentId,
    viewMode,
    gradeData,
    createModalOpen,
    newAssessment,
    
    // Data
    classes,
    assessments,
    students,
    grades,
    assessmentsLoading,
    gradesLoading,
    
    // Mutations
    createAssessmentMutation,
    saveGradesMutation,
    submitAssessmentMutation,
    
    // Actions
    setSelectedClassId,
    setSelectedAssessmentId,
    setViewMode,
    setCreateModalOpen,
    setNewAssessment,
    refetchAssessments,
    
    // Event handlers
    handleCreateAssessment,
    handleSaveGrades,
    handleSubmitAssessment,
    updateGrade,
    
    // Utilities
    getAssessmentTypeText,
    getGradeColor,
    getGradeLetter,
    calculateClassAverage,
    getSelectedAssessment
  } = useAssessmentGradebook();

  // Calculate class statistics for selected assessment
  const calculateClassStats = () => {
    if (!grades || grades.length === 0) return null;

    const percentages = grades.map(g => g.percentage || 0);
    const average = Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    
    return {
      average,
      highest,
      lowest,
      totalStudents: students?.length || 0,
      gradedStudents: grades.length,
      gradeDistribution: {
        A: grades.filter(g => (g.percentage || 0) >= 90).length,
        B: grades.filter(g => (g.percentage || 0) >= 80 && (g.percentage || 0) < 90).length,
        C: grades.filter(g => (g.percentage || 0) >= 70 && (g.percentage || 0) < 80).length,
        D: grades.filter(g => (g.percentage || 0) >= 60 && (g.percentage || 0) < 70).length,
        E: grades.filter(g => (g.percentage || 0) >= 50 && (g.percentage || 0) < 60).length,
        F: grades.filter(g => (g.percentage || 0) < 50).length,
      }
    };
  };

  const classStats = calculateClassStats();
  const selectedAssessment = getSelectedAssessment();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Qiymətləndirmə və Qiymət Dəftəri</h2>
          <p className="text-muted-foreground">
            Şagirdlərin qiymətlərini qeydə alın və qiymətləndirmələri idarə edin
          </p>
        </div>
      </div>

      {/* Class Selection */}
      <ClassSelector
        classes={classes}
        selectedClassId={selectedClassId}
        onClassChange={(classId) => {
          setSelectedClassId(classId);
          setSelectedAssessmentId(null);
          setViewMode('assessments');
        }}
        onRefresh={refetchAssessments}
      />

      {/* Main Content */}
      {selectedClassId ? (
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="assessments" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Qiymətləndirmələr
              </TabsTrigger>
              <TabsTrigger 
                value="grades" 
                disabled={!selectedAssessmentId}
                className="flex items-center gap-2"
              >
                <GraduationCap className="h-4 w-4" />
                Qiymətlər
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {viewMode === 'grades' && selectedAssessmentId && (
                <Button
                  variant="outline"
                  onClick={() => setViewMode('assessments')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Geri
                </Button>
              )}
              <Button 
                onClick={() => setCreateModalOpen(true)}
                disabled={!selectedClassId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Yeni Qiymətləndirmə
              </Button>
            </div>
          </div>

          {/* Assessments List */}
          <TabsContent value="assessments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Qiymətləndirmələr</CardTitle>
                <CardDescription>
                  {classes?.find(c => c.id === selectedClassId)?.name} sinifi üçün qiymətləndirmələr
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assessmentsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-32 bg-muted rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : assessments && assessments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assessments.map(assessment => (
                      <AssessmentCard
                        key={assessment.id}
                        assessment={assessment}
                        onViewGrades={(assessment) => {
                          setSelectedAssessmentId(assessment.id);
                          setViewMode('grades');
                        }}
                        onEdit={(assessment) => {
                          // Handle edit assessment
                          console.log('Edit assessment:', assessment);
                        }}
                        onSubmit={handleSubmitAssessment}
                        getAssessmentTypeText={getAssessmentTypeText}
                        calculateClassAverage={calculateClassAverage}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Qiymətləndirmə yoxdur</h3>
                    <p className="text-muted-foreground mb-4">
                      Bu sinif üçün hələ ki qiymətləndirmə yaradılmayıb
                    </p>
                    <Button onClick={() => setCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      İlk qiymətləndirməni yarat
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grades Entry */}
          <TabsContent value="grades" className="space-y-6">
            {selectedAssessment && (
              <>
                {/* Assessment Statistics */}
                {classStats && (
                  <GradebookStats 
                    stats={classStats}
                    totalPoints={selectedAssessment.total_points}
                  />
                )}

                {/* Grading Interface */}
                <GradingInterface
                  assessment={selectedAssessment}
                  students={students}
                  grades={grades}
                  gradeData={gradeData}
                  onBack={() => setViewMode('assessments')}
                  onSaveGrades={handleSaveGrades}
                  updateGrade={updateGrade}
                  getGradeColor={getGradeColor}
                  getGradeLetter={getGradeLetter}
                  isSaving={saveGradesMutation.isPending}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Sinif seçin</h3>
              <p className="text-muted-foreground">
                Qiymətləndirmə etmək üçün əvvəlcə sinif seçin
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Assessment Modal */}
      <AcademicAssessmentCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        newAssessment={newAssessment}
        setNewAssessment={setNewAssessment}
        onCreateAssessment={handleCreateAssessment}
        isCreating={createAssessmentMutation.isPending}
        selectedClassId={selectedClassId}
      />
    </div>
  );
};