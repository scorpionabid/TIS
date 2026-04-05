import React, { useEffect, useState, useCallback } from 'react';
import { 
  LayoutGrid, 
  Plus, 
  ArrowLeft, 
  BarChart3, 
  Calendar as CalendarIcon, 
  Target, 
  CheckCircle2, 
  Settings,
  Table as TableIcon,
  LayoutDashboard as KanbanIcon,
  BarChart3 as DashboardIcon,
  Briefcase,
  Activity,
  Loader2,
  Search,
  MoreHorizontal,
  RefreshCw,
  List
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
import { ActivityForm } from '@/components/projects/ActivityForm';
import { ActivityComments } from '@/components/projects/ActivityComments';
import { ActivityHistory } from '@/components/projects/ActivityHistory';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

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
  const [activeView, setActiveView] = useState<'kanban' | 'table' | 'dashboard' | 'timeline' | 'stats'>('kanban');
  const [listLayout, setListLayout] = useState<'grid' | 'table'>('table');
  
  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ProjectActivity | null>(null);

  const isAdmin = hasRole([
    USER_ROLES.SUPERADMIN, 
    USER_ROLES.REGIONADMIN, 
    USER_ROLES.REGIONOPERATOR, 
    USER_ROLES.SEKTORADMIN
  ]);

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await projectService.getProjects();
      setProjects(data);
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
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Layihə detallarını yükləmək mümkün olmadı.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Əməliyyat zamanı xəta baş verdi.',
        variant: 'destructive',
      });
    }
  };

  const handleAddActivity = async (values: any) => {
    if (!selectedProject) return;
    try {
      if (editingActivity) {
        await projectService.updateActivity(editingActivity.id, values);
      } else {
        await projectService.addActivity(selectedProject.id, values);
      }
      toast({
        title: 'Uğurlu',
        description: `Fəaliyyət uğurla ${editingActivity ? 'yeniləndi' : 'əlavə edildi'}.`,
      });
      setIsActivityModalOpen(false);
      setEditingActivity(null);
      fetchProjectDetails(selectedProject.id);
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Əməliyyat zamanı xəta baş verdi.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (activityId: number, newStatus: ProjectActivity['status']) => {
    if (!selectedProject) return;
    try {
      await projectService.updateActivity(activityId, { status: newStatus });
      fetchProjectDetails(selectedProject.id);
    } catch (error) {
       toast({
        title: 'Xəta',
        description: 'Status yenilənərkən xəta baş verdi.',
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
    <div className="container mx-auto p-4 md:p-6 space-y-8 max-w-screen-2xl">
      <AnimatePresence mode="wait">
        {!selectedProject ? (
          <motion.div
            key="project-list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Layihələrin İdarə Olunması
                </h1>
                <p className="text-muted-foreground mt-2 font-medium italic">
                  Strateji hədəflər, resursların idarə olunması və mərkəzi hesabatlılıq sistemi.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-muted/50 mr-2">
                  <Button 
                    variant={listLayout === 'table' ? 'default' : 'ghost'} 
                    size="icon" 
                    onClick={() => setListLayout('table')}
                    className="h-9 w-9 rounded-lg"
                    title="Cədvəl Görünüşü"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant={listLayout === 'grid' ? 'default' : 'ghost'} 
                    size="icon" 
                    onClick={() => setListLayout('grid')}
                    className="h-9 w-9 rounded-lg"
                    title="Kart Görünüşü"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" size="icon" onClick={fetchProjects} disabled={isLoading} className="rounded-xl border-primary/20 bg-primary/5 h-11 w-11">
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </Button>
                {isAdmin && (
                  <Button onClick={() => setIsProjectModalOpen(true)} className="gap-2 shadow-xl shadow-primary/20 rounded-xl px-6 h-11 font-bold transition-all hover:scale-105 active:scale-95">
                    <Plus className="w-4 h-4" /> Yeni Layihə
                  </Button>
                )}
              </div>
            </div>

            <Separator className="opacity-50" />

            <Tabs defaultValue="projects" className="w-full">
              <TabsList className="bg-muted/30 p-1 h-14 rounded-2xl mb-8 border border-muted/50 backdrop-blur-md">
                <TabsTrigger value="projects" className="rounded-xl px-10 h-full data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span className="font-black text-sm uppercase tracking-widest">Layihələr</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="rounded-xl px-10 h-full data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="font-black text-sm uppercase tracking-widest">Ümumi Statistika</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="projects" className="mt-0 ring-offset-0 focus-visible:ring-0">
                {listLayout === 'grid' ? (
                  <ProjectList 
                    projects={projects} 
                    onProjectClick={(p) => fetchProjectDetails(p.id)} 
                    onCreateClick={() => setIsProjectModalOpen(true)}
                    isAdmin={isAdmin}
                  />
                ) : (
                  <ProjectTable 
                    projects={projects}
                    onProjectClick={(p) => fetchProjectDetails(p.id)}
                    isAdmin={isAdmin}
                  />
                )}
              </TabsContent>

              <TabsContent value="stats" className="mt-0 ring-offset-0 focus-visible:ring-0">
                <ProjectOverallStats projects={projects} />
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSelectedProject(null); setStats(null); }}
                  className="mb-2 -ml-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Layihələrə qayıt
                </Button>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">{selectedProject.name}</h1>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-widest text-[10px] py-1 font-bold">
                    {selectedProject.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-2 bg-background/60 backdrop-blur-sm px-3 py-1 rounded-full border border-primary/10 shadow-sm">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold">Başlama: <b className="text-primary">{formatDate(selectedProject.start_date)}</b></span>
                  </div>
                  <div className="flex items-center gap-2 bg-background/60 backdrop-blur-sm px-3 py-1 rounded-full border border-primary/10 shadow-sm">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold">Hədəf: <b className="text-primary">{selectedProject.total_goal || '-'}</b></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={() => setIsActivityModalOpen(true)} className="gap-2 shadow-md">
                  <Plus className="w-4 h-4" /> Yeni Fəaliyyət
                </Button>
              </div>
            </div>

            {/* Stats Summary Cards */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="relative overflow-hidden group border-primary/10 bg-gradient-to-br from-primary/5 via-transparent to-transparent hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-12 h-12 text-primary" />
                  </div>
                  <CardContent className="p-4 flex flex-col justify-between h-28 relative z-10">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">İcra Faizi</h4>
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-black tracking-tight">{stats.progress_percentage}%</div>
                      <div className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", stats.progress_percentage > 50 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                        {stats.progress_percentage > 70 ? 'Əla' : 'Davam edir'}
                      </div>
                    </div>
                    <Progress value={stats.progress_percentage} className="h-1.5 mt-auto" />
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-muted/20 hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Activity className="w-12 h-12 text-blue-500" />
                  </div>
                  <CardContent className="p-4 flex flex-col justify-between h-28 relative z-10">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ümumi Fəaliyyət</h4>
                    <div className="text-3xl font-black tracking-tight">{stats.total_activities}</div>
                    <div className="flex items-center gap-2 mt-auto">
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold border-emerald-500/20 text-emerald-600 bg-emerald-50">
                        {stats.completed_activities} tamamlanıb
                      </Badge>
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold border-blue-500/20 text-blue-600 bg-blue-50">
                        {stats.total_activities - stats.completed_activities} aktiv
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-muted/20 hover:shadow-lg transition-all duration-300">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <CalendarIcon className="w-12 h-12 text-orange-500" />
                  </div>
                  <CardContent className="p-4 flex flex-col justify-between h-28 relative z-10">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Planlaşdırılan Saat</h4>
                    <div className="flex items-baseline gap-1">
                      <div className="text-3xl font-black tracking-tight">{stats.planned_hours}</div>
                      <div className="text-xs font-bold text-muted-foreground">saat</div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/80 mt-auto flex items-center gap-1 font-medium italic">
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-orange-500" /> Ümumi iş yükü analizi
                    </p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-muted/20 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-emerald-50/30 to-transparent">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </div>
                  <CardContent className="p-4 flex flex-col justify-between h-28 relative z-10">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Effektivlik</h4>
                    <div className="text-3xl font-black tracking-tight text-emerald-600">{stats.efficiency}%</div>
                    <div className="flex items-center gap-1.5 mt-auto bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-[9px] font-bold text-emerald-700">Plan vs Fakt Müqayisəsi</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between gap-4 border-b pb-1">
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-full md:w-auto">
                <TabsList className="bg-muted/50 p-1 h-11 backdrop-blur-sm border border-muted/60 w-full justify-start overflow-x-auto flex-nowrap custom-scrollbar">
                  <TabsTrigger value="table" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                    <TableIcon className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold">Cədvəl</span>
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                    <KanbanIcon className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold">Kanban</span>
                  </TabsTrigger>
                  <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                    <DashboardIcon className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-bold">Analitika</span>
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                    <CalendarIcon className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-bold">Zaman Oxu</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                 {isAdmin && (
                   <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setEditingProject(selectedProject); setIsProjectModalOpen(true); }}
                    className="gap-2 text-xs font-bold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                   >
                     <Settings className="w-3.5 h-3.5" /> Parametrlər
                   </Button>
                 )}
                 <Button variant="outline" size="sm" onClick={() => fetchProjectDetails(selectedProject.id)}>
                   <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                 </Button>
              </div>
            </div>

            {/* View Content */}
            <div className="pt-2">
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
                      activities={selectedProject.activities || []}
                      onEditActivity={(a) => { setEditingActivity(a); setIsActivityModalOpen(true); }}
                      onStatusChange={handleStatusChange}
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
                      activities={selectedProject.activities || []}
                      onEditActivity={(a) => { setEditingActivity(a); setIsActivityModalOpen(true); }}
                      onStatusChange={handleStatusChange}
                      canEdit={true}
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
                      activities={selectedProject.activities || []}
                      onEditActivity={(a) => { setEditingActivity(a); setIsActivityModalOpen(true); }}
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

      {/* Project Side Panel (Redesigned) */}
      <Sheet open={isProjectModalOpen} onOpenChange={(open) => { setIsProjectModalOpen(open); if(!open) setEditingProject(null); }}>
        <SheetContent className="sm:max-w-[750px] w-full p-0 flex flex-col border-l-primary/10 shadow-2xl">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border-b relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl" />
            <SheetHeader className="relative z-10">
              <SheetTitle className="text-3xl font-black tracking-tighter bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {editingProject ? 'Layihəni Redaktə Et' : 'Yeni Layihə Strategiyası'}
              </SheetTitle>
              <SheetDescription className="text-sm font-medium text-muted-foreground/80 mt-2 max-w-md italic">
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

      <Sheet open={isActivityModalOpen} onOpenChange={(open) => { setIsActivityModalOpen(open); if(!open) setEditingActivity(null); }}>
        <SheetContent className="sm:max-w-[650px] w-full p-0 flex flex-col border-l-primary/10 shadow-2xl">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border-b relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl" />
            <SheetHeader className="relative z-10">
              <SheetTitle className="text-3xl font-black tracking-tighter bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {editingActivity ? editingActivity.name : 'Yeni Fəaliyyət Planla'}
              </SheetTitle>
              <SheetDescription className="text-sm font-medium text-muted-foreground/80 mt-2 max-w-md italic">
                {editingActivity ? 'Fəaliyyət detalları, müzakirələr və tarixçə.' : 'Layihəni uğura aparan yeni bir fəaliyyət nöqtəsi təyin edin.'}
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-hidden p-8">
            {editingActivity ? (
              <Tabs defaultValue="info" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/40 p-1 rounded-xl h-12">
                  <TabsTrigger value="info" className="rounded-lg font-bold text-xs uppercase tracking-wider">Məlumat</TabsTrigger>
                  <TabsTrigger value="comments" className="rounded-lg font-bold text-xs uppercase tracking-wider">Müzakirə</TabsTrigger>
                  <TabsTrigger value="history" className="rounded-lg font-bold text-xs uppercase tracking-wider">Tarixçə</TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <TabsContent value="info" className="mt-0 focus-visible:ring-0">
                    <ActivityForm 
                      initialData={editingActivity || undefined}
                      activities={selectedProject.activities || []}
                      onSubmit={handleAddActivity}
                      onCancel={() => { setIsActivityModalOpen(false); setEditingActivity(null); }}
                      isLoading={isLoading}
                    />
                  </TabsContent>
                  <TabsContent value="comments" className="mt-0 focus-visible:ring-0">
                    <ActivityComments activityId={editingActivity.id} />
                  </TabsContent>
                  <TabsContent value="history" className="mt-0 focus-visible:ring-0">
                    <ActivityHistory activityId={editingActivity.id} />
                  </TabsContent>
                </div>
              </Tabs>
            ) : (
              <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                <ActivityForm 
                  activities={selectedProject?.activities || []}
                  onSubmit={handleAddActivity}
                  onCancel={() => { setIsActivityModalOpen(false); setEditingActivity(null); }}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
