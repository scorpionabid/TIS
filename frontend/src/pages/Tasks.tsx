import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, Edit, Trash2, Eye, Clock, CheckCircle, AlertTriangle, Calendar, 
  User, Building, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, 
  PlayCircle, PauseCircle, Users, FileText, Wrench, PartyPopper, 
  Shield, BookOpen, MoreHorizontal 
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Task, CreateTaskData, TaskFilters, UpdateTaskData, taskService } from "@/services/tasks";
import { TaskModalStandardized } from "@/components/modals/TaskModalStandardized";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  categoryLabels,
  priorityLabels,
  statusLabels,
} from "@/components/tasks/config/taskFormFields";

type SortField = 'title' | 'category' | 'priority' | 'status' | 'deadline' | 'assignee';
type SortDirection = 'asc' | 'desc';

const categoryIcons: Record<string, React.ElementType> = {
  report: FileText,
  maintenance: Wrench,
  event: PartyPopper,
  audit: Shield,
  instruction: BookOpen,
  other: MoreHorizontal,
};

export default function Tasks() {
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check access permissions
  const hasAccess = currentUser ? ['superadmin', 'regionadmin', 'sektoradmin'].includes(currentUser.role) : false;

  const canSeeRegionTab = currentUser ? ['superadmin', 'regionadmin'].includes(currentUser.role) : false;
  const canSeeSectorTab = currentUser ? ['superadmin', 'regionadmin', 'sektoradmin'].includes(currentUser.role) : false;

  const availableTabs = useMemo(
    () =>
      ([
        canSeeRegionTab && { value: 'region' as const, label: 'Regional Tapşırıqlar' },
        canSeeSectorTab && { value: 'sector' as const, label: 'Sektor Tapşırıqları' },
      ].filter(Boolean) as Array<{ value: 'region' | 'sector'; label: string }>),
    [canSeeRegionTab, canSeeSectorTab]
  );

  const [activeTab, setActiveTab] = useState<'region' | 'sector'>('region');

  useEffect(() => {
    if (availableTabs.length === 0) {
      return;
    }

    setActiveTab((prev) => {
      if (availableTabs.some((tab) => tab.value === prev)) {
        return prev;
      }
      return availableTabs[0]?.value ?? 'region';
    });
  }, [availableTabs]);

  const regionTasksQuery = useQuery({
    queryKey: ['tasks', 'region', currentUser?.institution?.id],
    queryFn: () => taskService.getAll({ origin_scope: 'region' }),
    enabled: hasAccess && canSeeRegionTab,
  });

  const sectorTasksQuery = useQuery({
    queryKey: ['tasks', 'sector', currentUser?.institution?.id],
    queryFn: () => taskService.getAll({ origin_scope: 'sector' }),
    enabled: hasAccess && canSeeSectorTab,
  });

  const activeTasksQuery = activeTab === 'region' ? regionTasksQuery : sectorTasksQuery;

  const tasksResponse = activeTasksQuery.data;
  const isLoading = activeTasksQuery.isLoading || activeTasksQuery.isFetching;
  const error = activeTasksQuery.error as Error | null | undefined;

  const rawTasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : [];

  const canCreateRegionTask = currentUser ? ['superadmin', 'regionadmin'].includes(currentUser.role) : false;
  const canCreateSectorTask = currentUser ? ['superadmin', 'sektoradmin'].includes(currentUser.role) : false;
  const showCreateButton =
    (activeTab === 'region' && canCreateRegionTask) || (activeTab === 'sector' && canCreateSectorTask);

  const canManageSectorTasks = currentUser ? ['superadmin', 'regionadmin', 'sektoradmin'].includes(currentUser.role) : false;
  const canManageRegionTasks = canCreateRegionTask;
  const currentTabLabel = availableTabs.find((tab) => tab.value === activeTab)?.label ?? '';

  // Filtering and Sorting logic - MOVED BEFORE SECURITY CHECK
  const stats = useMemo(() => {
    const source = Array.isArray(rawTasks) ? rawTasks : [];

    const total = source.length;
    const pending = source.filter(task => task.status === 'pending').length;
    const inProgress = source.filter(task => task.status === 'in_progress').length;
    const completed = source.filter(task => task.status === 'completed').length;
    const overdue = source.filter(task => {
      if (!task.deadline) return false;
      const deadlineDate = new Date(task.deadline);
      return deadlineDate < new Date() && task.status !== 'completed';
    }).length;

    return {
      total,
      pending,
      in_progress: inProgress,
      completed,
      overdue,
    };
  }, [rawTasks]);

  const tasks = useMemo(() => {
    // If not authorized, return empty array
    if (!hasAccess) return [];
    let filtered = [...rawTasks];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task.assignee?.name && task.assignee.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
}


    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    // Sort the filtered results
    const sorted = filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'category':
          aValue = categoryLabels[a.category].toLowerCase();
          bValue = categoryLabels[b.category].toLowerCase();
          break;
        case 'priority': {
          const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        }
        case 'status': {
          const statusOrder = { pending: 1, in_progress: 2, review: 3, completed: 4, cancelled: 5 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;
        }
        case 'deadline':
          aValue = a.deadline ? new Date(a.deadline).getTime() : 0;
          bValue = b.deadline ? new Date(b.deadline).getTime() : 0;
          break;
        case 'assignee':
          aValue = (a.assignee?.name || '').toLowerCase();
          bValue = (b.assignee?.name || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rawTasks, sortField, sortDirection, searchTerm, statusFilter, priorityFilter, categoryFilter, hasAccess]);

  // Security check - only administrative roles can access task management
  if (!hasAccess || availableTabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız idarəçi rolları daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const getTaskOrigin = (task: Task): 'region' | 'sector' | null => {
    if (task.origin_scope) {
      return task.origin_scope;
    }

    if (task.target_scope === 'regional') {
      return 'region';
    }

    if (task.target_scope === 'sector') {
      return 'sector';
    }

    return null;
  };

  const canEditTaskItem = (task: Task): boolean => {
    if (currentUser?.role === 'superadmin') {
      return true;
    }

    if (task.created_by === currentUser?.id) {
      return true;
    }

    const origin = getTaskOrigin(task);
    if (origin === 'region') {
      return canManageRegionTasks;
    }

    if (origin === 'sector') {
      return canManageSectorTasks;
    }

    return false;
  };

  const canDeleteTaskItem = (task: Task): boolean => {
    if (currentUser?.role === 'superadmin') {
      return true;
    }

    return task.created_by === currentUser?.id;
  };

  const handleOpenModal = (task?: Task) => {
    if (!task && !showCreateButton) {
      toast({
        title: "İcazə yoxdur",
        description: "Bu tabda yeni tapşırıq yaratmaq səlahiyyətiniz yoxdur.",
        variant: "destructive",
      });
      return;
    }

    setSelectedTask(task || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const normalizeCreatePayload = (data: CreateTaskData): CreateTaskData => {
    const assignedUserIds = Array.isArray(data.assigned_user_ids)
      ? data.assigned_user_ids.map((value: number | string) => Number(value)).filter((value) => !Number.isNaN(value))
      : [];

    const assignedInstitutionId = data.assigned_institution_id != null
      ? Number(data.assigned_institution_id)
      : null;

    const targetInstitutionIdFromSelection = Array.isArray(data.target_institutions) && data.target_institutions.length > 0
      ? Number(data.target_institutions[0])
      : null;

    const resolvedOriginScope = data.origin_scope ?? (activeTab === 'region' ? 'region' : 'sector');
    const resolvedTargetScope = resolvedOriginScope === 'region' ? 'regional' : 'sector';

    return {
      ...data,
      assigned_to: assignedUserIds.length > 0
        ? assignedUserIds[0]
        : (data.assigned_to != null ? Number(data.assigned_to) : null),
      assigned_institution_id: assignedInstitutionId,
      target_institution_id: targetInstitutionIdFromSelection ?? assignedInstitutionId,
      target_institutions: Array.isArray(data.target_institutions)
        ? data.target_institutions.map((value: number | string) => Number(value)).filter((value) => !Number.isNaN(value))
        : [],
      target_departments: Array.isArray(data.target_departments)
        ? data.target_departments.map((value: number | string) => Number(value)).filter((value) => !Number.isNaN(value))
        : [],
      target_roles: [],
      assignment_notes: data.assignment_notes ?? undefined,
      assigned_user_ids: assignedUserIds,
      requires_approval: Boolean(data.requires_approval),
      origin_scope: resolvedOriginScope,
      target_scope: resolvedTargetScope,
    };
  };

  const handleSave = async (formData: CreateTaskData) => {
    const payload = normalizeCreatePayload(formData);
    const isUpdate = Boolean(selectedTask);

    console.log("[Tasks] Save əməliyyatı başladı", {
      mode: isUpdate ? "update" : "create",
      payload,
    });

    try {
      if (isUpdate && selectedTask) {
        const updatePayload: UpdateTaskData = {
          title: payload.title,
          description: payload.description,
          category: payload.category,
          priority: payload.priority,
          deadline: payload.deadline,
          notes: payload.notes,
        };

        console.log("[Tasks] Update sorğusu göndərilir", {
          taskId: selectedTask.id,
          updatePayload,
        });

        await taskService.update(selectedTask.id, updatePayload);
        toast({
          title: "Tapşırıq yeniləndi",
          description: "Tapşırıq məlumatları uğurla yeniləndi.",
        });
      } else {
        console.log("[Tasks] Create sorğusu göndərilir", payload);
        await taskService.create(payload);
        toast({
          title: "Tapşırıq əlavə edildi",
          description: "Yeni tapşırıq uğurla yaradıldı.",
        });
      }
      
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      handleCloseModal();
    } catch (error) {
      console.error("[Tasks] Save əməliyyatı alınmadı", error);
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Əməliyyat zamanı problem yarandı.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (task: Task, deleteType: 'soft' | 'hard') => {
    console.log("[Tasks] Silmə əməliyyatı başladı", {
      taskId: task.id,
      deleteType,
    });

    try {
      await taskService.delete(task.id);
      
      toast({
        title: "Tapşırıq silindi",
        description: deleteType === 'hard'
          ? "Tapşırıq sistemdən tam silindi."
          : "Tapşırıq uğurla silindi.",
      });
      
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });

      console.log("[Tasks] Silmə əməliyyatı tamamlandı", { taskId: task.id });
    } catch (error) {
      console.error("[Tasks] Silmə əməliyyatında xəta", error);
      toast({
        title: "Silinə bilmədi",
        description: error instanceof Error ? error.message : "Tapşırıq silinərkən xəta baş verdi.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setTaskToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      in_progress: 'default',
      review: 'outline',
      completed: 'success',
      cancelled: 'destructive'
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: 'outline',
      medium: 'secondary', 
      high: 'default',
      urgent: 'destructive'
    };
    
    return (
      <Badge variant={variants[priority] || 'secondary'}>
        {priorityLabels[priority] || priority}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category] || MoreHorizontal;
    return <IconComponent className="h-4 w-4" />;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tapşırıq İdarəetməsi</h1>
            <p className="text-muted-foreground">
              {currentTabLabel
                ? `${currentTabLabel} üçün tapşırıqların görülməsi və idarəsi`
                : 'Sistem genelində bütün tapşırıqların görülməsi və idarəsi'}
            </p>
          </div>
        </div>
        
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'region' | 'sector')}
          className="mt-2"
        >
          <TabsList className="w-full sm:w-auto">
            {availableTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="capitalize">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tapşırıq</TableHead>
                <TableHead>Kateqoriya</TableHead>
                <TableHead>Məsul</TableHead>
                <TableHead>Prioritet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Son tarix</TableHead>
                <TableHead className="text-right">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1,2,3,4,5].map((i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-16 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">
          Tapşırıqlar yüklənərkən problem yarandı{error instanceof Error && error.message ? `: ${error.message}` : '.'}
        </p>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tapşırıq İdarəetməsi</h1>
          <p className="text-muted-foreground">
            {currentTabLabel
              ? `${currentTabLabel} üçün tapşırıqların görülməsi və idarəsi`
              : 'Sistem genelində bütün tapşırıqların görülməsi və idarəsi'}
          </p>
        </div>
        {showCreateButton && (
          <Button className="flex items-center gap-2" onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4" />
            Yeni Tapşırıq
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'region' | 'sector')}
        className="mt-2"
      >
        <TabsList className="w-full sm:w-auto">
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="capitalize">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv tapşırıqlar</p>
                <p className="text-2xl font-bold">{stats.in_progress}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanmış</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gecikmiş</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tapşırıq axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Prioritet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün prioritetlər</SelectItem>
              {Object.entries(priorityLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Kateqoriya" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {tasks.length} tapşırıq
          </span>
          {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all') && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-1" />
              Filterləri təmizlə
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('title')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Tapşırıq
                  {getSortIcon('title')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('category')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Kateqoriya
                  {getSortIcon('category')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('assignee')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Məsul
                  {getSortIcon('assignee')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('priority')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Prioritet
                  {getSortIcon('priority')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('status')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Status
                  {getSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('deadline')}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Son tarix
                  {getSortIcon('deadline')}
                </Button>
              </TableHead>
              <TableHead>İrəliləyiş</TableHead>
              <TableHead className="text-right w-[120px]">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">Heç bir tapşırıq tapılmadı.</p>
                    {showCreateButton && (
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal()}>
                        <Plus className="h-4 w-4 mr-2" />
                        İlk tapşırığı yarat
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="max-w-[300px]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        {getCategoryIcon(task.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        {task.origin_scope_label && (
                          <Badge variant="outline" className="mb-1">
                            {task.origin_scope_label}
                          </Badge>
                        )}
                        <div className="font-medium truncate" title={task.title}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground mt-1 overflow-hidden" title={task.description} style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}>
                            {task.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(task.category)}
                      <span className="text-sm">{categoryLabels[task.category]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.assignee && task.assignee.name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs">
                          {task.assignee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{task.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(task.priority)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(task.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(task.deadline)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all" 
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{task.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Əməliyyatları aç</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Əməliyyatlar</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenModal(task)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ətraflı bax
                        </DropdownMenuItem>
                        {canEditTaskItem(task) && (
                          <DropdownMenuItem onClick={() => handleOpenModal(task)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Redaktə et
                          </DropdownMenuItem>
                        )}
                        {canDeleteTaskItem(task) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(task)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Sil
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Task Modal */}
      <TaskModalStandardized
        open={isModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        onSave={handleSave}
        originScope={activeTab}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        item={taskToDelete}
        onConfirm={handleDeleteConfirm}
        itemType="tapşırıq"
      />
    </div>
  );
}
