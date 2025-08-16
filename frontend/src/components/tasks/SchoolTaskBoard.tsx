import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  CheckSquare, 
  Clock, 
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Eye,
  MessageSquare,
  Users,
  Tag,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { schoolAdminService, schoolAdminKeys, SchoolTask, SchoolTaskFilters } from '@/services/schoolAdmin';
import { Task } from '@/services/tasks';
import { formatDistanceToNow, format } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SchoolTaskBoardProps {
  className?: string;
}

export const SchoolTaskBoard: React.FC<SchoolTaskBoardProps> = ({ className }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SchoolTaskFilters>({
    page: 1,
    per_page: 50,
  });
  const [selectedTab, setSelectedTab] = useState('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Fetch school tasks
  const { 
    data: tasks, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: schoolAdminKeys.tasks(),
    queryFn: () => schoolAdminService.getSchoolTasks(filters),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Task status update mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status, notes }: { taskId: number; status: Task['status']; notes?: string }) =>
      schoolAdminService.updateTaskStatus(taskId, status, notes),
    onSuccess: () => {
      toast.success('Tapşırıq statusu yeniləndi');
      queryClient.invalidateQueries({ queryKey: schoolAdminKeys.tasks() });
    },
    onError: () => {
      toast.error('Status yenilənə bilmədi');
    },
  });

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'review':
        return <RefreshCw className="h-4 w-4 text-purple-600" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'review': return 'warning';
      case 'cancelled': return 'destructive';
      case 'pending':
      default: return 'secondary';
    }
  };

  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'in_progress': return 'İcradadır';
      case 'review': return 'Yoxlanılır';
      case 'cancelled': return 'Ləğv edildi';
      case 'pending': return 'Gözləyir';
      default: return 'Naməlum';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityText = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'Yüksək';
      case 'medium': return 'Orta';
      case 'low': return 'Aşağı';
      default: return 'Təyin edilməyib';
    }
  };

  const getDueDateStatus = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const now = new Date();
    const due = new Date(dueDate);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { status: 'overdue', text: `${Math.abs(daysLeft)} gün gecikib`, color: 'red' };
    if (daysLeft === 0) return { status: 'today', text: 'Bugün bitir', color: 'orange' };
    if (daysLeft <= 3) return { status: 'urgent', text: `${daysLeft} gün qalıb`, color: 'orange' };
    return { status: 'normal', text: `${daysLeft} gün qalıb`, color: 'gray' };
  };

  const handleTaskStatusChange = (task: SchoolTask, newStatus: Task['status']) => {
    updateTaskMutation.mutate({
      taskId: task.id,
      status: newStatus,
    });
  };

  const filteredTasks = tasks?.filter(task => {
    const matchesSearch = !searchTerm || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || task.status === selectedTab;
    
    return matchesSearch && matchesTab;
  }) || [];

  const taskStats = {
    total: tasks?.length || 0,
    pending: tasks?.filter(t => t.status === 'pending').length || 0,
    in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    completed: tasks?.filter(t => t.status === 'completed').length || 0,
    overdue: tasks?.filter(t => {
      const status = getDueDateStatus(t.due_date);
      return status?.status === 'overdue';
    }).length || 0,
  };

  const groupedTasks = {
    pending: filteredTasks.filter(t => t.status === 'pending'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    completed: filteredTasks.filter(t => t.status === 'completed'),
    on_hold: filteredTasks.filter(t => t.status === 'on_hold'),
  };

  const TaskCard: React.FC<{ task: SchoolTask }> = ({ task }) => {
    const dueDateStatus = getDueDateStatus(task.due_date);
    
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Task Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{task.title}</h4>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {task.description}
                  </p>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    Ətraflı bax
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Redaktə et
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {task.status !== 'completed' && (
                    <DropdownMenuItem onClick={() => handleTaskStatusChange(task, 'completed')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Tamamlandı olaraq işarələ
                    </DropdownMenuItem>
                  )}
                  {task.status === 'pending' && (
                    <DropdownMenuItem onClick={() => handleTaskStatusChange(task, 'in_progress')}>
                      <Play className="h-4 w-4 mr-2" />
                      Başla
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Task Metadata */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                {getPriorityText(task.priority)}
              </Badge>
              
              {task.category && (
                <Badge variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {task.category}
                </Badge>
              )}
            </div>

            {/* Progress */}
            {task.completion_rate !== undefined && task.completion_rate > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tamamlanma</span>
                  <span className="font-medium">{task.completion_rate}%</span>
                </div>
                <Progress value={task.completion_rate} className="h-2" />
              </div>
            )}

            {/* Due Date */}
            {dueDateStatus && (
              <div className={cn(
                "text-xs flex items-center gap-1",
                dueDateStatus.color === 'red' && "text-red-600",
                dueDateStatus.color === 'orange' && "text-orange-600",
                dueDateStatus.color === 'gray' && "text-gray-600"
              )}>
                <Clock className="h-3 w-3" />
                {dueDateStatus.text}
              </div>
            )}

            {/* Assignees */}
            {task.assigned_to_names && task.assigned_to_names.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{task.assigned_to_names.slice(0, 2).join(', ')}</span>
                {task.assigned_to_names.length > 2 && (
                  <span>+{task.assigned_to_names.length - 2}</span>
                )}
              </div>
            )}

            {/* Subtasks */}
            {task.subtasks_count && task.subtasks_count > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  <span>Alt tapşırıqlar</span>
                </div>
                <span>{task.completed_subtasks_count || 0}/{task.subtasks_count}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi</p>
                <p className="text-2xl font-bold">{taskStats.total}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gözləyən</p>
                <p className="text-2xl font-bold text-gray-600">{taskStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Davam edir</p>
                <p className="text-2xl font-bold text-blue-600">{taskStats.in_progress}</p>
              </div>
              <Play className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlandı</p>
                <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gecikmiş</p>
                <p className="text-2xl font-bold text-red-600">{taskStats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tapşırıq adı və ya açıqlama ilə axtarın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filters.status || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value as any }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün statuslar</SelectItem>
                  <SelectItem value="pending">Gözləyən</SelectItem>
                  <SelectItem value="in_progress">Davam edir</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="on_hold">Gözləyir</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.priority || 'all'} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, priority: value === 'all' ? undefined : value as any }))
              }>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Prioritet seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün prioritetlər</SelectItem>
                  <SelectItem value="high">Yüksək</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="low">Aşağı</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex rounded-md" role="group">
                <Button
                  variant={viewMode === 'board' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('board')}
                  className="rounded-r-none"
                >
                  Board
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  List
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task View */}
      {viewMode === 'board' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pending Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                Gözləyən
              </h3>
              <Badge variant="secondary">{groupedTasks.pending.length}</Badge>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                groupedTasks.pending.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Play className="h-4 w-4 text-blue-600" />
                Davam edir
              </h3>
              <Badge variant="primary">{groupedTasks.in_progress.length}</Badge>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                groupedTasks.in_progress.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>

          {/* On Hold Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Pause className="h-4 w-4 text-orange-600" />
                Gözləyir
              </h3>
              <Badge variant="warning">{groupedTasks.on_hold.length}</Badge>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                [...Array(2)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                groupedTasks.on_hold.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>

          {/* Completed Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Tamamlandı
              </h3>
              <Badge variant="success">{groupedTasks.completed.length}</Badge>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                [...Array(2)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                groupedTasks.completed.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="space-y-2 p-6">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border animate-pulse">
                    <div className="w-8 h-8 bg-muted rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                    <div className="w-20 h-6 bg-muted rounded" />
                  </div>
                ))
              ) : filteredTasks.length > 0 ? (
                filteredTasks.map(task => {
                  const dueDateStatus = getDueDateStatus(task.due_date);
                  return (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                          {getPriorityText(task.priority)}
                        </Badge>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          {task.assigned_by_name && (
                            <span>Təyin edən: {task.assigned_by_name}</span>
                          )}
                          {task.due_date && (
                            <span>Son tarix: {format(new Date(task.due_date), 'dd MMM', { locale: az })}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {dueDateStatus && (
                          <Badge 
                            variant={dueDateStatus.status === 'overdue' ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {dueDateStatus.text}
                          </Badge>
                        )}
                        <Badge variant={getStatusColor(task.status)}>
                          {getStatusText(task.status)}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Ətraflı bax
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Redaktə et
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <CheckSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Tapşırıq tapılmadı</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 
                      'Axtarış kriteriyasına uyğun tapşırıq tapılmadı' : 
                      'Hələ ki sizə təyin edilmiş tapşırıq yoxdur'
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};