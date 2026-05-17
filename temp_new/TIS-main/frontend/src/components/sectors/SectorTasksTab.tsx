import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Sector } from "@/services/sectors";
import { useSectorTasks } from "@/hooks/sectors/useSectorTasks";
import { SectorTaskCreateDialog } from "./SectorTaskCreateDialog";

interface SectorTasksTabProps {
  sector: Sector;
}

export const SectorTasksTab = ({ sector }: SectorTasksTabProps) => {
  const {
    showCreateTaskDialog,
    setShowCreateTaskDialog,
    newTask,
    setNewTask,
    tasksResponse,
    tasksLoading,
    taskStatsResponse,
    createTaskMutation,
    handleCreateTask,
  } = useSectorTasks(sector, 'tasks');

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Sektor Tapşırıqları</h3>
        <Button 
          size="sm" 
          onClick={() => setShowCreateTaskDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Yeni Tapşırıq
        </Button>
      </div>

      {/* Task Statistics */}
      {taskStatsResponse?.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{taskStatsResponse.data.total_tasks}</p>
                <p className="text-xs text-muted-foreground">Toplam</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">{taskStatsResponse.data.pending_tasks}</p>
                <p className="text-xs text-muted-foreground">Gözləyən</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{taskStatsResponse.data.in_progress_tasks}</p>
                <p className="text-xs text-muted-foreground">İcrada</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{taskStatsResponse.data.completed_tasks}</p>
                <p className="text-xs text-muted-foreground">Tamamlanmış</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-2">
        {tasksLoading ? (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Tapşırıqlar yüklənir...</p>
          </div>
        ) : tasksResponse?.data?.data?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Bu sektor üçün tapşırıq yoxdur</p>
          </div>
        ) : (
          tasksResponse?.data?.data?.map((task: any) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Kateqoriya: {task.category}</span>
                    <span>Prioritet: {task.priority}</span>
                    {task.deadline && (
                      <span>Son tarix: {format(new Date(task.deadline), 'dd.MM.yyyy')}</span>
                    )}
                  </div>
                </div>
                <Badge variant={
                  task.status === 'completed' ? 'default' :
                  task.status === 'in_progress' ? 'secondary' :
                  task.status === 'pending' ? 'outline' : 'destructive'
                }>
                  {task.status === 'completed' ? 'Tamamlandı' :
                   task.status === 'in_progress' ? 'İcrada' :
                   task.status === 'pending' ? 'Gözləyir' : task.status}
                </Badge>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Task Dialog */}
      <SectorTaskCreateDialog
        isOpen={showCreateTaskDialog}
        onClose={() => setShowCreateTaskDialog(false)}
        sectorName={sector.name}
        newTask={newTask}
        setNewTask={setNewTask}
        onSubmit={handleCreateTask}
        isCreating={createTaskMutation.isPending}
      />
    </div>
  );
};