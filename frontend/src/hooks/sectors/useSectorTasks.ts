import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sectorsService, SectorTaskCreateData, Sector } from '@/services/sectors';
import { useToast } from '@/hooks/use-toast';

export const useSectorTasks = (selectedSector: Sector | null, activeTab: string) => {
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState<SectorTaskCreateData>({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    target_scope: 'sector',
    requires_approval: false
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load sector tasks when a sector is selected
  const { data: tasksResponse, isLoading: tasksLoading } = useQuery({
    queryKey: ['sector-tasks', selectedSector?.id],
    queryFn: () => selectedSector ? sectorsService.getSectorTasks(selectedSector.id, { per_page: 10 }) : null,
    enabled: !!selectedSector && activeTab === 'tasks',
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load sector task statistics
  const { data: taskStatsResponse } = useQuery({
    queryKey: ['sector-task-statistics', selectedSector?.id],
    queryFn: () => selectedSector ? sectorsService.getSectorTaskStatistics(selectedSector.id) : null,
    enabled: !!selectedSector && activeTab === 'tasks',
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { sectorId: number; task: SectorTaskCreateData }) => 
      sectorsService.createSectorTask(data.sectorId, data.task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sector-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sector-task-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] }); // To update pending tasks count
      setShowCreateTaskDialog(false);
      setNewTask({
        title: '',
        description: '',
        category: 'other',
        priority: 'medium',
        target_scope: 'sector',
        requires_approval: false
      });
      toast({
        title: "Uğurlu",
        description: "Tapşırıq uğurla yaradıldı.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Tapşırıq yaradılarkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const handleCreateTask = () => {
    if (!selectedSector || !newTask.title.trim()) {
      toast({
        title: "Xəta",
        description: "Tapşırıq başlığı məcburidir.",
        variant: "destructive",
      });
      return;
    }
    createTaskMutation.mutate({ sectorId: selectedSector.id, task: newTask });
  };

  return {
    // State
    showCreateTaskDialog,
    setShowCreateTaskDialog,
    newTask,
    setNewTask,
    
    // Data
    tasksResponse,
    tasksLoading,
    taskStatsResponse,
    
    // Mutations
    createTaskMutation,
    
    // Actions
    handleCreateTask,
  };
};
