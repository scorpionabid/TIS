import { useQuery } from '@tanstack/react-query';
import { sectorsService, Sector } from '@/services/sectors';

interface UseSectorTasksProps {
  sector: Sector | null;
  activeTab: string;
}

export function useSectorTasks({ sector, activeTab }: UseSectorTasksProps) {
  // Load sector tasks when a sector is selected
  const tasksQuery = useQuery({
    queryKey: ['sector-tasks', sector?.id],
    queryFn: () => sector ? sectorsService.getSectorTasks(sector.id, { per_page: 10 }) : null,
    enabled: !!sector && activeTab === 'tasks',
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load sector task statistics
  const taskStatsQuery = useQuery({
    queryKey: ['sector-task-statistics', sector?.id],
    queryFn: () => sector ? sectorsService.getSectorTaskStatistics(sector.id) : null,
    enabled: !!sector && activeTab === 'tasks',
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    tasks: tasksQuery.data,
    isTasksLoading: tasksQuery.isLoading,
    taskStatistics: taskStatsQuery.data,
    isTaskStatsLoading: taskStatsQuery.isLoading,
  };
}