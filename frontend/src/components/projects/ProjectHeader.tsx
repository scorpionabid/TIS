import React from 'react';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  List, 
  LayoutGrid,
  SearchIcon
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
}

export function ProjectHeader({
  listLayout,
  setListLayout,
  searchQuery,
  setSearchQuery,
  isLoading,
  onRefresh,
  isAdmin,
  onNewProject
}: ProjectHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 py-2 px-1">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">
          Layihələr
        </h1>
        <p className="text-sm text-muted-foreground">
          Strateji hədəflər və resursların mərkəzləşdirilmiş idarəetmə mərkəzi.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Layout Toggle */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/40 backdrop-blur-sm shadow-sm">
          <Button 
            variant={listLayout === 'table' ? 'secondary' : 'ghost'} 
            size="icon" 
            onClick={() => setListLayout('table')}
            className={cn(
              "h-8 w-8 rounded-lg transition-all duration-300",
              listLayout === 'table' && "shadow-sm border border-border/20"
            )}
            title="Cədvəl Görünüşü"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button 
            variant={listLayout === 'grid' ? 'secondary' : 'ghost'} 
            size="icon" 
            onClick={() => setListLayout('grid')}
            className={cn(
              "h-8 w-8 rounded-lg transition-all duration-300",
              listLayout === 'grid' && "shadow-sm border border-border/20"
            )}
            title="Kart Görünüşü"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72 group">
           <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
           <Input 
              placeholder="Layihələrdə axtar..." 
              className="pl-9 h-10 rounded-xl bg-card border-border/60 focus-visible:ring-primary/20 shadow-sm hover:border-primary/30 transition-all duration-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
           />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onRefresh} 
              disabled={isLoading} 
              className="h-10 w-10 rounded-xl border-border/60 hover:bg-muted/50 hover:border-primary/30 shadow-sm transition-all duration-300"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            
            {isAdmin && (
              <Button 
                onClick={onNewProject} 
                className="gap-2 h-10 rounded-xl px-5 transition-colors duration-200"
              >
                <Plus className="w-4 h-4" /> <span className="font-bold">Yeni Layihə</span>
              </Button>
            )}
        </div>
      </div>
    </div>
  );
}
