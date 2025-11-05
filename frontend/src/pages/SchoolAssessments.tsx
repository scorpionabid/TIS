import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Plus,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Import components
import { SchoolAssessmentModal } from '@/components/assessments/SchoolAssessmentModal';

// Import services
import { schoolAssessmentService } from '@/services/schoolAssessments';

const SchoolAssessments: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // ALL HOOKS MOVED TO TOP - No early returns before hooks!

  // Fetch school assessments
  const { data: schoolAssessmentsData, isLoading: schoolAssessmentsLoading } = useQuery({
    queryKey: ['school-assessments', currentUser?.institution?.id],
    queryFn: async () => {
      if (!currentUser?.institution?.id) return null;

      try {
        const response = await schoolAssessmentService.getAssessments({ per_page: 50 });
        return response;
      } catch (error: any) {
        console.error('❌ Error loading school assessments:', error);
        throw error;
      }
    },
    enabled: !loading && !!currentUser?.institution?.id,
    staleTime: 1000 * 60 * 5,
    retry: 2
  });

  // Extract school assessments (new system) - BEFORE any conditional returns
  const schoolAssessments = React.useMemo(() => {
    const raw = schoolAssessmentsData?.data ?? schoolAssessmentsData;
    return Array.isArray(raw) ? raw : raw?.data ?? [];
  }, [schoolAssessmentsData]);

  // SECURITY CHECKS MOVED AFTER ALL HOOKS

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Yüklənir...</p>
        </div>
      </div>
    );
  }

  // Check if user has access to this page
  if (!currentUser?.institution?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Müəssisə məlumatı tapılmadı</h2>
          <p className="text-muted-foreground">
            Qiymətləndirmə sistemindən istifadə etmək üçün müəssisəyə təyin olunmalısınız.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Məktəb Qiymətləndirmə Sistemi
          </h1>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Qiymətləndirmə
        </Button>
      </div>

      {/* Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle>Qiymətləndirmələr</CardTitle>
          <CardDescription>
            Müəssisənizin bütün qiymətləndirmələrini buradan idarə edin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schoolAssessmentsLoading ? (
            <div className="text-center py-12">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ) : schoolAssessments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schoolAssessments.map((assessment: any) => (
                <Card key={assessment.id} className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">
                          {assessment.generated_title || assessment.title || 'Qiymətləndirmə'}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {assessment.assessment_type?.name || 'N/A'} • {assessment.stage?.name || 'Mərhələ'}
                      </p>
                      {assessment.scheduled_date && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(assessment.scheduled_date).toLocaleDateString('az-AZ')}
                        </p>
                      )}
                      <div className="flex justify-between items-center">
                        <Badge variant={
                          assessment.status === 'completed' ? 'default' :
                          assessment.status === 'in_progress' ? 'secondary' : 'outline'
                        }>
                          {assessment.status === 'completed' ? 'Tamamlanmış' :
                           assessment.status === 'in_progress' ? 'Davam edir' : 'Layihə'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Qiymətləndirmə yoxdur</h3>
              <p className="text-muted-foreground mb-4">
                Hələ ki qiymətləndirmə nəticəsi əlavə edilməyib
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                İlk qiymətləndirməni əlavə et
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <SchoolAssessmentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          setCreateModalOpen(false);
          toast({
            title: 'Sessiya yaradıldı',
            description: 'Yeni qiymətləndirmə sessiyası əlavə olundu.',
          });
          queryClient.invalidateQueries({ queryKey: ['school-assessments'] });
        }}
      />

    </div>
  );
};

export default SchoolAssessments;
