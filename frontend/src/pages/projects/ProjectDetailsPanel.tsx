import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Target,
  Table as TableIcon,
  LayoutDashboard as KanbanIcon,
  BarChart3 as DashboardIcon,
  RefreshCw,
  ListTodo,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Search,
  X,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Project, ProjectActivity, ProjectStats } from '@/services/projects';
import { projectService } from '@/services/projects';
import { AssignableUser } from '@/services/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProjectDetailsHeader } from '@/components/projects/ProjectDetailsHeader';
import { ProjectActivityTable, ActivityGlobalFilters } from '@/components/projects/ProjectActivityTable';
import { ProjectActivityKanban } from '@/components/projects/ProjectActivityKanban';
import { ProjectActivityTimeline } from '@/components/projects/ProjectActivityTimeline';
import { ProjectDashboard } from '@/components/projects/ProjectDashboard';

type ActiveView   = 'kanban' | 'table' | 'dashboard' | 'timeline';
type ActiveFilter = 'all' | 'mine' | 'overdue';
type Priority     = 'low' | 'medium' | 'high' | 'critical';

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Aşağı', medium: 'Orta', high: 'Yüksək', critical: 'Kritik',
};
const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

interface ProjectDetailsPanelProps {
  selectedProject: Project;
  stats: ProjectStats | null;
  filteredActivities: ProjectActivity[];
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
  activeFilter: ActiveFilter;
  setActiveFilter: (v: ActiveFilter) => void;
  highlightedActivityId: number | null;
  availableUsers: AssignableUser[];
  isLoading: boolean;
  isStatsVisible: boolean;
  toggleStats: () => void;
  isAdmin: boolean;
  formatDate: (d?: string) => string;
  onBack: () => void;
  onEdit: () => void;
  onStatusChange: (id: number, status: ProjectActivity['status']) => void;
  onDeleteActivity: (id: number) => Promise<void>;
  onRefresh: () => void;
  onViewDetails: (activity: ProjectActivity) => void;
  onActivityUpdated: (activity: ProjectActivity) => void;
  onCloneActivity?: (activity: ProjectActivity) => void;
}

