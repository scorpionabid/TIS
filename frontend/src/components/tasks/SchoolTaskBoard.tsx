import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { schoolAdminService, schoolAdminKeys, SchoolTaskFilters } from '@/services/schoolAdmin';
import { cn } from '@/lib/utils';

// Import our new specialized components
import { TaskStatsCards } from './components/TaskStatsCards';
import { TaskFilters } from './components/TaskFilters';
import { TaskBoardView } from './components/TaskBoardView';
import { TaskListView } from './components/TaskListView';
import { useTaskFilters } from './hooks/useTaskFilters';
import { useTaskActions } from './hooks/useTaskActions';

interface SchoolTaskBoardProps {
  className?: string;
}

export const SchoolTaskBoard: React.FC<SchoolTaskBoardProps> = ({ className }) => {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Fetch school tasks
  const { 
    data: tasks, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: schoolAdminKeys.tasks(),
    queryFn: () => schoolAdminService.getSchoolTasks({ page: 1, per_page: 50 }),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Use our custom hooks
  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    filteredTasks,
    groupedTasks,
    taskStats,
  } = useTaskFilters(tasks);

  const {
    handleTaskStatusChange,
    handleTaskEdit,
    handleTaskView,
  } = useTaskActions();

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Tapşırıqlar yüklənərkən xəta baş verdi</h3>
              <p className="text-muted-foreground mb-4">
                Zəhmət olmasa yenidən cəhd edin
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Yenidən cəhd et
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tapşırıq İdarəetməsi</h2>
          <p className="text-muted-foreground">
            Məktəb tapşırıqlarını izləyin və idarə edin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Yenilə
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Tapşırıq
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <TaskStatsCards stats={taskStats} />

      {/* Filters */}
      <TaskFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Task View */}
      {viewMode === 'board' ? (
        <TaskBoardView
          groupedTasks={groupedTasks}
          onTaskStatusChange={handleTaskStatusChange}
          onTaskEdit={handleTaskEdit}
          onTaskView={handleTaskView}
          isLoading={isLoading}
        />
      ) : (
        <TaskListView
          tasks={filteredTasks}
          onTaskStatusChange={handleTaskStatusChange}
          onTaskEdit={handleTaskEdit}
          onTaskView={handleTaskView}
          isLoading={isLoading}
          searchTerm={searchTerm}
        />
      )}
    </div>
  );
};