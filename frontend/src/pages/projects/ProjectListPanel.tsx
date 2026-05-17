import React from 'react';
import { Briefcase, Activity, AlertCircle, ListTodo } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Project } from '@/services/projects';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectTable } from '@/components/projects/ProjectTable';
import { ProjectOverallStats } from '@/components/projects/ProjectOverallStats';
import { ProjectMyActivities } from '@/components/projects/ProjectMyActivities';
import { ProjectUrgentActivities } from '@/components/projects/ProjectUrgentActivities';
import { ProjectHeader } from '@/components/projects/ProjectHeader';

type ListLayout = 'grid' | 'table';
type MainTab = 'projects' | 'stats' | 'my_activities' | 'urgent';

interface ProjectListPanelProps {
  projects: Project[];
  filteredProjects: Project[];
  isLoading: boolean;
  listLayout: ListLayout;
  setListLayout: (v: ListLayout) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  mainTab: MainTab;
  setMainTab: (v: MainTab) => void;
  isAdmin: boolean;
  currentUserId?: number;
  onProjectClick: (project: Project) => void;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onArchiveProject: (project: Project) => void;
  onUnarchiveProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onActivityClick: (projectId: number, activityId: number) => void;
}

export function ProjectListPanel({
  projects,
  filteredProjects,
  isLoading,
  listLayout,
  setListLayout,
  searchQuery,
  setSearchQuery,
  mainTab,
  setMainTab,
  isAdmin,
  currentUserId,
  onProjectClick,
  onNewProject,
  onEditProject,
  onArchiveProject,
  onUnarchiveProject,
  onDeleteProject,
  onActivityClick,
}: ProjectListPanelProps) {
  return (
    <div className="space-y-6">
      <ProjectHeader
        listLayout={listLayout}
        setListLayout={setListLayout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoading={isLoading}
        onRefresh={() => {}}
        isAdmin={isAdmin}
        onNewProject={onNewProject}
        projectCount={projects.length}
      />

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)} className="w-full">
        <TabsList className="mb-5 h-10 rounded-xl bg-muted/50 p-1 gap-0.5 w-full">
          <TabsTrigger value="projects" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <Briefcase className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Layihələr</span>
            {projects.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary tabular-nums">
                {projects.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="my_activities" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <ListTodo className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Fəaliyyətlərim</span>
          </TabsTrigger>
          <TabsTrigger value="urgent" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Təcili</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm">
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Statistika</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my_activities" className="mt-0">
          <ProjectMyActivities onActivityClick={onActivityClick} />
        </TabsContent>

        <TabsContent value="projects" className="mt-0">
          {listLayout === 'grid' ? (
            <ProjectList
              projects={filteredProjects}
              onProjectClick={onProjectClick}
              onEditClick={onEditProject}
              onArchiveClick={onArchiveProject}
              onUnarchiveClick={onUnarchiveProject}
              onDeleteClick={onDeleteProject}
              onCreateClick={onNewProject}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
            />
          ) : (
            <ProjectTable
              projects={filteredProjects}
              onProjectClick={onProjectClick}
              onEditClick={onEditProject}
              onArchiveClick={onArchiveProject}
              onUnarchiveClick={onUnarchiveProject}
              onDeleteClick={onDeleteProject}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
            />
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <ProjectOverallStats projects={projects} />
        </TabsContent>

        <TabsContent value="urgent" className="mt-0">
          <ProjectUrgentActivities onActivityClick={onActivityClick} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
