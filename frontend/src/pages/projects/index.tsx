import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  LayoutGrid,
  Plus,
  ArrowLeft,
  Calendar as CalendarIcon,
  Target,
  Table as TableIcon,
  LayoutDashboard as KanbanIcon,
  BarChart3 as DashboardIcon,
  Briefcase,
  Activity,
  Loader2,
  RefreshCw,
  List,
  Edit,
  ListTodo,
  Archive,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Search,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/constants/roles';
import { projectService, Project, ProjectActivity, ProjectStats } from '@/services/projects';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectTable } from '@/components/projects/ProjectTable';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { ProjectActivityKanban } from '@/components/projects/ProjectActivityKanban';
import { ProjectActivityTable, ActivityGlobalFilters } from '@/components/projects/ProjectActivityTable';
import { ProjectActivityTimeline } from '@/components/projects/ProjectActivityTimeline';
import { ProjectDashboard } from '@/components/projects/ProjectDashboard';
import { ProjectOverallStats } from '@/components/projects/ProjectOverallStats';
import { ProjectMyActivities } from '@/components/projects/ProjectMyActivities';
import { ActivityForm } from '@/components/projects/ActivityForm';
import { ActivityComments } from '@/components/projects/ActivityComments';
import { ActivityHistory } from '@/components/projects/ActivityHistory';
import { ProjectUrgentActivities } from '@/components/projects/ProjectUrgentActivities';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectDetailsHeader } from '@/components/projects/ProjectDetailsHeader';
import { useAssignableUsers } from '@/hooks/tasks/useAssignableUsers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    // Handle cases where date string might have trailing microsecond zeros (e.g. 2024-04-05 12:00:00.000000)
    const cleanDateString = dateString.includes('.') 
      ? dateString.split('.')[0] 
      : dateString;
    
    const date = new Date(cleanDateString);
    if (isNaN(date.getTime())) return '-';
    
    return format(date, 'dd.MM.yyyy', { locale: az });
  } catch (e) {
    return '-';
  }
};

