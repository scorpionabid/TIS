import React from 'react';
import {
  Plus,
  RefreshCw,
  List,
  LayoutGrid,
  Search,
  FolderKanban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ProjectHeaderProps {
  listLayout: 'grid' | 'table';
  setListLayout: (layout: 'grid' | 'table') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  isAdmin: boolean;
  onNewProject: () => void;
  projectCount?: number;
}

export function ProjectHeader({
  listLayout,
  setListLayout,
  searchQuery,
  setSearchQuery,
  isLoading,
  onRefresh,
  isAdmin,
  onNewProject,
  projectCount,
}: ProjectHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/[0.06] via-background to-background shadow-sm">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 left-1/3 w-32 h-32 rounded-full bg-accent/10 blur-2xl" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/30">
            <FolderKanban className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground leading-none">Layihələr</h1>
              {projectCount !== undefined && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                  {projectCount}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Strateji hədəflər və resursların idarəetmə mərkəzi
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/40 p-0.5">
            <button
              onClick={() => setListLayout('table')}
              title="Cədvəl"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150',
                listLayout === 'table'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setListLayout('grid')}
              title="Kart"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150',
                listLayout === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Layihə axtar..."
              className="h-9 pl-8 rounded-lg border-border/60 bg-background/80 text-sm focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 w-9 rounded-lg border-border/60"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </Button>

          {/* New project */}
          {isAdmin && (
            <Button
              onClick={onNewProject}
              className="h-9 gap-1.5 rounded-lg px-4 font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Layihə
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
