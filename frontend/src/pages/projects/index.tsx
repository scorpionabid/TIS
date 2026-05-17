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
import { ActivityComments } from '@/components/projects/ActivityComments';
import { ActivityHistory } from '@/components/projects/ActivityHistory';
import { useAssignableUsers } from '@/hooks/tasks/useAssignableUsers';
import { ProjectListPanel } from '@/pages/projects/ProjectListPanel';
import { ProjectDetailsPanel } from '@/pages/projects/ProjectDetailsPanel';
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
  const [detailActivity, setDetailActivity] = useState<ProjectActivity | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isGlobalAdmin = hasRole([
    USER_ROLES.SUPERADMIN,
    USER_ROLES.REGIONADMIN
  ]);
  
  const canManageProjects = hasRole([
    USER_ROLES.SUPERADMIN,
    USER_ROLES.REGIONADMIN,
    USER_ROLES.REGIONOPERATOR,
    USER_ROLES.SEKTORADMIN,
    USER_ROLES.SCHOOLADMIN
  ]);

  const isAdmin = canManageProjects; // Preserve legacy usage where appropriate

  const { users: availableUsers } = useAssignableUsers({
    perPage: 200,
    originScope: hasRole(USER_ROLES.SUPERADMIN) ? null :
                 hasRole([USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN]) ? 'region' : 'sector',
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

  const handleCloneActivity = async (activity: ProjectActivity) => {
    if (!selectedProject) return;
    try {
      await projectService.addActivity(selectedProject.id, {
        name:                     activity.name + ' (Kopyа)',
        description:              activity.description,
        priority:                 activity.priority,
        status:                   'pending',
        start_date:               activity.start_date,
        end_date:                 activity.end_date,
        planned_hours:            activity.planned_hours,
        budget:                   activity.budget,
        expected_outcome:         activity.expected_outcome,
        kpi_metrics:              activity.kpi_metrics,
        risks:                    activity.risks,
        location_platform:        activity.location_platform,
        monitoring_mechanism:     activity.monitoring_mechanism,
        goal_contribution_percentage: activity.goal_contribution_percentage,
        goal_target:              activity.goal_target,
        employee_ids:             activity.assigned_employees?.map(e => e.id) ?? [],
      });
      await fetchProjectDetails(selectedProject.id);
      const cleanName = activity.name.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      toast({ title: 'Kopyalandı', description: `"${cleanName}" kopyalandı.` });
    } catch {
      toast({ title: 'Xəta', description: 'Kopyalama zamanı xəta.', variant: 'destructive' });
    }
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
          <motion.div key="project-list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <ProjectListPanel
              projects={projects}
              filteredProjects={filteredProjects}
              isLoading={isLoading}
              listLayout={listLayout}
              setListLayout={setListLayout}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              mainTab={mainTab}
              setMainTab={setMainTab}
              isAdmin={isAdmin}
              currentUserId={currentUser?.id}
              onProjectClick={(p) => fetchProjectDetails(p.id)}
              onNewProject={() => setIsProjectModalOpen(true)}
              onEditProject={(p) => { setEditingProject(p); setIsProjectModalOpen(true); }}
              onArchiveProject={(p) => setArchivingProject(p)}
              onUnarchiveProject={handleUnarchiveProject}
              onDeleteProject={(p) => setDeletingProject(p)}
              onActivityClick={handleActivityClickFromMyActivities}
            />
          </motion.div>
        ) : (
          <motion.div key="project-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ProjectDetailsPanel
              selectedProject={selectedProject}
              stats={stats}
              filteredActivities={filteredActivities}
              activeView={activeView}
              setActiveView={setActiveView}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              highlightedActivityId={highlightedActivityId}
              availableUsers={availableUsers}
              isLoading={isLoading}
              isStatsVisible={isStatsVisible}
              toggleStats={() => { setIsStatsVisible(!isStatsVisible); setIsStatsManuallyToggled(true); }}
              isAdmin={isAdmin}
              formatDate={formatDate}
              onBack={() => { setSelectedProject(null); setStats(null); }}
              onEdit={() => { setEditingProject(selectedProject); setIsProjectModalOpen(true); }}
              onStatusChange={handleStatusChange}
              onDeleteActivity={handleDeleteActivity}
              onRefresh={() => fetchProjectDetails(selectedProject.id)}
              onViewDetails={(activity) => setDetailActivity(activity)}
              onCloneActivity={handleCloneActivity}
              onActivityUpdated={(updated) => setSelectedProject({
                ...selectedProject,
                activities: (selectedProject.activities || []).map(a => a.id === updated.id ? updated : a),
              })}
            />
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

      {/* ── Fəaliyyət Detalları — Şərhlər & Tarixçə ── */}
      <Sheet open={!!detailActivity} onOpenChange={(open) => { if (!open) setDetailActivity(null); }}>
        <SheetContent className="sm:max-w-[520px] w-full flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="text-base font-bold leading-tight line-clamp-2">
              {detailActivity?.name}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Fəaliyyət şərhləri və dəyişiklik tarixçəsi
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            {detailActivity && (
              <Tabs defaultValue="comments" className="h-full flex flex-col">
                <TabsList className="mx-6 mt-4 mb-0 w-auto self-start">
                  <TabsTrigger value="comments" className="text-xs">💬 Şərhlər</TabsTrigger>
                  <TabsTrigger value="history"  className="text-xs">🕐 Tarixçə</TabsTrigger>
                </TabsList>
                <TabsContent value="comments" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
                  <ActivityComments activityId={detailActivity.id} />
                </TabsContent>
                <TabsContent value="history" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
                  <ActivityHistory activityId={detailActivity.id} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