export default function Projects() {
  const { currentUser, hasRole } = useAuth();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'kanban' | 'table' | 'dashboard' | 'timeline' | 'stats'>('table');
  const [listLayout, setListLayout] = useState<'grid' | 'table'>('table');
  const [mainTab, setMainTab] = useState<'projects' | 'stats' | 'my_activities' | 'urgent'>('projects');
  const [highlightedActivityId, setHighlightedActivityId] = useState<number | null>(null);
  const [isStatsVisible, setIsStatsVisible] = useState(true);
  const [isStatsManuallyToggled, setIsStatsManuallyToggled] = useState(true);
  const [statsLayout, setStatsLayout] = useState<'compact' | 'grid'>(() => {
    return (localStorage.getItem('project_stats_layout') as 'compact' | 'grid') || 'compact';
  });
  
  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [archivingProject, setArchivingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isGlobalAdmin = hasRole([
    USER_ROLES.SUPERADMIN,
    USER_ROLES.REGIONADMIN
  ]);
  
  const canManageProjects = hasRole([
    USER_ROLES.SUPERADMIN,
    USER_ROLES.REGIONADMIN,
    USER_ROLES.SEKTORADMIN,
    USER_ROLES.SCHOOLADMIN
  ]);

  const isAdmin = canManageProjects; // Preserve legacy usage where appropriate
  
  const { users: availableUsers } = useAssignableUsers({
    perPage: 200,
    originScope: hasRole(USER_ROLES.SUPERADMIN) ? null : 
                 hasRole(USER_ROLES.REGIONADMIN) ? 'region' : 'sector',
    enabled: !!selectedProject,
  });

  
  const filteredActivities = useMemo(() => {
    if (!selectedProject?.activities) return [];
    const items = selectedProject.activities;
    
    if (activeFilter === 'mine') {
       return items.filter(a => 
         Number(a.user_id) === Number(currentUser?.id) || 
         a.assigned_employees?.some(e => Number(e.id) === Number(currentUser?.id))
       );
    }
    if (activeFilter === 'overdue') {
       return items.filter(a => a.status !== 'completed' && a.end_date && new Date(a.end_date) < new Date());
    }
    return items;
  }, [selectedProject?.activities, activeFilter, currentUser?.id]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    
    const query = searchQuery.toLowerCase();
    return projects.filter(project => 
      project.name?.toLowerCase().includes(query) || 
      project.description?.toLowerCase().includes(query) ||
      (project as any).employees?.some((e: any) => e.name?.toLowerCase().includes(query))
    );
  }, [projects, searchQuery]);

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await projectService.getProjects();
      // Archived projects always appear at the bottom
      const sorted = [...data].sort((a, b) => {
        if (a.status === 'archived' && b.status !== 'archived') return 1;
        if (a.status !== 'archived' && b.status === 'archived') return -1;
        return 0;
      });
      setProjects(sorted);
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Layihələri yükləmək mümkün olmadı.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchProjectDetails = useCallback(async (id: number) => {
    try {
      const [projectData, statsData] = await Promise.all([
        projectService.getProjectDetails(id),
        projectService.getStats(id)
      ]);
      setSelectedProject(projectData);
      setStats(statsData as ProjectStats);
    } catch (error: any) {
      const message = error.status === 403 
        ? "Bu layihəyə giriş icazəniz yoxdur." 
        : "Layihə detallarını yükləmək mümkün olmadı.";
        
      toast({
        title: 'Xəta',
        description: message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Statistics visibility logic
  useEffect(() => {
    if (selectedProject && !isStatsManuallyToggled) {
      setIsStatsVisible(true);
    }
  }, [selectedProject?.id, isStatsManuallyToggled]);

  // Save layout preference
  useEffect(() => {
    localStorage.setItem('project_stats_layout', statsLayout);
  }, [statsLayout]);

  const handleSaveProject = async (values: any) => {
    try {
      if (editingProject) {
        await projectService.updateProject(editingProject.id, values);
      } else {
        await projectService.createProject(values);
      }
      toast({
        title: 'Uğurlu',
        description: `Layihə uğurla ${editingProject ? 'yeniləndi' : 'yaradıldı'}.`,
      });
      setIsProjectModalOpen(false);
      setEditingProject(null);
      fetchProjects();
      if (selectedProject?.id === editingProject?.id) {
         fetchProjectDetails(selectedProject!.id);
      }
    } catch (error: any) {
      console.error('Project save error:', error);
      const errorMessage = error?.response?.data?.message || 'Əməliyyat zamanı xəta baş verdi.';
      toast({
        title: 'Xəta',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (activityId: number, newStatus: ProjectActivity['status']) => {
    if (!selectedProject) return;
    try {
      await projectService.updateActivity(activityId, { status: newStatus });
      fetchProjectDetails(selectedProject.id);
    } catch (error: any) {
       toast({
        title: 'Xəta',
        description: 'Status yenilənərkən xəta baş verdi.',
        variant: 'destructive',
      });
    }
  };

  const handleActivityClickFromMyActivities = async (activity: ProjectActivity) => {
    if (!activity.project_id) return;
    
    // Set main tab to projects and fetch details
    setMainTab('projects');
    await fetchProjectDetails(activity.project_id);
    
    // Switch view to table and set highlight
    setActiveView('table');
    setHighlightedActivityId(activity.id);
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedActivityId(null);
    }, 3000);
  };

  const handleDeleteActivity = async (activityId: number) => {
    try {
      await projectService.deleteActivity(activityId);
      if (selectedProject) {
        setSelectedProject({
          ...selectedProject,
          activities: selectedProject.activities?.filter(a => a.id !== activityId)
        });
      }
      toast({
        title: 'Uğurlu',
        description: 'Fəaliyyət silindi.',
      });
    } catch (error: any) {
      console.error('Activity delete error:', error);
      toast({
        title: 'Xəta',
        description: error?.response?.data?.message || 'Fəaliyyəti silmək mümkün olmadı.',
        variant: 'destructive',
      });
    }
  };

  const handleArchiveProject = async () => {
    if (!archivingProject) return;
    try {
      await projectService.archiveProject(archivingProject.id);
      toast({ title: 'Uğurlu', description: 'Layihə arxivləşdirildi.' });
      setArchivingProject(null);
      fetchProjects();
      if (selectedProject?.id === archivingProject.id) {
        setSelectedProject(null);
        setStats(null);
      }
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: error?.response?.data?.message || 'Arxivləşdirmə zamanı xəta baş verdi.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    try {
      await projectService.deleteProject(deletingProject.id);
      toast({ title: 'Uğurlu', description: 'Layihə tamamilə silindi.' });
      setDeletingProject(null);
      fetchProjects();
      if (selectedProject?.id === deletingProject.id) {
        setSelectedProject(null);
        setStats(null);
      }
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: error?.response?.data?.message || 'Silinmə zamanı xəta baş verdi.',
        variant: 'destructive',
      });
    }
  };

  const handleUnarchiveProject = async (project: Project) => {
    try {
      await projectService.unarchiveProject(project.id);
      toast({ title: 'Uğurlu', description: 'Layihə arxivdən çıxarıldı.' });
      fetchProjects();
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: error?.response?.data?.message || 'Əməliyyat zamanı xəta baş verdi.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading && !selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Layihələr yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-8 space-y-4">
      <AnimatePresence mode="wait">
        {!selectedProject ? (
          <motion.div
            key="project-list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <ProjectHeader
              listLayout={listLayout}
              setListLayout={setListLayout}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isLoading={isLoading}
              onRefresh={fetchProjects}
              isAdmin={isAdmin}
              onNewProject={() => setIsProjectModalOpen(true)}
              projectCount={projects.length}
            />

            <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="w-full">
              <TabsList className="mb-5 h-10 rounded-xl bg-muted/50 p-1 gap-0.5">
                <TabsTrigger value="projects" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Layihələr</span>
                  {projects.length > 0 && (
                    <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary tabular-nums">
                      {projects.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="my_activities" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>Fəaliyyətlərim</span>
                </TabsTrigger>
                <TabsTrigger value="urgent" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Təcili</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Statistika</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my_activities" className="mt-0 ring-offset-0 focus-visible:ring-0">
                <ProjectMyActivities onActivityClick={handleActivityClickFromMyActivities} />
              </TabsContent>

              <TabsContent value="projects" className="mt-0 ring-offset-0 focus-visible:ring-0">
                {listLayout === 'grid' ? (
                  <ProjectList
                    projects={filteredProjects}
                    onProjectClick={(p) => fetchProjectDetails(p.id)}
                    onEditClick={(p) => { setEditingProject(p); setIsProjectModalOpen(true); }}
                    onArchiveClick={(p) => setArchivingProject(p)}
                    onUnarchiveClick={handleUnarchiveProject}
                    onDeleteClick={(p) => setDeletingProject(p)}
                    onCreateClick={() => setIsProjectModalOpen(true)}
                    isAdmin={isAdmin}
                    currentUserId={currentUser?.id}
                  />
                ) : (
                  <ProjectTable
                    projects={filteredProjects}
                    onProjectClick={(p) => fetchProjectDetails(p.id)}
                    onEditClick={(p) => { setEditingProject(p); setIsProjectModalOpen(true); }}
                    onArchiveClick={(p) => setArchivingProject(p)}
                    onUnarchiveClick={handleUnarchiveProject}
                    onDeleteClick={(p) => setDeletingProject(p)}
                    isAdmin={isAdmin}
                    currentUserId={currentUser?.id}
                  />
                )}
              </TabsContent>

              <TabsContent value="stats" className="mt-0 ring-offset-0 focus-visible:ring-0">
                <ProjectOverallStats projects={projects} />
              </TabsContent>

              <TabsContent value="urgent" className="mt-0 ring-offset-0 focus-visible:ring-0">
                <ProjectUrgentActivities
                  onActivityClick={handleActivityClickFromMyActivities}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          <motion.div
            key="project-details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <ProjectDetailsHeader 
              project={selectedProject}
              onBack={() => { setSelectedProject(null); setStats(null); }}
              isStatsVisible={isStatsVisible}
              toggleStats={() => {
                setIsStatsVisible(!isStatsVisible);
                setIsStatsManuallyToggled(true);
              }}
              isAdmin={isAdmin}
              onEdit={() => { setEditingProject(selectedProject); setIsProjectModalOpen(true); }}
              formatDate={formatDate}
            />

            <AnimatePresence mode="wait">
              {stats && isStatsVisible && (
                <motion.div
                  key="stats-strip"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden mb-1"
                >
                  <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                    {/* Progress tile */}
                    <div className="min-w-[130px] flex-shrink-0 rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col gap-2">
                      <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider">İcra faizi</span>
                      <span className="text-3xl font-bold text-primary leading-none tabular-nums">
                        {stats.progress_percentage}%
                      </span>
                      <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.progress_percentage}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    {/* Status tiles */}
                    {[
                      { label: 'Cəmi', value: stats.total_activities, dot: 'bg-foreground/30', num: 'text-foreground', icon: ListTodo },
                      { label: 'Gözləyir', value: stats.status_breakdown?.pending ?? 0, dot: 'bg-muted-foreground', num: 'text-muted-foreground', icon: Clock },
                      { label: 'İcrada', value: stats.status_breakdown?.in_progress ?? 0, dot: 'bg-warning', num: 'text-warning', icon: RefreshCw },
                      { label: 'Yoxlamada', value: stats.status_breakdown?.checking ?? 0, dot: 'bg-primary', num: 'text-primary', icon: Target },
                      { label: 'Tamamlandı', value: stats.status_breakdown?.completed ?? 0, dot: 'bg-success', num: 'text-success', icon: CheckCircle2 },
                      { label: 'Problem', value: stats.status_breakdown?.stuck ?? 0, dot: 'bg-destructive', num: 'text-destructive', icon: AlertCircle },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="min-w-[100px] flex-shrink-0 rounded-xl border border-border/50 bg-card p-3.5 flex flex-col gap-1.5 hover:border-border transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className={cn('h-2 w-2 rounded-full shrink-0', item.dot)} />
                          <span className="text-[10px] text-muted-foreground font-medium leading-none">
                            {item.label}
                          </span>
                        </div>
                        <span className={cn('text-2xl font-bold leading-none tabular-nums', item.num)}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2 shadow-sm">
              {/* View mode segmented control */}
              <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
                {([
                  { value: 'table',     label: 'Cədvəl',   icon: TableIcon },
                  { value: 'timeline',  label: 'Zaman Oxu',icon: CalendarIcon },
                  { value: 'kanban',    label: 'Kanban',   icon: KanbanIcon },
                  { value: 'dashboard', label: 'Analitika',icon: DashboardIcon },
                ] as const).map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setActiveView(v.value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 h-8 text-xs font-medium transition-all',
                      activeView === v.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <v.icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                ))}
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-1.5">
                <ActivityGlobalFilters
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />
                <div className="h-4 w-px bg-border/60" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-xs font-medium hover:text-primary"
                  onClick={() => projectService.exportProject(selectedProject.id)}
                >
                  <Download className="w-3.5 h-3.5" /> Excel
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => fetchProjectDetails(selectedProject.id)}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
                </Button>
              </div>
            </div>

            {/* View Content */}
            <div className="pt-1">
              <AnimatePresence mode="wait">
                {activeView === 'kanban' && (
                  <motion.div
                    key="kanban"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ProjectActivityKanban 
                      activities={filteredActivities}
                      onStatusChange={handleStatusChange}
                      onActivityUpdated={(updatedActivity) => {
                        setSelectedProject({
                          ...selectedProject,
                          activities: (selectedProject.activities || []).map(a => 
                            a.id === updatedActivity.id ? updatedActivity : a
                          )
                        });
                      }}
                      onDeleteActivity={handleDeleteActivity}
                      isLoading={isLoading}
                      canEdit={true}
                    />
                  </motion.div>
                )}

                {activeView === 'table' && (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ProjectActivityTable 
                      projectId={selectedProject.id}
                      activities={filteredActivities}
                      onStatusChange={handleStatusChange}
                      onEditActivity={(activity) => {
                         // We can implement an edit modal here later, 
                         // but for now we pass it to satisfy props
                      }}
                      onDeleteActivity={handleDeleteActivity}
                      availableUsers={availableUsers}
                      onRefresh={() => fetchProjectDetails(selectedProject.id)}
                      canEdit={selectedProject.can_edit_all || false}
                      highlightedActivityId={highlightedActivityId || undefined}
                      isLoading={isLoading}
                    />
                  </motion.div>
                )}

                {activeView === 'timeline' && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ProjectActivityTimeline 
                      activities={filteredActivities}
                    />
                  </motion.div>
                )}

                {activeView === 'dashboard' && stats && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ProjectDashboard stats={stats} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive Confirmation */}
      <AlertDialog open={!!archivingProject} onOpenChange={(open) => { if (!open) setArchivingProject(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-purple-600" />
              Layihəni arxivləşdir?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">"{archivingProject?.name}"</span> layihəsi arxivə köçürüləcək. Arxivdəki layihələr siyahıda görünmir, lakin silinmir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Xeyr</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveProject}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Arxivləşdir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProject} onOpenChange={(open) => { if (!open) setDeletingProject(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Layihəni sil?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">"{deletingProject?.name}"</span> layihəsi və ona aid olan bütün fəaliyyətlər, şərhlər və fayllar <span className="font-bold text-rose-600 underline">geri qaytarılmamaq şərtilə</span> silinəcək.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Xeyr, ləğv et</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Bəli, tamamilə sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Side Panel (Redesigned) */}
      <Sheet open={isProjectModalOpen} onOpenChange={(open) => { setIsProjectModalOpen(open); if(!open) setEditingProject(null); }}>
        <SheetContent className="sm:max-w-[750px] w-full p-0 flex flex-col shadow-2xl">
          <div className="px-8 py-6 border-b">
            <SheetHeader>
              <SheetTitle className="text-2xl font-bold">
                {editingProject ? 'Layihəni Redaktə Et' : 'Yeni Layihə Strategiyası'}
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground mt-1">
                {editingProject 
                  ? 'Layihənin cari vəziyyətini, komanda tərkibi və hədəflərini buradan yeniləyin.' 
                  : 'Yeni bir strateji hədəf təyin edərək komandanı işə cəlb edin.'}
              </SheetDescription>
            </SheetHeader>
          </div>
          
          <div className="flex-1 overflow-hidden p-8">
            <ProjectForm 
              initialData={editingProject || undefined}
              onSubmit={handleSaveProject} 
              onCancel={() => { setIsProjectModalOpen(false); setEditingProject(null); }}
              isLoading={isLoading}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

