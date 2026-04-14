import React from 'react';
import { AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { useSchoolAttendanceData } from './hooks/useSchoolAttendanceData';
import { SchoolGradeStatsTable } from '@/components/regionadmin/attendance/SchoolGradeStatsTable';
import { RatingStatsCards } from '@/components/rating/RatingStatsCards';
import { ratingService } from '@/services/ratingService';
import { RatingItem } from '@/types/rating';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';

// Extracted Components
import { AttendanceFilters } from './components/AttendanceFilters';
import { AttendanceRankingsTable } from './components/AttendanceRankingsTable';

interface SchoolAttendanceReportsProps {
  activeTab?: 'schoolGrade' | 'rankings';
}

/**
 * SchoolAttendanceReports
 * 
 * Main page for school attendance reporting and rankings.
 * Modularized into smaller components for better maintainability.
 */
export default function SchoolAttendanceReports({ activeTab = 'schoolGrade' }: SchoolAttendanceReportsProps) {
  const { currentUser } = useAuth();
  const { isSchoolAdmin } = useRoleCheck();
  const [ratingData, setRatingData] = React.useState<RatingItem[]>([]);
  const [ratingLoading, setRatingLoading] = React.useState(false);

  const {
    hasAccess,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    datePreset,
    selectedShiftType,
    setSelectedShiftType,
    // Grade Stats
    gradeStatsLoading,
    gradeStatsError,
    refetchGradeStats,
    matrixData,
    // Rankings
    rankingsData,
    rankingsLoading,
    rankingsError,
    refetchRankings,
    mySchoolRank,
    // Actions
    handlePresetChange,
  } = useSchoolAttendanceData();

  // Load rating data for school admin
  React.useEffect(() => {
    if (activeTab === 'rankings') {
      loadRatingData();
    }
  }, [activeTab]);

  const loadRatingData = async () => {
    try {
      setRatingLoading(true);
      const response = await ratingService.getMyStats({
        period: format(new Date(), 'yyyy-MM'),
      });

      if (response?.rating) {
        const item: RatingItem = {
          ...response.rating,
          sector_rank: response.sector_rank,
          sector_total: response.sector_total,
          region_rank: response.region_rank,
          region_total: response.region_total,
          monthly_trend: response.monthly_trend,
          institution: response.institution,
          user: currentUser || undefined,
        };
        setRatingData([item]);
      }
    } catch (error) {
      console.error('Error loading rating data:', error);
    } finally {
      setRatingLoading(false);
    }
  };

  const handleRefresh = () => {
    refetchGradeStats();
    refetchRankings();
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">Bu bölməni görmək üçün müvafiq icazə tələb olunur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Filters Section */}
      <AttendanceFilters
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        selectedShiftType={selectedShiftType}
        setSelectedShiftType={setSelectedShiftType}
        datePreset={datePreset}
        handlePresetChange={handlePresetChange}
        onRefresh={handleRefresh}
      />

      {/* Error Alerts */}
      {(gradeStatsError || rankingsError) && (
        <div className="space-y-2">
          {gradeStatsError && (
            <Alert variant="destructive" className="rounded-2xl border-0 shadow-lg bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Xəta (Siniflər)</AlertTitle>
              <AlertDescription>
                {(gradeStatsError as any)?.message || 'Məlumatları yükləmək mümkün olmadı'}
              </AlertDescription>
            </Alert>
          )}
          {rankingsError && (
            <Alert variant="destructive" className="rounded-2xl border-0 shadow-lg bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Xəta (Reytinq)</AlertTitle>
              <AlertDescription>
                {(rankingsError as any)?.message || 'Reytinq məlumatlarını yükləmək mümkün olmadı'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'schoolGrade' && (
        <SchoolGradeStatsTable
          schools={matrixData.schools}
          regionalAverages={matrixData.regionalAverages}
          loading={gradeStatsLoading}
        />
      )}

      {activeTab === 'rankings' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Stats Cards for School Admin */}
          {ratingData.length > 0 && (
            <RatingStatsCards 
              data={ratingData[0]} 
              loading={ratingLoading} 
            />
          )}

          {/* Rankings Table */}
          <AttendanceRankingsTable
            data={rankingsData}
            loading={rankingsLoading}
            startDate={startDate}
            endDate={endDate}
            mySchoolRank={mySchoolRank}
          />
        </div>
      )}
    </div>
  );
}
