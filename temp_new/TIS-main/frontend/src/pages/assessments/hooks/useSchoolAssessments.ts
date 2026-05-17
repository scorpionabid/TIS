import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { assessmentService, AssessmentFilters } from '@/services/assessments';
import { assessmentTypeService, AssessmentType } from '@/services/assessmentTypes';

export const useSchoolAssessments = () => {
  const [filters, setFilters] = useState<AssessmentFilters>({
    assessment_type: 'all',
    per_page: 15
  });
  const [selectedTab, setSelectedTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssessmentTypeModalOpen, setIsAssessmentTypeModalOpen] = useState(false);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<AssessmentType | undefined>();

  const { toast } = useToast();
  const { currentUser, hasRole } = useAuth();

  // Fetch assessment types data
  const { data: assessmentTypes, refetch: refetchAssessmentTypes } = useQuery({
    queryKey: ['assessment-types'],
    queryFn: () => assessmentTypeService.getAssessmentTypes({ per_page: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch assessment overview data
  const { data: assessmentData, isLoading, error, refetch } = useQuery({
    queryKey: ['assessments', filters],
    queryFn: () => assessmentService.getAssessmentOverview(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['assessment-analytics', filters.institution_id, filters.academic_year_id],
    queryFn: () => {
      if (!filters.institution_id) return null;
      return assessmentService.getAnalytics(
        filters.institution_id,
        filters.academic_year_id,
        {
          include_trends: true,
          include_rankings: true,
          include_recommendations: true
        }
      );
    },
    enabled: !!filters.institution_id,
    staleTime: 1000 * 60 * 5,
  });

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!assessmentData?.data) return null;

    const { ksq_results, bsq_results, analytics } = assessmentData.data;
    
    // Combine KSQ and BSQ results for overall stats
    const allAssessments = [
      ...(ksq_results?.data || []),
      ...(bsq_results?.data || [])
    ];

    const totalAssessments = allAssessments.length;
    const averageScore = totalAssessments > 0 
      ? allAssessments.reduce((sum, assessment) => sum + assessment.percentage_score, 0) / totalAssessments 
      : 0;

    const approvedAssessments = allAssessments.filter(a => a.status === 'approved').length;
    const approvalRate = totalAssessments > 0 ? (approvedAssessments / totalAssessments) * 100 : 0;

    // Calculate trend from analytics or recent assessments
    const trendPercentage = analytics?.overall_analytics?.improvement_percentage || 0;

    return {
      averageScore: Math.round(averageScore * 10) / 10,
      totalAssessments,
      approvalRate: Math.round(approvalRate),
      trendPercentage: Math.round(trendPercentage * 10) / 10
    };
  }, [assessmentData]);

  // Event handlers
  const handleCreateAssessment = () => {
    setIsCreateModalOpen(true);
  };

  const handleExportData = async () => {
    if (!filters.institution_id) {
      toast({
        title: 'Xəta',
        description: 'İxrac üçün müəssisə seçin.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await assessmentService.exportData(
        filters.institution_id,
        'both',
        'excel',
        filters.academic_year_id
      );
      
      toast({
        title: 'İxrac başladı',
        description: 'Məlumatlar hazırlandıqda bildiriş alacaqsınız.',
      });
    } catch (error) {
      toast({
        title: 'İxrac xətası',
        description: 'Məlumatlar ixrac edilərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  const handleApproveAssessment = async (type: 'ksq' | 'bsq', id: number) => {
    try {
      await assessmentService.approve(type, id);
      toast({
        title: 'Təsdiqləndi',
        description: 'Qiymətləndirmə nəticəsi uğurla təsdiqləndi.',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Təsdiqləmə xətası',
        description: 'Qiymətləndirmə təsdiqləriëkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  // Assessment Type handlers
  const handleCreateAssessmentType = () => {
    setSelectedAssessmentType(undefined);
    setIsAssessmentTypeModalOpen(true);
  };

  const handleEditAssessmentType = (assessmentType: AssessmentType) => {
    setSelectedAssessmentType(assessmentType);
    setIsAssessmentTypeModalOpen(true);
  };

  const handleAssessmentTypeSuccess = () => {
    refetchAssessmentTypes();
    toast({
      title: 'Uğurlu əməliyyat',
      description: 'Assessment type uğurla saxlanıldı.',
    });
  };

  const handleDeleteAssessmentType = async (id: number) => {
    try {
      await assessmentTypeService.deleteAssessmentType(id);
      refetchAssessmentTypes();
      toast({
        title: 'Silindi',
        description: 'Assessment type uğurla silindi.',
      });
    } catch (error: any) {
      toast({
        title: 'Silmə xətası',
        description: error.message || 'Assessment type silinərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAssessmentTypeStatus = async (id: number) => {
    try {
      await assessmentTypeService.toggleAssessmentTypeStatus(id);
      refetchAssessmentTypes();
      toast({
        title: 'Status dəyişildi',
        description: 'Assessment type statusu uğurla dəyişildi.',
      });
    } catch (error: any) {
      toast({
        title: 'Status dəyişikliyi xətası',
        description: error.message || 'Status dəyişərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  // Utility functions
  const getStatusBadge = (status: string) => {
    // This will be moved to a separate utility file or kept inline
    return status;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  return {
    // State
    filters,
    selectedTab,
    searchTerm,
    isCreateModalOpen,
    isAssessmentTypeModalOpen,
    selectedAssessmentType,
    
    // Data
    assessmentTypes,
    assessmentData,
    analyticsData,
    summaryStats,
    
    // Loading states
    isLoading,
    analyticsLoading,
    error,
    
    // Actions
    setFilters,
    setSelectedTab,
    setSearchTerm,
    setIsCreateModalOpen,
    setIsAssessmentTypeModalOpen,
    handleCreateAssessment,
    handleExportData,
    handleApproveAssessment,
    handleCreateAssessmentType,
    handleEditAssessmentType,
    handleAssessmentTypeSuccess,
    handleDeleteAssessmentType,
    handleToggleAssessmentTypeStatus,
    refetch,
    refetchAssessmentTypes,
    
    // Utilities
    getStatusBadge,
    getScoreColor,
    
    // Auth
    currentUser,
    hasRole
  };
};