export function ProjectDetailsPanel({
  selectedProject,
  stats,
  filteredActivities,
  activeView,
  setActiveView,
  activeFilter,
  setActiveFilter,
  highlightedActivityId,
  availableUsers,
  isLoading,
  isStatsVisible,
  toggleStats,
  isAdmin,
  formatDate,
  onBack,
  onEdit,
  onStatusChange,
  onDeleteActivity,
  onRefresh,
  onViewDetails,
  onActivityUpdated,
  onCloneActivity,
}: ProjectDetailsPanelProps) {
  const [searchVal, setSearchVal]           = useState('');
  const [search, setSearch]                 = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<number | null>(null);
  const [showFilters, setShowFilters]     = useState(false);
  const [isExporting, setIsExporting]     = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await projectService.exportProject(selectedProject.id);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Debounced search effekti
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchVal);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // Lokal filterlər tətbiq et
  const displayActivities = useMemo(() => {
    let result = filteredActivities;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q)
      );
    }
    if (priorityFilter) {
      result = result.filter(a => a.priority === priorityFilter);
    }
    if (assigneeFilter) {
      result = result.filter(a =>
        a.assigned_employees?.some(e => e.id === assigneeFilter) ||
        a.user_id === assigneeFilter
      );
    }
    return result;
  }, [filteredActivities, search, priorityFilter, assigneeFilter]);

  const flatActivities = useMemo(() => {
    const list: ProjectActivity[] = [];
    const topLevel = displayActivities.filter(a => !a.parent_id);
    topLevel.forEach(parent => {
      list.push(parent);
      if (parent.sub_activities && parent.sub_activities.length > 0) {
        parent.sub_activities.forEach(sub => {
          list.push({
            ...sub,
            parentName: parent.name,
          });
        });
      }
    });
    return list;
  }, [displayActivities]);

  const hasActiveFilters = !!searchVal || !!priorityFilter || !!assigneeFilter;

  const clearFilters = () => {
    setSearchVal('');
    setSearch('');
    setPriorityFilter(null);
    setAssigneeFilter(null);
  };

  // Layihədəki unikal məsullar (filter üçün)
  const projectUsers = useMemo(() => {
    const map = new Map<number, string>();
    filteredActivities.forEach(a => {
      a.assigned_employees?.forEach(e => map.set(e.id, e.name));
      if (a.user_id && a.employee) map.set(a.user_id, (a.employee as { name: string }).name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [filteredActivities]);

  return (
    <div className="space-y-6">
      <ProjectDetailsHeader
        project={selectedProject}
        onBack={onBack}
        isStatsVisible={isStatsVisible}
        toggleStats={toggleStats}
        isAdmin={isAdmin}
        onEdit={onEdit}
        formatDate={formatDate}
      />

      {/* Stats strip */}
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
              <div className="min-w-[140px] flex-shrink-0 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md p-3.5 flex flex-col gap-2 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.15)] hover:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.25)] hover:-translate-y-0.5 transition-all duration-300">
                <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider">İcra faizi</span>
                <span className="text-3xl font-black text-primary leading-none tabular-nums">{stats.progress_percentage}%</span>
                <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden">
                  <motion.div className="h-full rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" initial={{ width: 0 }} animate={{ width: `${stats.progress_percentage}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
                </div>
              </div>
              {[
                { label: 'Cəmi',       value: stats.total_activities,                glow: 'from-slate-500/10 via-slate-500/5 to-transparent border-slate-500/20 hover:border-slate-500/40 text-slate-700 dark:text-slate-300 shadow-[0_4px_12px_-2px_rgba(100,116,139,0.08)] hover:shadow-[0_8px_24px_-2px_rgba(100,116,139,0.15)]', dot: 'bg-slate-500', num: 'text-slate-700 dark:text-slate-300', icon: ListTodo },
                { label: 'Gözləyir',   value: stats.status_breakdown?.pending ?? 0,  glow: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 hover:border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-[0_4px_12px_-2px_rgba(245,158,11,0.08)] hover:shadow-[0_8px_24px_-2px_rgba(245,158,11,0.15)]', dot: 'bg-amber-500', num: 'text-amber-600 dark:text-amber-400', icon: Clock },
                { label: 'İcrada',     value: stats.status_breakdown?.in_progress ?? 0, glow: 'from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/20 hover:border-yellow-500/40 text-yellow-600 dark:text-yellow-400 shadow-[0_4px_12px_-2px_rgba(234,179,8,0.08)] hover:shadow-[0_8px_24px_-2px_rgba(234,179,8,0.15)]', dot: 'bg-yellow-500', num: 'text-yellow-600 dark:text-yellow-400', icon: RefreshCw },
                { label: 'Yoxlamada',  value: stats.status_breakdown?.checking ?? 0, glow: 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20 hover:border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-[0_4px_12px_-2px_rgba(59,130,246,0.08)] hover:shadow-[0_8px_24px_-2px_rgba(59,130,246,0.15)]', dot: 'bg-blue-500', num: 'text-blue-600 dark:text-blue-400', icon: Target },
                { label: 'Tamamlandı', value: stats.status_breakdown?.completed ?? 0, glow: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-[0_4px_12px_-2px_rgba(16,185,129,0.08)] hover:shadow-[0_8px_24px_-2px_rgba(16,185,129,0.15)]', dot: 'bg-emerald-500', num: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
                { label: 'Problem',    value: stats.status_breakdown?.stuck ?? 0,     glow: 'from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/20 hover:border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-[0_4px_12px_-2px_rgba(244,63,94,0.08)] hover:shadow-[0_8px_24px_-2px_rgba(244,63,94,0.15)]', dot: 'bg-rose-500', num: 'text-rose-600 dark:text-rose-400', icon: AlertCircle },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                  className={cn(
                    "min-w-[110px] flex-shrink-0 rounded-xl border bg-gradient-to-br p-3.5 flex flex-col gap-1.5 backdrop-blur-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer select-none",
                    item.glow
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', item.dot)} />
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">{item.label}</span>
                    </div>
                    <item.icon className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                  </div>
                  <span className={cn('text-2xl font-bold leading-none tabular-nums', item.num)}>{item.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border/50 bg-background/60 px-3 py-2 shadow-sm">
          {/* View mode */}
          <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5 self-start sm:self-auto">
            {([
              { value: 'table',     label: 'Cədvəl',    icon: TableIcon },
              { value: 'timeline',  label: 'Zaman Oxu', icon: CalendarIcon },
              { value: 'kanban',    label: 'Kanban',    icon: KanbanIcon },
              { value: 'dashboard', label: 'Analitika', icon: DashboardIcon },
            ] as const).map((v) => (
              <button key={v.value} onClick={() => setActiveView(v.value)}
                className={cn('flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 h-8 text-xs font-medium transition-all',
                  activeView === v.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <v.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            {/* Axtarış */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Axtar..."
                className="h-8 pl-8 pr-7 w-full sm:w-48 text-xs"
              />
              {searchVal && (
                <button onClick={() => { setSearchVal(''); setSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <Button variant="ghost" size="icon" className={cn('h-8 w-8 rounded-lg', (showFilters || hasActiveFilters) && 'bg-primary/10 text-primary')}
              onClick={() => setShowFilters(p => !p)} title="Filterlər">
              <Filter className="w-3.5 h-3.5" />
              {hasActiveFilters && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />}
            </Button>

            <div className="h-4 w-px bg-border/60" />
            <ActivityGlobalFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            <div className="h-4 w-px bg-border/60" />
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 sm:px-3 text-xs font-medium hover:text-primary"
              onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isExporting ? 'İxrac edilir...' : 'Excel'}</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Filter paneli */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20">
                {/* Prioritet */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium">Prioritet:</span>
                  {(['low', 'medium', 'high', 'critical'] as Priority[]).map(p => (
                    <button key={p} onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
                      className={cn('h-6 px-2 text-[11px] font-medium rounded-full border transition-all',
                        priorityFilter === p ? PRIORITY_COLORS[p] + ' border-current' : 'bg-background border-border/50 text-muted-foreground hover:border-primary/40')}>
                      {PRIORITY_LABELS[p]}
                    </button>
                  ))}
                </div>

                {/* Məsul */}
                {projectUsers.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">Məsul:</span>
                    <select
                      value={assigneeFilter ?? ''}
                      onChange={e => setAssigneeFilter(e.target.value ? Number(e.target.value) : null)}
                      className="h-6 px-2 text-[11px] rounded border border-border/50 bg-background text-foreground focus:ring-0 focus:border-primary/40"
                    >
                      <option value="">Hamısı</option>
                      {projectUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Aktiv filter-ləri göstər */}
                {hasActiveFilters && (
                  <button onClick={clearFilters}
                    className="ml-auto flex items-center gap-1 text-[11px] text-destructive hover:text-destructive/80 font-medium">
                    <X className="w-3 h-3" />
                    Filterləri sıfırla
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Aktiv filter xülasəsi (panel bağlıdırsa) */}
        {!showFilters && hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap px-1">
            {search && (
              <Badge variant="secondary" className="h-6 gap-1 text-[11px] font-normal">
                <Search className="w-3 h-3" /> "{search}"
                <button onClick={() => setSearch('')}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {priorityFilter && (
              <Badge variant="secondary" className={cn('h-6 gap-1 text-[11px] font-normal', PRIORITY_COLORS[priorityFilter])}>
                {PRIORITY_LABELS[priorityFilter]}
                <button onClick={() => setPriorityFilter(null)}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {assigneeFilter && (
              <Badge variant="secondary" className="h-6 gap-1 text-[11px] font-normal">
                {projectUsers.find(u => u.id === assigneeFilter)?.name}
                <button onClick={() => setAssigneeFilter(null)}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">{displayActivities.length} nəticə</span>
          </div>
        )}
      </div>

      {/* View Content */}
      <div className="pt-1">
        <AnimatePresence mode="wait">
          {activeView === 'kanban' && (
            <motion.div key="kanban" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}>
              <ProjectActivityKanban
                activities={flatActivities}
                onStatusChange={onStatusChange}
                onActivityUpdated={onActivityUpdated}
                onDeleteActivity={onDeleteActivity}
                isLoading={isLoading}
                canEdit
              />
            </motion.div>
          )}
          {activeView === 'table' && (
            <motion.div key="table" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              <ProjectActivityTable
                projectId={selectedProject.id}
                activities={displayActivities}
                onStatusChange={onStatusChange}
                onEditActivity={() => {}}
                onDeleteActivity={onDeleteActivity}
                availableUsers={availableUsers}
                onRefresh={onRefresh}
                onViewDetails={onViewDetails}
                onCloneActivity={onCloneActivity}
                canEdit={selectedProject.can_edit_all || false}
                highlightedActivityId={highlightedActivityId || undefined}
                isLoading={isLoading}
              />
            </motion.div>
          )}
          {activeView === 'timeline' && (
            <motion.div key="timeline" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.2 }}>
              <ProjectActivityTimeline activities={flatActivities} />
            </motion.div>
          )}
          {activeView === 'dashboard' && stats && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
              <ProjectDashboard
                stats={stats}
                activities={selectedProject.activities ?? []}
                totalGoal={selectedProject.total_goal}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
