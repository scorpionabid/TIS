import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Plus,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { usePsixoloquDashboard } from './hooks/usePsixoloquDashboard';
import { StatsCard } from './StatsCard';
import { SessionSchedule } from './SessionSchedule';
import { QuickActions } from './QuickActions';
import { ActiveCases } from './ActiveCases';
import { AssessmentGrid } from './AssessmentGrid';
import { ReportsGrid } from './ReportsGrid';
import { PsixoloquStats } from './PsixoloquStats';

export const PsixoloquDashboardRefactored: React.FC = () => {
  const {
    // State
    refreshing,
    statsLoading,
    upcomingSessions,
    activeCases,
    
    // Calculated stats
    totalCases,
    todaySessions,
    urgentCases,
    completionRate,
    
    // Actions
    handleRefresh,
    
    // Helper functions
    getSessionTypeLabel,
    getCaseTypeLabel,
    getSeverityLabel,
    getStatusLabel,
    getSeverityColor,
    getStatusColor,
    getPriorityColor
  } = usePsixoloquDashboard();

  if (statsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Dashboard yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Psixoloji Dəstək</h1>
          <p className="text-muted-foreground">
            Şagird qayğısı, psixoloji dəstək və inkişaf izləməsi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Yenilə
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Sesiya
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Aktiv Hallar"
          value={totalCases}
          icon={Brain}
          variant="primary"
        />
        <StatsCard
          title="Bugünkü Sesiyalar"
          value={todaySessions}
          icon={Calendar}
          variant="warning"
        />
        <StatsCard
          title="Ciddi Hallar"
          value={urgentCases}
          icon={AlertTriangle}
          variant={urgentCases > 0 ? "destructive" : "success"}
        />
        <StatsCard
          title="Uğur Göstəricisi"
          value={`${completionRate}%`}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Secondary Stats */}
      <PsixoloquStats />

      {/* Main Content Tabs */}
      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sessions">Sesiya Təqvimi</TabsTrigger>
          <TabsTrigger value="cases">Aktiv Hallar</TabsTrigger>
          <TabsTrigger value="assessments">Qiymətləndirmələr</TabsTrigger>
          <TabsTrigger value="reports">Hesabatlar</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SessionSchedule
              sessions={upcomingSessions}
              getSessionTypeLabel={getSessionTypeLabel}
              getStatusLabel={getStatusLabel}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
            />
            <QuickActions />
          </div>
        </TabsContent>

        <TabsContent value="cases" className="space-y-4">
          <ActiveCases
            cases={activeCases}
            getCaseTypeLabel={getCaseTypeLabel}
            getSeverityLabel={getSeverityLabel}
            getStatusLabel={getStatusLabel}
            getSeverityColor={getSeverityColor}
            getStatusColor={getStatusColor}
          />
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          <AssessmentGrid />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportsGrid />
        </TabsContent>
      </Tabs>
    </div>
  );
};