import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { User, Mail, Phone, AlertTriangle, Loader2 } from 'lucide-react';
import { Sector } from '@/services/sectors';
import { format } from 'date-fns';
import { SectorTaskManager } from './SectorTaskManager';

interface SectorDetailsProps {
  sector: Sector | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  getSectorTypeIcon: (type: string) => React.ReactNode;
  getSectorTypeLabel: (type: string) => string;
  tasks: any;
  isTasksLoading: boolean;
  taskStatistics: any;
  onCreateTask: () => void;
}

export function SectorDetails({
  sector,
  open,
  onOpenChange,
  activeTab,
  setActiveTab,
  getSectorTypeIcon,
  getSectorTypeLabel,
  tasks,
  isTasksLoading,
  taskStatistics,
  onCreateTask,
}: SectorDetailsProps) {
  if (!sector) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getSectorTypeIcon(sector.type)}
            {sector.name}
          </DialogTitle>
          <DialogDescription>
            {sector.region_name} - {getSectorTypeLabel(sector.type)}
          </DialogDescription>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="flex space-x-1 border-b">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'details'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ətraflı məlumat
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'tasks'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tapşırıqlar ({sector.statistics.pending_tasks})
          </button>
        </div>
        
        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="space-y-6 mt-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Əsas Məlumatlar</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kod:</span>
                    <span className="font-medium">{sector.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={sector.is_active ? 'default' : 'secondary'}>
                      {sector.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
                    </Badge>
                  </div>
                  {sector.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefon:</span>
                      <span className="font-medium">{sector.phone}</span>
                    </div>
                  )}
                  {sector.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{sector.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Statistikalar</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Müəssisələr:</span>
                    <span className="font-medium">{sector.statistics.total_institutions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Şagirdlər:</span>
                    <span className="font-medium">{sector.statistics.total_students.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Müəllimlər:</span>
                    <span className="font-medium">{sector.statistics.total_teachers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Heyət:</span>
                    <span className="font-medium">{sector.statistics.total_staff}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Performans Göstəriciləri</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cavab Nisbəti</span>
                    <span className="text-sm font-medium">{sector.performance_metrics.response_rate}%</span>
                  </div>
                  <Progress value={sector.performance_metrics.response_rate} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tapşırıq Tamamlanması</span>
                    <span className="text-sm font-medium">{sector.performance_metrics.task_completion_rate}%</span>
                  </div>
                  <Progress value={sector.performance_metrics.task_completion_rate} className="h-2" />
                </div>
              </div>
            </div>

            {/* Institution Breakdown */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Müəssisə Növləri</h4>
              <div className="space-y-2">
                {(sector.institutions_breakdown ?? []).map((breakdown, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{breakdown.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{breakdown.count} ({breakdown.percentage}%)</span>
                      <div className="w-16 bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${breakdown.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manager Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Menecer Məlumatları</h4>
              {sector.manager ? (
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">
                      {(sector.manager.first_name && sector.manager.last_name) 
                        ? `${sector.manager.first_name} ${sector.manager.last_name}`
                        : sector.manager.username || sector.manager.email?.split('@')[0] || 'Admin'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span>{sector.manager.email}</span>
                    </div>
                    {sector.manager.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{sector.manager.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 border border-amber-200 rounded-lg bg-amber-50 text-amber-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Bu sektor üçün menecer təyin edilməyib</span>
                  </div>
                </div>
              )}
            </div>

            {sector.description && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Təsvir</h4>
                <p className="text-sm text-muted-foreground">{sector.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <SectorTaskManager
            sector={sector}
            tasks={tasks}
            isTasksLoading={isTasksLoading}
            taskStatistics={taskStatistics}
            onCreateTask={onCreateTask}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
