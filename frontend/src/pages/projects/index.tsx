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
  Download
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
import { ProjectActivityTable } from '@/components/projects/ProjectActivityTable';
import { ProjectActivityTimeline } from '@/components/projects/ProjectActivityTimeline';
import { ProjectDashboard } from '@/components/projects/ProjectDashboard';
import { ProjectOverallStats } from '@/components/projects/ProjectOverallStats';
import { ProjectMyActivities } from '@/components/projects/ProjectMyActivities';
import { ActivityForm } from '@/components/projects/ActivityForm';
import { ActivityComments } from '@/components/projects/ActivityComments';
import { ActivityHistory } from '@/components/projects/ActivityHistory';
import { ProjectUrgentActivities } from '@/components/projects/ProjectUrgentActivities';
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'overdue'>('all');

  const isAdmin = hasRole([
    USER_ROLES.SUPERADMIN,
    USER_ROLES.REGIONADMIN,
    USER_ROLES.SEKTORADMIN
  ]);
  
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
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <AnimatePresence mode="wait">
        {!selectedProject ? (
          <motion.div
            key="project-list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Layihələrin İdarə Olunması
                </h1>
                <p className="text-muted-foreground">
                  Strateji hədəflər, resursların idarə olunması və mərkəzi hesabatlılıq sistemi.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted p-1 rounded-md border mr-1">
                  <Button 
                    variant={listLayout === 'table' ? 'secondary' : 'ghost'} 
                    size="icon" 
                    onClick={() => setListLayout('table')}
                    className="h-8 w-8"
                    title="Cədvəl Görünüşü"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant={listLayout === 'grid' ? 'secondary' : 'ghost'} 
                    size="icon" 
                    onClick={() => setListLayout('grid')}
                    className="h-8 w-8"
                    title="Kart Görünüşü"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" size="icon" onClick={fetchProjects} disabled={isLoading} className="h-9 w-9">
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </Button>
                {isAdmin && (
                  <Button onClick={() => setIsProjectModalOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Yeni Layihə
                  </Button>
                )}
              </div>
            </div>

            <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="projects" className="gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>Layihələr</span>
                </TabsTrigger>
                <TabsTrigger value="my_activities" className="gap-2">
                  <ListTodo className="w-4 h-4" />
                  <span>Fəaliyyətlərim</span>
                </TabsTrigger>
                <TabsTrigger value="urgent" className="gap-2 relative">
                  <AlertCircle className="w-4 h-4" />
                  <span>Təcili</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Ümumi Statistika</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my_activities" className="mt-0 ring-offset-0 focus-visible:ring-0">
                <ProjectMyActivities onActivityClick={handleActivityClickFromMyActivities} />
              </TabsContent>

              <TabsContent value="projects" className="mt-0 ring-offset-0 focus-visible:ring-0">
                {listLayout === 'grid' ? (
                  <ProjectList
                    projects={projects}
                    onProjectClick={(p) => fetchProjectDetails(p.id)}
                    onEditClick={(p) => { setEditingProject(p); setIsProjectModalOpen(true); }}
                    onArchiveClick={(p) => setArchivingProject(p)}
                    onUnarchiveClick={handleUnarchiveProject}
                    onCreateClick={() => setIsProjectModalOpen(true)}
                    isAdmin={isAdmin}
                    currentUserId={currentUser?.id}
                  />
                ) : (
                  <ProjectTable
                    projects={projects}
                    onProjectClick={(p) => fetchProjectDetails(p.id)}
                    onEditClick={(p) => { setEditingProject(p); setIsProjectModalOpen(true); }}
                    onArchiveClick={(p) => setArchivingProject(p)}
                    onUnarchiveClick={handleUnarchiveProject}
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
            {/* Header Detail */}
            {(() => {
              const statusLabels: Record<string, string> = {
                active: 'Aktiv',
                completed: 'Tamamlanıb',
                on_hold: 'Gözləmədə',
                cancelled: 'Ləğv edilib',
                archived: 'Arxivdə',
              };
              const statusVariants: Record<string, string> = {
                active: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
                completed: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
                on_hold: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
                cancelled: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
                archived: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
              };
              return (
                <div className="flex items-center justify-between gap-6 border-b pb-1.5 mb-2">
                  {/* Left: Back Button */}
                  <div className="flex items-center shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedProject(null); setStats(null); }}
                      className="h-9 gap-2 text-muted-foreground hover:text-primary px-0 group/back transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 transition-transform group-hover/back:-translate-x-1" />
                      <span className="text-[11px] font-black uppercase tracking-widest">LAYİHƏLƏRƏ QAYIT</span>
                    </Button>
                  </div>

                  {/* Center-Left: Duration */}
                  <div className="flex items-center gap-2 px-4 border-l border-r border-border/40 shrink-0">
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                    <div className="flex flex-col">
                      <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter opacity-70 leading-none">Layihe muddəti</span>
                      <span className="text-[11px] font-black whitespace-nowrap leading-tight">
                        {formatDate(selectedProject.start_date)} — {formatDate(selectedProject.end_date)}
                      </span>
                    </div>
                  </div>

                  {/* Center: Title */}
                  <div className="flex flex-col items-center justify-center min-w-0 max-w-[400px] overflow-hidden">
                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">Layihe adı</span>
                    <div className="flex items-center gap-2">
                      <h1 className="text-sm font-black text-foreground truncate uppercase tracking-tight">{selectedProject.name}</h1>
                      <Badge variant="outline" className={cn("text-[8px] h-4.5 px-1.5 font-black uppercase shrink-0 border-current/20", statusVariants[selectedProject.status] || statusVariants.active)}>
                        {statusLabels[selectedProject.status] || selectedProject.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Center-Right: Responsible Person */}
                  <div className="flex items-center gap-2 px-4 border-l border-r border-border/40 shrink-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                       <Briefcase className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter opacity-70 leading-none">Layihə icraçısı</span>
                      <span className="text-[11px] font-black whitespace-nowrap leading-tight">
                        {selectedProject.employees && selectedProject.employees.length > 0 
                          ? selectedProject.employees.map(e => e.name).join(', ') 
                          : 'Təyin edilməyib'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsStatsVisible(!isStatsVisible);
                        setIsStatsManuallyToggled(true);
                      }}
                      className={cn(
                        "h-8 gap-2 rounded-lg px-3 transition-all",
                        isStatsVisible ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <DashboardIcon className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-wider">{isStatsVisible ? 'GİZLƏ' : 'STATİSTİKA'}</span>
                    </Button>

                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingProject(selectedProject); setIsProjectModalOpen(true); }}
                        className="h-8 gap-2 rounded-lg px-3 border-border/60 hover:border-primary hover:text-primary transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-wider">REDAKTƏ</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}

            <AnimatePresence mode="wait">
              {stats && isStatsVisible && (
                <motion.div
                  key={statsLayout}
                  initial={{ height: 0, opacity: 0, y: -20 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="relative group/stats-container mb-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {/* Progress Card */}
                    <Card className="border-primary/10 bg-primary/[0.03] shadow-md relative overflow-hidden group/card transition-all hover:border-primary/30 border-2">
                      <CardContent className="p-4 flex flex-col items-center text-center gap-1.5 h-full justify-center">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-80">İCRA FAİZİ</span>
                        <div className="relative w-full h-1.5 bg-primary/10 rounded-full mt-1 mb-2">
                           <motion.div 
                              className="absolute left-0 top-0 h-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                              initial={{ width: 0 }} 
                              animate={{ width: `${stats.progress_percentage}%` }}
                              transition={{ duration: 1 }}
                           />
                        </div>
                        <span className="text-4xl font-black text-primary leading-none tracking-tighter">{stats.progress_percentage}%</span>
                      </CardContent>
                    </Card>

                    {[
                      { label: 'CƏMİ', value: stats.total_activities, color: 'text-foreground', icon: ListTodo, bgColor: 'bg-slate-500/5' },
                      { label: 'GÖZLƏYİR', value: stats.status_breakdown?.pending || 0, color: 'text-slate-400', icon: Clock, bgColor: 'bg-slate-400/5' },
                      { label: 'İCRADA', value: stats.status_breakdown?.in_progress || 0, color: 'text-amber-500', icon: RefreshCw, bgColor: 'bg-amber-500/5' },
                      { label: 'YOXLAMADA', value: stats.status_breakdown?.checking || 0, color: 'text-indigo-500', icon: Target, bgColor: 'bg-indigo-500/5' },
                      { label: 'SONA ÇATDI', value: stats.status_breakdown?.completed || 0, color: 'text-emerald-500', icon: CheckCircle2, bgColor: 'bg-emerald-500/5' },
                      { label: 'PROBLEM', value: stats.status_breakdown?.stuck || 0, color: 'text-rose-500', icon: AlertCircle, bgColor: 'bg-rose-500/5' },
                    ].map((item, idx) => (
                      <Card key={idx} className="border-border/60 shadow-md transition-all hover:shadow-lg hover:border-primary/20 group/statcard">
                        <CardContent className="p-4 flex flex-col items-center justify-between gap-1 h-full min-h-[100px]">
                          <div className="flex items-center gap-1.5 opacity-80">
                             <div className={cn("p-1.5 rounded-lg transition-transform group-hover/statcard:scale-110", item.bgColor, item.color)}>
                                <item.icon className="w-3.5 h-3.5" />
                             </div>
                             <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.1em]">{item.label}</span>
                          </div>
                          <span className={cn("text-5xl font-black leading-none tracking-tighter self-center mb-1", item.color)}>{item.value}</span>
                          <div className="h-1" /> {/* Spacer */}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-1.5 px-3 bg-muted/30 rounded-xl border border-border/40 mb-1">
              <div className="flex items-center gap-3">
                <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-auto">
                  <TabsList className="h-8 p-0.5 bg-background/50 rounded-lg border">
                    <TabsTrigger value="table" className="h-7 px-3 text-[9px] uppercase font-black tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                       <TableIcon className="w-3 h-3" /> Cədvəl
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="h-7 px-3 text-[9px] uppercase font-black tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                       <CalendarIcon className="w-3 h-3" /> Zaman Oxu
                    </TabsTrigger>
                    <TabsTrigger value="kanban" className="h-7 px-3 text-[9px] uppercase font-black tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                       <KanbanIcon className="w-3 h-3" /> Kanban
                    </TabsTrigger>
                    <TabsTrigger value="dashboard" className="h-7 px-3 text-[9px] uppercase font-black tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                       <DashboardIcon className="w-3 h-3" /> Analitika
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex items-center gap-2">
                <ProjectActivityTable.GlobalFilters 
                   activeFilter={activeFilter} 
                   onFilterChange={setActiveFilter}
                />
                <div className="h-4 w-px bg-border/60 mx-1" />
                <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg border-border/60 hover:text-primary hover:border-primary transition-all" onClick={() => projectService.exportProject(selectedProject.id)}>
                   <Download className="w-3.5 h-3.5" /> Excel-ə köçür
                </Button>
                <div className="h-4 w-px bg-border/60 mx-1" />
                <Button variant="outline" size="icon" onClick={() => fetchProjectDetails(selectedProject.id)} disabled={isLoading} className="h-8 w-8 rounded-lg border-border/60">
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
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

      {/* Project Side Panel (Redesigned) */}
      <Sheet open={isProjectModalOpen} onOpenChange={(open) => { setIsProjectModalOpen(open); if(!open) setEditingProject(null); }}>
        <SheetContent className="sm:max-w-[750px] w-full p-0 flex flex-col border-l-primary/10 shadow-2xl">
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

ProjectActivityTable.GlobalFilters = function({ 
  activeFilter, 
  onFilterChange 
}: { 
  activeFilter: 'all' | 'mine' | 'overdue', 
  onFilterChange: (v: 'all' | 'mine' | 'overdue') => void 
}) {
  return (
    <div className="flex items-center gap-1.5 p-1 bg-background/50 rounded-lg border shadow-sm">
      {[
        { id: 'all', label: 'Hamısı' },
        { id: 'mine', label: 'Mənim' },
        { id: 'overdue', label: 'Gecikənlər' }
      ].map((f) => (
        <Button
          key={f.id}
          variant={activeFilter === f.id ? "default" : "ghost"}
          size="sm"
          onClick={() => onFilterChange(f.id as any)}
          className={cn(
            "h-7 px-3 text-[10px] font-black uppercase tracking-wider transition-all",
            activeFilter === f.id ? "shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
};
